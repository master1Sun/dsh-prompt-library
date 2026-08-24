/**
 * 新版本检查与自动更新（host 侧共享）。
 *
 * 双通道检测：
 * - npm registry（正式版通道）：@sunjuntao/dsh-prompt-library 的 latest 版本；
 * - GitHub Releases（测试版通道）：master1Sun/dsh-prompt-library 的所有 release（含预发布）
 *   中版本号最大的那条。
 *
 * 组合策略：
 * - GitHub 测试版严格高于 npm 正式版 → 提示用户「有新的测试版，点击更新」（手动更新）；
 * - npm 正式版高于当前版本 → 后台静默自动更新，不打扰用户；
 * - 两个版本号一致时以正式版（npm）为准，不当作测试版提示；
 * - 两个源都访问不到 → 不做任何处理。
 *
 * 结果在内存缓存 24 小时；任何失败都静默降级，不影响插件其它功能。
 */
import { get as httpsGet } from "node:https";
import type { IncomingMessage } from "node:http";
import { readFileSync } from "node:fs";
import { exec } from "node:child_process";

/** npm registry 中本包的 latest 端点（scoped 包需把 `/` 编码为 `%2f`）。 */
const REGISTRY_URL = "https://registry.npmjs.org/@sunjuntao%2fdsh-prompt-library/latest";
/** GitHub Releases 列表端点（含预发布；返回后在本模块内筛选版本号最大的一条，tag 即版本号）。 */
const GITHUB_API_URL = "https://api.github.com/repos/master1Sun/dsh-prompt-library/releases";
/** 版本检查结果的缓存时长。 */
const CACHE_MS = 24 * 60 * 60 * 1000;
/** 请求外网（npm / github）的超时。 */
const REQUEST_TIMEOUT_MS = 8000;

/** 版本检查结果：当前版本、npm 正式版最新、GitHub 测试版、是否有更新。 */
export interface UpdateInfo {
  current: string;
  /** npm 正式版最新版本（npm 不可用时退化为 GitHub 版本）。 */
  latest: string;
  /** 是否有正式版更新（npm > current，触发后台静默自动更新）。 */
  hasUpdate: boolean;
  /** GitHub 测试版最新版本号（无 release 或不可用时与 latest 一致）。 */
  betaLatest: string;
  /** 是否有测试版更新（GitHub 严格高于 npm 正式版，提示用户手动更新）。 */
  hasBeta: boolean;
}

/** 上次的检查结果缓存（成功则长缓存；失败给短缓存，避免频繁重试外网）。 */
let cache: { at: number; info: UpdateInfo; ttl: number } | null = null;

/** 读取本地 package.json 的当前版本号。 */
function currentVersion(): string {
  try {
    // lib/index.js 的上一级即包根目录，package.json 与 lib 同级。
    const pkgPath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    return typeof pkg.version === "string" && pkg.version ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** 简单 semver 比较：a > b 返回正数，a < b 返回负数，相等返回 0。 */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** 从「release tag」字符串提取主版本号 `x.y.z`；无法识别返回 null。 */
function extractVersion(raw: string): string | null {
  const m = raw.match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

/** 通用 GET JSON 请求：发起请求、校验 2xx、解析 JSON。 */
function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = httpsGet(url, { headers }, (res: IncomingMessage) => {
      const code = res.statusCode ?? 0;
      if (code < 200 || code >= 300) {
        res.resume();
        reject(new Error(`responded ${code}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
      res.on("error", reject);
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

/** 请求 npm registry 的 latest 元数据，返回最新正式版版本号。 */
async function fetchLatestVersion(): Promise<string> {
  const body = (await fetchJson(REGISTRY_URL, { accept: "application/json" })) as {
    version?: unknown;
  };
  if (typeof body.version !== "string" || !body.version) {
    throw new Error("registry had no version");
  }
  return body.version;
}

/** 请求 GitHub Releases 列表，筛选出版本号最大的一条（含预发布测试版）；无可用 release 返回空串。 */
async function fetchGithubLatestVersion(): Promise<string> {
  // GitHub API 强制要求 User-Agent，否则返回 403
  const body = (await fetchJson(GITHUB_API_URL, {
    accept: "application/vnd.github+json",
    "user-agent": "dsh-prompt-library-updater",
  })) as Array<{ tag_name?: unknown; draft?: unknown }>;
  if (!Array.isArray(body)) return "";
  const releases = body;
  if (releases.length === 0) return "";
  // 草稿不纳入（公开 API 通常不返回草稿，这里保险起见跳过）；其余 release 一律参与比较，
  // 取 tag 版本号最大的那条作为 GitHub 通道版本。这样预发布测试版也能被检测到。
  let best = "";
  for (const r of releases) {
    if (typeof r.tag_name !== "string" || r.draft === true) continue;
    const v = extractVersion(r.tag_name);
    if (v && (!best || compareVersions(v, best) > 0)) best = v;
  }
  return best;
}

/**
 * 检查插件是否有新版本（npm 正式版 + GitHub 测试版双通道）。
 * @param force 是否忽略缓存强制重新请求（默认 false）。
 */
export async function checkUpdate(force = false): Promise<UpdateInfo> {
  const now = Date.now();
  const current = currentVersion();
  if (!force && cache && now - cache.at < cache.ttl) return cache.info;

  const [npmRes, ghRes] = await Promise.allSettled([
    fetchLatestVersion(),
    fetchGithubLatestVersion(),
  ]);
  const npm = npmRes.status === "fulfilled" ? npmRes.value : null;
  const gh = ghRes.status === "fulfilled" ? ghRes.value || null : null;

  // 两个源都访问不到（或 GitHub 无 release 且 npm 不可用）→ 不做任何处理
  if (!npm && !gh) {
    const info: UpdateInfo = { current, latest: current, hasUpdate: false, betaLatest: current, hasBeta: false };
    cache = { at: now, info, ttl: CACHE_MS / 2 };
    return info;
  }

  // 测试版判定：仅当 GitHub 存在且严格同时高于 npm 正式版与当前已装版本，才提示「有新的测试版」。
  // 两版本号一致时以正式版（npm）为准，不当作测试版；当前已装版本已不低于测试版时亦不提示。
  // 若 npm 不可达但 GitHub 有新版本，此时只有测试通道可用，同样提示用户手动更新。
  const hasBeta =
    npm && gh
      ? compareVersions(gh, npm) > 0 && compareVersions(gh, current) > 0
      : !!gh && compareVersions(gh, current) > 0;

  // 正式版更新：以 npm 为准（npm 不可达时退化为 GitHub 最新），高于当前版本即触发静默自动更新
  const latest = npm ?? gh ?? current;
  const hasUpdate = compareVersions(latest, current) > 0;

  const info: UpdateInfo = {
    current,
    latest,
    hasUpdate,
    betaLatest: gh ?? latest,
    hasBeta,
  };
  cache = { at: now, info, ttl: CACHE_MS };
  return info;
}

/** 升级命令的超时（毫秒）：给 dsh 安装插件留足够时间。 */
const UPGRADE_TIMEOUT_MS = 180_000;

/**
 * 执行「更新插件」命令行，把插件安装/升级到指定版本。
 *
 * 不传 target 时自动选择：存在测试版 → 升到 GitHub 测试版；否则升到 npm 正式版。
 * 命令默认用 `dsh plugin --profile <platform> add <包名>@<版本>`；桌面端平台名由 env
 * `DSH_PLUGIN_PROFILE` 覆盖（如 desktop）。若需完全自定义整条命令，可设 env `DSH_PLUGIN_UPGRADE_CMD`。
 * 返回 { ok, output }；任何异常都不抛出，仅置 ok=false。
 */
export async function upgradePlugin(target?: string): Promise<{ ok: boolean; output: string }> {
  const profile = process.env.DSH_PLUGIN_PROFILE || "web";
  const pkg = "@sunjuntao/dsh-prompt-library";
  let version = target;
  if (!version) {
    try {
      const info = await checkUpdate(true); // 强制刷新，确保拿到最新版本信息
      if (info.hasBeta && /^\d+\.\d+\.\d+/.test(info.betaLatest)) version = info.betaLatest;
      else if (/^\d+\.\d+\.\d+/.test(info.latest)) version = info.latest;
    } catch {
      /* 拿不到版本就安装 latest 标签 */
    }
  }
  const targetStr = version && /^\d+\.\d+\.\d+/.test(version) ? `${pkg}@${version}` : pkg;
  const cmd = process.env.DSH_PLUGIN_UPGRADE_CMD || `dsh plugin --profile ${profile} add ${targetStr}`;
  return new Promise((resolve) => {
    exec(cmd, { timeout: UPGRADE_TIMEOUT_MS }, (err, stdout, stderr) => {
      const output = (stdout + (stderr ? `\n${stderr}` : "")).trim().slice(0, 1000);
      if (err) {
        resolve({ ok: false, output: output || String(err) });
        return;
      }
      // 升级成功后使版本缓存失效：下次检查会重新请求 registry，避免旧缓存让红点持续亮
      cache = null;
      resolve({ ok: true, output });
    });
  });
}

/** 静默自动更新的并发锁：避免启动检查与每日定时（或手动升级）重叠执行。 */
let autoUpdating = false;

/**
 * 每日（含服务启动）的静默版本检查与自动更新。
 * - 正式版（npm）有更新且无测试版提示 → 后台静默升级，不打扰用户；
 * - 存在测试版 → 留给用户手动点击更新，不做自动安装；
 * - 两个源都不可达 → 什么都不做。
 */
export async function autoUpdateDaily(): Promise<void> {
  if (autoUpdating) return;
  autoUpdating = true;
  try {
    const info = await checkUpdate(true);
    if (info.hasUpdate && !info.hasBeta) await upgradePlugin(info.latest);
  } catch {
    /* 静默失败，不影响主流程 */
  } finally {
    autoUpdating = false;
  }
}
