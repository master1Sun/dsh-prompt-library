/**
 * /api/prompt-library 的浏览器端 fetch 封装。
 *
 * host 路由的薄封装层；每个函数在成功时返回 `data` 字段，
 * 在非 ok 信封或传输失败时抛出异常。
 */
import type { PluginSettings, Prompt, PromptInput, PromptPatch, TrashItem } from "../../types.js";

const BASE = "/api/prompt-library/prompts";

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, headers: {} };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(path, init);
  let payload: ApiResponse<T>;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`prompt-library: bad response (${res.status})`);
  }
  if (!payload.ok || payload.data === undefined) {
    throw new Error(payload.error || `prompt-library: ${res.status}`);
  }
  return payload.data;
}

export function listPrompts(): Promise<Prompt[]> {
  return send<Prompt[]>("GET", BASE);
}

export function createPrompt(input: PromptInput): Promise<Prompt> {
  return send<Prompt>("POST", BASE, input);
}

export function updatePrompt(id: string, patch: PromptPatch): Promise<Prompt> {
  return send<Prompt>("PUT", `${BASE}/${encodeURIComponent(id)}`, patch);
}

export function deletePrompt(id: string): Promise<{ id: string }> {
  return send<{ id: string }>("DELETE", `${BASE}/${encodeURIComponent(id)}`);
}

/** 从原始草稿正文自动学习提示词（去重在 host 侧完成）。
 * skipEnrich：true 表示正文已在界面完成 AI 润色，不再触发后台 AI 完善。 */
export function learnPrompt(body: string, tag?: string, skipEnrich?: boolean): Promise<Prompt> {
  return send<Prompt>("POST", "/api/prompt-library/learn", { body, tag, skipEnrich });
}

/** 记录提示词的使用（点击插入时调用）。 */
export function usePrompt(id: string): Promise<Prompt> {
  return send<Prompt>("POST", `${BASE}/${encodeURIComponent(id)}`);
}

/** 导出全部提示词（备份内容，含 schema 版本与导出时间）。 */
export interface PromptBackup {
  version: 1;
  exportedAt: number;
  prompts: Prompt[];
}

/**
 * 导出提示词（备份内容，含 schema 版本与导出时间）。
 * 传入 ids 时仅导出勾选的提示词；缺省导出全部。
 */
export function exportPrompts(ids?: string[]): Promise<PromptBackup> {
  if (ids && ids.length > 0) {
    return send<PromptBackup>("POST", "/api/prompt-library/export", { ids });
  }
  return send<PromptBackup>("GET", "/api/prompt-library/export");
}

/** 从备份内容导入提示词（合并式），返回导入/更新/跳过条数。 */
export function importPrompts(
  data: unknown,
): Promise<{ imported: number; updated: number; skipped: number }> {
  return send<{ imported: number; updated: number; skipped: number }>(
    "POST",
    "/api/prompt-library/import",
    data,
  );
}

/** 标签汇总（名称 + 使用次数）。 */
export function listTags(): Promise<Array<{ name: string; count: number }>> {
  return send<Array<{ name: string; count: number }>>("GET", "/api/prompt-library/tags");
}

/** 重命名标签（合并到新标签），返回受影响条数。 */
export function renameTag(from: string, to: string): Promise<{ changed: number }> {
  return send<{ changed: number }>(
    "PUT",
    `/api/prompt-library/tags/${encodeURIComponent(from)}`,
    { to },
  );
}

/** 删除标签（从所有提示词中移除，内容变为未命名/未分类），返回受影响条数。 */
export function deleteTag(name: string): Promise<{ changed: number }> {
  return send<{ changed: number }>(
    "DELETE",
    `/api/prompt-library/tags/${encodeURIComponent(name)}`,
  );
}

/** 新建标签（已存在则忽略），返回规范化后的标签名。 */
export function createTag(name: string): Promise<{ name: string }> {
  return send<{ name: string }>("POST", "/api/prompt-library/tags", { name });
}

/** 批量生成技能的结果结构。 */
export interface SkillGenerateResult {
  generated: number;
  items: { title: string; name: string }[];
  errors: { title: string; reason: string }[];
  aiUnavailable: boolean;
}

/** 批量把勾选的提示词生成为 DSH 技能（写到 ~/.dsh/skills/<name>/SKILL.md）。 */
export function generateSkills(ids: string[]): Promise<SkillGenerateResult> {
  return send<SkillGenerateResult>("POST", "/api/prompt-library/skills/generate", { ids });
}

// ── 回收站管理 ────────────────────────────────────────────────────────────

/** 列出回收站中的全部提示词（按删除时间降序）。 */
export function listTrash(): Promise<TrashItem[]> {
  return send<TrashItem[]>("GET", "/api/prompt-library/trash");
}

/** 从回收站恢复一批提示词到词库。 */
export function restoreTrash(ids: string[]): Promise<{ restored: number }> {
  return send<{ restored: number }>("POST", "/api/prompt-library/trash/restore", { ids });
}

/** 从回收站永久删除一批提示词。 */
export function deleteTrash(ids: string[]): Promise<{ deleted: number }> {
  return send<{ deleted: number }>("POST", "/api/prompt-library/trash/delete", { ids });
}

/** 清空回收站（全部永久删除）。 */
export function emptyTrash(): Promise<{ deleted: number }> {
  return send<{ deleted: number }>("POST", "/api/prompt-library/trash/empty");
}

/**
 * 调用 harness AI 润色提示词正文，返回润色后的文本。
 * keepVariables 控制是否启用「{{}} 模板变量保留/新增」能力（默认开启）；
 * 聊天框按钮的 AI 润色传 false 关闭该能力。
 */
export function polishPrompt(
  body: string,
  opts?: { keepVariables?: boolean },
): Promise<{ polished: string }> {
  return send<{ polished: string }>("POST", "/api/prompt-library/ai/polish", {
    body,
    keepVariables: opts?.keepVariables ?? true,
  });
}

/** 设置界面用：单个提供方及其模型列表。 */
export interface ClientAiSelectable {
  provider: string;
  name: string;
  models: { id: string; name: string }[];
}

/** 读取系统中可用的 AI provider 及模型列表（设置界面下拉选择）。 */
export function getAiSelectables(): Promise<ClientAiSelectable[]> {
  return send<ClientAiSelectable[]>("GET", "/api/prompt-library/ai/providers");
}

/** 请求 AI 生成词库功能简介（5 句，供浮动小人气泡轮询）；失败时调用方回退到内置简介。 */
export function genIntro(lang: "zh" | "en"): Promise<{ lines: string[] }> {
  return send<{ lines: string[] }>("POST", "/api/prompt-library/ai/intro", { lang });
}

/** 版本检查结果：当前版本、npm 正式版最新、GitHub 测试版、是否有更新。 */
export interface UpdateInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  betaLatest: string;
  hasBeta: boolean;
  /** 安装 latest 时用的 GitHub release tag（如 v0.9.0）；为空表示 latest 来自 npm。 */
  gitTag: string;
  /** 红点测试版对应的 GitHub release tag（如 v0.9.0-beta1）；无测试版时为空串。 */
  betaTag: string;
}

/** 检查插件是否有新版本（host 侧含缓存；双源都失败时 hasUpdate/hasBeta 为 false）。 */
export function getUpdate(): Promise<UpdateInfo> {
  return send<UpdateInfo>("GET", "/api/prompt-library/update");
}

/** 执行安装命令，把插件升级到最新版；返回是否成功及命令输出。 */
export function applyUpdate(): Promise<{ ok: boolean; output: string }> {
  return send<{ ok: boolean; output: string }>("POST", "/api/prompt-library/update/apply");
}

const SETTINGS_BASE = "/api/prompt-library/settings";

/** 获取插件设置。 */
export function getSettings(): Promise<PluginSettings> {
  return send<PluginSettings>("GET", SETTINGS_BASE);
}

/** 更新插件设置（部分更新）。 */
export function updateSettings(patch: Partial<PluginSettings>): Promise<PluginSettings> {
  return send<PluginSettings>("PUT", SETTINGS_BASE, patch);
}

// ── 词库助手活动状态 ────────────────────────────────────────────────────

/** 词库助手活动阶段（与 host activity.ts 保持一致）。 */
export type ActivityPhase =
  | "idle"
  | "waiting"
  | "thinking"
  | "tool"
  | "review"
  | "done"
  | "failed";

/** 词库助手活动快照。 */
export interface ActivitySnapshot {
  phase: ActivityPhase;
  sessionActive: boolean;
}

/** 读取词库助手当前活动阶段（host 状态机投影官方会话事件，驱动小人动画）。 */
export function getActivity(): Promise<ActivitySnapshot> {
  return send<ActivitySnapshot>("GET", "/api/prompt-library/activity");
}