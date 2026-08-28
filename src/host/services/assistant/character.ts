/**
 * AI 人格服务（SQLite 数据库存储）。
 *
 * 支持多人格：
 * - 全局默认人格：SOUL 正文存于 prompts.db 的 meta 表（键 pl:default-persona-soul）；
 * - 自定义人格：SOUL 正文存于 prompts.db 的 personas.body 列（不再落盘 md 文件）。
 *
 * 能力：
 * - ensureSoulFile：默认人格正文缺失时写入默认模板；
 * - readSoulDoc：读取全局默认人格正文；
 * - soulSystemSync(personaId?)：按 `personaId` 同步读取对应人格（热路径），带缓存。
 */
import {
  getDefaultPersonaSoul,
  getPersona,
  setDefaultPersonaSoul,
  updatePersonaMeta,
} from "../data/store.js";

/** SOUL 新建自定义人格时使用的模板：仅一个标题占位，正文由用户在人格管理里自行填写，AI 据此遵守。 */
const DEFAULT_SOUL = `# SOUL · 人格
`;

/** 全局默认人格的完整模板：开箱即用的通用人格设定，写入数据库默认人格 SOUL，AI 据此遵守。 */
const DEFAULT_PERSONA_SOUL = `# SOUL · 人格

你是「词库助手」，一款帮助用户收集、整理、润色和复用提示词（Prompts）的智能助手，也是用户常用的提效工具。

## 身份定位
- 你是提示词领域的整理专家，熟悉写作、编程、办公、学习等各类场景下的提示词写法。
- 你关注细节，追求简洁、通用、可复用的输出。

## 工作原则
- 先理解用户的真实意图，再动手整理；保留原文关键细节，不随意删改。
- 归类与提炼时保持提示词清晰、精简、可直接使用。
- 遇到会随使用场景变化的内容（如角色、对象、主题、风格等），提炼为变量占位符，提升复用性。
- 涉及已有的变量、标签结构时原样保留，避免破坏现有格式。

## 表达风格
- 语气真诚、清晰、有条理；先给结论，再给必要说明。
- 尊重用户的输入，仅在确有需要时给出建议。
`;

/** «default» 保留 id：表示使用全局默认人格。 */
export const DEFAULT_PERSONA_ID = "default";

/** 把任意 personaId 归一化：空串 / 'default' → null（表示默认人格）。 */
function normalizePersona(personaId?: string | null): string | null {
  if (!personaId) return null;
  return personaId === DEFAULT_PERSONA_ID ? null : personaId;
}

/**
 * 确保默认人格正文存在。
 * 缺失（或仍为旧「仅标题占位」内容）时写入完整默认模板，
 * 让默认人格开箱即有完整设定；已有真实内容则保持原样，不覆盖用户自定义。
 */
export async function ensureSoulFile(): Promise<void> {
  const current = getDefaultPersonaSoul().trim();
  if (current === DEFAULT_SOUL.trim() || current === "") {
    setDefaultPersonaSoul(DEFAULT_PERSONA_SOUL);
  }
}

/** 确保自定义人格正文存在（记录不存在则忽略；正文为空时写入「仅标题占位」模板）。 */
export async function ensurePersonaSoul(personaId: string): Promise<void> {
  const record = getPersona(personaId);
  if (record && !record.body.trim()) {
    updatePersonaMeta(personaId, { body: DEFAULT_SOUL });
  }
}

/** 读取全局默认人格正文；未初始化返回空字符串。 */
export async function readSoulDoc(): Promise<string> {
  return getDefaultPersonaSoul().trim();
}

/** 读取某人格（按 personaId，null 表示默认人格）的 SOUL 正文；缺失返回空串。 */
export async function readPersonaSoul(personaId?: string | null): Promise<string> {
  const id = normalizePersona(personaId);
  if (id) return (getPersona(id)?.body ?? "").trim();
  return getDefaultPersonaSoul().trim();
}

/** 覆盖写入某人格（按 personaId，null 表示默认人格）的 SOUL 正文。 */
export async function writePersonaSoul(content: string, personaId?: string | null): Promise<void> {
  const id = normalizePersona(personaId);
  if (id) updatePersonaMeta(id, { body: content });
  else setDefaultPersonaSoul(content);
}

/** 清空某个人格的 SOUL 正文（默认/自定义均适用；不存在时静默忽略）。 */
export function removePersonaSoul(personaId: string): void {
  const id = normalizePersona(personaId);
  if (id) updatePersonaMeta(id, { body: "" });
  else setDefaultPersonaSoul("");
}

/** 人格正文追加到 AI system prompt 的边界段落（空则返回空串）。 */
export function buildSoulBoundary(soul: string): string {
  return soul.trim();
}

/** 按归一化人格 id 缓存热路径读取结果；写入/删除后由 invalidateSoulCache 失效。 */
const soulCache = new Map<string, string>();

/** 清理某个人格的缓存（增删改成语后调用，强制下次重读）。 */
export function invalidateSoulCache(personaId?: string | null): void {
  const id = normalizePersona(personaId);
  soulCache.delete(id ?? DEFAULT_PERSONA_ID);
}

/**
 * 同步读取某人格正文（供每次对话组装 system prompt 时调用）。
 *
 * personaId 为 undefined / null / 'default' 时读全局默认人格；否则读
 * personas.body。宿主在组装对话提示时是同步回调 text 函数，无法 await；
 * 数据库读取为同步，结果按人格缓存，写入/删除时由 invalidateSoulCache 失效。
 */
export function soulSystemSync(personaId?: string | null): string {
  const id = normalizePersona(personaId);
  const key = id ?? DEFAULT_PERSONA_ID;
  const cached = soulCache.get(key);
  if (cached !== undefined) return cached;
  const content = (id ? (getPersona(id)?.body ?? "") : getDefaultPersonaSoul()).trim();
  soulCache.set(key, content);
  return content;
}
