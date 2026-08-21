/**
 * 提示词库共享类型（host ↔ client）。
 */

/** 一条可复用的提示词片段，持久化到 ~/.dsh/prompt-library.json。 */
export interface Prompt {
  /** 稳定标识（UUID）。 */
  id: string;
  /** 在列表中显示的简短标题。 */
  title: string;
  /** 点击后插入到输入框的提示词正文。 */
  body: string;
  /** 可选的自定义标签，用于分组/筛选。 */
  tags?: string[];
  /** AI 生成的用途摘要/使用说明（显示在悬停详情）。 */
  summary?: string;
  /** AI 优化改写前的原始正文（仅当正文被改写时存在）。 */
  sourceBody?: string;
  /** 是否经过 AI 完善（标题/标签/摘要/正文）。 */
  aiRefined?: boolean;
  /** 最后一次修改的纪元毫秒时间戳。 */
  updatedAt: number;
  /** 创建时间的纪元毫秒时间戳。 */
  createdAt: number;
  /** 使用次数（用于排序和淘汰）。 */
  usageCount: number;
  /** 最后一次使用的纪元毫秒时间戳。 */
  lastUsedAt: number;
}

/** 持久化文件的磁盘结构。 */
export interface PromptStoreFile {
  /** 存储文件的 schema 版本。 */
  version: 1;
  prompts: Prompt[];
}

/** 规范的 API 响应信封。 */
export interface ApiResponse<T> {
  ok: boolean;
  /** 当 ok === true 时存在。 */
  data?: T;
  /** 当 ok === false 时存在。 */
  error?: string;
}

/** 小标题（title）允许的最大字符数。 */
export const TITLE_MAX_LEN = 25;

/** 把小标题限制在 TITLE_MAX_LEN 个字符内（中文按字计，超长直接截断）。 */
export function clampTitle(title: string): string {
  return title.slice(0, TITLE_MAX_LEN);
}

/** 创建请求的请求体。 */
export interface PromptInput {
  title: string;
  body: string;
  tags?: string[];
}

/** 更新请求的请求体（所有字段可选，但如果都不传则不生效）。 */
export interface PromptPatch {
  title?: string;
  body?: string;
  tags?: string[];
  summary?: string;
  sourceBody?: string;
  aiRefined?: boolean;
  usageCount?: number;
  lastUsedAt?: number;
}

/** 插件设置。 */
export interface PluginSettings {
  /** 是否开启自动学习。 */
  autoLearnEnabled: boolean;
  /** 自动学习提示词标签。 */
  autoLearnTag: string;
  /** 自动学习最小长度。 */
  autoLearnMinLength: number;
  /** 是否开启自动学习手动确认（聊天框弹出保存/取消，AI 智能完善开启时忽略）。 */
  autoLearnManualConfirm: boolean;
  /** 面板宽度（px）。 */
  panelWidth: number;
  /** 面板高度（px）。 */
  panelHeight: number;
  /** 是否启用右侧侧边栏展开/折叠。 */
  rightPanelEnabled: boolean;
  /** 是否在聊天框工具栏显示提示词库按钮。 */
  showComposerButton: boolean;
  /** 是否在聊天框工具栏显示 AI 润色按钮。 */
  showAIPolishButton: boolean;
  /** 是否启用输入 ~ 触发词库选择。 */
  tildaTriggerEnabled: boolean;
  /** 提示词最大存储数量。 */
  maxPromptCount: number;
  /** 是否启用鼠标移入显示详情。 */
  hoverDetailEnabled: boolean;
  /** 是否启用聊天内容选中文字后浮动「添加提示词」入口。 */
  selectionAddEnabled: boolean;
  /** 是否启用 AI 智能完善（调用 harness LLM 生成标题/标签/摘要并改写正文）。 */
  aiEnrichEnabled: boolean;
  /** AI 调用使用的 provider 路由（留空则自动发现）。 */
  aiProvider: string;
  /** AI 调用使用的模型 id（留空则自动发现）。 */
  aiModel: string;
  /** [实验室功能] 勾选后，把灵魂边界注入整个聊天会话，约束整个对话（后果自负）。 */
  applyCharacterToChat: boolean;
}

/** 设置的默认值。 */
export const DEFAULT_SETTINGS: PluginSettings = {
  autoLearnEnabled: true,
  autoLearnTag: "auto-learned",
  autoLearnMinLength: 60,
  autoLearnManualConfirm: false,
  panelWidth: 380,
  panelHeight: 500,
  rightPanelEnabled: false,
  showComposerButton: true,
  showAIPolishButton: true,
  tildaTriggerEnabled: true,
  maxPromptCount: 100,
  hoverDetailEnabled: false,
  selectionAddEnabled: false,
  aiEnrichEnabled: false,
  aiProvider: "",
  aiModel: "",
  applyCharacterToChat: false,
};