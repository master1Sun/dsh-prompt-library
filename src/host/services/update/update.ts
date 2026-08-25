/**
 * 新版本检查与自动更新（host 侧共享）。
 *
 * 版本来源（双通道，仅这两个外部源）：
 * - npm registry（主通道，优先）：@sunjuntao/dsh-prompt-library 的 latest 版本；
 * - GitHub Releases（兜底通道）：仓库 latest release 的 tag 作为版本号，npm 不可达时使用；
 *   安装该来源的更新走 `github:<repo>#<tag>`。
 *
 * 自动更新由设置项「自动更新」控制：开启时发现新版本即后台静默安装；关闭则完全不动。
 *
 * 结果在内存缓存 24 小时；任何失败都静默降级，不影响插件其它功能。
 */
import { get as httpsGet } from "node:https";
import type { IncomingMessage } from "node:http";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { exec } from "node:child_process";
import { dirname, join } from "node:path";
import { getSettings, readGlobalLocale } from "../data/store.js";
import { logDir } from "../../utils/paths.js";

/** npm registry 中本包的 latest 端点（scoped 包需把 `/` 编码为 `%2f`）。 */
const REGISTRY_URL = "https://registry.npmjs.org/@sunjuntao%2fdsh-prompt-library/latest";
/** GitHub 仓库（owner/repo），用于读 latest release tag 及 `github:` 安装引用。 */
const GITHUB_REPO = "master1Sun/dsh-prompt-library";
/** GitHub latest release 接口：取最新发布 tag 作为兜底版本号。 */
const GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
/** 版本检查结果的缓存时长。 */
const CACHE_MS = 24 * 60 * 60 * 1000;
/** 请求外网（npm / github）的超时。 */
const REQUEST_TIMEOUT_MS = 8000;

/** 版本检查结果：当前版本、待更新版本、更新来源及其安装方式。 */
export interface UpdateInfo {
  current: string;
  /** 可更新的最新版本（以 npm 为优先来源，npm 不可达时为 GitHub latest release）。 */
  latest: string;
  /** 是否待更新（latest > current）。 */
  hasUpdate: boolean;
  /** 该更新来源：npm（优先，默认）或 github（npm 不可达时的兜底）。 */
  source: "npm" | "github";
  /** github 来源对应的 release tag（如 v0.9.0）；npm 来源为空串。 */
  gitTag: string;
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
  check: (cur: string, npm: string, github: string) => string;
  /** 无可用更新源。 */
  noSource: string;
  /** 版本检查结果。 */
  result: (latest: string) => string;
  /** 开始升级。 */
  upgradeStart: (target: string, cmd: string) => string;
  /** 升级失败。 */
  upgradeFail: (out: string) => string;
  /** 升级成功。 */
  upgradeOk: string;
  /** 静默无需升级。 */
  silentSkip: (latest: string) => string;
  /** 静默升级到某版本。 */
  silentTo: (v: string) => string;
  /** 静默异常。 */
  silentErr: (msg: string) => string;
}

/** 构建版本日志文案（按语言）。 */
function buildVersionLogCopy(lang: string): VersionLogCopy {
  const zh = lang === "zh";
  if (zh) {
    return {
      check: (cur, npm, github) => `版本检查 当前=${cur} npm=${npm} github=${github}`,
      noSource: "版本检查 无可用更新源，跳过",
      result: (latest) => `版本检查 结果 latest=${latest}`,
      upgradeStart: (target, cmd) => `开始升级 目标=${target} 命令=${cmd}`,
      upgradeFail: (out) => `升级失败 ${out}`,
      upgradeOk: "升级成功，已清除版本检查缓存",
      silentSkip: (latest) => `静默自动更新 无需自动升级 latest=${latest}`,
      silentTo: (v) => `静默自动更新 升级到 ${v}`,
      silentErr: (msg) => `静默自动更新 异常 ${msg}`,
    };
  }
  return {
    check: (cur, npm, github) => `Version check current=${cur} npm=${npm} github=${github}`,
    noSource: "Version check no available update source, skipped",
    result: (latest) => `Version check result latest=${latest}`,
    upgradeStart: (target, cmd) => `Upgrade starting target=${target} command=${cmd}`,
    upgradeFail: (out) => `Upgrade failed ${out}`,
    upgradeOk: "Upgrade succeeded, update cache cleared",
    silentSkip: (latest) => `Silent auto-update no upgrade needed latest=${latest}`,
    silentTo: (v) => `Silent auto-update upgrading to ${v}`,
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

/** 请求 npm registry 的 latest 元数据，返回最新版本号。 */
async function fetchLatestVersion(): Promise<string> {
  const body = (await fetchJson(REGISTRY_URL, { accept: "application/json" })) as {
    version?: unknown;
  };
  if (typeof body.version !== "string" || !body.version) {
    throw new Error("registry had no version");
  }
  return body.version;
}

/** GitHub Releases 兜底通道：latest release 的 tag（如 v0.9.0）及其去 v 后的版本号。 */
interface GithubLatestRelease {
  tag: string;
  version: string;
}

/**
 * 读 GitHub latest release 的 tag 作为兜底版本号。失败（含接口不可达、tag 非法）返回 null，
 * 由调用方决定回退，不影响 npm 主通道。
 */
async function fetchGithubLatestRelease(): Promise<GithubLatestRelease | null> {
  try {
    const body = (await fetchJson(GITHUB_RELEASES_URL, {
      "user-agent": "dsh",
      accept: "application/vnd.github+json",
    })) as { tag_name?: unknown };
    if (typeof body.tag_name === "string") {
      const tag = body.tag_name;
      const version = tag.replace(/^v/, "");
      if (/^\d+\.\d+\.\d+/.test(version)) return { tag, version };
    }
  } catch {
    // GitHub release 读取失败 → 兜底通道置空
  }
  return null;
}

/** 读取「自动更新」开关；读取失败按关闭处理。 */
async function isAutoUpdateEnabled(): Promise<boolean> {
  try {
    const s = await getSettings();
    return s.autoUpdateEnabled ?? false;
  } catch {
    return false;
  }
}

/**
 * 检查插件是否有新版本。只从两个外部源获取：npm registry（优先）+ GitHub Releases（兜底）。
 *
 * 结果组合：
 * - npm 可达 → 以 npm version 为准（npm 优先）；
 * - npm 不可达但 GitHub latest release 可达 → 以其 tag 为准；
 * - 两者都不可达 → hasUpdate=false、latest=current。
 */
export async function checkUpdate(force = false): Promise<UpdateInfo> {
  const now = Date.now();
  const current = currentVersion();
  if (!force && cache && now - cache.at < cache.ttl) return cache.info;

  const vlog = buildVersionLogCopy(await readGlobalLocale());

  const [npmRes, ghRes] = await Promise.allSettled([fetchLatestVersion(), fetchGithubLatestRelease()]);
  const npm = npmRes.status === "fulfilled" ? npmRes.value : null;
  const gh = ghRes.status === "fulfilled" ? ghRes.value : null;

  // 记录本次版本比对原始信息（系统时区时间戳）
  logVersion(vlog.check(current, npm || "-", gh?.version || "-"));

  let info: UpdateInfo;
  if (npm) {
    // npm 主通道优先
    info = {
      current,
      latest: npm,
      hasUpdate: compareVersions(npm, current) > 0,
      source: "npm",
      gitTag: "",
    };
  } else if (gh) {
    // npm 不可达，用 GitHub latest release 兜底
    info = {
      current,
      latest: gh.version,
      hasUpdate: compareVersions(gh.version, current) > 0,
      source: "github",
      gitTag: gh.tag,
    };
  } else {
    logVersion(vlog.noSource);
    info = { current, latest: current, hasUpdate: false, source: "npm", gitTag: "" };
  }
  logVersion(vlog.result(info.latest));
  cache = { at: now, info, ttl: CACHE_MS };
  return info;
}

/** 升级命令的超时（毫秒）：给 dsh 安装插件留足够时间。 */
const UPGRADE_TIMEOUT_MS = 180_000;

/**
 * 执行「更新插件」命令行，把插件安装/升级到指定版本。
 *
 * 不传 target 时自动选择：取 checkUpdate 得到的最新待更新版本。
 * - 来源为 GitHub release（gitTag 非空）→ 走 `dsh plugin --profile <profile> add github:<repo>#<tag>`；
 * - 否则（npm）→ 走 `dsh plugin --profile <profile> add <pkg>@<version>`。
 * 桌面端平台名由 env `DSH_PLUGIN_PROFILE` 覆盖（如 desktop）；若需完全自定义整条命令，
 * 可设 env `DSH_PLUGIN_UPGRADE_CMD`。返回 { ok, output }；任何异常都不抛出，仅置 ok=false。
 */
export async function upgradePlugin(target?: string, gitRef = ""): Promise<{ ok: boolean; output: string }> {
  const profile = process.env.DSH_PLUGIN_PROFILE || "web";
  const pkg = "@sunjuntao/dsh-prompt-library";
  let version = target;
  // git 版本（GitHub release）用 github: 方式安装时的 ref（如 v0.9.0）；为空表示走 npm。
  if (!version) {
    try {
      const info = await checkUpdate(true); // 强制刷新，确保拿到最新版本信息
      if (info.hasUpdate && /^\d+\.\d+\.\d+/.test(info.latest)) {
        version = info.latest;
        gitRef = info.gitTag || "";
      }
    } catch {
      /* 拿不到版本就安装 latest 标签 */
    }
  }
  const targetStr = version && /^\d+\.\d+\.\d+/.test(version) ? `${pkg}@${version}` : pkg;
  // 只要是 GitHub 来源（带 gitTag）就走 github: 安装命令；其余（npm）保持 npm 命令。
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
      // 升级成功后使版本缓存失效：下次检查会重新请求 registry，避免旧缓存一直提示更新
      cache = null;
      logVersion(vlog.upgradeOk);
      resolve({ ok: true, output });
    });
  });
}

/** 静默自动更新的并发锁：避免启动检查与每日定时（或手动升级）重叠执行。 */
let autoUpdating = false;

/**
 * 每日（含服务启动）的静默版本检查与自动更新，受设置项「自动更新」控制：
 * - 开启：npm 或 GitHub release 有更新即后台静默升级；
 * - 关闭：不检查也不更新；
 * - 安装失败：给短缓存便于尽快重试。
 */
export async function autoUpdateDaily(): Promise<void> {
  if (autoUpdating) return;
  autoUpdating = true;
  try {
    if (!(await isAutoUpdateEnabled())) {
      logVersion("自动更新 已关闭，跳过");
      return;
    }
    const vlog = buildVersionLogCopy(await readGlobalLocale());
    const info = await checkUpdate(true);
    if (!info.hasUpdate || !info.latest || !/^\d+\.\d+\.\d+/.test(info.latest)) {
      logVersion(vlog.silentSkip(info.latest));
      return;
    }

    logVersion(vlog.silentTo(info.latest));
    const res = await upgradePlugin(info.latest, info.gitTag);
    if (!res.ok) {
      // 安装失败：给短缓存便于尽快重试（upgradePlugin 成功时会自行置空缓存）
      cache = { at: Date.now(), info: { ...info, hasUpdate: false }, ttl: CACHE_MS / 2 };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logVersion(buildVersionLogCopy(await readGlobalLocale().catch(() => "")).silentErr(msg));
    /* 静默失败，不影响主流程 */
  } finally {
    autoUpdating = false;
  }
}