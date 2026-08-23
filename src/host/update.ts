/**
 * 新版本检查（host 侧共享）。
 *
 * 从 npm registry 读取本插件的最新版本，与本地 package.json 的当前版本做比较。
 * 结果在内存缓存 24 小时，避免每次调用都请求外网；任何失败都静默降级为「无更新」，
 * 不影响插件其它功能。
 */
import { get as httpsGet } from "node:https";
import type { IncomingMessage } from "node:http";
import { readFileSync } from "node:fs";
import { exec } from "node:child_process";

/** npm registry 中本包的 latest 端点（scoped 包需把 `/` 编码为 `%2f`）。 */
const REGISTRY_URL = "https://registry.npmjs.org/@sunjuntao%2fdsh-prompt-library/latest";
/** 版本检查结果的缓存时长。 */
const CACHE_MS = 24 * 60 * 60 * 1000;
/** 请求 npm registry 的超时。 */
const REQUEST_TIMEOUT_MS = 8000;

/** 版本检查结果：当前版本、registry 最新版本、是否有更新。 */
export interface UpdateInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
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

/** 请求 npm registry 的 latest 元数据，返回最新版本号。 */
function fetchLatestVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = httpsGet(REGISTRY_URL, { headers: { accept: "application/json" } }, (res: IncomingMessage) => {
      const code = res.statusCode ?? 0;
      if (code < 200 || code >= 300) {
        res.resume();
        reject(new Error(`registry responded ${code}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { version?: unknown };
          if (typeof body.version !== "string" || !body.version) {
            reject(new Error("registry had no version"));
            return;
          }
          resolve(body.version);
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
      res.on("error", reject);
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error("registry timeout")));
    req.on("error", reject);
  });
}

/**
 * 检查插件是否有新版本。
 * @param force 是否忽略缓存强制重新请求（默认 false）。
 */
export async function checkUpdate(force = false): Promise<UpdateInfo> {
  const now = Date.now();
  const current = currentVersion();
  if (!force && cache && now - cache.at < cache.ttl) return cache.info;
  try {
    const latest = await fetchLatestVersion();
    const info: UpdateInfo = { current, latest, hasUpdate: compareVersions(latest, current) > 0 };
    cache = { at: now, info, ttl: CACHE_MS };
    return info;
  } catch {
    // 失败降级：报告无更新，并给个较短的降级周期，避免反复打外网。
    const info: UpdateInfo = { current, latest: current, hasUpdate: false };
    cache = { at: now, info, ttl: CACHE_MS / 2 };
    return info;
  }
}

/** 升级命令的超时（毫秒）：给 dsh 安装插件留足够时间。 */
const UPGRADE_TIMEOUT_MS = 180_000;

/**
 * 执行「更新插件」命令行，把插件安装/升级到最新版。
 *
 * 命令默认用 `dsh plugin --profile <platform> add <包名>@<最新版本>`，让 npm 明确解析到
 * 最新发布版；桌面端平台名由 env `DSH_PLUGIN_PROFILE` 覆盖（如 desktop）。若无法取得
 * 最新版本号则退回不带版本号的包名。若需完全自定义整条命令，可设 env `DSH_PLUGIN_UPGRADE_CMD`。
 * 返回 { ok, output }，输出截断避免过长；任何异常都不抛出，仅置 ok=false。
 */
export async function upgradePlugin(): Promise<{ ok: boolean; output: string }> {
  const profile = process.env.DSH_PLUGIN_PROFILE || "web";
  const pkg = "@sunjuntao/dsh-prompt-library";
  // 拼接最新版本号：@sunjuntao/dsh-prompt-library@0.9.0 形式；拿不到则用不带版本号的包名
  let target = pkg;
  try {
    const info = await checkUpdate(true); // 强制刷新，确保拿到 registry 最新版本
    if (info.latest && /^\d+\.\d+\.\d+/.test(info.latest)) target = `${pkg}@${info.latest}`;
  } catch {
    /* 拿不到版本就安装 latest 标签 */
  }
  const cmd = process.env.DSH_PLUGIN_UPGRADE_CMD || `dsh plugin --profile ${profile} add ${target}`;
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