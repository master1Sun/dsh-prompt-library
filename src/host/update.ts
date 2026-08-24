/**
 * 新版本检查与自动更新（host 侧共享）。
 *
 * 三通道检测：
 * - npm registry（正式版通道）：@sunjuntao/dsh-prompt-library 的 latest 版本；
 * - GitHub 主分支测试版（正式通道的补充）：直接读主分支(master) `package.json` 的 version，
 *   不打 tag、不走 Release；安装走 `github:<repo>#master` 拉主分支最新打包源码。
 *
 * 组合策略：
 * - 加入体验计划（默认勾选）：npm 与 GitHub 主分支任一有更新都后台静默更新，不弹红点；
 *   但 GitHub 主分支更新优先使用 git 安装最新打包版本，npm 仅作兜底静默通道；
 * - 未加入体验计划：有 npm 更新即后台静默安装，装完后以红点提示「已更新到新版本 v{版本号}」，
 *   红点随后台缓存持续到下一次后台检查（原定一天一次或重启客户端）；
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
/** GitHub 仓库（owner/repo），用于读主分支代码版本号及 git 安装命令的 `github:` 引用。 */
const GITHUB_REPO = "master1Sun/dsh-prompt-library";
/** 主分支代码的 package.json 地址（GitHub 主分支通道：直接读代码里的版本号）。
 * 用 contents 接口而非 raw 地址，避免 raw.githubusercontent.com 被墙导致读不到版本号。
 */
const MASTER_PACKAGE_URL = `https://api.github.com/repos/${GITHUB_REPO}/contents/package.json?ref=master`;
/** 版本检查结果的缓存时长。 */
const CACHE_MS = 24 * 60 * 60 * 1000;
/** 请求外网（npm / github）的超时。 */
const REQUEST_TIMEOUT_MS = 8000;

/** 版本检查结果：当前版本、待更新版本、是否静默更新、红点「已更新」版本及其标记。 */
export interface UpdateInfo {
  current: string;
  /** 待静默更新的版本（体验计划：GitHub 主分支或 npm 中更高者；未加入：npm latest）。 */
  latest: string;
  /** 是否要后台静默更新（latest > current）。 */
  hasUpdate: boolean;
  /** 红点展示的版本号：未加入体验计划时，npm 静默装完提示「已更新到新版本 v{版本号}」。 */
  betaLatest: string;
  /** 是否展示红点：仅未加入体验计划的「已更新到新版本」通知为 true，体验计划始终 false。 */
  hasBeta: boolean;
  /** 安装 latest 时用的 GitHub ref（如 master）。为空表示 latest 来自 npm，走 npm 命令。 */
  gitTag: string;
  /** 预留：安装 betaLatest 时的 GitHub ref；当前场景红点为通知型，恒为空串。 */
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
  check: (cur: string, npm: string, git: string, exp: boolean) => string;
  /** 无可用更新源。 */
  noSource: string;
  /** 体验计划勾选结果。 */
  expResult: (latest: string) => string;
  /** 未加入体验计划（普通）结果。 */
  normalResult: (latest: string) => string;
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
      check: (cur, npm, git, exp) =>
        `版本检查 当前=${cur} npm=${npm} git=${git} 体验计划=${exp ? on : off}`,
      noSource: "版本检查 无可用更新源，跳过",
      expResult: (latest) => `版本检查 体验计划结果 latest=${latest}`,
      normalResult: (latest) => `版本检查 普通结果 latest=${latest}`,
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
    check: (cur, npm, git, exp) =>
      `Version check current=${cur} npm=${npm} git=${git} experience=${exp ? on : off}`,
    noSource: "Version check no available update source, skipped",
    expResult: (latest) => `Version check experience result latest=${latest}`,
    normalResult: (latest) => `Version check normal result latest=${latest}`,
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

/** 请求外网 URL，返回原始文本（用于读 GitHub raw 文件，如主分支 package.json）。 */
function fetchRawText(url: string, headers: Record<string, string> = {}): Promise<string> {
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
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
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

/** GitHub 主分支通道的版本信息：只有「测试版」= 主分支代码 package.json 的 version。 */
interface GithubVersions {
  test: string;
  /** 测试版安装用的 git ref（恒为主分支名 `master`）；测试版安装拉主分支最新打包源码。 */
  testTag: string;
}

/**
 * 读主分支(master) `package.json` 的 version 作为 GitHub 主分支版本号（不打 tag、不走 Release）。
 * 走 contents 接口并请求原文（accept: raw），避免 raw.githubusercontent.com 被墙；读取失败返回空字符串。
 */
async function fetchGithubVersions(): Promise<GithubVersions> {
  try {
    const raw = await fetchRawText(MASTER_PACKAGE_URL, {
      "user-agent": "dsh",
      accept: "application/vnd.github.raw",
    });
    const pkg = JSON.parse(raw) as { version?: unknown };
    if (typeof pkg.version === "string" && pkg.version) {
      return { test: pkg.version, testTag: "master" };
    }
  } catch {
    // 主分支 package.json 读取失败 → 版本通道置空
  }
  return { test: "", testTag: "master" };
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
 * 检查插件是否有新版本（npm 正式版 + GitHub 主分支测试版双通道）。
 * @param force 是否忽略缓存强制重新请求（默认 false）。
 *
 * 组合规则：
 * - 未加入体验计划：npm 有更新 → 返回 hasUpdate=true + hasBeta=true（装完后红点提示「已更新到新版本 v{版本号}」）；
 * - 加入体验计划：npm 或 GitHub 主分支任一有更新 → 返回 hasUpdate=true、hasBeta=false（静默不红点）；
 *   其中 GitHub 主分支更新优先，gitTag 非空表示用 git 装主分支最新打包版本。
 */
export async function checkUpdate(force = false): Promise<UpdateInfo> {
  const now = Date.now();
  const current = currentVersion();
  if (!force && cache && now - cache.at < cache.ttl) return cache.info;

  // 是否加入体验计划：决定 npm 与「GitHub 主分支」更新如何被对待
  const betaEnabled = await isExperienceProgramEnabled();
  const vlog = buildVersionLogCopy(await readGlobalLocale());

  const [npmRes, ghRes] = await Promise.allSettled([
    fetchLatestVersion(),
    fetchGithubVersions(),
  ]);
  const npm = npmRes.status === "fulfilled" ? npmRes.value : null;
  const ghTest = ghRes.status === "fulfilled" ? ghRes.value?.test || "" : "";
  const ghTag = ghRes.status === "fulfilled" ? ghRes.value?.testTag || "" : "";

  // 记录本次版本比对原始信息（系统时区时间戳）
  logVersion(vlog.check(current, npm || "-", ghTest || "-", betaEnabled));

  // 所有源都访问不到 → 不做任何处理
  if (!npm && !ghTest) {
    logVersion(vlog.noSource);
    const info: UpdateInfo = { current, latest: current, hasUpdate: false, betaLatest: current, hasBeta: false, gitTag: "", betaTag: "" };
    cache = { at: now, info, ttl: CACHE_MS / 2 };
    return info;
  }

  const npmUpdate = !!npm && compareVersions(npm, current) > 0;
  const gitUpdate = !!ghTest && compareVersions(ghTest, current) > 0;

  // 加入体验计划：静默自动更新，不弹红点。
  // GitHub 主分支更新优先走 git 装最新打包版本；npm 仅作兜底静默通道。
  if (betaEnabled) {
    const info: UpdateInfo =
      gitUpdate
        ? { current, latest: ghTest, hasUpdate: true, betaLatest: current, hasBeta: false, gitTag: ghTag, betaTag: "" }
        : npmUpdate
          ? { current, latest: npm as string, hasUpdate: true, betaLatest: current, hasBeta: false, gitTag: "", betaTag: "" }
          : { current, latest: current, hasUpdate: false, betaLatest: current, hasBeta: false, gitTag: "", betaTag: "" };
    logVersion(vlog.expResult(info.latest));
    cache = { at: now, info, ttl: CACHE_MS };
    return info;
  }

  // 未加入体验计划：npm 有更新即静默安装；hasBeta 表示装完后要展示「已更新到新版本」红点。
  const info: UpdateInfo = npmUpdate
    ? { current, latest: npm as string, hasUpdate: true, betaLatest: npm as string, hasBeta: true, gitTag: "", betaTag: "" }
    : { current, latest: current, hasUpdate: false, betaLatest: current, hasBeta: false, gitTag: "", betaTag: "" };
  logVersion(vlog.normalResult(info.latest));
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
 * - 已加入体验计划：npm 或 GitHub 主分支有更新即后台静默升级，不弹红点；
 * - 未加入体验计划：npm 有更新即后台静默升级；成功后以缓存记录「已更新到新版本 v{版本号}」红点，
 *   红点随缓存持续到下一次后台检查（原定一天一次或重启客户端）；
 * - 安装失败则不展示「已更新」红点，避免误报；
 * - 两个源都不可达 → 什么都不做。
 */
export async function autoUpdateDaily(): Promise<void> {
  if (autoUpdating) return;
  autoUpdating = true;
  try {
    const info = await checkUpdate(true);
    const betaEnabled = await isExperienceProgramEnabled();
    const vlog = buildVersionLogCopy(await readGlobalLocale());

    if (!info.hasUpdate || !info.latest || !/^\d+\.\d+\.\d+/.test(info.latest)) {
      logVersion(vlog.silentSkip(info.hasUpdate, info.hasBeta, info.latest));
      return;
    }

    logVersion(vlog.silentTo(info.latest));
    const res = await upgradePlugin(info.latest, info.gitTag);
    const at = Date.now();
    if (res.ok) {
      if (betaEnabled) {
        // 已加入体验计划：静默安装不红点（upgradePlugin 已置空缓存，等下次检查重算）。
        return;
      }
      // 未加入体验计划：npm 静默装完 → 用缓存记录「已更新到新版本」红点，缓存 24h。
      // 期间客户端 getUpdate 读取到 hasBeta=true + betaLatest=已装版本；下次后台检查缓存过期后自然消失。
      cache = {
        at,
        info: {
          current: info.latest,
          latest: info.latest,
          hasUpdate: false,
          betaLatest: info.latest,
          hasBeta: true,
          gitTag: "",
          betaTag: "",
        },
        ttl: CACHE_MS,
      };
    } else {
      // 安装失败：不展示「已更新」红点，避免误报；给短缓存便于尽快重试。
      cache = { at, info: { ...info, hasUpdate: false, hasBeta: false }, ttl: CACHE_MS / 2 };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logVersion(buildVersionLogCopy(await readGlobalLocale().catch(() => "")).silentErr(msg));
    /* 静默失败，不影响主流程 */
  } finally {
    autoUpdating = false;
  }
}
