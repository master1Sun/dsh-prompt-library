/**
 * 版本信息（host 侧）。
 *
 * 自动更新/升级/重启等能力已随插件减法移除；保留本地版本号读取，
 * 以及「检查更新」的远端版本探测（优先 GitHub Release/tag，失败回退 npm registry）。
 */
import { readFileSync } from "node:fs";

/** 检查更新结果：最新版本号 + 探测来源（git / npm / 无）。 */
export interface UpdateCheckResult {
  latest: string;
  source: "git" | "npm" | "";
}

const GITHUB_RELEASES_LATEST = "https://api.github.com/repos/master1Sun/dsh-prompt-library/releases/latest";
const GITHUB_TAGS_LATEST = "https://api.github.com/repos/master1Sun/dsh-prompt-library/tags?per_page=1";
const NPM_LATEST = "https://registry.npmjs.org/@sunjuntao%2Fdsh-prompt-library/latest";
const FETCH_TIMEOUT_MS = 5000;

/** 带超时的 json fetch；失败/非 200/超时均返回 null，交给调用方回退。 */
async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { "user-agent": "dsh-prompt-library", accept: "application/json" },
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 从 tag/release 名里提取合法版本号（去掉前导 v，仅接受 x.y.z 可带预发布）。 */
function normalizeVersion(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const s = raw.trim().replace(/^v/i, "");
  return /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(s) ? s : "";
}

/** 比较两个版本号（数值段，忽略预发布后缀）：a > b 返回正数。 */
function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

/**
 * 探测远端最新版本：优先 GitHub（最新 Release 与最新 tag 取较高者，
 * 覆盖「tag 已推但 Release 尚未生成」的窗口），再回退 npm registry 的 dist-tag latest。
 * 全部失败时返回空 latest。
 */
export async function checkLatestVersion(): Promise<UpdateCheckResult> {
  // 1) GitHub：Release 与最新 tag 取较高版本
  const [release, tags] = await Promise.all([
    fetchJson(GITHUB_RELEASES_LATEST),
    fetchJson(GITHUB_TAGS_LATEST),
  ]);
  const fromRelease = normalizeVersion(release?.tag_name);
  let fromTag = "";
  if (Array.isArray(tags)) {
    const first = tags[0] as { name?: unknown } | undefined;
    fromTag = normalizeVersion(first?.name);
  }
  const gitLatest = !fromRelease ? fromTag : !fromTag ? fromRelease : compareVersion(fromRelease, fromTag) >= 0 ? fromRelease : fromTag;
  if (gitLatest) return { latest: gitLatest, source: "git" };

  // 2) 回退 npm registry latest
  const npm = await fetchJson(NPM_LATEST);
  const fromNpm = normalizeVersion(npm?.version);
  if (fromNpm) return { latest: fromNpm, source: "npm" };

  return { latest: "", source: "" };
}

/** 读取本地 package.json 的当前版本号（磁盘已安装版本）。 */
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
 * 与 currentVersion()（读磁盘 package.json 的「已安装版本」）不同，它反映的是
 * 当前进程实际加载的代码版本。
 */
export function builtVersion(): string {
  return typeof __PLUGIN_VERSION__ !== "undefined" && __PLUGIN_VERSION__ ? __PLUGIN_VERSION__ : "0.0.0";
}

/** 服务端/客户端版本比对所需信息：运行版本 + 磁盘已安装版本（客户端用自己的构建版本比对）。 */
export function getVersionInfo(): { server: string; installed: string } {
  return { server: builtVersion(), installed: currentVersion() };
}
