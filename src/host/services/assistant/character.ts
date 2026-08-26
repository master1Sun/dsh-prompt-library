/**
 * AI 人格文件模块。
 *
 * 支持多人格：
 * - 全局默认人格：~/.dsh/prompt-library/character/SOUL.md（用户可直接编辑，AI 严格遵守）；
 * - 自定义人格：character/personas/<id>/SOUL.md（按会话绑定后，该会话注入对应 SOUL）。
 *
 * 能力：
 * - ensureSoulFile：默认人格文件缺失时写入默认模板，并创建目录；
 * - readSoulDoc：读取全局默认人格文件内容；
 * - soulSystemSync(personaId?)：按 `personaId` 同步读取对应人格（热路径），带按路径缓存。
 */
import { readFileSync, rmSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { personaSoulPath, soulPath } from "../../utils/paths.js";
import { stripBom } from "../../utils/text.js";

/** SOUL.md 默认模板：新建人格时只给一个标题占位，正文由用户在人格管理里自行填写，AI 据此遵守。 */
const DEFAULT_SOUL = `# SOUL · 人格
`;

/** «default» 保留 id：表示使用全局默认人格（character/SOUL.md）。 */
export const DEFAULT_PERSONA_ID = "default";

/** 把任意 personaId 归一化：空串 / 'default' → null（表示默认人格）。 */
function normalizePersona(personaId?: string | null): string | null {
  if (!personaId) return null;
  return personaId === DEFAULT_PERSONA_ID ? null : personaId;
}

/** 确保默认人格文件存在（缺失则写入默认模板；目录不存在则创建）。 */
export async function ensureSoulFile(): Promise<void> {
  const path = soulPath();
  try {
    await readFile(path, "utf8");
  } catch {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, stripBom(DEFAULT_SOUL), "utf8");
  }
}

/** 确保自定义人格的 SOUL 文件存在（缺失则写入默认模板；目录不存在则创建）。 */
export async function ensurePersonaSoul(personaId: string): Promise<void> {
  const path = personaSoulPath(personaId);
  try {
    await readFile(path, "utf8");
  } catch {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, stripBom(DEFAULT_SOUL), "utf8");
  }
}

/** 读取全局默认人格文件内容；文件缺失返回空字符串。 */
export async function readSoulDoc(): Promise<string> {
  try {
    return stripBom(await readFile(soulPath(), "utf8")).trim();
  } catch {
    return "";
  }
}

/** 读取某人格（按 personaId，null 表示默认人格）的 SOUL 文件内容；缺失返回空串。 */
export async function readPersonaSoul(personaId?: string | null): Promise<string> {
  const id = normalizePersona(personaId);
  const path = id ? personaSoulPath(id) : soulPath();
  try {
    return stripBom(await readFile(path, "utf8")).trim();
  } catch {
    return "";
  }
}

/** 覆盖写入某人格（按 personaId，null 表示默认人格）的 SOUL 文件内容。 */
export async function writePersonaSoul(content: string, personaId?: string | null): Promise<void> {
  const id = normalizePersona(personaId);
  const path = id ? personaSoulPath(id) : soulPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stripBom(content), "utf8");
}

/** 删除某人物的 SOUL 文件及其目录（不存在时静默忽略）。 */
export function removePersonaSoul(personaId: string): void {
  try {
    rmSync(personaSoulPath(personaId), { recursive: true, force: true });
  } catch {
    /* 删除失败静默 */
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
/** 按人格文件路径缓存热路径结果；mtime/size 变化时自动失效。 */
const soulCacheByPath = new Map<string, { meta: SoulMeta | null; content: string } | null>();

/** 清理某路径的人格缓存（增删改成语后调用，强制下次重读）。 */
export function invalidateSoulCache(personaId?: string | null): void {
  const id = normalizePersona(personaId);
  const path = id ? personaSoulPath(id) : soulPath();
  soulCacheByPath.delete(path);
}

/**
 * 同步读取某人格文本（供每次对话组装 system prompt 时调用）。
 *
 * personaId 为 undefined / null / 'default' 时读全局默认人格；否则读
 * character/personas/<personaId>/SOUL.md。
 *
 * 与 readSoulDoc 不同，这里是**同步**返回：宿主在组装对话提示时是同步
 * 回调 text 函数的，无法 await。每次组装都走到这里（热路径），为避免每次
 * 同步读文件，用便宜的 stat（mtime/size）做失效判断——文件没变就复用缓存。
 */
export function soulSystemSync(personaId?: string | null): string {
  const id = normalizePersona(personaId);
  const path = id ? personaSoulPath(id) : soulPath();
  // 读 stat（mtime/size）做失效判断；文件缺失静默走重建分支
  let meta: SoulMeta | null = null;
  try {
    const s = statSync(path);
    meta = { mtimeMs: s.mtimeMs, size: s.size };
  } catch {
    /* 文件缺失：meta 保持 null，走重建分支 */
  }
  const cached = soulCacheByPath.get(path);
  // 文件未变（都存在且 mtime/size 一致，或双侧都缺失）→ 复用缓存
  if (cached && ((meta !== null && cached.meta !== null && cached.meta.mtimeMs === meta.mtimeMs && cached.meta.size === meta.size) || (meta === null && cached.meta === null))) {
    return cached.content;
  }

  let content = "";
  try {
    content = stripBom(readFileSync(path, "utf8")).trim();
  } catch {
    // 文件缺失则留空；并在组装后触发默认模板重建
    if (id) void ensurePersonaSoul(id).catch(() => {});
    else void ensureSoulFile().catch(() => {});
  }
  soulCacheByPath.set(path, { meta, content });
  return content;
}