/**
 * Host 侧提示词持久化（SQLite）。
 *
 * 数据存储在 DSH_HOME（默认 ~/.dsh）下
 *   ~/.dsh/prompt-library/db/prompts.db
 * 使用 Node 内置 `node:sqlite`（DatabaseSync），无第三方原生依赖。
 *
 * 历史数据迁移：若旧 JSON 文件 prompts.json 存在且 db 尚无数据，
 * 首次访问 database 时一次性导入并删除旧 JSON 文件。
 *
 * 所有读写在单进程单连接上串行执行，天然避免并发交错导致的丢失更新。
 */
import { readFile, rm, writeFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { load, dump } from "js-yaml";
import type { PluginSettings, Prompt } from "../types.js";
import { clampTitle, DEFAULT_SETTINGS, TITLE_MAX_LEN } from "../types.js";
import { enrichLearnedPrompt, isAiAvailable } from "./ai.js";
import { syncCharacterChatInto } from "./character.js";
import {
  dbPath,
  SETTINGS_NAMESPACE,
  storePath,
  systemSettingsPath,
} from "./paths.js";

/** 去掉 UTF-8 BOM（Windows 记事本/PowerShell 等工具可能写入），避免 JSON.parse 失败。 */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// ── SQLite 连接与初始化 ────────────────────────────────────────────────────

/** 单例数据库连接。 */
let db: DatabaseSync | undefined;

function getDb(): DatabaseSync {
  if (db) return db;
  // 懒初始化：确保 db 目录存在，打开数据库，建表，并迁移历史 JSON 数据。
  // 在模块导入前无法做副作用初始化（会在 headless profile 误触发），
  // 因此延后到首次真实访问数据时进行。
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  const next = new DatabaseSync(path);
  next.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      body         TEXT NOT NULL,
      tags         TEXT,
      summary      TEXT,
      sourceBody   TEXT,
      aiRefined    INTEGER NOT NULL DEFAULT 0,
      updatedAt    INTEGER NOT NULL,
      usageCount   INTEGER NOT NULL DEFAULT 0,
      lastUsedAt   INTEGER NOT NULL DEFAULT 0
    );
  `);
  db = next;
  // 一次性迁移历史 JSON 数据（失败静默，不影响使用）。
  migrateLegacyJsonIfNeeded().catch(() => {});
  return next;
}

/** 关闭数据库连接（供测试/收尾使用）。 */
export function closeDb(): void {
  if (db) {
    try {
      db.close();
    } catch {
      /* 忽略关闭错误 */
    }
    db = undefined;
  }
}

// ── 行映射 ─────────────────────────────────────────────────────────────────

interface PromptRow {
  id: string;
  title: string;
  body: string;
  tags: string | null;
  summary: string | null;
  sourceBody: string | null;
  aiRefined: number;
  updatedAt: number;
  usageCount: number;
  lastUsedAt: number;
}

function rowToPrompt(r: PromptRow): Prompt {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    tags: r.tags ? (JSON.parse(r.tags) as string[]) : undefined,
    summary: r.summary ?? undefined,
    sourceBody: r.sourceBody ?? undefined,
    aiRefined: r.aiRefined === 1,
    updatedAt: r.updatedAt,
    usageCount: r.usageCount,
    lastUsedAt: r.lastUsedAt,
  };
}

function tagsToJson(tags?: string[]): string | null {
  return Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags) : null;
}

// ── 旧 JSON → SQLite 迁移 ──────────────────────────────────────────────────

/**
 * 若旧 JSON 库 ~/.dsh/prompt-library/prompts.json 存在且 db 尚无任何数据，
 * 一次性导入全部提示词，随后删除旧 JSON 文件（数据已迁入 db，旧文件不再保留）。
 */
async function migrateLegacyJsonIfNeeded(): Promise<void> {
  const legacy = storePath();
  let text: string;
  try {
    text = await readFile(legacy, "utf8");
  } catch {
    return; // 旧文件不存在
  }
  if (hasAnyPrompts()) return; // db 已有数据，不重复导入

  let parsed: { prompts?: Array<Record<string, unknown>> } | undefined;
  try {
    parsed = JSON.parse(stripBom(text)) as { prompts?: Array<Record<string, unknown>> };
  } catch {
    return; // 旧文件格式错误：跳过
  }
  const list = Array.isArray(parsed?.prompts) ? parsed.prompts : [];
  const cur = getDb();
  const stmt = cur.prepare(`
    INSERT OR IGNORE INTO prompts
      (id, title, body, tags, summary, sourceBody, aiRefined, updatedAt, usageCount, lastUsedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // 事务批量导入，提高迁移性能并保证原子性
  cur.exec("BEGIN");
  try {
    for (const raw of list) {
      const p = raw as Partial<Prompt>;
      if (typeof p.id !== "string" || typeof p.body !== "string") continue;
      stmt.run(
        p.id,
        typeof p.title === "string" ? p.title : "",
        p.body,
        tagsToJson(p.tags),
        typeof p.summary === "string" ? p.summary : null,
        typeof p.sourceBody === "string" ? p.sourceBody : null,
        p.aiRefined ? 1 : 0,
        typeof p.updatedAt === "number" ? p.updatedAt : 0,
        typeof p.usageCount === "number" ? p.usageCount : 0,
        typeof p.lastUsedAt === "number" ? p.lastUsedAt : 0,
      );
    }
    cur.exec("COMMIT");
  } catch (e) {
    cur.exec("ROLLBACK");
    throw e;
  }
  // 导入成功后删除旧 JSON 文件；删除失败仅保留旧文件，不影响已导入的数据
  try {
    await rm(legacy);
  } catch {
    /* 保留旧文件即可 */
  }
}

/**
 * 排序规则：
 * 1. 使用次数最高的前 3 个提示词固定置顶（常用优先）；
 * 2. 其余提示词按更新时间降序（新增的在最前面），更新时间相同的按使用次数降序。
 */
function sortPrompts(prompts: Prompt[]): Prompt[] {
  // 使用次数最高的前 3 个（使用次数相同时，更新时间新的在前）
  const byUsage = [...prompts].sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return b.updatedAt - a.updatedAt;
  });
  const topUsed = byUsage.slice(0, 3);
  const topUsedIds = new Set(topUsed.map((p) => p.id));
  // 其余按更新时间降序
  const rest = prompts
    .filter((p) => !topUsedIds.has(p.id))
    .sort((a, b) => {
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      return b.usageCount - a.usageCount;
    });
  return [...topUsed, ...rest];
}

/** 取全部提示词（未排序）。 */
function findAll(): Prompt[] {
  const cur = getDb();
  const rows = cur.prepare("SELECT * FROM prompts").all() as unknown as PromptRow[];
  return rows.map(rowToPrompt);
}

/** db 中是否存在提示词。 */
function hasAnyPrompts(): boolean {
  const cur = getDb();
  const row = cur.prepare("SELECT EXISTS(SELECT 1 FROM prompts) AS n").get() as { n: number };
  return (row?.n ?? 0) > 0;
}

/**
 * 如果超过最大数量，删除最不常用的提示词。
 * 优先删除使用次数为 0 且最旧的。
 */
async function enforceMaxCount(maxCount: number): Promise<void> {
  const cur = getDb();
  const { total } = cur.prepare("SELECT COUNT(*) AS total FROM prompts").get() as { total: number };
  if (total <= maxCount) return;
  // 超出个数的由当前最少使用/最旧者删除：先删除非置顶、使用次数为 0 且最旧的
  const toRemove = total - maxCount;
  const ids = cur
    .prepare(
      `SELECT id FROM prompts
       ORDER BY usageCount ASC, updatedAt ASC
       LIMIT ?`,
    )
    .all(toRemove) as unknown as Array<{ id: string }>;
  const rm = cur.prepare("DELETE FROM prompts WHERE id = ?");
  for (const { id } of ids) rm.run(id);
}

export function listPrompts(): Promise<Prompt[]> {
  try {
    return Promise.resolve(sortPrompts(findAll()));
  } catch (e) {
    return Promise.reject(e);
  }
}

export function createPrompt(input: {
  title: string;
  body: string;
  tags?: string[];
}): Promise<Prompt> {
  try {
    const now = Date.now();
    const prompt: Prompt = {
      id: randomUUID(),
      title: clampTitle(input.title.trim()),
      body: input.body,
      tags: Array.isArray(input.tags) ? input.tags : [],
      updatedAt: now,
      usageCount: 0,
      lastUsedAt: 0,
    };
    const cur = getDb();
    cur
      .prepare(
        `INSERT INTO prompts
           (id, title, body, tags, aiRefined, updatedAt, usageCount, lastUsedAt)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      )
      .run(prompt.id, prompt.title, prompt.body, tagsToJson(prompt.tags), now, 0, 0);
    const settings = getSettingsSync();
    void enforceMaxCount(settings.maxPromptCount);
    return Promise.resolve(prompt);
  } catch (e) {
    return Promise.reject(e);
  }
}

export function updatePrompt(
  id: string,
  patch: {
    title?: string;
    body?: string;
    tags?: string[];
    summary?: string;
    sourceBody?: string;
    aiRefined?: boolean;
    usageCount?: number;
    lastUsedAt?: number;
  },
): Promise<Prompt | undefined> {
  try {
    const cur = getDb();
    const existing = cur.prepare("SELECT * FROM prompts WHERE id = ?").get(id) as unknown as PromptRow | undefined;
    if (!existing) return Promise.resolve(undefined);
    const current = rowToPrompt(existing);
    const next: Prompt = {
      ...current,
      title: patch.title !== undefined ? clampTitle(patch.title.trim()) : current.title,
      body: patch.body !== undefined ? patch.body : current.body,
      tags: patch.tags !== undefined ? patch.tags : current.tags,
      summary: patch.summary !== undefined ? patch.summary : current.summary,
      sourceBody: patch.sourceBody !== undefined ? patch.sourceBody : current.sourceBody,
      aiRefined: patch.aiRefined !== undefined ? patch.aiRefined : current.aiRefined,
      updatedAt: Date.now(),
      usageCount: patch.usageCount !== undefined ? patch.usageCount : current.usageCount,
      lastUsedAt: patch.lastUsedAt !== undefined ? patch.lastUsedAt : current.lastUsedAt,
    };
    cur
      .prepare(
        `UPDATE prompts SET
           title = ?, body = ?, tags = ?, summary = ?, sourceBody = ?,
           aiRefined = ?, updatedAt = ?, usageCount = ?, lastUsedAt = ?
         WHERE id = ?`,
      )
      .run(
        next.title,
        next.body,
        tagsToJson(next.tags),
        next.summary ?? null,
        next.sourceBody ?? null,
        next.aiRefined ? 1 : 0,
        next.updatedAt,
        next.usageCount,
        next.lastUsedAt,
        id,
      );
    return Promise.resolve(next);
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * 记录提示词的使用（点击插入）。
 * 递增使用次数并更新最后使用时间。
 */
export function recordUsage(id: string): Promise<Prompt | undefined> {
  try {
    const cur = getDb();
    const ts = Date.now();
    cur
      .prepare("UPDATE prompts SET usageCount = usageCount + 1, lastUsedAt = ?, updatedAt = ? WHERE id = ?")
      .run(ts, ts, id);
    const row = cur.prepare("SELECT * FROM prompts WHERE id = ?").get(id) as unknown as PromptRow | undefined;
    if (!row) return Promise.resolve(undefined);
    return Promise.resolve(rowToPrompt(row));
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * 无 AI 时的标题自动梳理：从正文中提取一个干净的标题。
 * - 取首个有内容的行；
 * - 去掉行首的 markdown 标题/列表/序号/引用及纯符号前缀；
 * - 超长时优先在句末标点处断句，加省略号，再限制在 TITLE_MAX_LEN 内；
 * - 全部为空时回退到默认标题。
 * 开启「AI 智能完善」后，标题仍会由 AI 在后台进一步语义化。
 */
function buildTitle(body: string): string {
  const fallback = "Learned Prompt";
  const firstLine = (body.split(/\r?\n/) ?? [""]).map((l) => l.trim()).find((l) => l.length > 0);
  if (!firstLine) return fallback;
  // 去掉行首标题/列表/序号/引用标记与纯符号前缀
  const cleaned = firstLine
    .replace(/^\s*(#{1,6}\s*|\*\s*|-{1,3}\s*|\d+[.、)]\s*|>\s*)/, "")
    .replace(/^[\s\p{P}\p{S}]+/u, "")
    .trim();
  if (!cleaned) return fallback;
  if (cleaned.length <= TITLE_MAX_LEN) return cleaned;
  // 超长：优先在较靠前的句末标点处断句；找不到则整段截断
  const segment = cleaned.slice(0, TITLE_MAX_LEN + 6);
  const m = segment.match(/[。！？!?；;…]/);
  const cut = m ? m.index! + 1 : TITLE_MAX_LEN;
  return clampTitle(cleaned.slice(0, Math.max(1, cut)) + "…");
}

export function autoLearn(body: string, tag?: string, skipEnrich?: boolean): Promise<Prompt> {
  try {
    const normalized = body.trim().toLowerCase();
    const collisions = getDb()
      .prepare("SELECT id FROM prompts WHERE lower(body) = ?")
      .all(normalized) as unknown as Array<{ id: string }>;
    if (collisions.length > 0) {
      const row = getDb()
        .prepare("SELECT * FROM prompts WHERE id = ?")
        .get(collisions[0]!.id) as unknown as PromptRow;
      const existing = rowToPrompt(row);
      return Promise.resolve(existing).then(async (prompt) => {
        void continueEnrich(prompt, !!skipEnrich);
        return prompt;
      });
    }

    // 自动生成标题：无 AI 时也用 buildTitle 做基础梳理（去标记、句末断句、限 25 字）。
    const title = buildTitle(body);

    const now = Date.now();
    const prompt: Prompt = {
      id: randomUUID(),
      title,
      body: body.trim(),
      tags: tag ? [tag] : ["auto-learned"],
      updatedAt: now,
      usageCount: 0,
      lastUsedAt: 0,
      // 已在界面完成 AI 润色的正文视为已完善，跳过后台 AI 完善
      aiRefined: !!skipEnrich,
    };
    getDb()
      .prepare(
        `INSERT INTO prompts
           (id, title, body, tags, aiRefined, updatedAt, usageCount, lastUsedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(prompt.id, prompt.title, prompt.body, tagsToJson(prompt.tags), prompt.aiRefined ? 1 : 0, now, 0, 0);
    const settings = getSettingsSync();
    void enforceMaxCount(settings.maxPromptCount);
    void continueEnrich(prompt, !!skipEnrich);
    return Promise.resolve(prompt);
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * 后台 AI 完善：不阻塞响应，任何失败静默降级。
 * 若是手动确认里已点过「AI 润色」的正文（skipEnrich），不再重复调用 AI 完善。
 */
async function continueEnrich(prompt: Prompt, skipEnrich: boolean): Promise<void> {
  if (skipEnrich) return;
  const settings = await getSettings();
  if (settings.aiEnrichEnabled && isAiAvailable()) {
    enrichLearnedPrompt(prompt, settings).catch(() => {
      /* 静默：AI 完善失败不影响已保存的提示词 */
    });
  }
}

export function deletePrompt(id: string): Promise<boolean> {
  try {
    const result = getDb().prepare("DELETE FROM prompts WHERE id = ?").run(id);
    return Promise.resolve(result.changes > 0);
  } catch (e) {
    return Promise.reject(e);
  }
}

// ── 设置存储（系统 settings.yaml）───────────────────────────────────────────

/**
 * 读取系统 settings.yaml 中的插件设置命名空间（`prompt-library`）。
 * 文件不存在、无法解析或命名空间缺失/非对象时返回 undefined；
 * 任何读取失败都不向上抛错，避免干扰主流程。
 */
async function readSystemSettingsNamespace(): Promise<Partial<PluginSettings> | undefined> {
  let text: string;
  try {
    text = await readFile(systemSettingsPath(), "utf8");
  } catch {
    return undefined;
  }
  let root: unknown;
  try {
    root = load(stripBom(text));
  } catch {
    return undefined; // 系统配置格式错误：不动它，视为命名空间缺失
  }
  if (typeof root !== "object" || root === null || Array.isArray(root)) return undefined;
  const ns = (root as Record<string, unknown>)[SETTINGS_NAMESPACE];
  if (typeof ns !== "object" || ns === null || Array.isArray(ns)) return undefined;
  return ns as Partial<PluginSettings>;
}

/**
 * 把插件设置写入系统 settings.yaml 的 `prompt-library` 命名空间：
 * 读取整个系统配置 → 仅追加/替换自己的命名空间 → 整体写回。
 * 系统其它命名空间原样保留（只可能被 YAML 重新排版，不会丢值）；
 * 系统配置不存在或无法解析时按空配置处理，不覆盖、不误改。
 */
async function writeSettingsRaw(settings: PluginSettings): Promise<void> {
  let root: Record<string, unknown> = {};
  try {
    const text = await readFile(systemSettingsPath(), "utf8");
    const parsed: unknown = load(stripBom(text));
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      root = parsed as Record<string, unknown>;
    }
  } catch {
    // 系统配置缺失或不可读：从空配置开始，仅写入自己的命名空间
  }
  root[SETTINGS_NAMESPACE] = settings;
  await writeFile(systemSettingsPath(), dump(root, { indent: 2 }), "utf8");
}

/**
 * 读取设置：优先从系统 settings.yaml 的 `prompt-library` 命名空间读取；
 * 命名空间缺失时用默认值并写入系统配置。任何写入失败都不影响本次读取。
 */
async function readSettingsRaw(): Promise<PluginSettings> {
  const ns = await readSystemSettingsNamespace().catch(() => undefined);
  if (ns !== undefined) {
    const settings: PluginSettings = { ...DEFAULT_SETTINGS, ...ns };
    syncCharacterChatInto(settings.applyCharacterToChat ?? false);
    return settings;
  }
  // 命名空间缺失：用默认值初始化并写入系统配置
  const settings: PluginSettings = { ...DEFAULT_SETTINGS };
  try {
    await writeSettingsRaw(settings);
  } catch {
    /* 写入失败也照常返回设置值，不影响本次读取 */
  }
  syncCharacterChatInto(settings.applyCharacterToChat ?? false);
  return settings;
}

export function getSettings(): Promise<PluginSettings> {
  return readSettingsRaw();
}

/** 同步读取设置（供创建/自动学习内部快速获取不阻塞）。 */
function getSettingsSync(): PluginSettings {
  // 同步路径下无法可靠读 yaml，这里直接返回默认值；
  // enforceMaxCount 是后台淘汰，用默认上限足够，不影响主逻辑。
  return { ...DEFAULT_SETTINGS };
}

export function updateSettings(patch: Partial<PluginSettings>): Promise<PluginSettings> {
  return readSettingsRaw().then(async (settings) => {
    const next: PluginSettings = { ...settings, ...patch };
    await writeSettingsRaw(next);
    // 立即同步会话级灵魂边界开关，让勾选即刻生效。
    // 关闭只阻止「新会话」注入，已注入的会话永久保持注入，不受中途开关影响。
    syncCharacterChatInto(next.applyCharacterToChat ?? false);
    return next;
  });
}