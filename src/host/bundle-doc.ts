/**
 * 插件包内「外置文档资源」的同步读取工具。
 *
 * 把使用手册 / HARNESS 默认模板 / 版本说明等较长文案从代码中抽出，
 * 放进展包 `doc/` 目录（构建时由 scripts/build.mjs 拷贝到 lib/doc）。
 * 运行时用 import.meta.url 相对产物（lib/index.js）定位：
 *   lib/doc/manual.zh.txt
 *
 * 外置文件是这些文案的编辑来源（随包分发、可被编辑/替换）；本模块只是读取入口。
 * 读取失败（缺失 / 损坏 / 无法定位）时回退调用方传入的默认值，避免文案缺失
 * 导致命令或界面空转。
 */
import { readFileSync } from "node:fs";

/** 同步读取包内 doc/ 下的外置文档；缺失或读取失败回退 fallback。 */
export function readBundleDoc(fileName: string, fallback: string): string {
  try {
    const url = new URL(`./doc/${fileName}`, import.meta.url);
    return readFileSync(url, "utf8").replace(/^\uFEFF/, "");
  } catch {
    return fallback;
  }
}