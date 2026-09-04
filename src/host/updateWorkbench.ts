/**
 * workbench 首次安装：library 启动后检测 file-workbench 是否已安装，未装则从 git 安装。
 *
 * 背景：DSH 用 pnpm 的 `blockExoticSubdeps` 禁止「子依赖」携带 git/file 等 exotic 源，
 * 因此 workbench 不能作为 library 的 dependencies 随 npm 安装。改为由 library 在
 * 运行时检测 workbench 是否已安装，未安装则从 git 拉取并铺到 profile 的 node_modules，
 * 同时把它登记到 profile 的 `dsh.profile.bundles` 与 `dependencies`（引用格式与 library
 * 一致 `github:<repo>#<tag>`），保证重启 dsh 后 workbench 会被自动加载。
 *
 * 已安装则一律不管，不检查版本、不升级。任何失败都静默降级，不阻断 library。
 * 生效方式：安装完成后提示重启 `dsh web`。
 */
import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import { promisify } from "node:util";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dshHome } from "./paths.js";
import { emitWorkbenchInstalled } from "./events.js";

const execFileP = promisify(execFile);

/** workbench 包全名（scope + name）。 */
const WORKBENCH_PKG = "@sunjuntao/dsh-file-workbench";
/** workbench 远端仓库。 */
const DEFAULT_REPO = "https://github.com/master1Sun/dsh-file-workbench-lib.git";
/** 当前 library 运行包根（lib/ 上一级）。 */
const LIBRARY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

type JsonLike = { [k: string]: unknown } | null;

async function readJson(p: string): Promise<JsonLike> {
  try {
    return JSON.parse(await readFile(p, "utf8")) as JsonLike;
  } catch {
    return null;
  }
}

/** 忽略前导 v 的裸版本号。 */
function bare(tag: string): string {
  return tag.replace(/^v/i, "");
}

/** 轻量语义化比较：a>b→1, a<b→-1, 相等→0；非法段按 0 处理。 */
function semverCompare(a: string, b: string): number {
  const pa = a.split(".").map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0));
  const pb = b.split(".").map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/**
 * 定位当前运行的 profile 根目录。
 * 优先取环境变量名；否则从 library 已装路径反推：
 *   ~/.dsh/profiles/<name>/node_modules/@sunjuntao/dsh-prompt-library/
 *   → 当前库包根 LIBRARY_ROOT = .../node_modules/@sunjuntao/dsh-prompt-library
 *   → 上级 @sunjuntao → 上级 node_modules → 上级即 profile 根。
 */
function profileRoot(): string | null {
  const envName = process.env.DSH_PROFILE || process.env.DSH_PROFILE_NAME;
  const dshHomeReal = dshHome();
  if (envName) {
    const root = join(dshHomeReal, "profiles", envName);
    if (root) return root;
  }
  const profile = dirname(dirname(dirname(LIBRARY_ROOT))); // .../profiles/<name>
  if (/[\\/]profiles[\\/][^\\/]+$/.test(profile)) return profile;
  return null;
}

/** workbench 已装包根目录；不存在时返回 null。 */
async function workbenchRoot(profile: string): Promise<string | null> {
  const parts = WORKBENCH_PKG.split("/");
  const p = join(profile, "node_modules", ...parts);
  try {
    await stat(join(p, "package.json"));
    return p;
  } catch {
    return null;
  }
}

/** 枚举远端 tags 取语义化版本最高者（保留原始 tag 名）。 */
export async function latestRemoteTag(repo: string): Promise<{ raw: string; sem: string } | null> {
  const { stdout } = await execFileP("git", ["ls-remote", "--tags", repo], {
    timeout: 15_000,
    windowsHide: true,
  });
  let bestRaw = "";
  let bestSem = "";
  for (const line of stdout.split("\n")) {
    const m = /refs\/tags\/(.*?)(\^\{\})?$/.exec(line.trim());
    if (!m) continue;
    const raw = m[1];
    const sem = bare(raw);
    if (!/^\d+\.\d+\.\d+/.test(sem)) continue;
    if (!bestSem || semverCompare(sem, bestSem) > 0) {
      bestSem = sem;
      bestRaw = raw;
    }
  }
  return bestSem ? { raw: bestRaw, sem: bestSem } : null;
}

/** 判断本地路径是否为文件/目录（同步，避免 await 嵌套）。 */
function fsExists(p: string): boolean {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

/** 从目标包根路径（.../node_modules/@scope/name）推导包名。 */
function pkgNameFromDest(dest: string): string {
  const idx = dest.indexOf("node_modules");
  const rel = idx >= 0 ? dest.slice(idx + "node_modules".length + 1) : dest;
  return rel.split(/[\\/]/).join("/");
}

/** 从 git clone 指定 tag 并把发布内容铺到目标包根。 */
export async function installFromGit(repo: string, rawTag: string, dest: string): Promise<void> {
  const staging = join(tmpdir(), `wb-install-${Date.now()}`);
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  try {
    await execFileP(
      "git",
      ["clone", "--depth", "1", "--branch", rawTag, "--single-branch", "--", repo, staging],
      { timeout: 120_000, windowsHide: true },
    );
    await stat(join(staging, "lib"));

    // 远端 tag 可能只发布编译产物（lib/ + cordis.patch.yml）而无 package.json
    //（如 dsh-file-workbench v0.1.0）。此时按目标包根推导包名并生成最小 package.json，
    // 保证 DSH 能当作 npm 包加载；有 package.json 则校验版本与 tag 一致。
    const remotePkg = await readJson(join(staging, "package.json"));
    let pkg: Record<string, unknown>;
    if (remotePkg) {
      if (bare(String(remotePkg.version ?? "")) !== bare(rawTag)) {
        throw new Error(`tag(${rawTag}) 与包版本(${String(remotePkg.version)})不符`);
      }
      pkg = { ...remotePkg, version: bare(rawTag) };
    } else {
      pkg = { name: pkgNameFromDest(dest), version: bare(rawTag), type: "module", main: "./lib/index.js" };
    }

    await mkdir(dest, { recursive: true });
    await rm(dest, { recursive: true, force: true });
    await mkdir(dest, { recursive: true });
    await cp(join(staging, "lib"), join(dest, "lib"), { recursive: true });
    await writeFile(join(dest, "package.json"), JSON.stringify(pkg, null, 2) + "\n", "utf8");
    if (fsExists(join(staging, "cordis.patch.yml"))) {
      await cp(join(staging, "cordis.patch.yml"), join(dest, "cordis.patch.yml"));
    }
  } finally {
    await rm(staging, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * 把 workbench 登记到 profile 的 `dsh.profile.bundles`（不存在则追加）。
 * 保留 JSON 无 BOM 写入。@returns 写入成功返回 true（含原本已在）。
 */
async function ensureInBundles(profile: string): Promise<boolean> {
  const pkgPath = join(profile, "package.json");
  let conf: JsonLike = null;
  try {
    conf = JSON.parse(await readFile(pkgPath, "utf8")) as JsonLike;
  } catch {
    return false;
  }
  const dsh = (conf?.dsh as JsonLike) ?? null;
  const bundleDsh = (dsh?.profile as JsonLike) ?? null;
  const bundles = bundleDsh?.bundles as unknown[] | null;
  if (!Array.isArray(bundles)) return false;
  if (bundles.includes(WORKBENCH_PKG)) return true;
  (bundleDsh as unknown as { bundles: unknown[] }).bundles = [...bundles, WORKBENCH_PKG];
  await writeFile(pkgPath, JSON.stringify(conf, null, 2) + "\n", "utf8");
  return true;
}

/**
 * 把 workbench 写入 profile 的 `dependencies`（不存在则追加），引用格式与
 * library 一致：`github:<repo>#<tag>`。保留 JSON 无 BOM 写入。
 * @returns 写入成功返回 true（含原本已在）。
 */
async function ensureInDependencies(profile: string, ref: string): Promise<boolean> {
  const pkgPath = join(profile, "package.json");
  let conf: JsonLike = null;
  try {
    conf = JSON.parse(await readFile(pkgPath, "utf8")) as JsonLike;
  } catch {
    return false;
  }
  const deps = (conf?.dependencies as Record<string, unknown> | null) ?? null;
  if (!deps) return false;
  const entry = `github:${DEFAULT_REPO.replace(/^https?:\/\//, "").replace(/\.git$/, "")}#${ref}`;
  if (deps[WORKBENCH_PKG] === entry) return true;
  deps[WORKBENCH_PKG] = entry;
  await writeFile(pkgPath, JSON.stringify(conf, null, 2) + "\n", "utf8");
  return true;
}

/**
 * 主入口：仅当用户未安装 workbench 时才安装（不检测最新、不每日检测）。
 * 已安装则一律不管，不做任何升级。幂等，任何失败均静默。
 * @returns 是否执行了安装（true 表示刚装上，需重启生效；已安装则 false）。
 */
export async function ensureWorkbenchInstalled(): Promise<boolean> {
  try {
    const profile = profileRoot();
    if (!profile) return false;

    // 已安装则直接返回，不检查版本、不升级
    const root = await workbenchRoot(profile);
    if (root) {
      await ensureInBundles(profile).catch(() => false);
      return false;
    }

    const remote = await latestRemoteTag(DEFAULT_REPO).catch(() => null);
    if (!remote) return false;

    const dest = join(profile, "node_modules", ...WORKBENCH_PKG.split("/"));
    await installFromGit(DEFAULT_REPO, remote.raw, dest);
    await ensureInBundles(profile).catch(() => false);
    // 把版本写入 profile 的 dependencies，格式 `github:master1Sun/dsh-file-workbench-lib#v0.x.y`
    await ensureInDependencies(profile, remote.raw).catch(() => false);

    // 安装完成后推送 SSE 事件，由前端弹「需重启」气泡（不再自行打印）
    emitWorkbenchInstalled();
    return true;
  } catch (error) {
    try {
      console.error("[dsh-prompt-library] ensureWorkbenchInstalled skipped:", (error as Error).message);
    } catch {
      /* ignore */
    }
    return false;
  }
}