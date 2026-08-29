/**
 * 操作手册（纯文本，用换行符排版）。
 *
 * /prompts 命令输出会在聊天框按纯文本展示：markdown 与 HTML 均无法解析，
 * 因此这里用普通字符串 + 换行符组织内容，中英双语并存于同一模块。
 *
 * 本手册仅用于 /prompts -h 与欢迎引导，不再经系统 prompt 注入打印到聊天框；
 * 会话上下文由 HARNESS 文件（~/.dsh/prompt-library/prompts/HARNESS.md）提供。
 *
 * 手册文案已外置到插件包 doc/manual.zh.txt、doc/manual.en.txt（构建时拷贝到
 * lib/doc，随包分发、可直接编辑），运行时用 readBundleDoc 同步读取；
 * 外置文件缺失 / 损坏时回退内置精简文案，避免命令空转。
 */
import { readBundleDoc } from "./host/bundle-doc.js";

/** 中文手册兜底文案（外置文件缺失时提示，而非空白）。 */
const FALLBACK_ZH =
  "dsh-prompt-library 词库 — 使用手册\n" +
  "==========================================\n\n" +
  "（使用手册未加载：插件包缺少 doc/manual.zh.txt，请重新安装或重新构建插件。）\n" +
  "快速上手：输入 /prompts 查看命令示例，/prompts -h 为完整手册。";

/** 英文手册兜底文案。 */
const FALLBACK_EN =
  "dsh-prompt-library — User Manual\n" +
  "================================\n\n" +
  "(Manual unavailable: the plugin package is missing doc/manual.en.txt; please reinstall or rebuild the plugin.)\n" +
  "Quick start: type /prompts for command examples, /prompts -h for the full manual.";

/** 使用手册（中文）— 从插件包外置文件读取，缺失回退内置文案。 */
export const manualZh = readBundleDoc("manual.zh.txt", FALLBACK_ZH);

/** 使用手册（英文）— 从插件包外置文件读取，缺失回退内置文案。 */
export const manualEn = readBundleDoc("manual.en.txt", FALLBACK_EN);