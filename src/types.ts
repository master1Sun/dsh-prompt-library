/**
 * 词库共享类型（host ↔ client）。
 */

/** 一条可复用的提示词片段，持久化到 SQLite（~/.dsh/prompt-library/db/prompts.db）。 */
export interface Prompt {
  /** 稳定标识（UUID）。 */
  id: string;
  /** 在列表中显示的简短标题。 */
  title: string;
  /** 点击后插入到输入框的提示词正文。 */
  body: string;
  /** 可选的自定义标签，用于分组/筛选。 */
  tags?: string[];
  /** AI 生成的用途摘要/使用说明。 */
  summary?: string;
  /** AI 优化改写前的原始正文（仅当正文被改写时存在）。 */
  sourceBody?: string;
  /** 是否经过 AI 完善（标题/标签/摘要/正文）。 */
  aiRefined?: boolean;
  /** AI 首次完善的毫秒时间戳（0 表示从未完善）。 */
  aiRefinedAt?: number;
  /** 最后一次修改的纪元毫秒时间戳。 */
  updatedAt: number;
  /** 创建时间的纪元毫秒时间戳。 */
  createdAt: number;
  /** 使用次数（用于排序和淘汰）。 */
  usageCount: number;
  /** 最后一次使用的纪元毫秒时间戳。 */
  lastUsedAt: number;
}

/** 回收站中的一条提示词（含删除时间）。 */
export interface TrashItem extends Prompt {
  /** 移入回收站的时间（纪元毫秒）。 */
  deletedAt: number;
}

/** 会话级技能：独立于普通词库（prompts）的另一套技能，供「会话级词库管理」与「技能管理」使用。 */
export interface SessionPrompt {
  /** 稳定标识（UUID）。 */
  id: string;
  /** 在列表中显示的简短标题。 */
  title: string;
  /** 注入到系统提示/输入框的技能正文。 */
  body: string;
  /** 可选的自定义标签（仅保留单个）。 */
  tags?: string[];
  /** 是否启用（禁用的技能不会被注入，即使被临时注入或路径绑定）。 */
  enabled: boolean;
  /** 最后一次修改的纪元毫秒时间戳。 */
  updatedAt: number;
  /** 使用次数。 */
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

/** 人格元信息（来自 SQLite personas 表）。 */
export interface PersonaMeta {
  /** 稳定标识（UUID）；保留 id `default` 表示内置默认人格。 */
  id: string;
  /** 人格名称（可编辑）。 */
  name: string;
  /** 是否启用（禁用的人格不会被按会话注入）。 */
  enabled: boolean;
  /** 创建时间的纪元毫秒时间戳。 */
  createdAt: number;
  /** 最后一次修改的纪元毫秒时间戳。 */
  updatedAt: number;
}

/** 面向 UI 的完整人格视图：元信息 + SOUL 正文 + 是否内置默认。 */
export interface PersonaView extends PersonaMeta {
  /** 是否为内置默认人格（不可删除/重命名）。 */
  isDefault: boolean;
  /** SOUL 正文（默认人格存于 meta 表，自定义人格存于 personas.body）。 */
  content: string;
}

/** 工作区/项目路径 → 人格 绑定视图（无绑定返回空串表示「使用默认人格」）。 */
export interface PersonaBinding {
  /** 该路径精确绑定的自定义人格 id；空串表示未精确绑定（回落默认/上层）。 */
  personaId: string;
}

/** 会话（会话 id 维度绑定）：会话在树中挂载到其工作目录 cwd 命中的工作区/项目节点下。 */
export interface SessionNode {
  /** 会话 id（持久绑定的 key，也即注入时的 context.scope）。 */
  id: string;
  /** 展示名（有标题用标题，否则回落为「会话 + id 片段」）。 */
  title: string;
  /** 会话工作目录（header.cwd），用于归属到工作区/项目树。 */
  cwd: string;
  /** 该会话精确绑定的人格 id（'' 表示未绑定，回落默认/上层）。 */
  boundPersonaId: string;
  /** 该会话精确绑定的技能 id 列表。 */
  boundPromptIds: string[];
}

/** 「其他会话」分组的合成路径 key（未命中任何工作区/项目的会话归入该分组，前端据此本地化标题）。 */
export const UNMATCHED_SCOPE_PATH = "__pl_unmatched__";

/** 「工作区 → 项目 → 会话」树节点：供技能管理右栏「项目绑定」树形选择并绑定。 */
export interface ScopeNode {
  /** 绝对路径（绑定的 key）。 */
  path: string;
  /** 展示名（工作区用其标题，项目用目录名）。 */
  title: string;
  /** 节点类型。 */
  kind: "workspace" | "project";
  /** 该层精确绑定的人格 id（'' 表示未精确绑定，回落默认/上层）。 */
  bound: string;
  /** 该路径精确绑定的技能 id 列表（会话级技能注入弹窗用）。 */
  boundPromptIds?: string[];
  /** 归属到本节点的会话（按 cwd 最深的路径前缀匹配）。 */
  sessions?: SessionNode[];
  /** 子项目节点（工作区下）或空数组（项目无下级）。 */
  children: ScopeNode[];
}

/** 插件设置。 */
export interface PluginSettings {
  /** 面板宽度（px）。 */
  panelWidth: number;
  /** 面板高度（px）。 */
  panelHeight: number;
  /** 是否显示左侧设置按钮上方的词库按钮。 */
  settingsAboveMenuEnabled: boolean;
  /** 是否在聊天框工具栏显示词库按钮。 */
  showComposerButton: boolean;
  /** 词库按钮用纯图标显示（隐藏文字标签，仅保留图标）。 */
  composerButtonIconOnly: boolean;
  /** 是否在聊天框工具栏显示 AI 润色按钮。 */
  showAIPolishButton: boolean;
  /** AI 润色按钮用纯图标显示（隐藏文字标签，仅保留图标）。 */
  aiPolishButtonIconOnly: boolean;
  /** 是否启用输入 ~ 触发词库选择。 */
  tildaTriggerEnabled: boolean;
  /** 提示词最大存储数量。 */
  maxPromptCount: number;
  /** 是否启用聊天内容选中文字后浮动「添加提示词」入口。 */
  selectionAddEnabled: boolean;
  /** 是否启用基于聊天上下文的提示词推荐（显示在输入框上方，输入框为空时展示）。 */
  contextRecommendEnabled: boolean;
  /** AI 调用使用的 provider 路由（留空则自动发现）。 */
  aiProvider: string;
  /** AI 调用使用的模型 id（留空则自动发现）。 */
  aiModel: string;
  /** 是否启用「数据管理」入口（含导入导出/标签/回收站）。默认开启。 */
  dataManagementEnabled: boolean;
}

/** 设置的默认值。 */
export const DEFAULT_SETTINGS: PluginSettings = {
  panelWidth: 360, // 右侧面板宽度（px）
  panelHeight: 500, // 右侧面板高度（px）
  maxPromptCount: 100, // 提示词最大存储数量（超出时按使用次数/更新时间淘汰）
  aiProvider: "", // AI 调用使用的 provider（留空自动发现）
  aiModel: "", // AI 调用使用的模型 id（留空自动发现）
  settingsAboveMenuEnabled: true, // 是否显示左侧设置按钮上方的词库按钮（默认开启）
  showComposerButton: true, // 是否在聊天框工具栏显示词库按钮
  composerButtonIconOnly: true, // 词库按钮用纯图标显示（隐藏文字，仅保留图标）
  showAIPolishButton: true, // 是否在聊天框工具栏显示 AI 润色按钮
  aiPolishButtonIconOnly: true, // AI 润色按钮用纯图标显示（隐藏文字，仅保留图标）
  tildaTriggerEnabled: true, // 是否启用输入 ~ 触发词库选择
  selectionAddEnabled: true, // 是否启用选中文本后浮动「添加提示词」入口
  contextRecommendEnabled: true, // 是否启用基于聊天上下文的提示词推荐
  dataManagementEnabled: true, // 数据管理：卡片菜单/词库菜单展示「数据管理」入口
};