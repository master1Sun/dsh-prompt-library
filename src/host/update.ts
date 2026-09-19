/**
 * 版本信息（host 侧）。
 *
 * 自动更新/升级/重启等能力已随插件减法移除，仅保留版本号读取，
 * 供 GET /version 路由及设置界面「当前版本」展示使用。
 */
import { readFileSync } from "node:fs";

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
