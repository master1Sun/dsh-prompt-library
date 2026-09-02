/**
 * 会话预览面板共享类型与常量。
 * 供 PreviewView 主组件及各拆分组件共同引用，避免重复定义与循环依赖。
 */
import type { ConversationSnapshot } from "@deepseek-ai/dsh-client-runtime/client";
import type { PLTranslate } from "../../utils/i18n.js";
import type { PreviewFileEntry, PreviewFileType } from "../../utils/api.js";

/** `conversation.view` 的宿主运行时套件（此视图仅依赖翻译座位与会话快照钩子）。 */
export interface PreviewProps {
  /** 会话快照选择器钩子（宿主注入）：读取当前被查看会话，切换会话（无论是否运行）即时跟随。 */
  useSession?: <T>(selector: (s: ConversationSnapshot) => T) => T;
  /** 翻译座位（宿主注入，已绑定 prompt-library 命名空间）。 */
  t?: PLTranslate;
}

/** 大纲条目：锚点 id + 标题层级 + 标题文本。 */
export interface OutlineItem {
  id: string;
  level: number;
  text: string;
}

/** 左侧树形节点：目录节点只有 name + children（path 存相对路径用于折叠标识），文件节点带 path/type/size。 */
export interface FileTreeNode {
  name: string;
  /** 目录节点：相对路径；文件节点：绝对路径。 */
  path?: string;
  type?: PreviewFileType;
  size?: number;
  children?: FileTreeNode[];
}

/** 移动/复制目标目录树的节点。 */
export interface MoveDirNode {
  name: string;
  rel: string;
  abs: string;
  children: MoveDirNode[];
}

/** 右键菜单目标：文件 / 目录 / 列表空白区。 */
export interface CtxTarget {
  kind: "file" | "dir" | "blank";
  /** 绝对路径（空白区=当前预览根目录）。 */
  absPath: string;
  /** 相对列表根目录的路径。 */
  relPath: string;
  /** 显示名 / 新建时的默认名。 */
  name: string;
  /** 文件类型（仅文件）。 */
  type?: PreviewFileType;
}

/** 智能文件分类：基于文件名、路径和内容特征。 */
export type SmartCategory = "docs" | "config" | "test" | "business" | "styles" | "data" | "other";

/** 样式作用域前缀，避免与宿主类名冲突。 */
export const S = "pl-pv";

/** 各类型的徽标文本与主题色。 */
export const TYPE_META: Record<PreviewFileType, { label: string; color: string }> = {
  md: { label: "md", color: "#60a5fa" },
  json: { label: "json", color: "#f59e0b" },
  txt: { label: "txt", color: "#94a3b8" },
  csv: { label: "csv", color: "#34d399" },
  // Programming languages
  ts: { label: "ts", color: "#3178c6" },
  js: { label: "js", color: "#f7df1e" },
  py: { label: "py", color: "#3776ab" },
  go: { label: "go", color: "#00add8" },
  rs: { label: "rs", color: "#dea584" },
  java: { label: "java", color: "#f89820" },
  c: { label: "c", color: "#a8b9cc" },
  cpp: { label: "cpp", color: "#00599c" },
  // Config files
  yml: { label: "yml", color: "#cb171f" },
  yaml: { label: "yaml", color: "#cb171f" },
  toml: { label: "toml", color: "#9c4121" },
  xml: { label: "xml", color: "#e37933" },
  // Log files
  log: { label: "log", color: "#6b7280" },
  // Images
  png: { label: "png", color: "#a855f7" },
  jpg: { label: "jpg", color: "#a855f7" },
  jpeg: { label: "jpeg", color: "#a855f7" },
  gif: { label: "gif", color: "#a855f7" },
  svg: { label: "svg", color: "#ffb13b" },
};

/** Prism 语言标识映射：将文件类型映射到 Prism 支持的语言名。 */
export const PRISM_LANG_MAP: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  c: "c",
  cpp: "cpp",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  xml: "markup",
};

/** 大文本文件按行窗口的分页读取 + 虚拟滚动渲染（只渲染可视窗口，带滚动条与行号）。 */
export const BIG_LINE_H = 20; // 单行像素高（与样式 line-height 对齐）
export const BIG_WINDOW = 500; // 每次拉取的行窗口大小（偏大减少请求数）
export const BIG_LOAD_THRESHOLD = 160; // 距窗口边缘多少行时提前拉新窗口
export const BIG_TEXT_THRESHOLD = 1500; // 超出该行数视为大文件，走分片视图

export type { PreviewFileEntry, PreviewFileType };
