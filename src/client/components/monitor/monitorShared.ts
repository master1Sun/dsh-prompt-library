/**
 * 会话监控面板的共享类型与常量。
 * 从 TokenMonitorView 拆出：样式前缀、图表配色、宿主注入 Props、数据投影接口与详情条目定义。
 */
import type { ConversationSnapshot } from "@deepseek-ai/dsh-client-runtime/client";
import type { PLTranslate } from "../../utils/i18n.js";

/** `conversation.view` 的宿主标准运行时套件（会话轨迹亦依赖同一套注入）。 */
export interface MonitorProps {
  /** 会话快照选择器钩子（宿主必定注入）。 */
  useSession?: <T>(selector: (s: ConversationSnapshot) => T) => T;
  /** 会话投影选择器钩子：按 key 读取 token-meter / sessionStats 投影的当前值。 */
  useProjection?: <T>(key: string) => T | undefined;
  /** 翻译座位（宿主注入，已绑定 prompt-library 命名空间）。 */
  t?: PLTranslate;
}

/** tokenUsage 投影的值：供应商上报的累计 token 用量。 */
export interface TokenUsage {
  uncachedInputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/** contextPressure 投影的值：请求侧上下文占用（prompt 侧）。 */
export interface ContextPressure {
  pressureTokens?: number;
  projectedTokens?: number;
  contextWindow?: number;
}

/** contextBreakdown 投影的值：上下文构成（系统/工具/对话）。 */
export interface ContextBreakdown {
  systemTokens: number;
  toolsTokens: number;
  messageTokens: number;
}

/** sessionStats 投影的值：会话累计统计。 */
export interface SessionStats {
  turns: number;
  steps: number;
  llmMs: number;
  toolMs: number;
  ttftMs: number;
  ttftSteps: number;
  decodeMs: number;
  decodeTokens: number;
}

/**
 * trajectory 投影（快照 `s.views.get("trajectory")`）的无侵入子集：
 * 仅取本面板需要读的请求级 prompt（系统提示文本 + 工具 schema 列表）。
 * trajectory 插件可能未加载，此时 `views.get` 返回 undefined，需优雅降级。
 */
export interface TrajectoryToolView {
  name?: string;
}
export interface TrajectoryPromptView {
  system?: string;
  tools?: TrajectoryToolView[];
}
export interface TrajectoryRequestView {
  prompt?: TrajectoryPromptView;
}
export interface TrajectorySnapshotView {
  requests?: TrajectoryRequestView[];
}

/** 右侧「详细信息」抽屉的内容。 */
export interface DetailEntry {
  /** 抽屉标题（如工具名 / 区块标题 / 角色+来源）。 */
  title: string;
  /** 次要信息行（如 schema › parameters）。 */
  subtitle?: string;
  /** 正文是纯文本还是 JSON。 */
  lang: "text" | "json";
  /** 正文全文。 */
  content: string;
  /** file_path + content 类型的写入调用：抽屉内用 tab 展示内容预览（渲染 markdown）与参数 JSON。 */
  file?: { path: string; content: string };
  /** 需要「参数 / 对象」双 tab 的详情（如工具 schema），默认定位到「参数」。 */
  dualTabs?: boolean;
}

/** 样式作用域前缀，避免与宿主类名冲突。 */
export const S = "pl-mtr";

export const ACCENT_MESSAGES = "var(--dsw-static-blue-450)";
export const ACCENT_TOOLS = "#a78bfa";
export const ACCENT_SYSTEM = "var(--dsw-static-neutral-bluish-400)";
// 图表配色：直接使用具体色值，避免宿主 CSS 变量在 SVG/svgpath 上解析失败导致无色
export const ACCENT_UNCACHED = "#f59e0b"; // 琥珀：未命中缓存
export const ACCENT_CACHED = "#a78bfa"; // 紫：缓存读
export const ACCENT_CACHEWRITE = "#22d3ee"; // 青：缓存写
export const ACCENT_OUTPUT = "#5b8cff"; // 蓝：输出
// 上下文占用圆环：已用段绿色，未用段灰色（显式两段）
export const OCC_COLOR_LOW = "#34d399";
export const OCC_TRACK = "#9aa1ab";
