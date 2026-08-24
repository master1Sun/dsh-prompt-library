/**
 * 新版本检查与自动更新（host 侧共享）。
 *
 * 三通道检测：
 * - npm registry（正式版通道）：@sunjuntao/dsh-prompt-library 的 latest 版本；
 * - GitHub Releases 正式版（非预发布）；
 * - GitHub Releases 测试版（预发布）。
 *
 * 组合策略：
 * - 加入体验计划（默认勾选）：优先 npm → GitHub 正式版 → 测试版；npm 与 GitHub 正式版有更新即后台静默，
 *   仅「最新测试版」以红点提示手动点击更新；
 * - 未加入体验计划：保持之前逻辑——npm 正式版更新静默；GitHub 任一版本领先 npm 即红点手动更新；
 * - 两个源都访问不到 → 不做任何处理。
 *
 * 结果在内存缓存 24 小时；任何失败都静默降级，不影响插件其它功能。
 */
import { get as httpsGet } from "node:https";
import type { IncomingMessage } from "node:http";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { exec } from "node:child_process";
import { dirname, join } from "node:path";
import { getSettings, readGlobalLocale } from "./store.js";
import { logDir } from "./paths.js";

/** npm registry 中本包的 latest 端点（scoped 包需把 `/` 编码为 `%2f`）。 */
const REGISTRY_URL = "https://registry.npmjs.org/@sunjuntao%2fdsh-prompt-library/latest";
/** GitHub Releases 列表端点（含预发布；返回后在本模块内筛选版本号最大的一条，tag 即版本号）。 */
const GITHUB_API_URL = "https://api.github.com/repos/master1Sun/dsh-prompt-library/releases";
/** GitHub 仓库（owner/repo），用于测试版走 git 安装命令时的 `github:` 引用。 */
const GITHUB_REPO = "master1Sun/dsh-prompt-library";
/** 版本检查结果的缓存时长。 */
const CACHE_MS = 24 * 60 * 60 * 1000;
/** 请求外网（npm / github）的超时。 */
const REQUEST_TIMEOUT_MS = 8000;

/** 版本检查结果：当前版本、待更新版本、是否静默更新、GitHub 测试版、是否有红点更新。 */
export interface UpdateInfo {
  current: string;
  /** 待静默更新的版本（体验计划：npm / GitHub 正式版中更高者；未加入：npm 或 GitHub 更高者）。 */
  latest: string;
  /** 是否有正式版更新（latest > current，触发后台静默自动更新）。 */
  hasUpdate: boolean;
  /** 红点可手动更新的测试版/领先版本号（无则与 latest 一致）。 */
  betaLatest: string;
  /** 是否有红点手动更新（体验计划：仅最新测试版；未加入：GitHub 版本领先 npm）。 */
  hasBeta: boolean;
  /** 安装 latest 时用的 GitHub release tag（如 v0.9.0）。为空表示 latest 来自 npm，走 npm 命令。 */
  gitTag: string;
  /** 安装测试版（betaLatest）时用的 GitHub release tag（如 v0.9.0-beta1）。无测试版时为空串。 */
  betaTag: string;
}

/** 上次的检查结果缓存（成功则长缓存；失败给短缓存，避免频繁重试外网）。 */
let cache: { at: number; info: UpdateInfo; ttl: number } | null = null;

/** 两位数字补零（如 3 → "03"）。 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 系统时区（本地）时间戳，格式 YYYY-MM-DD HH:mm:ss。 */
function localTime(): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return `${date} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** 版本日志的文案模板（按语言返回格式化函数），zh / en 双语同步维护。 */
interface VersionLogCopy {
  /** 版本比对原始信息。 */
  check: (cur: string, npm: string, ghO: string, ghT: string, exp: boolean) => string;
  /** 无可用更新源。 */
  noSource: string;
  /** 体验计划勾选结果。 */
  expResult: (latest: string, hasUpdate: boolean, hasBeta: boolean, beta: string) => string;
  /** 未加入体验计划（普通）结果。 */
  normalResult: (latest: string, hasUpdate: boolean, hasBeta: boolean, beta: string) => string;
  /** 开始升级。 */
  upgradeStart: (target: string, cmd: string) => string;
  /** 升级失败。 */
  upgradeFail: (out: string) => string;
  /** 升级成功。 */
  upgradeOk: string;
  /** 静默升级到某版本。 */
  silentTo: (v: string) => string;
  /** 静默无需升级。 */
  silentSkip: (hasUpdate: boolean, hasBeta: boolean, latest: string) => string;
  /** 静默异常。 */
  silentErr: (msg: string) => string;
}

/** 构建版本日志文案（按语言）。 */
function buildVersionLogCopy(lang: string): VersionLogCopy {
  const zh = lang === "zh";
  const on = zh ? "勾选" : "enabled";
  const off = zh ? "未勾选" : "disabled";
  const yes = zh ? "是" : "yes";
  const no = zh ? "否" : "no";

  const bool = (b: boolean) => (b ? yes : no);

  if (zh) {
    return {
      check: (cur, npm, ghO, ghT, exp) =>
        `版本检查 当前=${cur} npm=${npm} git正式=${ghO} git测试=${ghT} 体验计划=${exp ? on : off}`,
      noSource: "版本检查 无可用更新源，跳过",
      expResult: (latest, hasUpdate, hasBeta, beta) =>
        `版本检查 体验计划结果 latest=${latest} hasUpdate=${bool(hasUpdate)} hasBeta=${bool(hasBeta)} betaLatest=${beta}`,
      normalResult: (latest, hasUpdate, hasBeta, beta) =>
        `版本检查 普通结果 latest=${latest} hasUpdate=${bool(hasUpdate)} hasBeta=${bool(hasBeta)} betaLatest=${beta}`,
      upgradeStart: (target, cmd) => `开始升级 目标=${target} 命令=${cmd}`,
      upgradeFail: (out) => `升级失败 ${out}`,
      upgradeOk: "升级成功，已清除版本检查缓存",
      silentTo: (v) => `静默自动更新 升级到 ${v}`,
      silentSkip: (hasUpdate, hasBeta, latest) =>
        `静默自动更新 无需自动升级 (hasUpdate=${bool(hasUpdate)} hasBeta=${bool(hasBeta)} latest=${latest})`,
      silentErr: (msg) => `静默自动更新 异常 ${msg}`,
    };
  }
  return {
    check: (cur, npm, ghO, ghT, exp) =>
      `Version check current=${cur} npm=${npm} git-official=${ghO} git-test=${ghT} experience=${exp ? on : off}`,
    noSource: "Version check no available update source, skipped",
    expResult: (latest, hasUpdate, hasBeta, beta) =>
      `Version check experience result latest=${latest} hasUpdate=${bool(hasUpdate)} hasBeta=${bool(hasBeta)} betaLatest=${beta}`,
    normalResult: (latest, hasUpdate, hasBeta, beta) =>
      `Version check normal result latest=${latest} hasUpdate=${bool(hasUpdate)} hasBeta=${bool(hasBeta)} betaLatest=${beta}`,
    upgradeStart: (target, cmd) => `Upgrade starting target=${target} command=${cmd}`,
    upgradeFail: (out) => `Upgrade failed ${out}`,
    upgradeOk: "Upgrade succeeded, update cache cleared",
    silentTo: (v) => `Silent auto-update upgrading to ${v}`,
    silentSkip: (hasUpdate, hasBeta, latest) =>
      `Silent auto-update no upgrade needed (hasUpdate=${bool(hasUpdate)} hasBeta=${bool(hasBeta)} latest=${latest})`,
    silentErr: (msg) => `Silent auto-update error ${msg}`,
  };
}

/** 追加一行到版本检查日志 ~/.dsh/prompt-library/log/version.log；写日志失败绝不影响主流程。 */
function logVersion(msg: string): void {
  try {
    const logPath = join(logDir(), "version.log");
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, `[${localTime()}] ${msg}\n`);
  } catch {
    /* 忽略 */
  }
}

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

/** GitHub 通道的两个版本：正式版（非预发布）与测试版（预发布）各自的最高版本；无则空串。 */
interface GithubVersions {
  official: string;
  /** 最高正式版对应的完整 release tag（如 v0.9.0）；无正式版时为空串。 */
  officialTag: string;
  test: string;
  /** 最高测试版对应的完整 release tag（如 v0.9.0-beta1）；无测试版时为空串。 */
  testTag: string;
}

/**
 * 请求 GitHub Releases 列表，分别取最高正式版与最高测试版；无可用 release 返回空串。
 * 草稿不纳入（公开 API 通常不返回草稿，这里保险起见跳过）。
 */
async function fetchGithubVersions(): Promise<GithubVersions> {
  // GitHub API 强制要求 User-Agent，否则返回 403
  const body = (await fetchJson(GITHUB_API_URL, {
    accept: "application/vnd.github+json",
    "user-agent": "dsh-prompt-library-updater",
  })) as Array<{ tag_name?: unknown; draft?: unknown; prerelease?: unknown }>;
  const result: GithubVersions = { official: "", officialTag: "", test: "", testTag: "" };
  if (!Array.isArray(body)) return result;
  for (const r of body) {
    if (typeof r.tag_name !== "string" || r.draft === true) continue;
    const v = extractVersion(r.tag_name);
    if (!v) continue;
    // 预发布视为测试版；其余视为正式版（两通道各自取版本号最大的一条）
    if (r.prerelease === true) {
      if (compareVersions(v, result.test) > 0) {
        result.test = v;
        result.testTag = r.tag_name;
      }
    } else if (compareVersions(v, result.official) > 0) {
      result.official = v;
      result.officialTag = r.tag_name;
    }
  }
  return result;
}

/** 依据版本号取对应的 GitHub tag；非 git 版本或匹配不上返回空串。 */
function gitTagFor(gh: GithubVersions | null, v: string): string {
  if (!v || !gh) return "";
  if (gh.test && v === gh.test) return gh.testTag;
  if (gh.official && v === gh.official) return gh.officialTag;
  return "";
}

/** 读取「加入体验计划」开关；读取失败按未勾选处理。 */
async function isExperienceProgramEnabled(): Promise<boolean> {
  try {
    const s = await getSettings();
    return s.experienceProgramEnabled ?? false;
  } catch {
    return false;
  }
}

/**
 * 检查插件是否有新版本（npm 正式版 + GitHub 测试版双通道）。
 * @param force 是否忽略缓存强制重新请求（默认 false）。
 */
export async function checkUpdate(force = false): Promise<UpdateInfo> {
  const now = Date.now();
  const current = currentVersion();
  if (!force && cache && now - cache.at < cache.ttl) return cache.info;

  // 是否加入体验计划：决定「GitHub 正式版 / 测试版」如何被对待
  const betaEnabled = await isExperienceProgramEnabled();
  const vlog = buildVersionLogCopy(await readGlobalLocale());

  const [npmRes, ghRes] = await Promise.allSettled([
    fetchLatestVersion(),
    fetchGithubVersions(),
  ]);
  const npm = npmRes.status === "fulfilled" ? npmRes.value : null;
  const gh = ghRes.status === "fulfilled" ? ghRes.value : null;
  const ghOfficial = gh?.official || "";
  const ghTest = gh?.test || "";

  // 记录本次版本比对原始信息（系统时区时间戳）
  logVersion(vlog.check(current, npm || "-", ghOfficial || "-", ghTest || "-", betaEnabled));

  // 所有源都访问不到（或均无可用版本）→ 不做任何处理
  if (!npm && !ghOfficial && !ghTest) {
    logVersion(vlog.noSource);
    const info: UpdateInfo = { current, latest: current, hasUpdate: false, betaLatest: current, hasBeta: false, gitTag: "", betaTag: "" };
    cache = { at: now, info, ttl: CACHE_MS / 2 };
    return info;
  }

  if (betaEnabled) {
    // —— 已加入体验计划：优先 npm → GitHub 正式版 → 测试版 ——
    // npm 与 GitHub 正式版都走静默自动更新；只有预发布「最新测试版」才以红点提示手动点击更新。
    // 稳定通道版本 = npm 与 GitHub 正式版中更高者。
    const stable = (() => {
      const a = npm || "";
      const b = ghOfficial;
      if (a && b) return compareVersions(a, b) >= 0 ? a : b;
      return a || b || "";
    })();
    // 正式版更新（静默）：稳定通道高于当前版本。
    const hasUpdate = !!stable && compareVersions(stable, current) > 0;
    // 测试版（红点手动）：仅当预发布「最新测试版」既高于当前版本、又高于全部稳定通道时才提示，
    // 以免与已静默覆盖的正式版重复打扰。
    const hasBeta =
      !!ghTest &&
      compareVersions(ghTest, current) > 0 &&
      compareVersions(ghTest, stable || current) > 0;
    const latest = hasUpdate ? stable : hasBeta ? ghTest : current;
    // 稳定通道是否来自 GitHub 正式版（npm 缺失或 GitHub 正式版更高 → 用 git 安装）
    const stableIsGit = !!ghOfficial && (!npm || compareVersions(ghOfficial, npm) > 0);
    const info: UpdateInfo = {
      current,
      latest,
      hasUpdate,
      betaLatest: hasBeta ? ghTest : latest,
      hasBeta,
      // 静默安装的目标（latest）若来自 GitHub（正式或测试版），带上其 tag 改走 git 命令；来自 npm 则留空走 npm
      gitTag: hasUpdate
        ? stableIsGit
          ? gh?.officialTag || ""
          : ""
        : hasBeta
          ? gh?.testTag || ""
          : "",
      // 红点手动更新的测试版：GitHub 预发布 → git 命令
      betaTag: hasBeta ? gh?.testTag || "" : "",
    };
    logVersion(vlog.expResult(latest, hasUpdate, hasBeta, info.betaLatest));
    cache = { at: now, info, ttl: CACHE_MS };
    return info;
  }

  // —— 未加入体验计划：保持之前逻辑不变 ——
  // GitHub 通道版本取正式版 / 测试版中更高者；npm 正式版更新静默，GitHub 任一版本领先 npm 时红点手动更新。
  const ghAny = compareVersions(ghOfficial, ghTest) >= 0 ? ghOfficial : ghTest;
  const hasBeta =
    npm && ghAny
      ? compareVersions(ghAny, npm) > 0 && compareVersions(ghAny, current) > 0
      : !!ghAny && compareVersions(ghAny, current) > 0;
  const latest = npm ?? (ghAny || current);
  const hasUpdate = compareVersions(latest, current) > 0;

  const info: UpdateInfo = {
    current,
    latest,
    hasUpdate,
    betaLatest: ghAny || latest,
    hasBeta,
    // 未加入体验计划：静默安装版本 latest 来自 npm 则走 npm；若 npm 不可用改用 GitHub 版本则走 git。
    // 红点手动更新的 GitHub 版本（ghAny，正式或测试）也走 git 命令。
    gitTag: gitTagFor(gh, latest),
    betaTag: hasBeta ? gitTagFor(gh, ghAny) : "",
  };
  logVersion(vlog.normalResult(latest, hasUpdate, hasBeta, info.betaLatest));
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
export async function upgradePlugin(target?: string, gitRef = ""): Promise<{ ok: boolean; output: string }> {
  const profile = process.env.DSH_PLUGIN_PROFILE || "web";
  const pkg = "@sunjuntao/dsh-prompt-library";
  let version = target;
  // git 版本（GitHub 正式/测试）用 github: 方式安装时的 ref（如 v0.9.0 / v0.9.0-beta1）；为空表示走 npm。
  if (!version) {
    try {
      const info = await checkUpdate(true); // 强制刷新，确保拿到最新版本信息
      // 有红点手动更新（多为 GitHub 测试版）优先装它；否则装 latest
      if (info.hasBeta && /^\d+\.\d+\.\d+/.test(info.betaLatest)) {
        version = info.betaLatest;
        gitRef = info.betaTag || "";
      } else if (/^\d+\.\d+\.\d+/.test(info.latest)) {
        version = info.latest;
        gitRef = info.gitTag || "";
      }
    } catch {
      /* 拿不到版本就安装 latest 标签 */
    }
  }
  const targetStr = version && /^\d+\.\d+\.\d+/.test(version) ? `${pkg}@${version}` : pkg;
  // 只要是 git 版本（带 gitTag/betaTag）就走 github: 安装命令；其余（npm）保持 npm 命令。
  // 二者都可通过 DSH_PLUGIN_UPGRADE_CMD 完全自定义整条命令（优先级最高）。
  const cmd =
    process.env.DSH_PLUGIN_UPGRADE_CMD ||
    (gitRef
      ? `dsh plugin --profile ${profile} add github:${GITHUB_REPO}#${gitRef}`
      : `dsh plugin --profile ${profile} add ${targetStr}`);
  const vlog = buildVersionLogCopy(await readGlobalLocale());
  logVersion(vlog.upgradeStart(version || pkg, cmd));
  return new Promise((resolve) => {
    exec(cmd, { timeout: UPGRADE_TIMEOUT_MS }, (err, stdout, stderr) => {
      const output = (stdout + (stderr ? `\n${stderr}` : "")).trim().slice(0, 1000);
      if (err) {
        logVersion(vlog.upgradeFail(output || String(err)));
        resolve({ ok: false, output: output || String(err) });
        return;
      }
      // 升级成功后使版本缓存失效：下次检查会重新请求 registry，避免旧缓存让红点持续亮
      cache = null;
      logVersion(vlog.upgradeOk);
      resolve({ ok: true, output });
    });
  });
}

/** 静默自动更新的并发锁：避免启动检查与每日定时（或手动升级）重叠执行。 */
let autoUpdating = false;

/**
 * 每日（含服务启动）的静默版本检查与自动更新。
 * - 已加入体验计划：正式版（npm / GitHub 正式版）有更新即后台静默升级；测试版留给红点手动更新。
 * - 未加入体验计划：保持之前逻辑——正式版有更新且无测试版提示 → 后台静默；存在测试版 → 按红点手动。
 * - 两个源都不可达 → 什么都不做。
 */
export async function autoUpdateDaily(): Promise<void> {
  if (autoUpdating) return;
  autoUpdating = true;
  try {
    const info = await checkUpdate(true);
    // 已加入体验计划：只静默安装稳定通道（latest 已按 npm / GitHub 正式版取最高）；测试版由红点手动。
    // 未加入体验计划：仅当正式版有更新且无测试版（hasBeta）才静默，测试版同样留给红点手动。
    const betaEnabled = await isExperienceProgramEnabled();
    const silent = betaEnabled ? info.hasUpdate : info.hasUpdate && !info.hasBeta;
    const vlog = buildVersionLogCopy(await readGlobalLocale());
    if (silent && info.latest && /^\d+\.\d+\.\d+/.test(info.latest)) {
      logVersion(vlog.silentTo(info.latest));
      await upgradePlugin(info.latest, info.gitTag);
    } else {
      logVersion(vlog.silentSkip(info.hasUpdate, info.hasBeta, info.latest));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logVersion(buildVersionLogCopy(await readGlobalLocale().catch(() => "")).silentErr(msg));
    /* 静默失败，不影响主流程 */
  } finally {
    autoUpdating = false;
  }
}
