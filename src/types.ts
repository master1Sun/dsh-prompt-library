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
  /** 最后一次修改的纪元毫秒时间戳。 */
  updatedAt: number;
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
}