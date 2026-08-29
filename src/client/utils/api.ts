/**
 * /api/prompt-library 的浏览器端 fetch 封装。
 *
 * host 路由的薄封装层；每个函数在成功时返回 `data` 字段，
 * 在非 ok 信封或传输失败时抛出异常。
 */
import type {
  PersonaBinding,
  PersonaView,
  PluginSettings,
  Prompt,
  PromptInput,
  PromptPatch,
  ScopeNode,
  SessionPrompt,
  TrashItem,
} from "../../types.js";

const BASE = "/api/prompt-library/prompts";
const PERSONAS_BASE = "/api/prompt-library/personas";
const SESSION_PROMPTS_BASE = "/api/prompt-library/session-prompts";

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function send<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const init: RequestInit = { method, headers: {} };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  if (signal) init.signal = signal;
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
 * skipEnrich：true 表示正文已在界面完成 AI 润色，不再触发后台 AI 完善。
 * summary：可选，已润色时把 AI 生成的用途摘要一并入库。 */
export function learnPrompt(body: string, tag?: string, skipEnrich?: boolean, summary?: string): Promise<Prompt> {
  return send<Prompt>("POST", "/api/prompt-library/learn", { body, tag, skipEnrich, summary });
}

/** 记录提示词的使用（点击插入时调用）。 */
export function usePrompt(id: string): Promise<Prompt> {
  return send<Prompt>("POST", `${BASE}/${encodeURIComponent(id)}`);
}

/** 重新触发某条提示词的 AI 完善（查看详情「重新完善」入口）。返回是否成功触发。 */
export function refinePrompt(id: string): Promise<{ ok: boolean }> {
  return send<{ ok: boolean }>("POST", `${BASE}/${encodeURIComponent(id)}/refine`);
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

/** 后端下载结果：后端把文件写入系统「下载」目录后返回保存路径与条数。 */
export interface ExportSaveResult {
  count: number;
  filePath: string;
}

/**
 * 走后端下载：前端只传勾选的 ids 与导出格式，由后端拉取数据、组织文件并写入系统「下载」目录。
 * 仅在文件真正写入磁盘后 resolve，不再有浏览器下载时序问题。
 */
export function saveExportFile(ids: string[], format: string): Promise<ExportSaveResult> {
  return send<ExportSaveResult>("POST", "/api/prompt-library/export/save", { ids, format });
}

/** 导入提示词的结果：成功/更新/跳过条数 + 逐条结果。 */
export interface ImportPromptsResult {
  imported: number;
  updated: number;
  skipped: number;
  /** 逐条结果（title 为空表示该行无可用标题）。 */
  items: Array<{ title: string; status: "imported" | "updated" | "skipped" }>;
}

/** 从备份内容导入提示词（合并式），返回导入/更新/跳过条数及逐条结果。 */
export function importPrompts(data: unknown): Promise<ImportPromptsResult> {
  return send<ImportPromptsResult>("POST", "/api/prompt-library/import", data);
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

/** 逆向导入技能的结果结构。 */
export interface SkillImportResult {
  imported: number;
  updated: number;
  skipped: number;
  /** 成功 / 跳过的技能清单（status：imported 新增 / updated 覆盖 / skipped 正文为空跳过）。 */
  items: { title: string; name: string; status: "imported" | "updated" | "skipped" }[];
  errors: { name: string; reason: string }[];
}

/** 逆向导入：读取 ~/.dsh/skills/<name>/SKILL.md 批量生成为提示词入库。 */
export function importSkills(): Promise<SkillImportResult> {
  return send<SkillImportResult>("POST", "/api/prompt-library/skills/import");
}

/** 待逆向导入的单条技能条目（用户在弹窗中编辑后提交保存）。 */
export interface SkillEntry {
  /** 技能名（kebab-case），用于与 prompt_skill_links 关联；缺省由标题生成。 */
  name?: string;
  title: string;
  body: string;
  summary?: string;
}

/** 可供选择导入的技能来源：已解析为可编辑内容的条目 + 是否已入库。 */
export interface SkillSource {
  name: string;
  title: string;
  body: string;
  summary: string;
  /** 是否已入库（同名技能已关联过提示词 → 再次导入为覆盖更新）。 */
  exists: boolean;
}

/** 列出 ~/.dsh/skills 下可导入的技能（解析为可编辑条目，供导入弹窗勾选）。 */
export function listAvailableSkills(): Promise<SkillSource[]> {
  return send<SkillSource[]>("GET", "/api/prompt-library/skills/available");
}

/** 递归扫描指定目录下的 md 文件为可导入技能条目（「扫描文件夹」导入，解析结果同 listAvailableSkills）。 */
export function scanSkillDir(dir: string): Promise<SkillSource[]> {
  return send<SkillSource[]>("POST", "/api/prompt-library/skills/scan-dir", { dir });
}

/** 解析一段 md 原始文本（frontmatter + 正文）为可编辑条目（供「选择本地 md 文件」导入）。 */
export function parseSkillRaw(raw: string): Promise<{ title: string; body: string; summary: string }> {
  return send<{ title: string; body: string; summary: string }>(
    "POST",
    "/api/prompt-library/skills/parse",
    { raw },
  );
}

/** 保存用户在弹窗中编辑后的技能条目入库（带「skill」标签，同名技能覆盖更新）。 */
export function importSkillEntries(entries: SkillEntry[]): Promise<SkillImportResult> {
  return send<SkillImportResult>("POST", "/api/prompt-library/skills/import/entries", { entries });
}

/** 批量导出技能的结果：成功条数 + 成功清单 + 失败清单。 */
export interface SkillExportResult {
  exported: number;
  /** 实际导出位置（目录），用于结果通知展示导出路径。 */
  root: string;
  items: { title: string; name: string }[];
  errors: { title: string; reason: string }[];
}

/** 技能导出范围：global 通用（全局技能库）/ project 项目（当前项目）/ private 私有（绑定当前会话）。 */
export type SkillExportScope = "global" | "project" | "private";

/**
 * 把用户在弹窗中编辑后的技能条目导出为 DSH 技能。
 * scope 缺省 global：写盘 ~/.dsh/skills/<name>/SKILL.md；
 * project：写盘项目级技能库 <项目路径>/.dsh/skills/<name>/SKILL.md（rootPath 为未自动解析到当前项目时用户手动填写的项目路径）；
 * private：创建为会话级技能并绑定当前会话。
 */
export function exportSkillEntries(
  entries: SkillEntry[],
  scope: SkillExportScope = "global",
  rootPath?: string,
): Promise<SkillExportResult> {
  return send<SkillExportResult>("POST", "/api/prompt-library/skills/export/entries", {
    entries,
    scope,
    rootPath,
  });
}

/** 解析当前项目路径（导出弹窗「项目技能」范围用）：cwd 为当前项目绝对路径，无法确定时为 null。 */
export function getExportProjectCwd(): Promise<{ cwd: string | null }> {
  return send<{ cwd: string | null }>("GET", "/api/prompt-library/skills/export/project-cwd");
}

/** AI 依据提示词内容生成的技能描述符（导出弹窗「校验并 AI 生成」用）。 */
export interface SkillDescriptor {
  name: string;
  description: string;
  whenToUse?: string;
}

/** 技能描述符生成失败原因码（与 host 端 SkillDescribeFail 保持一致）。 */
export type SkillDescribeFail = "no-llm" | "route" | "empty" | "parse";

/** AI 生成结果：{ desc } 成功；{ fail } 失败并给出原因码。 */
export interface SkillDescribeResult {
  desc?: SkillDescriptor;
  fail?: SkillDescribeFail;
}

/** 用 AI 依据提示词内容生成技能名与描述（不改写正文，保留 {{变量名}}）。 */
export function describeSkill(
  payload: {
    title: string;
    body: string;
    summary?: string;
    tags?: string[];
  },
  signal?: AbortSignal,
): Promise<SkillDescribeResult> {
  return send<SkillDescribeResult>("POST", "/api/prompt-library/skills/ai-describe", payload, signal);
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
 * withSummary 开启时同时生成用途摘要（AI 优化后展示/保存摘要用）。
 */
export function polishPrompt(
  body: string,
  opts?: { keepVariables?: boolean; withSummary?: boolean },
): Promise<{ polished: string; summary?: string }> {
  return send<{ polished: string; summary?: string }>("POST", "/api/prompt-library/ai/polish", {
    body,
    keepVariables: opts?.keepVariables ?? true,
    withSummary: opts?.withSummary ?? false,
  });
}

/** AI 生成失败原因码（与 host 端 DraftGenerateFail 保持一致）。 */
export type DraftGenerateFail = "no-llm" | "route" | "empty";

/** 依据「标题 + 已有内容」用 AI 生成技能 / 人格正文草稿（人格管理 / 技能管理「AI 生成」按钮用）。 */
export function generateDraft(
  kind: "soul" | "skill",
  title: string,
  input: string,
  lang?: "zh" | "en",
): Promise<{ content: string }> {
  return send<{ content: string }>("POST", "/api/prompt-library/ai/draft", {
    kind,
    title,
    input,
    lang,
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

/** 请求 AI 生成词库功能简介（5 句，供浮动助手气泡轮询）；失败时调用方回退到内置简介。 */
export function genIntro(lang: "zh" | "en"): Promise<{ lines: string[] }> {
  return send<{ lines: string[] }>("POST", "/api/prompt-library/ai/intro", { lang });
}

/** 请求 AI 依据词库当前统计生成建议点评（公告看板「AI 建议」卡片；AI 不可用时返回空串）。 */
export function getAiSuggest(lang: "zh" | "en"): Promise<{ suggestion: string }> {
  return send<{ suggestion: string }>("POST", "/api/prompt-library/ai/suggest", { lang });
}

/** 版本检查结果：当前版本、最新可更新版本、是否有更新及来源。 */
export interface UpdateInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  /** 该更新来源：npm（优先，默认）或 github（npm 不可达时的兜底）。 */
  source: "npm" | "github";
  /** github 来源对应的 release tag（如 v0.9.0）；npm 来源为空串。 */
  gitTag: string;
}

/** 检查插件是否有新版本（host 侧含缓存；双源都失败时 hasUpdate 为 false）。 */
export function getUpdate(): Promise<UpdateInfo> {
  return send<UpdateInfo>("GET", "/api/prompt-library/update");
}

/** 手动升级的实时进度（客户端轮询以驱动更新进度条）。 */
export interface UpdateProgress {
  /** 是否有升级正在后台执行。 */
  active: boolean;
  stage: "idle" | "checking" | "downloading" | "installing" | "done" | "failed";
  /** 进度百分比（0-100）。 */
  percent: number;
  /** 可选附加说明（如安装命令输出摘要）。 */
  detail?: string;
}

/** 启动后台升级插件到最新版：立即返回是否已成功发起；升级在后台执行，实时进度由 getUpdateProgress 轮询获取。 */
export function applyUpdate(): Promise<{ ok: boolean; started: boolean; error?: string }> {
  return send<{ ok: boolean; started: boolean; error?: string }>("POST", "/api/prompt-library/update/apply");
}

/** 读取后台升级的实时进度（升级期间的进度条/阶段变化）。 */
export function getUpdateProgress(): Promise<UpdateProgress> {
  return send<UpdateProgress>("GET", "/api/prompt-library/update/progress");
}

/** 通知 host 重启本地 dsh web 服务（重启后当前连接会短暂断开）。 */
export function restartService(): Promise<{ ok: boolean; error?: string }> {
  return send<{ ok: boolean; error?: string }>("POST", "/api/prompt-library/restart");
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

// ── 多人格管理 ──────────────────────────────────────────────────────────

/** 列出全部人格（含内置默认人格，排最前）。 */
export function listPersonas(): Promise<PersonaView[]> {
  return send<PersonaView[]>("GET", PERSONAS_BASE);
}

/** 新建自定义人格（自动写入默认 SOUL 文件），返回完整视图。 */
export function createPersona(name: string): Promise<PersonaView> {
  return send<PersonaView>("POST", PERSONAS_BASE, { name });
}

/** 更新人格：可改名称 / 启用状态 / SOUL 正文（默认人格的名称与正文只读，更新会被 host 拒绝）。 */
export function updatePersona(
  id: string,
  patch: { name?: string; enabled?: boolean; content?: string },
): Promise<PersonaView> {
  return send<PersonaView>("PUT", `${PERSONAS_BASE}/${encodeURIComponent(id)}`, patch);
}

/** 删除自定义人格（删除记录、会话绑定与 SOUL 文件；默认人格不可删）。 */
export function deletePersona(id: string): Promise<{ id: string }> {
  return send<{ id: string }>("DELETE", `${PERSONAS_BASE}/${encodeURIComponent(id)}`);
}

/** 读取工作区/项目树（节点自带精确绑定的人格 id）。 */
export function listScopeTree(): Promise<ScopeNode[]> {
  return send<ScopeNode[]>("GET", `${PERSONAS_BASE}/scopes`);
}

/** 读取「工作区 → 项目 → 会话」树（工作区/项目节点下挂会话，会话自带人格与技能绑定）。 */
export function listSessionScopeTree(): Promise<ScopeNode[]> {
  return send<ScopeNode[]>("GET", `${PERSONAS_BASE}/scopes/sessions`);
}

/** 读取某路径精确绑定的自定义人格 id（无绑定返回空串，表示使用默认人格）。 */
export function getPersonaBinding(path: string): Promise<PersonaBinding> {
  return send<PersonaBinding>("GET", `${PERSONAS_BASE}/scopes/binding?path=${encodeURIComponent(path)}`);
}

/** 设置某路径绑定的人格（传入 'default'/空串 → 回落默认/上层），返回实际生效的人格 id。 */
export function setPersonaBinding(path: string, personaId: string): Promise<PersonaBinding> {
  return send<PersonaBinding>("PUT", `${PERSONAS_BASE}/scopes/binding`, { path, personaId });
}

// ── 会话级技能与技能注入 ────────────────────────────────────────────────

/** 列出全部会话级技能。 */
export function listSessionPrompts(): Promise<SessionPrompt[]> {
  return send<SessionPrompt[]>("GET", SESSION_PROMPTS_BASE);
}

/** 新建一条会话级技能。 */
export function createSessionPrompt(input: PromptInput): Promise<SessionPrompt> {
  return send<SessionPrompt>("POST", SESSION_PROMPTS_BASE, input);
}

/** 更新一条会话级技能（会话级技能额外支持启用状态）。 */
export function updateSessionPrompt(
  id: string,
  patch: PromptPatch & { enabled?: boolean },
): Promise<SessionPrompt> {
  return send<SessionPrompt>("PUT", `${SESSION_PROMPTS_BASE}/${encodeURIComponent(id)}`, patch);
}

/** 删除一条会话级技能（同时清理绑定与临时注入引用）。 */
export function deleteSessionPrompt(id: string): Promise<{ id: string }> {
  return send<{ id: string }>("DELETE", `${SESSION_PROMPTS_BASE}/${encodeURIComponent(id)}`);
}

/** 列出全部路径 → 会话级技能 绑定。 */
export function listSessionPromptBindings(): Promise<Array<{ path: string; promptIds: string[] }>> {
  return send<Array<{ path: string; promptIds: string[] }>>("GET", `${SESSION_PROMPTS_BASE}/bindings`);
}

/** 读取某路径精确绑定的会话级技能 id 列表。 */
export function getSessionPromptBinding(path: string): Promise<{ promptIds: string[] }> {
  return send<{ promptIds: string[] }>(
    "GET",
    `${SESSION_PROMPTS_BASE}/bindings/path?path=${encodeURIComponent(path)}`,
  );
}

/** 设置某路径绑定的会话级技能 id 列表（空数组 → 解除绑定）。 */
export function setSessionPromptBinding(path: string, promptIds: string[]): Promise<{ promptIds: string[] }> {
  return send<{ promptIds: string[] }>("PUT", `${SESSION_PROMPTS_BASE}/bindings`, { path, promptIds });
}

/** 清除某路径的会话级技能绑定。 */
export function clearSessionPromptBinding(path: string): Promise<{ cleared: boolean }> {
  return send<{ cleared: boolean }>(
    "DELETE",
    `${SESSION_PROMPTS_BASE}/bindings?path=${encodeURIComponent(path)}`,
  );
}

/** 一键清空技能绑定（所有路径 + 会话的技能绑定，人格不受影响）。 */
export function clearAllBindings(): Promise<{ cleared: boolean }> {
  return send<{ cleared: boolean }>("DELETE", `${SESSION_PROMPTS_BASE}/bindings/all`);
}

/** 一键清空人格绑定（所有路径 + 会话的人格绑定，技能不受影响）。 */
export function clearAllPersonaBindings(): Promise<{ cleared: boolean }> {
  return send<{ cleared: boolean }>("DELETE", `${PERSONAS_BASE}/scopes/bindings/all`);
}

/** 读取某会话 scope 临时注入的会话级技能 id 列表。 */
export function getSessionActivePrompts(scope: string): Promise<{ promptIds: string[] }> {
  return send<{ promptIds: string[] }>(
    "GET",
    `${SESSION_PROMPTS_BASE}/active?scope=${encodeURIComponent(scope)}`,
  );
}

/** 设置某会话 scope 临时注入的会话级技能 id 列表（空数组 → 清除该会话的临时注入）。 */
export function setSessionActivePrompts(scope: string, promptIds: string[]): Promise<{ promptIds: string[] }> {
  return send<{ promptIds: string[] }>("PUT", `${SESSION_PROMPTS_BASE}/active`, { scope, promptIds });
}

// ── 会话解析诊断（排查「设了人格/技能却没生效」用）──────────────────────

/** 会话解析诊断结果（与组装端同一套逻辑）。 */
export interface ScopeDiag {
  sessid: string;
  cwd: string;
  personaId: string;
  personaName: string;
  personaSource: "session" | "path" | "default";
  promptIds: string[];
  promptTitles: string[];
  activeCount: number;
  checkedPaths: string[];
}

/** 拉取某会话（省略则取最近活跃）当前的解析命中：人格来源、命中的技能。 */
export function diagSession(sessid?: string): Promise<ScopeDiag> {
  const q = sessid ? `?sessid=${encodeURIComponent(sessid)}` : "";
  return send<ScopeDiag>("GET", `${SESSION_PROMPTS_BASE}/diag${q}`);
}

// ── Harness 技能软控制（~/.dsh/skills 系统技能 + 项目技能）─────────────────

/** 单条 harness 技能及其开关状态（与 host 端 HarnessSkillItem 一致）。 */
export interface HarnessSkillItem {
  /** 技能目录绝对路径（唯一 id，开关回写时原样返回）。 */
  id: string;
  /** 归属：system（~/.dsh/skills）/ project（<项目>/.dsh/skills）。 */
  scope: "system" | "project";
  /** kebab-case 技能名。 */
  name: string;
  /** 可读标题。 */
  title: string;
  /** 摘要（可能为空）。 */
  summary: string;
  /** 技能根目录。 */
  root: string;
  /** 当前是否启用。 */
  enabled: boolean;
}

/** 列出 system（~/.dsh/skills）与当前项目的 harness 技能及开关状态。 */
export function listHarnessSkillToggles(): Promise<{ items: HarnessSkillItem[]; projectRoot: string | null }> {
  return send<{ items: HarnessSkillItem[]; projectRoot: string | null }>("GET", "/api/prompt-library/skills/harness/list");
}

/** 更新某 harness 技能的开关（软控制：禁用清单注入系统提示）。 */
export function setHarnessSkillToggle(id: string, enabled: boolean): Promise<{ id: string; enabled: boolean }> {
  return send<{ id: string; enabled: boolean }>("POST", "/api/prompt-library/skills/harness/toggle", { id, enabled });
}

/** 删除某 harness 技能（删除其技能根目录下的整个目录）。 */
export function deleteHarnessSkill(id: string): Promise<{ id: string }> {
  return send<{ id: string }>("POST", "/api/prompt-library/skills/harness/delete", { id });
}

/** 设置某会话绑定的自定义人格（传 'default'/空串 → 回落默认/上层），返回实际生效的人格 id。 */
export function setSessionPersonaBinding(sessionId: string, personaId: string): Promise<{ personaId: string }> {
  return send<{ personaId: string }>("PUT", `${SESSION_PROMPTS_BASE}/session/persona`, { sessionId, personaId });
}

/** 设置某会话持久绑定的会话级技能 id 列表（空数组 → 解除该会话的技能绑定）。 */
export function setSessionPromptBindingForSession(
  sessionId: string,
  promptIds: string[],
): Promise<{ promptIds: string[] }> {
  return send<{ promptIds: string[] }>("PUT", `${SESSION_PROMPTS_BASE}/session/prompts`, { sessionId, promptIds });
}

/** 清除某会话的全部持久绑定（人格回落默认、技能不再注入）。 */
export function clearSessionBinding(sessionId: string): Promise<{ cleared: boolean }> {
  return send<{ cleared: boolean }>(
    "DELETE",
    `${SESSION_PROMPTS_BASE}/session?sessionId=${encodeURIComponent(sessionId)}`,
  );
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
  /** 是否有正在进行的会话；无会话时助手应回到 idle。 */
  sessionActive: boolean;
  /** 当前聊天主题风格（code/writing/translate/qa/general），由 host 分类。 */
  topic?: string;
  /** 匹配当前主题 + 阶段 + 语言的一条文案（同阶段多套轮换），由 host 推送。 */
  text?: string;
}

/** 读取词库助手当前活动阶段与阶段文案（host 状态机投影官方会话事件，驱动助手动画）。 */
export function getActivity(lang?: string): Promise<ActivitySnapshot> {
  const q = lang ? `?lang=${encodeURIComponent(lang)}` : "";
  return send<ActivitySnapshot>("GET", `/api/prompt-library/activity${q}`);
}

// ── DeepSeek 余额判断 ─────────────────────────────────────────────

/** DeepSeek 余额信息（未接入真实查询前由 host 返回 null 占位）。 */
export interface DeepSeekCredit {
  /** 结算币种，如 CNY。 */
  currency: string;
  /** 账户总余额。 */
  total: number;
}

/** DeepSeek 余额快照：isDeepSeek 表示当前是否在使用 DeepSeek API。 */
export interface DeepSeekBalance {
  isDeepSeek: boolean;
  /** 余额数据，未接入真实查询前为 null；后续接入后为 DeepSeekCredit。 */
  balance: DeepSeekCredit | null;
}

/**
 * 读取当前是否使用 DeepSeek API 及余额。
 * 本轮仅做「判断 + 常驻角标界面」，未接真实查询，balance 恒为 null；
 * 待用户配置 DeepSeek API Key 后 host 返回真实余额。
 */
export function getDeepSeekBalance(): Promise<DeepSeekBalance> {
  return send<DeepSeekBalance>("GET", "/api/prompt-library/deepseek/balance");
}

// ── 词库助手游戏化状态（等级 / 成就 / 彩蛋）────────────────────────────

/** 词库助手等级信息。 */
export interface AssistantLevel {
  /** 当前等级（1 起步，已考虑回落）。 */
  level: number;
  /** 当前等级称号。 */
  title: string;
  /** 当前累计使用次数。 */
  current: number;
  /** 升下一级所需累计使用次数；0 表示已满级。 */
  next: number;
  /** 当前等级内进度百分比（0-100）。 */
  pct: number;
  /** 是否因长期未使用而触发等级回落。 */
  decayed?: boolean;
  /** 距上次使用的天数（本地时区），用于解释回落原因。 */
  inactiveDays?: number;
  /** 距回落到上一档的净积分差（level>1 时有效，否则 0）。 */
  dropGap?: number;
  /** 上一档称号（按语言；level=1 时为空串）。 */
  prevTitle?: string;
}

/** 词库助手单条成就（含稀有度、进度与分值）。 */
export interface AssistantAchievement {
  id: string;
  title: string;
  desc: string;
  achieved: boolean;
  /** 稀有度：common/rare/epic/legendary/myth。 */
  rarity: "common" | "rare" | "epic" | "legendary" | "myth";
  /** 解锁可得分值。 */
  points: number;
  /** 当前进度值。 */
  progress: number;
  /** 达成目标值。 */
  target: number;
}

/** 词库助手成就汇总（称号 + 达成数 + 成就点）。 */
export interface AssistantAchievementSummary {
  /** 成长称号。 */
  rank: string;
  /** 成长称号档位标识。 */
  rankKey: "wanderer" | "explorer" | "collector" | "star" | "legend";
  /** 已解锁成就数。 */
  unlocked: number;
  /** 成就总数。 */
  total: number;
  /** 已获得成就点。 */
  earnedPoints: number;
  /** 成就点上限。 */
  maxPoints: number;
}

/** 词库助手一条彩蛋文案。 */
export interface AssistantEasterEgg {
  id: string;
  text: string;
}

/** 词库助手一段等级档位门槛（等级详情用）。 */
export interface AssistantLevelMilestone {
  level: number;
  /** 达到该等级所需的净积分。 */
  threshold: number;
  zh: string;
  en: string;
}

/** 词库助手一种积分获取来路。 */
export interface AssistantPointSource {
  kind: string;
  points: number;
  zh: string;
  en: string;
}

/** 词库助手游戏化快照。 */
export interface AssistantStatus {
  level: AssistantLevel;
  achievements: AssistantAchievement[];
  achievementSummary: AssistantAchievementSummary;
  easterEgg: AssistantEasterEgg | null;
  /** 各等级档位门槛（等级详情）。 */
  levelRules: AssistantLevelMilestone[];
  /** 积分获取来路。 */
  pointSources: AssistantPointSource[];
  /** 积分衰减规则文案。 */
  decayRule: string;
}

/** 读取词库助手等级 / 成就 / 彩蛋快照（host 依据统计与本地时间生成）。 */
export function getAssistantStatus(lang?: string): Promise<AssistantStatus> {
  const q = lang ? `?lang=${encodeURIComponent(lang)}` : "";
  return send<AssistantStatus>("GET", `/api/prompt-library/assistant/status${q}`);
}

// ── 公告通告 ────────────────────────────────────────────────────────────

/** 单版本更新条目（由 host 的 VERSION_NOTES 生成，按语言填充）。 */
export interface VersionEntry {
  /** 版本号。 */
  version: string;
  /** 发布日期 YYYY-MM-DD，可选。 */
  date?: string;
  /** 版本标题。 */
  title: string;
  /** 版本更新要点列表。 */
  items: string[];
}

/** 公告通告内容（全部为本地多语言数据，不再读取网络 JSON）。 */
export interface AnnouncementData {
  source: "local";
  /** 生效语言（zh / en）。 */
  lang: "zh" | "en";
  /** 当前运行版本（package.json version），用于优先匹配当前版本的更新说明。 */
  current: string;
  /** 使用手册条目（key 对应 i18n 键，text 已按当前语言填充）。 */
  manual: { key: string; text: string }[];
  /** 版本更新说明（按版本倒序）。 */
  versions: VersionEntry[];
}

/** 拉取公告通告（词库助手右键菜单「公告」弹窗时调用；lang 传入浏览器/系统语言，内部归一化）。 */
export function getAnnouncement(lang?: string): Promise<AnnouncementData> {
  const url = lang
    ? `/api/prompt-library/announcement?lang=${encodeURIComponent(lang)}`
    : "/api/prompt-library/announcement";
  return send<AnnouncementData>("GET", url);
}

// ── 公告报纸「今日」动态（每日日报 + 科技快讯）──────────────────────────

/** 报纸「今日词库日报」单条。 */
export interface DailyReportItem {
  /** 醒目短标题。 */
  headline: string;
  /** 一句话展开说明。 */
  body: string;
}

/** 报纸「今日科技快讯」单条。 */
export interface TechNewsItem {
  /** 新闻标题。 */
  title: string;
  /** 一句话摘要。 */
  summary: string;
  /** 原文链接（IT之家链接；AI 回退/缺失时可能为空）。 */
  url: string;
}

/** 报纸「今日/历史」一期动态内容。 */
export interface DailyExtras {
  /** 语言（zh / en）。 */
  lang: "zh" | "en";
  /** 内容日期 YYYY-MM-DD（本地时区）。 */
  date: string;
  /** 每日日报要点；不可用或失败时为 null（显示「今日暂无推荐」）。 */
  report: DailyReportItem[] | null;
  /** 科技快讯条目；不可用或失败时为 null（显示「今日暂无推荐」）。 */
  news: TechNewsItem[] | null;
  /** 科技快讯来源：本地成就速报。 */
  newsSource?: "achievement" | null;
  /** 所有已存档报纸日期（时间倒序，最新在前），用于历史翻页导航。 */
  availableDates: string[];
  /** 当期是否为今天。 */
  isToday: boolean;
}

/** 拉取公告报纸某一期（date 省略取今天；lang 可省略默认 zh）。 */
export function getAnnouncementDaily(lang?: string, date?: string): Promise<DailyExtras> {
  const params: string[] = [];
  if (lang) params.push(`lang=${encodeURIComponent(lang)}`);
  if (date) params.push(`date=${encodeURIComponent(date)}`);
  const qs = params.length > 0 ? `?${params.join("&")}` : "";
  return send<DailyExtras>("GET", `/api/prompt-library/announcement/daily${qs}`);
}

// ── 词库统计（供统计可视化面板）────────────────────────────────────────

/** 词库使用统计（与 host store.computeLibraryStats 对齐）。 */
export interface LibraryStats {
  /** 提示词总数。 */
  total: number;
  /** 累计使用次数。 */
  totalUsage: number;
  /** 曾使用过的提示词数量。 */
  usedCount: number;
  /** 从未使用过的提示词数量。 */
  unusedCount: number;
  /** 最常用的前 5 条（按使用次数降序）。 */
  topUsed: Array<{ title: string; usageCount: number; lastUsedAt: number }>;
  /** 最近使用的前 5 条（按最后使用时间降序）。 */
  recentUsed: Array<{ title: string; lastUsedAt: number }>;
  /** 标签及其被引用次数。 */
  tagStats: Array<{ name: string; count: number }>;
  /** 回收站条数。 */
  trashCount: number;
  /** 复用活力：近 7 天曾被使用的提示词数量。 */
  usedIn7Days: number;
  /** 复用活力：近 30 天曾被使用的提示词数量。 */
  usedIn30Days: number;
  /** 沉睡提示词：创建超 30 天且从未使用的最久前 3 条。 */
  longestUnused: Array<{ title: string; days: number }>;
  /** 正文总字数。 */
  totalBodyLength: number;
  /** 平均每条正文字数。 */
  avgBodyLength: number;
  /** 已由 AI 完善的提示词数量。 */
  aiRefinedCount: number;
  /** AI 完善占比（0-100）。 */
  aiRefinedPct: number;
  /** 近 7 天新增提示词数量。 */
  addedIn7Days: number;
  /** 近 30 天新增提示词数量。 */
  addedIn30Days: number;
  /** 近 7 天最常用的前 5 条（按近 7 天使用次数降序）。 */
  topUsed7: Array<{ title: string; count: number }>;
  /** 近 7 天经 AI 完善的提示词数量。 */
  aiRefinedIn7: number;
  /** 自动学习条目数量（标签为配置的自动学习标签或默认 auto-learned）。 */
  autoLearnedCount: number;
}

/** 每周增量统计（近 7 天：新增/使用/AI 完善）。 */
export interface WeeklyStats {
  rangeStart: number;
  rangeEnd: number;
  addedCount: number;
  addedTitles: string[];
  usedPromptCount: number;
  usageCount: number;
  topUsed: Array<{ title: string; count: number }>;
  aiRefinedCount: number;
}

/** 一次统计历史快照。 */
export interface StatsSnapshot {
  id: number;
  stats: WeeklyStats;
  comment: string;
  createdAt: number;
}

/** 使用热力图一个单元：本地时区星期（0=周日）+ 小时（0-23）+ 次数。 */
export interface HeatmapCell {
  weekday: number;
  hour: number;
  count: number;
}

/** 统计接口返回：当前实时统计 + 历史快照序列（时间正序，供趋势图）+ 使用热力图。 */
export interface PromptStatsData {
  stats: LibraryStats;
  snapshots: StatsSnapshot[];
  heatmap: HeatmapCell[];
}

/** 获取词库统计（当前统计 + 近 12 周快照）。 */
export function getStats(): Promise<PromptStatsData> {
  return send<PromptStatsData>("GET", "/api/prompt-library/stats");
}

// ── 自动备份 ──────────────────────────────────────────────────────────────

/** 自动备份目录下的单条备份文件信息。 */
export interface BackupEntry {
  name: string;
  size: number;
  createdAt: number;
  /** 备份文件格式：db（数据库文件）/ json（JSON 导出）。 */
  format: "db" | "json";
}

/** 列出自动备份目录中的备份文件（按时间倒序，最新在前）。 */
export function listBackups(): Promise<BackupEntry[]> {
  return send<BackupEntry[]>("GET", "/api/prompt-library/backups");
}

/** 立即执行一次备份，返回生成的备份文件名与大小。format 缺省 db（复制数据库文件）；json 导出为 JSON 备份。 */
export function runBackup(format: "db" | "json" = "db"): Promise<{ name: string; size: number }> {
  return send<{ name: string; size: number }>("POST", "/api/prompt-library/backups/run", { format });
}

/** 从指定备份文件恢复词库（db 覆盖主库重开连接；json 清空后重建）。返回格式与恢复后条数。 */
export function restoreBackup(
  name: string,
): Promise<{ format: "db" | "json"; count: number }> {
  return send<{ format: "db" | "json"; count: number }>(
    "POST",
    "/api/prompt-library/backups/restore",
    { name },
  );
}

/** 删除指定的备份文件（删除后不可恢复）。 */
export function deleteBackup(name: string): Promise<{ deleted: boolean }> {
  return send<{ deleted: boolean }>("POST", "/api/prompt-library/backups/delete", { name });
}