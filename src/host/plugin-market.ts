/**
 * 插件市场热门榜单 — host 侧抓取与缓存。
 *
 * 数据源：dsh-plugin.org（社区 DSH 插件市场）。
 * - 榜单页 GET /plugins 是全量 SSR（约 14MB），其 Next.js flight payload 内嵌
 *   按「热门」排序的完整插件记录（slug / version / license / stars /
 *   githubCommand / description / compatibility 等），直接逐窗口解析前 TOP_N 个；
 * - 缓存：成功后整体写入 ~/.dsh/prompt-library/plugin-market.json，
 *   TTL 内（默认 6 小时）直接走缓存（14MB 页面不可频繁抓）；
 * - 兜底：实时抓取失败回退磁盘缓存，无缓存回退内置条目。
 *
 * 任何失败都静默降级，不阻断调用方。
 */
import { get as httpsGet } from "node:https";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pluginGithubCachePath, pluginMarketCachePath } from "./paths.js";

/** 热门榜单页（全量 SSR，约 14MB，记录按热门排序内嵌于 flight payload）。 */
const HOT_LIST_URL = "https://dsh-plugin.org/plugins";
/** 缓存有效期（毫秒）：6 小时。 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
/** 取热门前 N 个。 */
const TOP_N = 8;
/** 榜单页抓取超时（毫秒）。 */
const LIST_TIMEOUT_MS = 30_000;
/** GitHub API 请求超时（毫秒）。 */
const GITHUB_TIMEOUT_MS = 12_000;
/** GitHub 实时信息缓存有效期（毫秒）：30 分钟（未认证限流 60 次/小时，不可频繁抓）。 */
const GITHUB_TTL_MS = 30 * 60 * 1000;

/** 统一展示的插件条目。 */
export interface MarketPlugin {
  /** 唯一 id（owner/repo）。 */
  id: string;
  /** 插件名。 */
  name: string;
  /** 简介原文（英文，来自市场）。 */
  desc: string;
  /** 版本号（不含前导 v）。 */
  version: string;
  /** 许可证名。 */
  license: string;
  /** GitHub 仓库主页。 */
  repo: string;
  /** git clone 命令。 */
  cloneCmd: string;
  /** DSH 官方安装命令。 */
  dshCmd: string;
  /** GitHub stars 数。 */
  stars: number;
  /** 市场兼容性状态。 */
  verified: boolean;
  /** 热门排名（1 起）。 */
  rank: number;
}

/** 一次榜单获取结果。 */
export interface MarketResult {
  /** live 实时 / cache 磁盘缓存 / builtin 内置兜底。 */
  source: "live" | "cache" | "builtin";
  /** 数据抓取时间戳（毫秒）；builtin 为 0。 */
  fetchedAt: number;
  items: MarketPlugin[];
}

/** 无网络且无缓存时的内置兜底条目。 */
const BUILTIN_ITEMS: MarketPlugin[] = [
  {
    id: "master1Sun/dsh-file-workbench-lib",
    name: "dsh-file-workbench",
    desc: "File workbench plugin for DeepSeek Harness: explorer, editing, preview, search, Git and terminal.",
    version: "0.3.1",
    license: "MIT",
    repo: "https://github.com/master1Sun/dsh-file-workbench-lib",
    cloneCmd: "git clone --depth 1 https://github.com/master1Sun/dsh-file-workbench-lib.git",
    dshCmd: 'dsh plugin --profile web add "github:master1Sun/dsh-file-workbench-lib"',
    stars: 0,
    verified: false,
    rank: 1,
  },
];

/** GET 一个 URL，跟随一次重定向，超时后销毁请求；返回 UTF-8 全文。 */
function fetchPage(url: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = httpsGet(
      url,
      { headers: { "user-agent": "Mozilla/5.0 dsh-prompt-library", accept: "text/html" } },
      (res) => {
        // 重定向（最多跟一次即可满足本站需求）
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          const next = new URL(res.headers.location, url).toString();
          fetchPage(next, timeoutMs).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", reject);
      },
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`timeout after ${timeoutMs}ms for ${url}`));
    });
    req.on("error", reject);
  });
}

/** 解转义：把 JSON 字符串字面量还原为原文（失败返回原样）。 */
function unescapeJson(s: string): string {
  try {
    return JSON.parse(`"${s}"`) as string;
  } catch {
    return s;
  }
}

/** 去掉版本号前导 v。 */
function bareVersion(v: string): string {
  return v.replace(/^v/i, "");
}

/** 从转义记录窗口中取字符串字段（优先转义形式，退化到普通 JSON 形式）。 */
function fieldOf(win: string, key: string): string {
  const esc = new RegExp(`\\\\"${key}\\\\":\\\\"([^"\\\\]+)\\\\"`).exec(win);
  if (esc?.[1]) return esc[1];
  const plain = new RegExp(`"${key}":\\s*"([^"\\\\]+)"`).exec(win);
  return plain?.[1] ?? "";
}

/** 从转义记录窗口中取数字字段。 */
function numOf(win: string, key: string): number {
  const m = new RegExp(`\\\\"?${key}\\\\?":\\s*(\\d+)`).exec(win);
  return m ? Number(m[1]) : 0;
}

/** 从转义记录窗口中取描述（锚定 description 后紧跟 features，失败取窗口内第一条）。 */
function descOf(win: string): string {
  const descFeat = new RegExp(
    `\\\\"description\\\\":\\\\"((?:[^"\\\\]|\\\\.)+)\\\\",\\\\"features`,
  ).exec(win);
  if (descFeat?.[1]) return unescapeJson(descFeat[1]);
  const anyDesc = new RegExp(`\\\\"description\\\\":\\\\"((?:[^"\\\\]|\\\\.)+)\\\\"`).exec(win);
  return anyDesc?.[1] ? unescapeJson(anyDesc[1]) : "";
}

/** 把一条完整记录窗口解析为 MarketPlugin（rank 由调用方赋值）。 */
function recordFromWindow(win: string, name: string): MarketPlugin | null {
  const repoM = fieldOf(win, "repo").includes("/")
    ? fieldOf(win, "repo")
    : `${fieldOf(win, "ownerSlug")}/${name}`;
  if (!name || !repoM.includes("/")) return null;
  return {
    id: repoM,
    name,
    desc: descOf(win),
    version: bareVersion(fieldOf(win, "version")) || "—",
    license: fieldOf(win, "licenseName") || fieldOf(win, "license") || "—",
    repo: `https://github.com/${repoM}`,
    cloneCmd: `git clone --depth 1 https://github.com/${repoM}.git`,
    dshCmd: fieldOf(win, "githubCommand") || `dsh plugin --profile web add "github:${repoM}"`,
    stars: numOf(win, "stargazers_count"),
    // 兼容性状态在记录里是 {"compatibility":{"status":"verified"|"unconfirmed"}}
    verified: win.includes('\\"status\\":\\"verified\\"'),
    rank: 0,
  };
}

/**
 * 从榜单页 flight payload 中解析热门插件记录。
 *
 * 页面里每条记录以转义形式（\"key\":\"value\"）内嵌，按热门排序；记录开头是
 * `\"slug\":\"<name>\"`，完整记录含 stats/metadata（用于与页面其它短引用区分，
 * 要求窗口内出现 stargazers_count）。解析前 TOP_N 条。
 */
function parseHotRecords(html: string): MarketPlugin[] {
  const slugToken = `\\"slug\\":\\"`;
  const items: MarketPlugin[] = [];
  let from = 0;
  while (items.length < TOP_N) {
    const idx = html.indexOf(slugToken, from);
    if (idx < 0) break;
    from = idx + slugToken.length;
    const win = html.slice(idx, idx + 12000);
    if (!win.includes("stargazers_count")) continue; // 短引用，非完整记录
    const name = fieldOf(win, "slug");
    const p = recordFromWindow(win, name);
    if (!p) continue;
    p.rank = items.length + 1;
    items.push(p);
  }
  return items;
}

/**
 * 置顶插件的 slug（与客户端 plugin-reco.ts 的 PINNED 条目对应）。
 * 这些插件不一定在热门前 TOP_N 里，需从榜单页全量记录中额外解析，
 * 否则客户端拿不到它们的实时版本 / stars。
 */
const PINNED_SLUGS = ["dsh-file-workbench-lib", "dsh-prompt-library", "dsh-QQbot"];

/**
 * 置顶插件仓库（与客户端 plugin-reco.ts 的 PINNED_WB / PINNED_PLUGIN / PINNED_QQ 一一对应）。
 * 这三个插件展示在推荐位最前，其版本 / stars / 许可证以 GitHub 实时数据为准，
 * 市场站数据仅在网络不可达或限流时兜底（市场站收录版本常滞后于 GitHub 发布）。
 */
const PINNED_REPOS = [
  "master1Sun/dsh-file-workbench-lib",
  "master1Sun/dsh-prompt-library",
  "master1Sun/dsh-QQbot",
];

/** 从榜单页全量记录中解析置顶插件的完整记录（rank 置 0，排序由客户端负责）。 */
function parsePinnedRecords(html: string): MarketPlugin[] {
  const out: MarketPlugin[] = [];
  for (const slug of PINNED_SLUGS) {
    const token = `\\"slug\\":\\"${slug}\\"`;
    let from = 0;
    let found: MarketPlugin | null = null;
    while (!found) {
      const idx = html.indexOf(token, from);
      if (idx < 0) break;
      from = idx + token.length;
      const win = html.slice(idx, idx + 12000);
      if (!win.includes("stargazers_count")) continue; // 短引用，继续找下一个出现
      found = recordFromWindow(win, slug);
    }
    if (found) out.push(found);
  }
  return out;
}

/** 置顶插件的 GitHub 实时信息。 */
interface GithubInfo {
  /** 最新版本号（latest release 的 tag；无 release 时取最新 tag）。 */
  version: string;
  stars: number;
  license: string;
}

/** GitHub 信息缓存文件。 */
interface GithubCacheFile {
  fetchedAt: number;
  /** key 为「小写 owner/repo」。 */
  items: Record<string, GithubInfo>;
}

/** GET 一个 JSON 接口（GitHub API），非 200 或超时直接 reject。 */
function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = httpsGet(
      url,
      {
        headers: {
          "user-agent": "dsh-prompt-library",
          accept: "application/vnd.github+json",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (e) {
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        });
        res.on("error", reject);
      },
    );
    req.setTimeout(GITHUB_TIMEOUT_MS, () => {
      req.destroy(new Error(`timeout after ${GITHUB_TIMEOUT_MS}ms for ${url}`));
    });
    req.on("error", reject);
  });
}

/**
 * 拉取单个仓库的实时信息：
 * - stars / license 取 `GET /repos/{repo}`；
 * - 版本取 `GET /repos/{repo}/releases/latest`，无 release（404）时退化为最新 tag。
 * 任一环节失败返回 null，由调用方沿用兜底值。
 */
async function fetchGithubInfo(repo: string): Promise<GithubInfo | null> {
  try {
    const meta = (await fetchJson(`https://api.github.com/repos/${repo}`)) as {
      stargazers_count?: number;
      license?: { spdx_id?: string | null } | null;
    };
    let version = "";
    try {
      const rel = (await fetchJson(
        `https://api.github.com/repos/${repo}/releases/latest`,
      )) as { tag_name?: string };
      version = bareVersion(rel.tag_name ?? "");
    } catch {
      try {
        const tags = (await fetchJson(
          `https://api.github.com/repos/${repo}/tags?per_page=1`,
        )) as Array<{ name?: string }>;
        version = bareVersion(Array.isArray(tags) ? tags[0]?.name ?? "" : "");
      } catch {
        version = "";
      }
    }
    const spdx = meta.license?.spdx_id ?? "";
    return {
      version,
      stars: typeof meta.stargazers_count === "number" ? meta.stargazers_count : 0,
      license: spdx && spdx !== "NOASSERTION" ? spdx : "—",
    };
  } catch (err) {
    console.error(
      "[plugin-market] github fetch failed:",
      repo,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/** 读取 GitHub 信息缓存（损坏返回 null）。 */
async function readGithubCache(): Promise<GithubCacheFile | null> {
  try {
    const raw = await readFile(pluginGithubCachePath(), "utf8");
    const parsed = JSON.parse(raw) as GithubCacheFile;
    if (parsed && typeof parsed.fetchedAt === "number" && parsed.items) return parsed;
  } catch {
    /* 无缓存 / 损坏 */
  }
  return null;
}

/** 写 GitHub 信息缓存（失败静默忽略）。 */
async function writeGithubCache(cache: GithubCacheFile): Promise<void> {
  try {
    const p = pluginGithubCachePath();
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, JSON.stringify(cache), "utf8");
  } catch {
    /* 忽略写入失败 */
  }
}

/** in-flight 去重：并发请求共享同一次 GitHub 抓取。 */
let githubInflight: Promise<GithubCacheFile> | null = null;

/** 实际执行 GitHub 抓取：TTL 内走缓存，失败项沿用上一次缓存值。 */
async function doFetchGithub(force: boolean): Promise<GithubCacheFile> {
  const cached = await readGithubCache();
  if (!force && cached && Date.now() - cached.fetchedAt < GITHUB_TTL_MS) return cached;
  const entries = await Promise.all(
    PINNED_REPOS.map(async (repo) =>
      [repo, await fetchGithubInfo(repo)] as const,
    ),
  );
  const items: Record<string, GithubInfo> = { ...(cached?.items ?? {}) };
  for (const [repo, info] of entries) {
    if (info) items[repo.toLowerCase()] = info;
  }
  const out: GithubCacheFile = { fetchedAt: Date.now(), items };
  await writeGithubCache(out);
  return out;
}

/** 获取置顶插件的 GitHub 实时信息（版本 / stars / 许可证）。 */
function fetchPinnedGithub(force: boolean): Promise<GithubCacheFile> {
  if (!githubInflight) {
    githubInflight = doFetchGithub(force).finally(() => {
      githubInflight = null;
    });
  }
  return githubInflight;
}

/**
 * 把 GitHub 实时信息合并进榜单条目：
 * 榜单里已有该仓库则覆盖版本 / stars / 许可证；没有则按仓库构造一条最小条目
 * （名称与简介留空，客户端会用 i18n 文案填充）。
 */
function mergeGithub(items: MarketPlugin[], gh: GithubCacheFile | null): MarketPlugin[] {
  if (!gh || Object.keys(gh.items).length === 0) return items;
  const out = items.map((p) => ({ ...p }));
  for (const repo of PINNED_REPOS) {
    const info = gh.items[repo.toLowerCase()];
    if (!info) continue;
    const idx = out.findIndex((p) => p.id.toLowerCase() === repo.toLowerCase());
    if (idx >= 0) {
      const cur = out[idx] as MarketPlugin;
      out[idx] = {
        ...cur,
        version: info.version || cur.version,
        stars: info.stars > 0 ? info.stars : cur.stars,
        license: info.license && info.license !== "—" ? info.license : cur.license,
      };
      continue;
    }
    out.push({
      id: repo,
      name: "",
      desc: "",
      version: info.version || "—",
      license: info.license || "—",
      repo: `https://github.com/${repo}`,
      cloneCmd: `git clone --depth 1 https://github.com/${repo}.git`,
      dshCmd: `dsh plugin --profile web add "github:${repo}"`,
      stars: info.stars,
      verified: true,
      rank: 0,
    });
  }
  return out;
}

interface MarketCacheFile {
  fetchedAt: number;
  items: MarketPlugin[];
}

/** 读取磁盘缓存（损坏返回 null）。 */
async function readCache(): Promise<MarketCacheFile | null> {
  try {
    const raw = await readFile(pluginMarketCachePath(), "utf8");
    const parsed = JSON.parse(raw) as MarketCacheFile;
    if (parsed && Array.isArray(parsed.items) && typeof parsed.fetchedAt === "number") {
      return parsed;
    }
  } catch {
    /* 无缓存 / 损坏 */
  }
  return null;
}

/** 写磁盘缓存（失败静默忽略）。 */
async function writeCache(cache: MarketCacheFile): Promise<void> {
  try {
    const p = pluginMarketCachePath();
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, JSON.stringify(cache), "utf8");
  } catch {
    /* 忽略写入失败 */
  }
}

/** in-flight 去重：并发请求共享同一次抓取。 */
let inflight: Promise<MarketResult> | null = null;

/** 实际执行抓取流程。 */
async function doFetch(force: boolean): Promise<MarketResult> {
  const cached = await readCache();
  const market = await fetchMarketList(force, cached);
  // 置顶插件的版本 / stars / 许可证以 GitHub 实时数据为准（市场站收录常滞后）。
  // force 时同步强行刷新；否则按 GitHub 自身的 TTL（30 分钟）决定是否回源。
  const gh = await fetchPinnedGithub(force).catch(() => null);
  return { ...market, items: mergeGithub(market.items, gh) };
}

/** 抓取榜单本体：TTL 内走磁盘缓存 → 实时抓 dsh-plugin.org → 失败回退缓存 / 内置。 */
async function fetchMarketList(
  force: boolean,
  cached: MarketCacheFile | null,
): Promise<MarketResult> {
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { source: "cache", fetchedAt: cached.fetchedAt, items: cached.items };
  }
  try {
    const html = await fetchPage(HOT_LIST_URL, LIST_TIMEOUT_MS);
    const hot = parseHotRecords(html);
    if (hot.length === 0) throw new Error("hot list empty");
    // 置顶插件的完整记录（不在热门前 N 也能取到实时版本 / stars）；去重后追加
    const hotIds = new Set(hot.map((p) => p.id));
    const pinned = parsePinnedRecords(html).filter((p) => !hotIds.has(p.id));
    const items = [...hot, ...pinned];
    const cache: MarketCacheFile = { fetchedAt: Date.now(), items };
    await writeCache(cache);
    return { source: "live", fetchedAt: cache.fetchedAt, items };
  } catch (err) {
    console.error("[plugin-market] fetch failed:", err instanceof Error ? err.message : err);
    if (cached) return { source: "cache", fetchedAt: cached.fetchedAt, items: cached.items };
    return { source: "builtin", fetchedAt: 0, items: BUILTIN_ITEMS };
  }
}

/**
 * 获取插件市场热门榜单：
 * 1. TTL 内且非强制刷新 → 磁盘缓存（cache）；
 * 2. 否则实时抓 dsh-plugin.org 榜单页并解析热门记录（live）后写缓存；
 * 3. 抓取失败 → 磁盘缓存（cache）；无缓存 → 内置兜底（builtin）。
 */
export function fetchPluginMarket(force = false): Promise<MarketResult> {
  if (!inflight) {
    inflight = doFetch(force).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
