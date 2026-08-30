/**
 * 会话查询与「工作区 → 项目 → 会话」树的组装。
 *
 * DSH 的 sessionQuery / sessionTitle 是宿主注入的 Cordis 服务，路由层无法直接访问；
 * 因此本模块维护一个由 apply() 在宿主注入 sessionQuery/sessionTitle 后注册的会话列表提供器。
 *
 * 会话节点按 header.cwd 归属到工作区/项目树（最深的路径前缀匹配）：
 * - 命中工作区/项目 → 挂到对应节点下；
 * - 未命中任何工作区/项目 → 归入「其他会话」分组（合成的工作区节点，path 为 UNMATCHED_SCOPE_PATH）。
 *
 * 所有会话查询失败均静默降级为空列表（树里不显示会话），不影响其它功能。
 */
import type { ScopeNode, SessionNode } from "../types.js";
import { UNMATCHED_SCOPE_PATH } from "../types.js";
import { listScopeTree as listPathScopeTree, getPersonaForSession } from "./persona-service.js";
import { listSessionBindings } from "./session-prompts.js";

/** 会话查询记录：由宿主服务转成的最小形状（id / title / cwd）。 */
export interface SessionQueryRecord {
  id: string;
  title: string;
  cwd: string | null;
}

/** 当前已注册的会话列表提供器（未注册时为 null → 树里不显示会话）。 */
let sessionProvider: (() => Promise<SessionQueryRecord[]>) | null = null;

/** 注册会话列表提供器（apply() 注入 sessionQuery/sessionTitle 后调用）。 */
export function registerSessionListProvider(provider: () => Promise<SessionQueryRecord[]>): void {
  sessionProvider = provider;
}

/** 会话 id → 最近一次系统提示组装时记录的真实 cwd（来自 agent.session.header.cwd，与运行时解析同一来源）。
 * 注意：listSessionRecords() 依赖 sessionQuery 服务，未注入时为空；而组装端始终有 agent，故以组装时记录为准，
 * 避免诊断与运行时解析不一致（诊断误报「工作目录为空 → 命中默认」）。 */
const activeSessionCwd = new Map<string, string>();

/** 记录某会话最近一次组装时的真实 cwd（组装端每次调用解析时更新）。 */
export function recordActiveSessionCwd(sessionId: string, cwd: string): void {
  if (!sessionId) return;
  if (cwd) activeSessionCwd.set(sessionId, cwd);
}
/** 读取某会话最近一次组装时的真实 cwd；无记录返回空串。 */
export function getActiveSessionCwd(sessionId: string): string {
  return activeSessionCwd.get(sessionId) ?? "";
}

/** 读取全部会话元信息；无提供器 / 失败时返回空数组。 */
export async function listSessionRecords(): Promise<SessionQueryRecord[]> {
  if (!sessionProvider) return [];
  try {
    return await sessionProvider();
  } catch {
    return [];
  }
}

/**
 * 组装「工作区 → 项目 → 会话」树：
 * 在现有工作区/项目树基础上，把全部会话按 cwd 最深的路径前缀匹配挂到节点下，
 * 未命中的归入「其他会话」分组（仅当存在未命中会话时追加）。
 */
export async function listSessionScopeTree(): Promise<ScopeNode[]> {
  const [tree, sessions] = await Promise.all([listPathScopeTree(), listSessionRecords()]);
  attachSessionsToTree(tree, sessions);
  return tree;
}

/** 路径归一化：统一正斜杠、去尾分隔符；Windows 下转小写（与人格/技能绑定解析一致）。 */
function normalizeScopePath(p: string): string {
  let s = p.replace(/\\/g, "/").trim();
  while (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return process.platform === "win32" ? s.toLowerCase() : s;
}

/** 把会话挂到树上：命中节点追加到其 sessions，未命中进入「其他会话」分组。 */
function attachSessionsToTree(tree: ScopeNode[], sessions: SessionQueryRecord[]): void {
  // 建立 归一化路径 → 树节点 的索引（工作区与项目都收录）
  const pathIndex = new Map<string, ScopeNode>();
  const walk = (node: ScopeNode): void => {
    pathIndex.set(normalizeScopePath(node.path), node);
    for (const child of node.children) walk(child);
  };
  for (const ws of tree) walk(ws);

  const sessionPromptBindings = new Map(
    listSessionBindings().map((b) => [b.sessionId, b.promptIds] as const),
  );

  const unmatched: SessionNode[] = [];
  for (const s of sessions) {
    const node = s.cwd ? findDeepestNode(pathIndex, s.cwd) : undefined;
    const sessionNode: SessionNode = {
      id: s.id,
      title: s.title || `会话 ${s.id.slice(0, 8)}`,
      cwd: s.cwd ?? "",
      boundPersonaId: getPersonaForSession(s.id),
      boundPromptIds: sessionPromptBindings.get(s.id) ?? [],
    };
    if (node) {
      (node.sessions ??= []).push(sessionNode);
    } else {
      unmatched.push(sessionNode);
    }
  }

  // 保持会话列表提供器返回的顺序（与系统会话列表一致），不做重排；未命中分组最后追加（仅当存在未命中会话时）
  if (unmatched.length > 0) {
    tree.push({
      path: UNMATCHED_SCOPE_PATH,
      title: UNMATCHED_SCOPE_PATH,
      kind: "workspace",
      bound: "",
      sessions: unmatched,
      children: [],
    });
  }
}

/**
 * 从节点路径索引中找 cwd 命中的「最深」节点：
 * 从 cwd 自身逐级向上，命中的第一个（最深）即归属节点；无命中返回 undefined。
 */
function findDeepestNode(pathIndex: Map<string, ScopeNode>, cwd: string): ScopeNode | undefined {
  let cur = normalizeScopePath(cwd);
  for (;;) {
    const node = pathIndex.get(cur);
    if (node) return node;
    const idx = cur.lastIndexOf("/");
    if (idx <= 0) break;
    cur = cur.slice(0, idx);
  }
  return undefined;
}
