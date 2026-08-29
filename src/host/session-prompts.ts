/**
 * 会话级技能服务：元信息 + 正文均存 SQLite（prompts.db 的 session_prompts 表），
 * 向上层（路由/组装）暴露统一操作。
 *
 * 与多人格（persona-service）一致：
 * - 元信息（标题/标签/启用/创建与更新时间/使用次数）与正文（注入到系统提示中的内容）
 *   都直接存于 session_prompts 表（body 列），不再落盘 md 文件。
 *
 * 路径绑定（工作区/项目 → 技能 id 列表）与当前会话临时注入：
 * - 持久绑定存于 SQLite（prompts.db 的 prompt_scope_bindings 表，与人格绑定一致）；
 * - 当前会话临时注入仅存内存（重启即失效，与「当前会话」语义一致）。
 *
 * 所有函数均为同步读取（系统提示组装是同步回调，无法 await），
 * 写入则同步落库，失败静默降级（列表返回空 / 写入忽略），不影响其他功能。
 */
import { randomUUID } from "node:crypto";
import type { SessionPrompt } from "../types.js";
import { clampTitle } from "../types.js";
import {
  clearAllScopePersonaBindings as dbClearAllScopePersonaBindings,
  clearAllScopePromptBindings as dbClearAllScopePromptBindings,
  clearAllSessionPersonaBindings as dbClearAllSessionPersonaBindings,
  clearAllSessionPromptBindings as dbClearAllSessionPromptBindings,
  clearScopePromptBinding as dbClearScopePromptBinding,
  clearSessionScopeBinding as dbClearSessionScopeBinding,
  createSessionPromptRecord,
  deleteSessionPromptRecord,
  getMetaValue,
  getScopeBoundPromptIds as dbGetScopeBoundPromptIds,
  getSessionPromptRecord,
  getSessionScopeBinding as dbGetSessionScopeBinding,
  listScopePromptBindings as dbListScopePromptBindings,
  listSessionPromptRecords,
  readUiLangSync,
  setMetaValue,
  setScopePromptBinding as dbSetScopePromptBinding,
  setSessionScopeBinding as dbSetSessionScopeBinding,
  updateSessionPromptMeta,
} from "./store.js";

// ── 路径归一化（与人格绑定解析一致）────────────────────────────────────

/** 路径归一化：统一为正斜杠、去掉末尾分隔符；Windows 下转小写。 */
function normalizeScopePath(p: string): string {
  let s = p.replace(/\\/g, "/").trim();
  while (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return process.platform === "win32" ? s.toLowerCase() : s;
}

// ── 会话级技能正文（存于 session_prompts 表 body 列）─────────────────────

/** 读取某技能正文（正文已随记录存入数据库，直接取自记录）。 */
function readPromptBody(record: { body: string }): string {
  return record.body;
}

/** 把元信息记录 + 正文组装成完整的会话级技能。 */
function recordToPrompt(record: {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  enabled: boolean;
  updatedAt: number;
  usageCount: number;
  lastUsedAt: number;
}): SessionPrompt {
  return {
    id: record.id,
    title: record.title,
    body: readPromptBody(record),
    tags: record.tags,
    enabled: record.enabled,
    updatedAt: record.updatedAt,
    usageCount: record.usageCount,
    lastUsedAt: record.lastUsedAt,
  };
}

// ── 会话级技能 CRUD（元信息 + 正文均存库）───────────────────────────────

/** 列出全部会话级技能（按更新时间倒序）。 */
export function listSessionPrompts(): SessionPrompt[] {
  return listSessionPromptRecords().map(recordToPrompt);
}

/** 按 id 批量读取会话级技能（注入时按给定顺序返回；缺失 id 忽略）。 */
export function getSessionPromptsByIds(ids: string[]): SessionPrompt[] {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const out: SessionPrompt[] = [];
  for (const id of ids) {
    const record = getSessionPromptRecord(id);
    if (record) out.push(recordToPrompt(record));
  }
  return out;
}

/** 新建一条会话级技能：写入元信息记录 + 正文（一并存库）。 */
export function createSessionPrompt(input: { title: string; body: string; tags?: string[] }): SessionPrompt {
  const now = Date.now();
  const prompt: SessionPrompt = {
    id: randomUUID(),
    title: clampTitle(input.title.trim()),
    body: input.body,
    tags: Array.isArray(input.tags) ? input.tags.filter(Boolean).slice(0, 1) : undefined,
    enabled: true,
    updatedAt: now,
    usageCount: 0,
    lastUsedAt: 0,
  };
  createSessionPromptRecord(prompt.id, prompt.title, {
    tags: prompt.tags,
    enabled: prompt.enabled,
    updatedAt: now,
    body: prompt.body,
  });
  return prompt;
}

/** 更新一条会话级技能（元信息 + 正文均存库）；不存在返回 undefined。 */
export function updateSessionPrompt(
  id: string,
  patch: { title?: string; body?: string; tags?: string[]; enabled?: boolean },
): SessionPrompt | undefined {
  const record = getSessionPromptRecord(id);
  if (!record) return undefined;
  const currentBody = record.body;
  const next: SessionPrompt = {
    id,
    title: patch.title !== undefined ? clampTitle(patch.title.trim()) : record.title,
    body: patch.body !== undefined ? patch.body : currentBody,
    tags: patch.tags !== undefined ? patch.tags.filter(Boolean).slice(0, 1) : record.tags,
    enabled: patch.enabled !== undefined ? patch.enabled : record.enabled,
    updatedAt: Date.now(),
    usageCount: record.usageCount,
    lastUsedAt: record.lastUsedAt,
  };
  updateSessionPromptMeta(id, {
    title: next.title,
    tags: next.tags,
    enabled: next.enabled,
    body: next.body,
  });
  return next;
}

/** 删除一条会话级技能：删除元信息记录（正文随记录一并删除），并清理其在所有路径绑定与临时注入中的引用。 */
export function deleteSessionPrompt(id: string): boolean {
  // 清理路径绑定（存库）
  for (const b of dbListScopePromptBindings()) {
    const next = b.promptIds.filter((x) => x !== id);
    if (next.length !== b.promptIds.length) {
      if (next.length === 0) dbClearScopePromptBinding(b.path);
      else dbSetScopePromptBinding(b.path, next);
    }
  }
  // 清理临时注入
  for (const [scope, ids] of activeSessionPrompts) {
    const next = ids.filter((x) => x !== id);
    if (next.length !== ids.length) {
      if (next.length === 0) activeSessionPrompts.delete(scope);
      else activeSessionPrompts.set(scope, next);
    }
  }
  // 清理会话 id 持久绑定中引用该技能的位置（存库；技能删后该会话不再注入它）
  for (const b of listSessionBindings()) {
    if (b.promptIds.includes(id)) {
      const next = b.promptIds.filter((x) => x !== id);
      setSessionPromptBindingForSession(b.sessionId, next);
    }
  }
  // 删除元信息记录（正文随记录一并删除）
  deleteSessionPromptRecord(id);
  return true;
}

// ── 工作区/项目路径 → 会话级技能 持久绑定（存库，与人格绑定一致）────────

/** 设置某路径（工作区/项目）持久绑定的会话级技能 id 列表（空数组 → 解除绑定）。 */
export function setScopePromptBinding(path: string, promptIds: string[]): void {
  dbSetScopePromptBinding(path, Array.isArray(promptIds) ? promptIds : []);
}

/** 读取某路径精确绑定的会话级技能 id 列表（无精确记录返回空数组）。 */
export function getScopeBoundPromptIds(path: string): string[] {
  return dbGetScopeBoundPromptIds(path);
}

/** 列出全部路径 → 会话级技能 绑定。 */
export function listScopePromptBindings(): Array<{ path: string; promptIds: string[] }> {
  return dbListScopePromptBindings();
}

/** 清空某路径的会话级技能绑定。 */
export function clearScopePromptBinding(path: string): void {
  dbClearScopePromptBinding(path);
}

/**
 * 解析某工作目录（agent.session.header.cwd）应持久绑定的会话级技能 id：
 * 从该路径向上逐级找第一个有绑定的层级（最深的祖先/相等匹配，与人格解析一致），
 * 命中即返回该层绑定的技能 id；无任何绑定返回空数组。
 */
export function resolveBoundPromptIdsForPath(cwd: string | null | undefined): string[] {
  if (!cwd) return [];
  const normals = new Map<string, string[]>();
  for (const b of dbListScopePromptBindings()) {
    normals.set(normalizeScopePath(b.path), b.promptIds);
  }
  let cur = normalizeScopePath(cwd);
  for (;;) {
    const ids = normals.get(cur);
    if (ids && ids.length > 0) return ids;
    const idx = cur.lastIndexOf("/");
    if (idx <= 0) break;
    cur = cur.slice(0, idx);
  }
  return [];
}

// ── 当前会话临时注入（内存态，仅对指定会话生效，重启即失效）────────────

/** 会话 scope → 临时注入的会话级技能 id 列表（仅当前进程内存，不落盘）。 */
const activeSessionPrompts = new Map<string, string[]>();

/** 设置某会话 scope 的临时注入技能 id 列表（空数组 → 清除该会话的临时注入）。 */
export function setSessionActivePrompts(scope: string, promptIds: string[]): void {
  const ids = Array.isArray(promptIds) ? [...new Set(promptIds.filter(Boolean))] : [];
  if (ids.length === 0) activeSessionPrompts.delete(scope);
  else activeSessionPrompts.set(scope, ids);
}

/** 读取某会话 scope 临时注入的会话级技能 id 列表。 */
export function getSessionActivePromptIds(scope: string): string[] {
  return activeSessionPrompts.get(scope) ?? [];
}

/** 清除某会话 scope 的临时注入。 */
export function clearSessionActivePrompts(scope: string): void {
  activeSessionPrompts.delete(scope);
}

// ── 当前会话 scope 跟踪（供「技能注入」弹窗「当前会话」Tab 读取）─────────

/** 最近一次活跃的会话 scope（host 在会话事件时更新；无会话时为 null）。 */
let currentSessionScope: string | null = null;

/** 记录最近活跃的会话 scope。 */
export function setCurrentSessionScope(scope: string | null | undefined): void {
  currentSessionScope = typeof scope === "string" && scope ? scope : null;
}

/** 读取最近活跃的会话 scope；无会话时返回 null。 */
export function getCurrentSessionScope(): string | null {
  return currentSessionScope;
}

// ── 会话 id → 会话级技能 持久绑定（存库，优先于路径绑定生效）────────────

/** 设置某会话 id 持久绑定的会话级技能 id 列表（空数组 → 清空该会话的技能绑定维度）。 */
export function setSessionPromptBindingForSession(sessionId: string, promptIds: string[]): void {
  dbSetSessionScopeBinding(sessionId, readSessionBoundPersonaId(sessionId), Array.isArray(promptIds) ? promptIds : []);
}

/** 设置某会话 id 绑定的自定义人格 id（null / '' / 'default' → 清空人格维度，回落默认）。 */
export function setSessionPersonaBindingForSession(sessionId: string, personaId: string | null): void {
  const pid = normalizeBoundPersonaId(personaId);
  const binding = dbGetSessionScopeBinding(sessionId);
  dbSetSessionScopeBinding(sessionId, pid, binding?.promptIds ?? []);
}

/** 读取某会话 id 持久绑定的会话级技能 id 列表（无绑定返回空数组）。 */
export function getSessionBoundPromptIds(sessionId: string): string[] {
  return dbGetSessionScopeBinding(sessionId)?.promptIds ?? [];
}

/** 读取某会话 id 持久绑定的自定义人格 id；无绑定返回空串（默认人格）。 */
export function getSessionBoundPersonaId(sessionId: string): string {
  return dbGetSessionScopeBinding(sessionId)?.personaId ?? "";
}

/** 列出全部会话 id → 技能 持久绑定。 */
export function listSessionBindings(): Array<{ sessionId: string; promptIds: string[] }> {
  return listSessionScopeBindingsAll().map((b) => ({ sessionId: b.sessionId, promptIds: b.promptIds }));
}

/** 读取某会话 id 持久绑定的自定义人格 id（供技能绑定写回时保留人格维度）。 */
function readSessionBoundPersonaId(sessionId: string): string {
  return dbGetSessionScopeBinding(sessionId)?.personaId ?? "";
}

/** 归一化要写入会话绑定的人格 id：空串 / 'default' → 空串（默认人格）。 */
function normalizeBoundPersonaId(personaId: string | null | undefined): string {
  return personaId && personaId !== "default" ? personaId : "";
}

/** 列出全部会话 id → 人格 + 技能 持久绑定（内部使用，避免重复包装）。 */
function listSessionScopeBindingsAll(): Array<{
  sessionId: string;
  personaId: string;
  promptIds: string[];
}> {
  // 直接复用 store 导出，避免与上方 listSessionBindings 命名冲突
  return listSessionScopeBindingsFromStore();
}

/** store 导出的全部会话绑定（见 persona-service 同名语义）。 */
import { listSessionScopeBindings as dbListSessionScopeBindings } from "./store.js";

function listSessionScopeBindingsFromStore(): Array<{
  sessionId: string;
  personaId: string;
  promptIds: string[];
}> {
  return dbListSessionScopeBindings();
}

/** 清除某会话 id 的全部绑定（人格回落默认、技能不注入）。 */
export function clearSessionBinding(sessionId: string): void {
  dbClearSessionScopeBinding(sessionId);
}

/** 一键清空技能绑定（技能独立模块）：所有路径（工作区/项目）的技能绑定 + 所有会话的临时技能绑定，人格绑定不受影响。 */
export function clearAllSkillBindings(): void {
  dbClearAllScopePromptBindings();
  dbClearAllSessionPromptBindings();
}

/** 一键清空人格绑定（人格独立模块）：所有路径（工作区/项目）的人格绑定 + 所有会话的临时人格绑定，技能绑定不受影响。 */
export function clearAllPersonaBindings(): void {
  dbClearAllScopePersonaBindings();
  dbClearAllSessionPersonaBindings();
}

/**
 * 解析某会话 scope 应持久绑定的会话级技能 id：优先取「会话 id」精确绑定；
 * 无则取工作目录 cwd 命中的「工作区/项目」持久绑定（最深的祖先/相等匹配）。
 */
export function resolveSessionPromptBindingIds(sessionId: string | null | undefined, cwd: string | null | undefined): string[] {
  if (typeof sessionId === "string" && sessionId) {
    const ids = getSessionBoundPromptIds(sessionId);
    if (ids.length > 0) return ids;
  }
  return resolveBoundPromptIdsForPath(cwd);
}

// ── 默认技能播种（首次使用：编程 / 文员 / 律师）────────────────────────────

/** 系统默认技能种子（中/英双语，正文为自然语言描述，不含 {{}} 占位符）。 */
const DEFAULT_SESSION_PROMPT_SEEDS: {
  zh: Array<{ title: string; tags: string[]; body: string }>;
  en: Array<{ title: string; tags: string[]; body: string }>;
} = {
  zh: [
    {
      title: "编程",
      tags: ["编程"],
      body: [
        "你是一名资深全栈工程师，精通主流编程语言、框架与工程实践。回答编程问题时请：",
        "1. 先确认需求与约束条件，必要时提问澄清；",
        "2. 给出可直接运行的代码示例，并说明关键实现思路；",
        "3. 指出常见坑点与边界情况，给出防御性写法；",
        "4. 涉及多种方案时对比利弊，给出明确推荐并说明理由。",
      ].join("\n"),
    },
    {
      title: "文员",
      tags: ["文员"],
      body: [
        "你是一名经验丰富的办公室文员，擅长公文写作、会议纪要、表格整理与日常行政事务。回答办公类任务时请：",
        "1. 使用正式、规范的书面语，行文简洁明了；",
        "2. 结构清晰、条理分明，善用小标题与列表；",
        "3. 提供可直接套用的模板或范例；",
        "4. 注意格式、措辞与称谓的规范性，符合职场惯例。",
      ].join("\n"),
    },
    {
      title: "律师",
      tags: ["律师"],
      body: [
        "你是一名严谨专业的律师，擅长法律咨询、文书撰写与合规分析。回答法律问题时请：",
        "1. 依据现行法律法规与司法解释给出分析与建议；",
        "2. 提示潜在法律风险与责任边界；",
        "3. 提供规范的法律文书表述或条款示例；",
        "4. 对不确定或需个案判断的事项，明确说明局限并建议咨询专业律师或机构。",
      ].join("\n"),
    },
  ],
  en: [
    {
      title: "Programming",
      tags: ["Programming"],
      body: [
        "You are a senior full-stack engineer proficient in mainstream programming languages, frameworks, and engineering practices. When answering coding questions:",
        "1. Clarify the requirement and constraints first, asking questions when needed;",
        "2. Provide runnable code examples and explain the key implementation ideas;",
        "3. Point out common pitfalls and edge cases, offering defensive coding practices;",
        "4. When multiple approaches exist, compare their trade-offs and give a clear recommendation with reasons.",
      ].join("\n"),
    },
    {
      title: "Office Clerk",
      tags: ["Office"],
      body: [
        "You are an experienced office clerk skilled in official writing, meeting minutes, spreadsheet organization, and daily administrative tasks. When handling office tasks:",
        "1. Use formal, standard written language that is concise and clear;",
        "2. Keep the structure well-organized with headings and lists;",
        "3. Provide ready-to-use templates or examples;",
        "4. Follow workplace conventions for format, wording, and forms of address.",
      ].join("\n"),
    },
    {
      title: "Lawyer",
      tags: ["Lawyer"],
      body: [
        "You are a rigorous professional lawyer skilled in legal consultation, document drafting, and compliance analysis. When answering legal questions:",
        "1. Base your analysis and advice on current laws, regulations, and judicial interpretations;",
        "2. Flag potential legal risks and the boundaries of liability;",
        "3. Provide standard legal wording or sample clauses;",
        "4. For matters requiring case-specific judgment, clearly state the limitations and recommend consulting a licensed attorney or institution.",
      ].join("\n"),
    },
  ],
};

/**
 * 首次使用（session_prompts 表为空且未播种过）时写入三条默认技能（编程 / 文员 / 律师）。
 * 用 meta 键 `session-prompts-seeded` 保证只播种一次：即便用户后来全部删除也不再回填。
 * 语言按宿主界面语言选择；与默认提示词播种保持一致（仅在空表时执行）。
 */
export function seedDefaultSessionPromptsIfEmpty(): void {
  try {
    if (getMetaValue("session-prompts-seeded") === "1") return;
    if (listSessionPromptRecords().length > 0) {
      setMetaValue("session-prompts-seeded", "1");
      return;
    }
    const seeds = readUiLangSync() === "zh" ? DEFAULT_SESSION_PROMPT_SEEDS.zh : DEFAULT_SESSION_PROMPT_SEEDS.en;
    for (const seed of seeds) {
      createSessionPrompt({ title: seed.title, body: seed.body, tags: seed.tags });
    }
    setMetaValue("session-prompts-seeded", "1");
  } catch {
    /* 播种失败静默，不影响其他功能 */
  }
}
