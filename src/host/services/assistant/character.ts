/**
 * AI 人格文件模块。
 *
 * 维护单个 SOUL.md（位于 ~/.dsh/prompt-library/character/SOUL.md）：聚合
 * 身份、性格/语气、工作规范，用户可直接编辑，AI 严格遵守。
 *
 * 能力：
 * - ensureSoulFile：文件缺失时写入默认模板，并创建目录；
 * - readSoulDoc：读取人格文件内容；
 * - soulSystemSync：同步读取（供对话组装热路径），带 stat 缓存。
 *
 * 该文件是用户的显式设定（含缺省模板），AI 只读引用、不擅自改写。
 */
import { readFileSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { soulPath } from "../../utils/paths.js";
import { stripBom } from "../../utils/text.js";

/** SOUL.md 默认模板：提供一套通用助手人格，用户可直接编辑，AI 据此遵守。 */
const DEFAULT_SOUL = `# SOUL · 人格

我是「词库助手」，专注把散乱输入整理成清晰、通用、可复用的提示词，越用越懂用户。
语气自然、简洁务实、贴近用户写作风格；不堆砌空话，不歪曲用户意图，不删减必要细节，不生成与任务无关的内容。

## 工作规范
1. 理解原意：读懂输入的核心意图与关键细节。
2. 优化表达：让内容更清晰、通用、结构清晰、可直接复用。
3. 只处理提示词内容本身，不改动标题、分类等无关部分；相似内容优先复用既有记忆。
`;

/** 是否把人格注入到整个聊天会话（由实验室功能开关控制）。 */
let characterChatInject = false;

/** 设置「整个聊天会话也注入人格」的开关状态（由设置读写联动）。 */
export function syncCharacterChatInto(enable: boolean): void {
  characterChatInject = enable;
}

/** 当前是否启用「整个聊天会话注入人格」。 */
export function isCharacterChatInjected(): boolean {
  return characterChatInject;
}

// ── 会话级注入跟踪：只对「新会话」生效，不影响启用前正在进行的对话 ──────────
/** 已注入人格的新会话 scope。 */
const grantedScopes = new Set<unknown>();
/** 功能启用前就已存在的会话 scope（视为进行中，不注入）。 */
const seenScopes = new Set<unknown>();
/** 跟踪集合上限，超过则清空，避免无限增长。 */
const MAX_TRACKED_SCOPES = 200;

function trimScopeSet(set: Set<unknown>): void {
  if (set.size > MAX_TRACKED_SCOPES) set.clear();
}

/**
 * 判断这次组装（属于会话 scope）是否应注入人格：
 * - 功能关闭：把该会话记为「既存」，返回 false（不注入）。
 * - 功能开启后：
 *   - 无法识别 scope → 直接注入；
 *   - 已注入过的新会话 → 保持注入；
 *   - 启用前就存在的会话 → 不注入（不影响正在进行的对话）；
 *   - 从未见过的 scope → 视为新会话，注入。
 */
export function shouldInjectChatCharacter(contextScope: unknown): boolean {
  if (!characterChatInject) {
    if (contextScope != null) seenScopes.add(contextScope);
    trimScopeSet(seenScopes);
    return false;
  }
  if (contextScope == null) return true;
  if (grantedScopes.has(contextScope)) return true;
  if (seenScopes.has(contextScope)) return false;
  grantedScopes.add(contextScope);
  trimScopeSet(grantedScopes);
  return true;
}

/** 确保人格文件存在（缺失则写入默认模板；目录不存在则创建）。 */
export async function ensureSoulFile(): Promise<void> {
  const path = soulPath();
  try {
    await readFile(path, "utf8");
  } catch {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, stripBom(DEFAULT_SOUL), "utf8");
  }
}

/** 读取人格文件内容；文件缺失返回空字符串。 */
export async function readSoulDoc(): Promise<string> {
  try {
    return stripBom(await readFile(soulPath(), "utf8")).trim();
  } catch {
    return "";
  }
}

/** 人格文件内容追加到 AI system prompt 的边界段落（空则返回空串）。 */
export function buildSoulBoundary(soul: string): string {
  return soul.trim();
}

/**
 * 同步读取人格文本（供每次对话组装 system prompt 时调用）。
 *
 * 与 readSoulDoc 不同，这里是**同步**返回：宿主在组装对话提示时是同步
 * 回调 text 函数的，无法 await。
 *
 * 性能：对话组装每次都会走到这里（热路径）。为避免每次同步读文件，
 * 用便宜的 stat（mtime/size）做失效判断——文件没变就复用上次结果。
 */
interface SoulMeta {
  mtimeMs: number;
  size: number;
}
/** 面向热路径的结果缓存；mtime/size 变化时自动失效。 */
let soulCache: { meta: SoulMeta | null; content: string } | null = null;

export function soulSystemSync(): string {
  // 读 stat（mtime/size）做失效判断；文件缺失静默走重建分支
  let meta: SoulMeta | null = null;
  try {
    const s = statSync(soulPath());
    meta = { mtimeMs: s.mtimeMs, size: s.size };
  } catch {
    /* 文件缺失：meta 保持 null，走重建分支 */
  }
  const cached = soulCache;
  // 文件未变（都存在且 mtime/size 一致，或双侧都缺失）→ 复用缓存
  if (cached && ((meta !== null && cached.meta !== null && cached.meta.mtimeMs === meta.mtimeMs && cached.meta.size === meta.size) || (meta === null && cached.meta === null))) {
    return cached.content;
  }

  let content = "";
  try {
    content = stripBom(readFileSync(soulPath(), "utf8")).trim();
  } catch {
    // 文件缺失则留空；并在组装后触发默认模板重建
    void ensureSoulFile().catch(() => {});
  }
  soulCache = { meta, content };
  return content;
}