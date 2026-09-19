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

/** 后端下载结果：后端把文件写入系统「下载」目录后返回保存路径与条数。 */
export interface ExportSaveResult {
  count: number;
  filePath: string;
}

/**
 * 导出到指定目录：前端只传勾选的 ids、导出格式与目标目录，由后端拉取数据、
 * 组织文件并写入该目录（dir 缺省时后端回落系统「下载」目录）。
 * 仅在文件真正写入磁盘后 resolve，不再有浏览器下载时序问题。
 */
export function saveExportFile(
  ids: string[],
  format: string,
  dir?: string,
): Promise<ExportSaveResult> {
  return send<ExportSaveResult>("POST", "/api/prompt-library/export/save", {
    ids,
    format,
    ...(dir ? { dir } : {}),
  });
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

/** 目录浏览的单条结果（自建后端能力，见 host/fs 路由）。 */
export interface DirEntry {
  name: string;
  path: string;
  hidden: boolean;
}

/** 目录浏览结果：当前路径、宿主 home、祖先链与一层子目录。 */
export interface DirListing {
  path: string;
  home: string;
  crumbs: DirEntry[];
  entries: DirEntry[];
  truncated: boolean;
}

/**
 * 列出指定目录（缺省为宿主 home）的一层子目录。
 * 走插件自建的 `/fs/list` 路由，不依赖宿主 workspaces 能力。
 */
export function listFsDirectory(path?: string): Promise<DirListing> {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return send<DirListing>("GET", `/api/prompt-library/fs/list${qs}`);
}

/** 在指定父目录下新建子目录，返回新目录绝对路径。 */
export function createFsDirectory(path: string, name: string): Promise<{ path: string }> {
  return send<{ path: string }>("POST", "/api/prompt-library/fs/mkdir", { path, name });
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

/** 服务端运行版本与磁盘已安装版本（本地读取，不触发网络检查）。 */
export interface VersionInfo {
  /** 服务端编译版本号。 */
  server: string;
  /** 磁盘 package.json 已安装版本号。 */
  installed: string;
}

/** 读取版本比对信息（轻量本地接口，用于展示当前版本号）。 */
export function getVersion(): Promise<VersionInfo> {
  return send<VersionInfo>("GET", "/api/prompt-library/version");
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

// ── 人格管理（CRUD + 工作区/项目/会话绑定）───────────────────────────────

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

// ── 会话解析诊断（排查「设了技能却没生效」用）────────────────────────────

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

// ── 插件级元数据（localStorage 业务标记落库用）───────────────────────────

/** 读取 meta 表值（key 不存在返回空串）。 */
export function getMetaValue(key: string): Promise<string> {
  return send<{ key: string; value: string }>("GET", `/api/prompt-library/meta/${encodeURIComponent(key)}`).then(
    (d) => d.value,
  );
}

/** 覆写 meta 表值。 */
export function setMetaValue(key: string, value: string): Promise<string> {
  return send<{ key: string; value: string }>(
    "PUT",
    `/api/prompt-library/meta/${encodeURIComponent(key)}`,
    { value },
  ).then((d) => d.value);
}