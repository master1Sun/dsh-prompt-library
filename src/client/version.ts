/**
 * 客户端插件版本号。
 *
 * 版本号在构建时由 scripts/build.mjs 的 esbuild define 注入
 * `__PLUGIN_VERSION__`（值来自 package.json 的 version）。
 * 运行于未注入的调试/直跑环境时回退为 "0.0.0"。
 */

/** 构建时注入的全局常量（由 esbuild define 提供）。 */
declare const __PLUGIN_VERSION__: string;

/** 插件版本号（客户端打包时的版本）。 */
export const PLUGIN_VERSION: string =
  typeof __PLUGIN_VERSION__ !== "undefined" && __PLUGIN_VERSION__ ? __PLUGIN_VERSION__ : "0.0.0";
