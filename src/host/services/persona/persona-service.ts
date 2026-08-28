/**
 * 多人格服务：组合「数据库元信息 + SOUL 正文」与「路径绑定」两级存储，向上层（路由/组装）暴露统一操作。
 *
 * 人格本体（SOUL 正文）直接存于数据库：默认人格存 meta 表，自定义人格存 personas.body，
 * 元信息（名称/启用/创建时间）与「工作区/项目路径 → 人格」绑定也存放在 SQLite（prompts.db）。
 *
 * 关键约定：
 * - 保留 id `default` 表示全局默认人格，不在 personas 表中，不可删除/重命名；
 * - 绑定的 key 是「目录绝对路径」：工作区（workspace.json 里的工作区根）或其下项目（直接子目录）；
 * - 解析人恪时按「最深的祖先/相等匹配」：某会话取 `agent.session.header.cwd`，
 *   从该路径向上逐级找第一个有绑定的层级生效（项目覆盖工作区，工作区覆盖默认）。
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  clearScopePersonaBinding,
  createPersona,
  deletePersona as deletePersonaRecord,
  getPersona,
  getScopeBoundPersonaId,
  listPersonas,
  listScopeBindings,
  setScopePersonaBinding,
  updatePersonaMeta,
  type PersonaRecord,
} from "../data/store.js";
import {
  DEFAULT_PERSONA_ID,
  ensurePersonaSoul,
  invalidateSoulCache,
  readPersonaSoul,
  removePersonaSoul,
  writePersonaSoul,
} from "../assistant/character.js";
import { workspaceStorePath } from "../../utils/paths.js";
import { getSessionBoundPersonaId } from "../session-prompts/session-prompts.js";

/** 面向 UI 的人格视图：元信息 + SOUL 正文 + 是否内置默认。 */
export interface PersonaView {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  isDefault: boolean;
  content: string;
}

/** 工作区/项目树节点：供人格管理「树形选择工作区/项目并绑定」使用。 */
export interface ScopeNode {
  path: string; // 绝对路径
  title: string; // 展示名（工作区用其标题，项目用目录名）
  kind: "workspace" | "project";
  bound: string; // 该层精确绑定的人格 id（'' 表示未精确绑定，回落默认/上层）
  children: ScopeNode[];
}

/** 把记录转成视图（content 由调用方填充）。 */
function recordToView(record: PersonaRecord): Omit<PersonaView, "content"> {
  return {
    id: record.id,
    name: record.name,
    enabled: record.enabled,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    isDefault: false,
  };
}

/** 归一化绑定的 personaId：空串 / 'default' / 不存在的 id → null（默认人格）。 */
export function normalizePersonaId(personaId: string | null | undefined): string | null {
  if (!personaId) return null;
  const id = personaId === DEFAULT_PERSONA_ID ? null : personaId;
  if (id && !getPersona(id)) return null;
  return id;
}

/** 列出全部人格视图（含内置默认人格，排在最前）。 */
export async function listPersonaViews(): Promise<PersonaView[]> {
  const defaultContent = await readPersonaSoul(null);
  const views: PersonaView[] = [
    {
      id: DEFAULT_PERSONA_ID,
      name: "默认人格",
      enabled: true,
      createdAt: 0,
      updatedAt: 0,
      isDefault: true,
      content: defaultContent,
    },
  ];
  const records = listPersonas();
  for (const r of records) {
    const meta = recordToView(r);
    views.push({ ...meta, content: await readPersonaSoul(r.id) });
  }
  return views;
}

/** 新建自定义人格：写入记录 + 默认 SOUL 文件，返回视图。 */
export async function createPersonaWithSoul(name: string): Promise<PersonaView> {
  const id = randomUUID();
  const record = createPersona(id, name.trim() || "新人格");
  await ensurePersonaSoul(id);
  const content = await readPersonaSoul(id);
  return { ...recordToView(record), content };
}

/** 更新人格：可改名称/启用状态与 SOUL 正文；修改正文后失效该人格的注入缓存。 */
export async function updatePersonaWithContent(
  id: string,
  patch: { name?: string; enabled?: boolean; content?: string },
): Promise<PersonaView | undefined> {
  const record = getPersona(id);
  if (!record) return undefined;
  if (patch.content !== undefined) {
    await writePersonaSoul(patch.content, id);
    invalidateSoulCache(id);
  }
  if (patch.name !== undefined || patch.enabled !== undefined) {
    updatePersonaMeta(id, { name: patch.name, enabled: patch.enabled });
  }
  const next = getPersona(id)!;
  return { ...recordToView(next), content: await readPersonaSoul(id) };
}

/** 删除自定义人格：删除记录、路径绑定与 SOUL 文件（默认人格不可删）。 */
export async function deletePersonaWithSoul(id: string): Promise<boolean> {
  if (id === DEFAULT_PERSONA_ID) return false;
  if (!getPersona(id)) return false;
  deletePersonaRecord(id);
  removePersonaSoul(id);
  invalidateSoulCache(id);
  return true;
}

// ── 工作区/项目路径 → 人格 绑定 ──────────────────────────────────────────

/** 路径归一化：统一为正斜杠、去掉末尾分隔符；Windows 下再转小写（大小写不敏感匹配）。 */
function normalizeScopePath(p: string): string {
  let s = p.replace(/\\/g, "/").trim();
  while (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return process.platform === "win32" ? s.toLowerCase() : s;
}

/** 设置某路径（工作区/项目）绑定的人格（传入 'default'/空串/不存在的 id → 解除绑定，回落默认）。 */
export function bindPersonaToScope(scopePath: string, personaId: string | null | undefined): string {
  const normalized = normalizePersonaId(personaId);
  if (normalized) {
    setScopePersonaBinding(scopePath, normalized);
    return normalized;
  }
  // 未绑或绑到默认 → 清除该路径的精确绑定（回落默认人格 / 上层工作区绑定）
  clearScopePersonaBinding(scopePath);
  return DEFAULT_PERSONA_ID;
}

/** 读取某路径精确绑定的人格 id；无精确绑定返回空串（默认人格）。 */
export function getPersonaForScopePath(scopePath: string): string {
  const bound = getScopeBoundPersonaId(scopePath);
  return normalizePersonaId(bound) ?? "";
}

/**
 * 解析某工作目录（agent.session.header.cwd）应采用的人格 id：
 * - 从该路径向上逐级找第一个有绑定的层级（最深的祖先/相等匹配），命中且人格启用则返回其 id；
 * - 无任何有效绑定 → 返回 null（使用全局默认人格）。
 */
export function resolvePersonaForPath(cwd: string | null | undefined): string | null {
  if (!cwd) return null;
  const normals = new Map(
    listScopeBindings().map((b) => [normalizeScopePath(b.path), b.personaId] as const),
  );
  let cur = normalizeScopePath(cwd);
  // 从 cwd 自身开始，逐级向上到根；命中的第一级即「最深绑定」。
  for (;;) {
    const pid = normals.get(cur);
    if (pid) {
      const record = getPersona(pid);
      if (record && record.enabled) return pid;
    }
    const idx = cur.lastIndexOf("/");
    if (idx <= 0) break;
    cur = cur.slice(0, idx);
  }
  return null;
}

/**
 * 读取某会话 id 精确绑定的人格 id（无绑定返回空串，表示使用默认人格/回落上层）。
 * 绑定可能是失效的人格 id（已删除），此时返回空串（回落）。
 */
export function getPersonaForSession(sessionId: string): string {
  const bound = getSessionBoundPersonaId(sessionId);
  return normalizePersonaId(bound) ?? "";
}

/**
 * 解析某会话应采用的人格 id：
 * - 优先取「会话 id」精确绑定（绑定的人格启用才生效，否则回落）；
 * - 无则按工作目录 cwd 命中的「工作区/项目」持久绑定（最深的祖先/相等匹配）；
 * - 仍无 → null（使用全局默认人格）。
 */
export function resolvePersonaForSession(
  sessionId: string | null | undefined,
  cwd: string | null | undefined,
): string | null {
  if (typeof sessionId === "string" && sessionId) {
    const pid = getPersonaForSession(sessionId);
    if (pid) {
      const record = getPersona(pid);
      if (record && record.enabled) return pid;
    }
  }
  return resolvePersonaForPath(cwd);
}

/**
 * 枚举工作区/项目树（供 UI 树形选择并绑定）：
 * - 顶层为 workspace.json 里登记的工作区（path + title）；
 * - 每个工作区下挂其「直接子目录」作为项目（跳过隐藏目录），不递归深层以免过多开销；
 * - 每个节点带 `bound`：该路径精确绑定的人格 id。
 */
export function listScopeTree(): ScopeNode[] {
  const nodes: ScopeNode[] = [];
  // 读取 host 工作区清单（缺失/损坏视为无，避免整棵绑定树不可用）。
  let raw: {
    tables?: { workspaces?: Record<string, { path?: unknown; title?: unknown }> };
  } = {};
  if (existsSync(workspaceStorePath())) {
    try {
      raw = JSON.parse(readFileSync(workspaceStorePath(), "utf8")) as typeof raw;
    } catch {
      /* JSON 损坏：按空清单处理 */
    }
  }
  const wsMap = raw?.tables?.workspaces ?? {};
  for (const ws of Object.values(wsMap)) {
    if (typeof ws?.path !== "string" || !ws.path) continue;
    const title = typeof ws.title === "string" && ws.title ? ws.title : basename(ws.path);
    nodes.push(buildScopeNode(ws.path, title, "workspace"));
  }
  return nodes;
}

/**
 * 构造一个树节点：工作区直接挂其子项目；若目录不存在则仅返回空节点（无 children）。
 */
function buildScopeNode(absPath: string, title: string, kind: "workspace" | "project"): ScopeNode {
  const children: ScopeNode[] = [];
  if (kind === "workspace") {
    try {
      const entries = readdirSync(absPath, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory() || e.name.startsWith(".")) continue;
        const childPath = join(absPath, e.name);
        children.push(buildScopeNode(childPath, e.name, "project"));
      }
    } catch {
      /* 目录不可读/不存在 → 无子项目 */
    }
    children.sort((a, b) => a.title.localeCompare(b.title, "zh"));
  }
  return { path: absPath, title, kind, bound: getPersonaForScopePath(absPath), children };
}