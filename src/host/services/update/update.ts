/**
 * 新版本检查与自动更新（host 侧共享）。
 *
 * 版本来源（双通道，仅这两个外部源）：
 * - npm registry：@sunjuntao/dsh-prompt-library 的 latest 版本；
 * - GitHub Releases：仓库 latest release 的 tag 作为版本号。
 * 两者都能访问时取其中较高版本（安装走对应通道）；任一不可达时用可达的那个；
 * 都不可达则判定无更新源。
 *
 * 自动更新由设置项「自动更新」控制：开启时发现新版本即后台静默安装；关闭则完全不动。
 *
 * 结果在内存缓存 24 小时；任何失败都静默降级，不影响插件其它功能。
 */
import { get as httpsGet } from "node:https";
import type { IncomingMessage } from "node:http";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { getSettings, readGlobalLocale } from "../data/store.js";
import { dshHome, logDir } from "../../utils/paths.js";

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
  /** 可更新的最新版本（npm 与 GitHub 取较高；任一不可达时用可达的那个）。 */
  latest: string;
  /** 是否待更新（latest > current）。 */
  hasUpdate: boolean;
  /** 该更新来源：npm（默认）或 github（GitHub 版本更高 / 仅 GitHub 可达时）。 */
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
  /** 重启服务命令触发。 */
  restartCmd: (method: string, cmd: string) => string;
  /** 重启服务异常。 */
  restartErr: (msg: string) => string;
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
      restartCmd: (method, cmd) => `重启服务 方式=${method} 命令=${cmd}`,
      restartErr: (msg) => `重启服务 异常 ${msg}`,
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
    restartCmd: (method, cmd) => `Restart service method=${method} command=${cmd}`,
    restartErr: (msg) => `Restart service error ${msg}`,
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

/** 读取本地 package.json 的当前版本号（公告弹窗也用它优先匹配当前版本的更新说明）。 */
export function currentVersion(): string {
  try {
    // lib/index.js 的上一级即包根目录，package.json 与 lib 同级。
    const pkgPath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    return typeof pkg.version === "string" && pkg.version ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** 构建时注入的全局常量（由 esbuild define 提供，值为构建时的插件版本号）。 */
declare const __PLUGIN_VERSION__: string;

/**
 * 服务端「运行版本」：构建时注入到服务端 bundle 的版本号。
 *
 * 与 currentVersion()（读磁盘 package.json 的「已安装版本」）不同，它反映的是
 * 当前进程实际加载的代码版本：插件更新（文件已落盘）但未重启 dsh web 时，
 * 运行版本仍为旧版本号，从而可与客户端版本比对、提示需要重启。
 */
export function builtVersion(): string {
  return typeof __PLUGIN_VERSION__ !== "undefined" && __PLUGIN_VERSION__ ? __PLUGIN_VERSION__ : "0.0.0";
}

/** 服务端/客户端版本比对所需信息：运行版本 + 磁盘已安装版本（客户端用自己的构建版本比对）。 */
export function getVersionInfo(): { server: string; installed: string } {
  return { server: builtVersion(), installed: currentVersion() };
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
 * 检查插件是否有新版本。只从两个外部源获取：npm registry + GitHub Releases。
 *
 * 结果组合：
 * - 两者都可达 → 取较高版本（npm 与 GitHub 中更高的那个，安装走对应通道）；
 * - 仅 npm 可达 → 以 npm version 为准；
 * - 仅 GitHub latest release 可达 → 以其 tag 为准；
 * - 都不可达 → hasUpdate=false、latest=current。
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
  if (npm && gh) {
    // 双源都可达：取较高版本，安装走对应通道
    const useGit = compareVersions(gh.version, npm) > 0;
    const latest = useGit ? gh.version : npm;
    info = {
      current,
      latest,
      hasUpdate: compareVersions(latest, current) > 0,
      source: useGit ? "github" : "npm",
      gitTag: useGit ? gh.tag : "",
    };
  } else if (npm) {
    // 仅 npm 可达
    info = {
      current,
      latest: npm,
      hasUpdate: compareVersions(npm, current) > 0,
      source: "npm",
      gitTag: "",
    };
  } else if (gh) {
    // 仅 GitHub latest release 可达
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
 * 手动升级的实时进度（供客户端轮询展示进度条）。
 * stage：idle 空闲；checking 准备；downloading 下载；installing 安装；done 成功；failed 失败。
 */
export interface UpgradeProgress {
  /** 是否有升级正在后台执行。 */
  active: boolean;
  stage: "idle" | "checking" | "downloading" | "installing" | "done" | "failed";
  /** 进度百分比（0-100）。 */
  percent: number;
  /** 可选附加说明（如安装命令输出摘要）。 */
  detail?: string;
}

/** 手动升级的当前进度（模块级状态，供 startUpgrade / getUpgradeState 读写）。 */
let upgradeState: UpgradeProgress = { active: false, stage: "idle", percent: 0 };

/** 合并更新当前进度状态（写进度状态失败不影响主流程）。 */
function setUpgradeProgress(patch: Partial<UpgradeProgress>): void {
  upgradeState = { ...upgradeState, ...patch };
}

/** 读取当前升级进度（返回副本，避免外部篡改内部状态）。 */
export function getUpgradeState(): UpgradeProgress {
  return { ...upgradeState };
}

/**
 * 启动一次后台升级（点击「立即更新」用）：立即返回 started，升级在后台执行，
 * 客户端通过轮询 getUpgradeState() 实时获取进度条变化。
 * 已在升级（手动或自动）进行中时返回 busy。
 */
export function startUpgrade(): { ok: boolean; started: boolean; error?: string } {
  if (upgradeState.active || autoUpdating) {
    return { ok: false, started: false, error: "busy" };
  }
  setUpgradeProgress({ active: true, stage: "checking", percent: 0 });
  void upgradePlugin(); // 后台执行，不阻塞返回
  return { ok: true, started: true };
}

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
    setUpgradeProgress({ active: true, stage: "downloading", percent: 5 });
    const child = spawn(cmd, { shell: true, windowsHide: true });
    const parts: string[] = [];
    let completed = false;
    let timer: NodeJS.Timeout | undefined;
    const finish = (ok: boolean, out: string): void => {
      if (completed) return;
      completed = true;
      if (timer) clearTimeout(timer);
      if (ok) {
        // 升级成功后使版本缓存失效：下次检查会重新请求 registry，避免旧缓存一直提示更新
        cache = null;
        logVersion(vlog.upgradeOk);
        setUpgradeProgress({ active: false, stage: "done", percent: 100 });
      } else {
        logVersion(vlog.upgradeFail(out || "unknown error"));
        setUpgradeProgress({ active: false, stage: "failed", detail: out });
      }
      resolve({ ok, output: out });
    };
    // 安装阶段：随子进程输出字符推进伪实时进度（无精确百分比，按输出量估算），封顶 90%；退出后定成败
    let outLen = 0;
    const onData = (buf: Buffer): void => {
      const text = buf.toString("utf8");
      parts.push(text);
      outLen += text.length;
      setUpgradeProgress({
        stage: "installing",
        percent: Math.min(90, 5 + Math.floor(Math.min(80, outLen / 256))),
      });
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", (err) => finish(false, err instanceof Error ? err.message : String(err)));
    timer = setTimeout(() => {
      finish(false, "timeout");
      child.kill();
    }, UPGRADE_TIMEOUT_MS);
    child.on("close", (code) => {
      const output = parts.join("").trim().slice(0, 1000);
      finish(code === 0, output);
    });
  });
}

/** 静默自动更新的并发锁：避免启动检查与每日定时（或手动升级）重叠执行。 */
let autoUpdating = false;

/**
 * 重启本地 dsh web 服务（自重启）。
 *
 * 重启命令可用环境变量 `DSH_PLUGIN_RESTART_CMD` 完全自定义（优先级最高）；
 * Windows 默认实现：延迟 1 秒后结束 dsh web（node --profile web）进程，
 * 再通过 harness 启动脚本（dsh-harness-start.vbs，可用 `DSH_HARNESS_VBS` 覆盖）重新拉起。
 * 使用 detached + unref 的独立进程执行，确保父进程被杀后重启流程仍能完成。
 * 返回 { ok, error? }；任何异常都不抛出，仅返回错误信息。
 */
export async function restartService(): Promise<{ ok: boolean; error?: string }> {
  const vlog = buildVersionLogCopy(await readGlobalLocale().catch(() => ""));
  try {
    const override = process.env.DSH_PLUGIN_RESTART_CMD;
    if (override) {
      spawn(override, { detached: true, stdio: "ignore", shell: true, windowsHide: true }).unref();
      logVersion(vlog.restartCmd("custom", override));
      return { ok: true };
    }
    if (process.platform === "win32") {
      const vbs = process.env.DSH_HARNESS_VBS || join(dshHome(), "file", "dsh-console", "dsh-harness-start.vbs");
      // 转义单引号（路径含单引号时的 PowerShell 字符串安全）
      const safeVbs = vbs.replace(/'/g, "''");
      const ps = [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-WindowStyle",
        "Hidden",
        "-Command",
        "Start-Sleep -Seconds 1; " +
          "Get-CimInstance Win32_Process | " +
          "Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*--profile web*' } | " +
          "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; " +
          "Start-Sleep -Seconds 1; " +
          `if (Test-Path '${safeVbs}') { wscript.exe '${safeVbs}' }`,
      ];
      spawn("powershell.exe", ps, { detached: true, stdio: "ignore", windowsHide: true }).unref();
      logVersion(vlog.restartCmd("vbs", vbs));
      return { ok: true };
    }
    return {
      ok: false,
      error: "restart not supported on this platform; set DSH_PLUGIN_RESTART_CMD to customize",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logVersion(vlog.restartErr(msg));
    return { ok: false, error: msg };
  }
}

/**
 * 每日（含服务启动）的静默版本检查与自动更新，受设置项「自动更新」控制：
 * - 开启：npm 或 GitHub release 有更新即后台静默升级，成功后自动重启服务使新代码生效；
 * - 关闭：不检查也不更新；
 * - 安装失败：给短缓存便于尽快重试。
 */
export async function autoUpdateDaily(): Promise<void> {
  if (autoUpdating) return;
  autoUpdating = true;
  try {
    // 未开启「自动更新」时静默跳过：不检查、不更新，也不产生任何自动更新日志
    if (!(await isAutoUpdateEnabled())) return;
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
      return;
    }
    // 升级成功后自动重启服务，使新版本代码生效（自重启进程，重启流程独立完成）
    await restartService();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logVersion(buildVersionLogCopy(await readGlobalLocale().catch(() => "")).silentErr(msg));
    /* 静默失败，不影响主流程 */
  } finally {
    autoUpdating = false;
  }
}