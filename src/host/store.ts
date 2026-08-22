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
import type { PluginSettings, Prompt, TrashItem } from "../types.js";
import { clampTitle, DEFAULT_SETTINGS, TITLE_MAX_LEN } from "../types.js";
import { enrichLearnedPrompt, isAiAvailable } from "./ai.js";
import { emitDataChanged } from "./events.js";
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
  // 兼容早期的库：若缺少 createdAt 列则补建，并回填为 updatedAt（近似创建时间）。
  try {
    next.exec("ALTER TABLE prompts ADD COLUMN createdAt INTEGER NOT NULL DEFAULT 0");
    next.exec("UPDATE prompts SET createdAt = updatedAt WHERE createdAt = 0");
  } catch {
    /* 列已存在，忽略 */
  }
  // 独立的标签数据表：标签的集中管理（新增/删除/修改）以该表为准。
  next.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      name       TEXT PRIMARY KEY,
      createdAt  INTEGER NOT NULL
    );
  `);
  // 回收站数据表：删除的提示词移入此处，支持恢复或永久删除。
  next.exec(`
    CREATE TABLE IF NOT EXISTS trash (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      body         TEXT NOT NULL,
      tags         TEXT,
      summary      TEXT,
      sourceBody   TEXT,
      aiRefined    INTEGER NOT NULL DEFAULT 0,
      updatedAt    INTEGER NOT NULL,
      usageCount   INTEGER NOT NULL DEFAULT 0,
      lastUsedAt   INTEGER NOT NULL DEFAULT 0,
      createdAt    INTEGER NOT NULL DEFAULT 0,
      deletedAt    INTEGER NOT NULL
    );
  `);
  // 插件级元数据表（key-value），用于「首次欢迎」等一次性标记。
  next.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  // 一次性把提示词中已有的标签同步进标签表（幂等）。
  syncTagsFromPrompts(next);
  // 首次使用（词库为空）时写入一条默认提示词与标签，作为上手引导。
  seedDefaultPromptIfEmpty(next);
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

/**
 * 首次使用（prompts 表为空）时写入一条默认提示词与标签，作为上手引导。
 * 已有数据（含迁移自旧 JSON 的数据）时不执行，保证只播种一次。
 */
function seedDefaultPromptIfEmpty(cur: DatabaseSync): void {
  const row = cur.prepare("SELECT COUNT(*) AS c FROM prompts").get() as { c: number };
  if ((row.c ?? 0) > 0) return;
  const now = Date.now();
  const body = [
    "这是你保存的第一条提示词，也是提示词库的上手引导。",
    "",
    "你可以这样使用本插件：",
    "· 在输入框输入 `/prompts 把这段好的提示词保存下来`，不错过任何好词；",
    "· 输入 `/prompts -AI 请把这段润色得更专业`，AI 润色后填入聊天框；",
    "· 输入 `/prompts -h` 查看完整使用手册。",
    "",
    "也可以直接编辑这条提示词，替换为你自己的内容，并在设置里为它打上标签。",
  ].join("\n");
  const prompt: Prompt = {
    id: randomUUID(),
    title: "欢迎使用提示词库",
    body,
    // 不能在此调用 ensureTags()：它会重新进入 getDb()，而 db 尚未赋值导致无限递归。
    // 标签的落表由紧随其后的 syncTagsFromPrompts(cur) 用当前连接完成。默认数据仅单标签。
    tags: ["欢迎"],
    updatedAt: now,
    createdAt: now,
    usageCount: 0,
    lastUsedAt: 0,
    aiRefined: false,
  };
  cur.prepare(
    `INSERT INTO prompts
       (id, title, body, tags, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(prompt.id, prompt.title, prompt.body, tagsToJson(prompt.tags), 0, now, 0, 0, now);
  // 把默认提示词的标签同步进标签表（幂等）。
  syncTagsFromPrompts(cur);
}

// ── 首次欢迎：只对第一个新会话注入一次 AI 开场白 ────────────────────────────

/** 首次欢迎时注入到 system prompt 的开场指令（让 AI 第一条回复引导用户）。 */
const WELCOME_SYSTEM = [
  "（首次使用引导）本会话是你与带「提示词库」插件的助手第一次对话。",
  "请在本次会话的【第一条回复】中用一段简洁、自然、友好的开场白欢迎用户，并说明：",
  "1. 你具备提示词库能力：能随时把值得复用的内容保存成带标题、标签、{{变量}}的提示词；",
  "2. 告诉用户三种用法：输入“/prompts 正文”保存；“/prompts -AI 正文”由 AI 润色后填入聊天框；“/prompts -h”查看完整使用手册；",
  "3. 提示词库已预置一条「欢迎使用提示词库」示例，可在右侧侧边栏查看。",
  "开场白只需一段，明确提及以上三点即可，不要复述整本手册，也不要在此后回复中重复欢迎。",
].join("\n");

/** 已把欢迎指令绑定到某个会话 scope。 */
let welcomeBound = false;
/** 绑定到的会话 scope（用于同一会话多次组装的持续注入）。 */
let welcomeScope: unknown;

/**
 * 判断本次组装（属于会话 scope）是否应注入首次欢迎开场指令：
 * - 第一次调用（全局首次）：注入，并把 scope 绑定起来，同时写 meta 标记持久化；
 * - 同一 scope 再次组装：保持注入（该会话第一条回复仍能看到指令）；
 * - 首次已消费且不是绑定 scope：不再注入。
 * 返回需要追加到 system prompt 的文本，空串表示不注入。
 */
export function welcomePromptOnce(scope: unknown): string {
  if (welcomeBound) {
    return welcomeScope === scope ? WELCOME_SYSTEM : "";
  }
  welcomeBound = true;
  welcomeScope = scope;
  try {
    getDb()
      .prepare("INSERT INTO meta (key, value) VALUES ('welcomeShown', '1') ON CONFLICT(key) DO NOTHING")
      .run();
  } catch {
    /* 标记写入失败不阻断注入 */
  }
  return WELCOME_SYSTEM;
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
  createdAt: number;
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
    createdAt: r.createdAt,
    usageCount: r.usageCount,
    lastUsedAt: r.lastUsedAt,
  };
}

function tagsToJson(tags?: string[]): string | null {
  return Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags) : null;
}

// ── 独立标签数据表 ──────────────────────────────────────────────────────────

/** 确保一个标签存在于标签表（不存在则插入）。返回规范化后的标签名。 */
export function ensureTag(name: string): string {
  const t = name.trim();
  if (!t) return t;
  const cur = getDb();
  cur
    .prepare("INSERT OR IGNORE INTO tags (name, createdAt) VALUES (?, ?)")
    .run(t, Date.now());
  return t;
}

/** 确保多个标签存在于标签表。 */
function ensureTags(names?: string[]): string[] {
  if (!Array.isArray(names)) return [];
  const out: string[] = [];
  for (const n of names) {
    const t = ensureTag(n);
    if (t) out.push(t);
  }
  return out;
}

/** 把提示词表中的标签同步进标签表（幂等，用于旧数据迁移）。 */
function syncTagsFromPrompts(cur: DatabaseSync): void {
  try {
    const rows = cur
      .prepare("SELECT tags FROM prompts WHERE tags IS NOT NULL")
      .all() as unknown as Array<{ tags: string }>;
    const insert = cur.prepare("INSERT OR IGNORE INTO tags (name, createdAt) VALUES (?, ?)");
    const now = Date.now();
    cur.exec("BEGIN");
    try {
      for (const row of rows) {
        const list = JSON.parse(row.tags) as string[];
        for (const t of list) {
          const name = t.trim();
          if (name) insert.run(name, now);
        }
      }
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
  } catch {
    /* 同步失败静默，不影响主流程 */
  }
}

// ── 回收站行映射 ────────────────────────────────────────────────────────────

interface TrashRow {
  id: string;
  title: string;
  body: string;
  tags: string | null;
  summary: string | null;
  sourceBody: string | null;
  aiRefined: number;
  updatedAt: number;
  createdAt: number;
  usageCount: number;
  lastUsedAt: number;
  deletedAt: number;
}

function rowToTrash(r: TrashRow): TrashItem {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    tags: r.tags ? (JSON.parse(r.tags) as string[]) : undefined,
    summary: r.summary ?? undefined,
    sourceBody: r.sourceBody ?? undefined,
    aiRefined: r.aiRefined === 1,
    updatedAt: r.updatedAt,
    createdAt: r.createdAt,
    usageCount: r.usageCount,
    lastUsedAt: r.lastUsedAt,
    deletedAt: r.deletedAt,
  };
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
      (id, title, body, tags, summary, sourceBody, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        typeof p.createdAt === "number"
          ? p.createdAt
          : typeof p.updatedAt === "number"
            ? p.updatedAt
            : 0,
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
 * 1. 时效期内（创建未超过 FRESH_MS）的新提示词排在最前，按创建时间降序（最新在前）；
 * 2. 其余提示词：先用次数最高的前 3 个排前面，再按更新时间降序（新增在前），更新时间相同按使用次数降序。
 */
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;

function sortPrompts(prompts: Prompt[]): Prompt[] {
  const now = Date.now();
  // 1. 时效期内的新提示词排在最前（按创建时间降序）
  const fresh = prompts
    .filter((p) => now - p.createdAt < FRESH_MS)
    .sort((a, b) => b.createdAt - a.createdAt);
  const freshIds = new Set(fresh.map((p) => p.id));
  // 2. 其余提示词按原规则：次数最高的前 3 个排前面，其余按更新时间降序
  const rest = prompts.filter((p) => !freshIds.has(p.id));
  const byUsage = [...rest].sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return b.updatedAt - a.updatedAt;
  });
  const topUsed = byUsage.slice(0, 3);
  const topUsedIds = new Set(topUsed.map((p) => p.id));
  const others = rest
    .filter((p) => !topUsedIds.has(p.id))
    .sort((a, b) => {
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      return b.usageCount - a.usageCount;
    });
  return [...fresh, ...topUsed, ...others];
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
  // 超出个数的由当前最少使用/最旧者删除：优先删除使用次数为 0 且最旧的
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
    // 标签写入标签表（集中管理），仅保留单个标签
    const tags = ensureTags(Array.isArray(input.tags) ? input.tags : []).slice(0, 1);
    const prompt: Prompt = {
      id: randomUUID(),
      title: clampTitle(input.title.trim()),
      body: input.body,
      tags,
      updatedAt: now,
      createdAt: now,
      usageCount: 0,
      lastUsedAt: 0,
    };
    const cur = getDb();
    cur
      .prepare(
        `INSERT INTO prompts
           (id, title, body, tags, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      )
      .run(prompt.id, prompt.title, prompt.body, tagsToJson(prompt.tags), now, 0, 0, now);
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
    // 标签更新时同步进标签表（集中管理），仅保留单个标签
    const nextTags = patch.tags !== undefined ? ensureTags(patch.tags).slice(0, 1) : undefined;
    const next: Prompt = {
      ...current,
      title: patch.title !== undefined ? clampTitle(patch.title.trim()) : current.title,
      body: patch.body !== undefined ? patch.body : current.body,
      tags: nextTags !== undefined ? nextTags : current.tags,
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
      tags: ensureTags(tag ? [tag] : ["auto-learned"]).slice(0, 1),
      updatedAt: now,
      createdAt: now,
      usageCount: 0,
      lastUsedAt: 0,
      // 已在界面完成 AI 润色的正文视为已完善，跳过后台 AI 完善
      aiRefined: !!skipEnrich,
    };
    getDb()
      .prepare(
        `INSERT INTO prompts
           (id, title, body, tags, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(prompt.id, prompt.title, prompt.body, tagsToJson(prompt.tags), prompt.aiRefined ? 1 : 0, now, 0, 0, now);
    const settings = getSettingsSync();
    void enforceMaxCount(settings.maxPromptCount);
    void continueEnrich(prompt, !!skipEnrich);
    emitDataChanged();
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
    enrichLearnedPrompt(prompt, settings)
      .then(() => emitDataChanged())
      .catch(() => {
        /* 静默：AI 完善失败不影响已保存的提示词 */
      });
  }
}

/**
 * 删除提示词：不直接物理删除，而是移入回收站（trash 表），
 * 支持在数据管理面板中恢复或永久删除。
 */
export function deletePrompt(id: string): Promise<boolean> {
  try {
    const cur = getDb();
    const existing = cur.prepare("SELECT * FROM prompts WHERE id = ?").get(id) as unknown as PromptRow | undefined;
    if (!existing) return Promise.resolve(false);
    const now = Date.now();
    cur.exec("BEGIN");
    try {
      cur
        .prepare(
          `INSERT INTO trash
             (id, title, body, tags, summary, sourceBody, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt, deletedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          existing.id,
          existing.title,
          existing.body,
          existing.tags,
          existing.summary,
          existing.sourceBody,
          existing.aiRefined,
          existing.updatedAt,
          existing.usageCount,
          existing.lastUsedAt,
          existing.createdAt,
          now,
        );
      cur.prepare("DELETE FROM prompts WHERE id = ?").run(id);
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve(true);
  } catch (e) {
    return Promise.reject(e);
  }
}

// ── 回收站管理 ──────────────────────────────────────────────────────────────

/** 回收站自动清除保留期：超过 30 天永久清除。 */
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 列出回收站中的全部提示词（按删除时间降序，最新删除在前）。
 * 访问时先把已超过保留期（30 天）的内容自动永久清除，再返回剩余项。
 */
export function listTrash(): Promise<TrashItem[]> {
  try {
    const cur = getDb();
    const deadline = Date.now() - TRASH_RETENTION_MS;
    // 自动清除超过保留期的回收站内容（无论此接口是否被访问都会在处理列表时执行）
    cur.prepare("DELETE FROM trash WHERE deletedAt < ?").run(deadline);
    const rows = cur
      .prepare("SELECT * FROM trash ORDER BY deletedAt DESC")
      .all() as unknown as TrashRow[];
    return Promise.resolve(rows.map(rowToTrash));
  } catch (e) {
    return Promise.reject(e);
  }
}

/** 从回收站恢复一批提示词到词库（已存在的 id 覆盖为回收站版本）。返回恢复条数。 */
export function restorePrompts(ids: string[]): Promise<number> {
  try {
    const list = Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : [];
    if (list.length === 0) return Promise.resolve(0);
    const cur = getDb();
    const select = cur.prepare("SELECT * FROM trash WHERE id = ?");
    const insert = cur.prepare(
      `INSERT OR REPLACE INTO prompts
         (id, title, body, tags, summary, sourceBody, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const remove = cur.prepare("DELETE FROM trash WHERE id = ?");
    let restored = 0;
    cur.exec("BEGIN");
    try {
      for (const id of list) {
        const row = select.get(id) as unknown as TrashRow | undefined;
        if (!row) continue;
        // 恢复时同步标签进标签表（集中管理）
        const tags = row.tags ? (JSON.parse(row.tags) as string[]) : [];
        ensureTags(tags);
        insert.run(
          row.id,
          row.title,
          row.body,
          row.tags,
          row.summary,
          row.sourceBody,
          row.aiRefined,
          row.updatedAt,
          row.usageCount,
          row.lastUsedAt,
          row.createdAt,
        );
        remove.run(id);
        restored++;
      }
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve(restored);
  } catch (e) {
    return Promise.reject(e);
  }
}

/** 从回收站永久删除一批提示词。返回删除条数。 */
export function deleteTrash(ids: string[]): Promise<number> {
  try {
    const list = Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : [];
    if (list.length === 0) return Promise.resolve(0);
    const cur = getDb();
    const rm = cur.prepare("DELETE FROM trash WHERE id = ?");
    let deleted = 0;
    cur.exec("BEGIN");
    try {
      for (const id of list) {
        deleted += Number(rm.run(id).changes);
      }
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve(deleted);
  } catch (e) {
    return Promise.reject(e);
  }
}

/** 清空回收站（全部永久删除）。返回删除条数。 */
export function emptyTrash(): Promise<number> {
  try {
    const cur = getDb();
    const result = cur.prepare("DELETE FROM trash").run();
    return Promise.resolve(Number(result.changes));
  } catch (e) {
    return Promise.reject(e);
  }
}

// ── 导入导出 / 备份恢复 ────────────────────────────────────────────────────

/** 导出的备份文件结构。 */
export interface PromptBackup {
  version: 1;
  exportedAt: number;
  prompts: Prompt[];
}

/**
 * 导出提示词（备份内容，含 schema 版本与导出时间）。
 * 传入 ids 时仅导出指定提示词；缺省导出全部。
 */
export function exportPrompts(ids?: string[]): Promise<PromptBackup> {
  try {
    const all = findAll().sort((a, b) => a.title.localeCompare(b.title));
    const prompts =
      ids && ids.length > 0 ? all.filter((p) => ids.includes(p.id)) : all;
    return Promise.resolve({ version: 1, exportedAt: Date.now(), prompts });
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * 从备份内容导入提示词（合并式导入）：
 * - 同 id 已存在 → 用导入数据覆盖（保留导入侧字段）；
 * - 同 id 不存在 → 新增；
 * - 缺 body 的无效行跳过；缺 id 时生成新 id。
 * 返回导入/更新/跳过条数。
 */
export function importPrompts(
  raw: unknown,
): Promise<{ imported: number; updated: number; skipped: number }> {
  try {
    const list = Array.isArray(raw)
      ? raw
      : typeof raw === "object" &&
          raw !== null &&
          Array.isArray((raw as { prompts?: unknown }).prompts)
        ? (raw as { prompts: unknown[] }).prompts
        : [];
    const cur = getDb();
    const upsert = cur.prepare(`
      INSERT INTO prompts
        (id, title, body, tags, summary, sourceBody, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, body = excluded.body, tags = excluded.tags,
        summary = excluded.summary, sourceBody = excluded.sourceBody,
        aiRefined = excluded.aiRefined, updatedAt = excluded.updatedAt,
        usageCount = excluded.usageCount, lastUsedAt = excluded.lastUsedAt,
        createdAt = excluded.createdAt
    `);
    const now = Date.now();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    cur.exec("BEGIN");
    try {
      for (const rawItem of list) {
        if (typeof rawItem !== "object" || rawItem === null) {
          skipped++;
          continue;
        }
        const p = rawItem as Record<string, unknown>;
        const body = typeof p.body === "string" ? p.body : "";
        if (!body.trim()) {
          skipped++;
          continue;
        }
        const id = typeof p.id === "string" && p.id ? p.id : randomUUID();
        const title =
          typeof p.title === "string" && p.title.trim()
            ? clampTitle(p.title.trim())
            : buildTitle(body);
        const tags = Array.isArray(p.tags)
          ? (p.tags as unknown[])
              .filter((t): t is string => typeof t === "string")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined;
        // 导入时把标签同步进标签表（集中管理）
        if (Array.isArray(tags)) ensureTags(tags);
        const summary = typeof p.summary === "string" ? p.summary : undefined;
        const sourceBody = typeof p.sourceBody === "string" ? p.sourceBody : undefined;
        const aiRefined = p.aiRefined ? 1 : 0;
        const updatedAt = typeof p.updatedAt === "number" ? p.updatedAt : now;
        const createdAt = typeof p.createdAt === "number" ? p.createdAt : updatedAt;
        const usageCount = typeof p.usageCount === "number" ? p.usageCount : 0;
        const lastUsedAt = typeof p.lastUsedAt === "number" ? p.lastUsedAt : 0;
        const existing = cur.prepare("SELECT id FROM prompts WHERE id = ?").get(id);
        upsert.run(
          id,
          title,
          body,
          tagsToJson(tags),
          summary ?? null,
          sourceBody ?? null,
          aiRefined,
          updatedAt,
          usageCount,
          lastUsedAt,
          createdAt,
        );
        if (existing) updated++;
        else imported++;
      }
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve({ imported, updated, skipped });
  } catch (e) {
    return Promise.reject(e);
  }
}

// ── 标签集中管理（独立标签表）───────────────────────────────────────────────

/** 新建一个标签（已存在则忽略，返回规范化后的标签名）。 */
export function createTag(name: string): Promise<string> {
  try {
    const t = name.trim();
    if (!t) return Promise.reject(new Error("tag name empty"));
    return Promise.resolve(ensureTag(t));
  } catch (e) {
    return Promise.reject(e);
  }
}

/** 汇总所有标签及其使用次数（以标签表为基准，按使用次数降序，同名合并）。 */
export function listTags(): Promise<Array<{ name: string; count: number }>> {
  try {
    const cur = getDb();
    const tagRows = cur.prepare("SELECT name FROM tags ORDER BY name").all() as unknown as Array<{ name: string }>;
    // 统计每个标签被多少条提示词引用
    const counts = new Map<string, number>();
    for (const row of tagRows) counts.set(row.name, 0);
    const promptRows = cur
      .prepare("SELECT tags FROM prompts WHERE tags IS NOT NULL")
      .all() as unknown as Array<{ tags: string }>;
    for (const row of promptRows) {
      const list = JSON.parse(row.tags) as string[];
      for (const t of list) {
        const name = t.trim();
        if (!name) continue;
        if (counts.has(name)) counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    // 标签表中有但提示词已不使用的（如删除后残留），也一并展示
    const tags = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    tags.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return Promise.resolve(tags);
  } catch (e) {
    return Promise.reject(e);
  }
}

/** 重命名标签：更新标签表并把所有提示词中的旧标签替换为新标签（合并去重、去空）。返回受影响条数。 */
export function renameTag(from: string, to: string): Promise<number> {
  try {
    const source = from.trim();
    const target = to.trim();
    if (!source || !target || source === target) return Promise.resolve(0);
    const cur = getDb();
    const rows = cur
      .prepare("SELECT id, tags FROM prompts WHERE tags IS NOT NULL")
      .all() as unknown as Array<{ id: string; tags: string }>;
    const upd = cur.prepare("UPDATE prompts SET tags = ?, updatedAt = ? WHERE id = ?");
    let changed = 0;
    cur.exec("BEGIN");
    try {
      for (const row of rows) {
        const list = JSON.parse(row.tags) as string[];
        let hit = false;
        const next = list.map((t) => {
          if (t.trim() === source) {
            hit = true;
            return target;
          }
          return t;
        });
        if (!hit) continue;
        // 去重并去掉空标签，仅保留单个标签
        const dedup = Array.from(new Set(next.map((t) => t.trim()).filter(Boolean))).slice(0, 1);
        upd.run(tagsToJson(dedup), Date.now(), row.id);
        changed++;
      }
      // 更新标签表：删除旧标签、确保新标签存在
      cur.prepare("DELETE FROM tags WHERE name = ?").run(source);
      ensureTag(target);
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve(changed);
  } catch (e) {
    return Promise.reject(e);
  }
}

/** 删除标签：从标签表删除，并把所有提示词中的该标签移除（移空后无标签，即「未命名/未分类」）。返回受影响条数。 */
export function deleteTag(name: string): Promise<number> {
  try {
    const target = name.trim();
    if (!target) return Promise.resolve(0);
    const cur = getDb();
    const rows = cur
      .prepare("SELECT id, tags FROM prompts WHERE tags IS NOT NULL")
      .all() as unknown as Array<{ id: string; tags: string }>;
    const upd = cur.prepare("UPDATE prompts SET tags = ?, updatedAt = ? WHERE id = ?");
    let changed = 0;
    cur.exec("BEGIN");
    try {
      for (const row of rows) {
        const list = JSON.parse(row.tags) as string[];
        const trimmed = list.map((t) => t.trim());
        const next = trimmed.filter((t) => t !== target);
        if (next.length === trimmed.length) continue;
        upd.run(tagsToJson(next), Date.now(), row.id);
        changed++;
      }
      // 从标签表删除
      cur.prepare("DELETE FROM tags WHERE name = ?").run(target);
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve(changed);
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

/**
 * 读取宿主界面语言偏好（`~/.dsh/settings.yaml` 的 `locale.preference`）。
 * 供 `/prompts` 命令描述等宿主侧文案在启动时按语言选择；读取失败返回空字符串。
 */
export async function readGlobalLocale(): Promise<string> {
  try {
    const text = await readFile(systemSettingsPath(), "utf8");
    const root = load(text) as { locale?: { preference?: unknown } } | undefined;
    const pref = root?.locale?.preference;
    return typeof pref === "string" ? pref.toLowerCase() : "";
  } catch {
    return "";
  }
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