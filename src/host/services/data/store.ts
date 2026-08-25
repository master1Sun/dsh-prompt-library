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
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { load, dump } from "js-yaml";
import type { PluginSettings, Prompt, TrashItem } from "../../../types.js";
import { clampTitle, DEFAULT_SETTINGS, TITLE_MAX_LEN } from "../../../types.js";
import { enrichLearnedPrompt, isAiAvailable } from "../ai/ai.js";
import { emitDataChanged } from "../sse/events.js";
import { syncCharacterChatInto } from "../assistant/character.js";
import {
  dbPath,
  SETTINGS_NAMESPACE,
  storePath,
  systemSettingsPath,
} from "../../utils/paths.js";
import { stripBom } from "../../utils/text.js";

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
  // WAL 提升并发读写健壮性；busy_timeout 让短时锁等待自动重试而非立刻报错
  next.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
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
  // 兼容早期的库：若缺少 aiRefinedAt 列则补建（AI 首次完善的毫秒时间戳，0 表示从未完善）。
  try {
    next.exec("ALTER TABLE prompts ADD COLUMN aiRefinedAt INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* 列已存在，忽略 */
  }
  // 使用历史表：每次点击插入时记录一行（promptId + usedAt），
  // 供每周统计精确统计「近 7 天使用次数 / 活跃提示词 / 最常使用」，避免只依赖累计 usageCount。
  next.exec(`
    CREATE TABLE IF NOT EXISTS usage_log (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      promptId TEXT NOT NULL,
      usedAt   INTEGER NOT NULL
    );
  `);
  next.exec("CREATE INDEX IF NOT EXISTS idx_usage_log_usedAt ON usage_log (usedAt)");
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
  // 提示词 → 技能名 关联表：同一提示词二次生成技能时复用原技能名，
  // 覆盖写盘而非无限新增目录。
  next.exec(`
    CREATE TABLE IF NOT EXISTS prompt_skill_links (
      promptId  TEXT PRIMARY KEY,
      skillName TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
  // 统计历史表：每 7 天自动生成的词库统计快照（含 AI 点评）。
  next.exec(`
    CREATE TABLE IF NOT EXISTS stats_history (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      stats     TEXT NOT NULL,
      comment   TEXT,
      createdAt INTEGER NOT NULL
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
 * 同步读取宿主界面语言（`~/.dsh/settings.yaml` 的 `locale.preference`）。
 * 供默认播种等同步流程判断中/英文案；读取失败默认按中文处理。
 */
function readUiLangSync(): "zh" | "en" {
  try {
    const text = readFileSync(systemSettingsPath(), "utf8");
    const pref = (load(text) as { locale?: { preference?: unknown } } | undefined)?.locale?.preference;
    return typeof pref === "string" && pref.toLowerCase().startsWith("en") ? "en" : "zh";
  } catch {
    return "zh";
  }
}

/**
 * 首次使用（prompts 表为空）时写入一条默认提示词与标签，作为上手引导。
 * 中/英文按宿主界面语言选择。已有数据（含迁移自旧 JSON 的数据）时不执行，保证只播种一次。
 */
function seedDefaultPromptIfEmpty(cur: DatabaseSync): void {
  const row = cur.prepare("SELECT COUNT(*) AS c FROM prompts").get() as { c: number };
  if ((row.c ?? 0) > 0) return;
  const now = Date.now();
  const isZh = readUiLangSync() === "zh";
  const body = isZh
    ? [
        "这是你保存的第一条提示词，也是词库的上手引导。",
        "",
        "你可以这样使用本插件：",
        "· 在输入框输入 `/prompts -add 把这段好的提示词保存下来`，不错过任何好词；",
        "· 输入 `/prompts -AI 请把这段优化得更专业`，AI 优化后结果会打印出来供复制；",
        "· 输入 `/prompts -h` 查看完整使用手册。",
        "",
        "也可以直接编辑这条提示词，替换为你自己的内容，并在设置里为它打上标签。",
      ].join("\n")
    : [
        "This is the first prompt you saved and your quick guide to the prompt library.",
        "",
        "Here is how to use this plugin:",
        "· Type `/prompts -add save this great prompt` in the input box to keep any good prompt;",
        "· Type `/prompts -AI polish this to be more professional` and the polished result is printed for you to copy;",
        "· Type `/prompts -h` to see the full manual.",
        "",
        "You can also edit this prompt and replace it with your own content, and tag it in the settings.",
      ].join("\n");
  const prompt: Prompt = {
    id: randomUUID(),
    title: isZh ? "欢迎使用词库" : "Welcome to the Prompt Library",
    body,
    // 不能在此调用 ensureTags()：它会重新进入 getDb()，而 db 尚未赋值导致无限递归。
    // 标签的落表由紧随其后的 syncTagsFromPrompts(cur) 用当前连接完成。默认数据仅单标签。
    tags: isZh ? ["欢迎"] : ["Welcome"],
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

// ── 首次欢迎：只对第一个新会话注入一次简短问候 ─────────────────────────────
//
// 注意：这段文本会进入宿主 systemPrompt 的 section，宿主会把其中完整的
// `{{...}}` 当作模板变量引用并强制校验变量名（须匹配 /^[a-z][a-z0-9_]*$/）。
// 这里不得书写任何字面 {{}}；使用规则/手册不再打印到聊天框，而是由
// index.ts 注入的 HARNESS 会话上下文（文件化）提供，用户可用 /prompts -h 查看。

/** 首次欢迎时注入到 system prompt 的简短问候（不再输出整本手册）。 */
const WELCOME_SYSTEM = [
  "（首次使用引导）这是你与带「词库」插件的助手第一次对话。",
  "请在本次会话的【第一条回复】中用一句简洁、自然、友好的话欢迎用户即可。",
  "不要输出插件使用手册全文；若用户主动询问插件功能，可引导其输入 /prompts -h 查看使用手册。",
].join("\n");

/** 已把欢迎指令绑定到某个会话 scope。 */
let welcomeBound = false;
/** 绑定到的会话 scope（用于同一会话多次组装的持续注入）。 */
let welcomeScope: unknown;

/**
 * 判断本次组装（属于会话 scope）是否应注入首次欢迎开场指令：
 * - 持久化标记 welcomeShown 已存在：整个安装生命周期只欢迎一次，直接不注入（跨进程重启仍成立）；
 * - 第一次调用（全局首次）：注入，并把 scope 绑定起来，同时写 welcomeShown 标记持久化；
 * - 同一 scope 再次组装：保持注入（该会话第一条回复仍能看到指令）；
 * - 首次已消费且不是绑定 scope：不再注入。
 * 返回需要追加到 system prompt 的文本，空串表示不注入。
 */
export function welcomePromptOnce(scope: unknown): string {
  if (welcomeBound) {
    return welcomeScope === scope ? WELCOME_SYSTEM : "";
  }
  // 持久化标记优先：历史已欢迎过（含旧版本写入的 welcomeShown）则不再欢迎，
  // 保证「只欢迎一次」跨进程重启依然成立；删除数据文件后标记消失，下次会重新欢迎。
  let shown = false;
  try {
    const row = getDb()
      .prepare("SELECT value FROM meta WHERE key = 'welcomeShown'")
      .get() as { value: string } | undefined;
    shown = row?.value === "1";
  } catch {
    /* 读取失败按未欢迎处理，不阻断 */
  }
  if (shown) {
    welcomeBound = true;
    welcomeScope = undefined;
    return "";
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
  aiRefinedAt: number;
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
    aiRefinedAt: r.aiRefinedAt ?? 0,
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

/** 取某提示词上次生成的技能名；未关联过则返回 undefined。 */
export function getSkillNameForPrompt(promptId: string): string | undefined {
  if (!db) return undefined;
  const row = db
    .prepare("SELECT skillName FROM prompt_skill_links WHERE promptId = ?")
    .get(promptId) as { skillName: string } | undefined;
  return row?.skillName;
}

/** 记录提示词对应的技能名（upsert）。 */
export function setSkillNameForPrompt(promptId: string, skillName: string): void {
  if (!db) return;
  db.prepare(
    "INSERT INTO prompt_skill_links (promptId, skillName, updatedAt) VALUES (?, ?, ?) " +
      "ON CONFLICT(promptId) DO UPDATE SET skillName = excluded.skillName, updatedAt = excluded.updatedAt",
  ).run(promptId, skillName, Date.now());
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
    // 用用户配置的真实上限做后台淘汰（getSettingsSync 只回默认值）
    void getSettings().then((s) => enforceMaxCount(s.maxPromptCount));
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
    aiRefinedAt?: number;
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
    const aiRefined = patch.aiRefined !== undefined ? patch.aiRefined : current.aiRefined;
    // AI 完善：首次从 false → true 时记录完善时间；显式传入时间戳则直接采用
    const aiRefinedAt =
      patch.aiRefinedAt !== undefined
        ? patch.aiRefinedAt
        : aiRefined && !current.aiRefined
          ? Date.now()
          : (current.aiRefinedAt ?? 0);
    const next: Prompt = {
      ...current,
      title: patch.title !== undefined ? clampTitle(patch.title.trim()) : current.title,
      body: patch.body !== undefined ? patch.body : current.body,
      tags: nextTags !== undefined ? nextTags : current.tags,
      summary: patch.summary !== undefined ? patch.summary : current.summary,
      sourceBody: patch.sourceBody !== undefined ? patch.sourceBody : current.sourceBody,
      aiRefined,
      aiRefinedAt,
      updatedAt: Date.now(),
      usageCount: patch.usageCount !== undefined ? patch.usageCount : current.usageCount,
      lastUsedAt: patch.lastUsedAt !== undefined ? patch.lastUsedAt : current.lastUsedAt,
    };
    cur
      .prepare(
        `UPDATE prompts SET
           title = ?, body = ?, tags = ?, summary = ?, sourceBody = ?,
           aiRefined = ?, aiRefinedAt = ?, updatedAt = ?, usageCount = ?, lastUsedAt = ?
         WHERE id = ?`,
      )
      .run(
        next.title,
        next.body,
        tagsToJson(next.tags),
        next.summary ?? null,
        next.sourceBody ?? null,
        next.aiRefined ? 1 : 0,
        next.aiRefinedAt ?? 0,
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
    // 写入使用历史，供每周统计精确统计「近 7 天使用次数 / 活跃提示词 / 最常使用」
    cur.prepare("INSERT INTO usage_log (promptId, usedAt) VALUES (?, ?)").run(id, ts);
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
    // 用用户配置的真实上限做后台淘汰（getSettingsSync 只回默认值）
    void getSettings().then((s) => enforceMaxCount(s.maxPromptCount));
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

/** 词库的使用统计（供 /prompts -data 输出 + AI 点评）。 */
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
  /** 标签及其被引用次数（复用 listTags）。 */
  tagStats: Array<{ name: string; count: number }>;
  /** 回收站条数。 */
  trashCount: number;
  /** 复用活力：近 7 天曾被使用的提示词数量。 */
  usedIn7Days: number;
  /** 复用活力：近 30 天曾被使用的提示词数量。 */
  usedIn30Days: number;
  /** 沉睡提示词：创建超过 30 天且从未被使用的最久前 3 条（含闲置天数）。 */
  longestUnused: Array<{ title: string; days: number }>;
  /** 正文体量：全部提示词正文总字数。 */
  totalBodyLength: number;
  /** 正文体量：平均每条正文字数。 */
  avgBodyLength: number;
  /** AI 完善占比：已由 AI 完善（aiRefined）的提示词数量。 */
  aiRefinedCount: number;
  /** AI 完善占比（百分比：0-100）。 */
  aiRefinedPct: number;
  /** 新增趋势：近 7 天新增提示词数量。 */
  addedIn7Days: number;
  /** 新增趋势：近 30 天新增提示词数量。 */
  addedIn30Days: number;
  /** 近 7 天最常用的前 5 条（按近 7 天使用次数降序，来自 usage_log）。 */
  topUsed7: Array<{ title: string; count: number }>;
  /** 近 7 天经 AI 完善的提示词数量。 */
  aiRefinedIn7: number;
}

/** 一周的毫秒数。 */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 汇总词库的使用统计（SQLite live 数据）。 */
export async function computeLibraryStats(): Promise<LibraryStats> {
  try {
    const cur = getDb();
    const all = findAll();
    const total = all.length;
    const totalUsage = all.reduce((s, p) => s + p.usageCount, 0);
    const used = all.filter((p) => p.usageCount > 0);
    const topUsed = [...used]
      .sort((a, b) => b.usageCount - a.usageCount || b.lastUsedAt - a.lastUsedAt)
      .slice(0, 5)
      .map((p) => ({ title: p.title, usageCount: p.usageCount, lastUsedAt: p.lastUsedAt }));
    const recentUsed = used
      .filter((p) => p.lastUsedAt > 0)
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, 5)
      .map((p) => ({ title: p.title, lastUsedAt: p.lastUsedAt }));
    const trashRow = cur.prepare("SELECT COUNT(*) AS c FROM trash").get() as { c: number };
    const tagStats = await listTags();

    // —— 精细化统计维度 ——
    const now = Date.now();
    const weekAgo = now - WEEK_MS;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // 复用活力：近 7 / 30 天曾被使用；沉睡提示词：创建超 30 天且从未使用（取最久前 3 条）
    const usedIn7Days = all.filter((p) => p.lastUsedAt > weekAgo).length;
    const usedIn30Days = all.filter((p) => p.lastUsedAt > monthAgo).length;
    const longestUnused = [...all]
      .filter((p) => p.lastUsedAt === 0 && p.createdAt < monthAgo)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, 3)
      .map((p) => ({
        title: p.title,
        days: Math.floor((now - p.createdAt) / (24 * 60 * 60 * 1000)),
      }));

    // 正文体量
    const totalBodyLength = all.reduce((sum, p) => sum + p.body.length, 0);
    const avgBodyLength = total > 0 ? Math.round(totalBodyLength / total) : 0;

    // AI 完善占比
    const aiRefinedCount = all.filter((p) => p.aiRefined).length;
    const aiRefinedPct = total > 0 ? Math.round((aiRefinedCount / total) * 100) : 0;

    // 新增趋势
    const addedIn7Days = all.filter((p) => p.createdAt > weekAgo).length;
    const addedIn30Days = all.filter((p) => p.createdAt > monthAgo).length;

    // 近 7 天最常使用（基于 usage_log 聚合，关联标题）与近 7 天 AI 完善
    const usageRows7 = cur
      .prepare("SELECT promptId FROM usage_log WHERE usedAt > ?")
      .all(weekAgo) as Array<{ promptId: string }>;
    const countByPrompt = new Map<string, number>();
    for (const r of usageRows7) countByPrompt.set(r.promptId, (countByPrompt.get(r.promptId) ?? 0) + 1);
    const topUsed7: Array<{ title: string; count: number }> = [];
    if (countByPrompt.size > 0) {
      const byId = new Map(all.map((p) => [p.id, p.title]));
      const sorted = [...countByPrompt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      for (const [id, count] of sorted) topUsed7.push({ title: byId.get(id) ?? "（已删除）", count });
    }
    const aiRefinedIn7 = (
      cur
        .prepare("SELECT COUNT(*) AS c FROM prompts WHERE aiRefined = 1 AND aiRefinedAt > ?")
        .get(weekAgo) as { c: number }
    ).c;

    return Promise.resolve({
      total,
      totalUsage,
      usedCount: used.length,
      unusedCount: total - used.length,
      topUsed,
      recentUsed,
      tagStats,
      trashCount: trashRow?.c ?? 0,
      usedIn7Days,
      usedIn30Days,
      longestUnused,
      totalBodyLength,
      avgBodyLength,
      aiRefinedCount,
      aiRefinedPct,
      addedIn7Days,
      addedIn30Days,
      topUsed7,
      aiRefinedIn7,
    });
  } catch (e) {
    return Promise.reject(e);
  }
}

// ── 每周统计快照（stats_history 表）───────────────────────────────────────

/**
 * 每周统计：只统计「近 7 天」的增量数据（新增/使用/AI 完善），
 * 避免像全量累计那样把历史数据反复重复统计。
 */
export interface WeeklyStats {
  /** 统计周期的起始时间（毫秒时间戳，近 7 天前）。 */
  rangeStart: number;
  /** 统计周期的结束时间（毫秒时间戳，快照生成时刻）。 */
  rangeEnd: number;
  /** 近 7 天新增的提示词数量。 */
  addedCount: number;
  /** 近 7 天新增的提示词标题（最多 5 条，用于展示）。 */
  addedTitles: string[];
  /** 近 7 天被使用过的提示词数量（活跃复用）。 */
  usedPromptCount: number;
  /** 近 7 天总使用次数。 */
  usageCount: number;
  /** 近 7 天最常用的前 5 条（按使用次数降序）。 */
  topUsed: Array<{ title: string; count: number }>;
  /** 近 7 天经 AI 完善的提示词数量。 */
  aiRefinedCount: number;
}

/** 计算近 7 天的每周统计（基于 usage_log 使用历史 + prompts 的新增/完善时间）。 */
export async function computeWeeklyStats(): Promise<WeeklyStats> {
  try {
    const cur = getDb();
    const rangeEnd = Date.now();
    const rangeStart = rangeEnd - WEEK_MS;
    // 近 7 天新增（按创建时间）
    const addedRows = cur
      .prepare("SELECT title, createdAt FROM prompts WHERE createdAt > ? ORDER BY createdAt DESC")
      .all(rangeStart) as Array<{ title: string; createdAt: number }>;
    // 近 7 天使用（按 usage_log）
    const usageRows = cur
      .prepare("SELECT promptId FROM usage_log WHERE usedAt > ?")
      .all(rangeStart) as Array<{ promptId: string }>;
    const usageCount = usageRows.length;
    const usedPromptCount = new Set(usageRows.map((r) => r.promptId)).size;
    // 近 7 天最常使用：按 promptId 聚合计数，关联标题
    const countByPrompt = new Map<string, number>();
    for (const r of usageRows) countByPrompt.set(r.promptId, (countByPrompt.get(r.promptId) ?? 0) + 1);
    const topUsed: Array<{ title: string; count: number }> = [];
    if (countByPrompt.size > 0) {
      const byId = new Map(
        (cur.prepare("SELECT id, title FROM prompts").all() as Array<{ id: string; title: string }>).map((r) => [
          r.id,
          r.title,
        ]),
      );
      const sorted = [...countByPrompt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      for (const [id, count] of sorted) topUsed.push({ title: byId.get(id) ?? "（已删除）", count });
    }
    // 近 7 天 AI 完善（按 aiRefinedAt）
    const aiRefinedCount = (
      cur
        .prepare("SELECT COUNT(*) AS c FROM prompts WHERE aiRefined = 1 AND aiRefinedAt > ?")
        .get(rangeStart) as { c: number }
    ).c;
    return Promise.resolve({
      rangeStart,
      rangeEnd,
      addedCount: addedRows.length,
      addedTitles: addedRows.slice(0, 5).map((r) => r.title),
      usedPromptCount,
      usageCount,
      topUsed,
      aiRefinedCount,
    });
  } catch (e) {
    return Promise.reject(e);
  }
}

/** 一次统计历史快照。 */
export interface StatsSnapshot {
  id: number;
  stats: WeeklyStats;
  comment: string;
  createdAt: number;
}

/** 写入一条统计历史快照（comment 保留以兼容旧数据，新写入时为空串）。 */
export async function saveStatsSnapshot(stats: WeeklyStats, comment?: string): Promise<void> {
  try {
    const cur = getDb();
    cur
      .prepare("INSERT INTO stats_history (stats, comment, createdAt) VALUES (?, ?, ?)")
      .run(JSON.stringify(stats), comment ?? "", Date.now());
  } catch (e) {
    return Promise.reject(e);
  }
}

/** 读取最近一条统计历史快照（不存在返回 undefined，解析失败按缺失处理）。 */
export async function getLastStatsSnapshot(): Promise<StatsSnapshot | undefined> {
  try {
    const cur = getDb();
    const row = cur
      .prepare("SELECT * FROM stats_history ORDER BY createdAt DESC LIMIT 1")
      .get() as unknown as
      | { id: number; stats: string; comment: string | null; createdAt: number }
      | undefined;
    if (!row) return Promise.resolve(undefined);
    let raw: Partial<WeeklyStats>;
    try {
      raw = JSON.parse(row.stats) as Partial<WeeklyStats>;
    } catch {
      return Promise.resolve(undefined);
    }
    // 兼容旧版本快照：旧快照缺少新字段（rangeStart/addedTitles 等），
    // 直接按「无快照」处理，避免残缺数据引发读取 undefined 报错，也让定时门控能重新生成新快照。
    if (
      typeof raw.rangeStart !== "number" ||
      typeof raw.rangeEnd !== "number" ||
      !Array.isArray(raw.addedTitles) ||
      !Array.isArray(raw.topUsed)
    ) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve({
      id: row.id,
      stats: {
        rangeStart: raw.rangeStart,
        rangeEnd: raw.rangeEnd,
        addedCount: raw.addedCount ?? 0,
        addedTitles: raw.addedTitles,
        usedPromptCount: raw.usedPromptCount ?? 0,
        usageCount: raw.usageCount ?? 0,
        topUsed: raw.topUsed,
        aiRefinedCount: raw.aiRefinedCount ?? 0,
      },
      comment: row.comment ?? "",
      createdAt: row.createdAt,
    });
  } catch (e) {
    return Promise.reject(e);
  }
}

/** 最近一次「有效」统计快照的写入时间（毫秒时间戳；无记录或均为旧格式返回 0）。 */
export async function getLastSnapshotAt(): Promise<number> {
  try {
    const snap = await getLastStatsSnapshot();
    return Promise.resolve(snap?.createdAt ?? 0);
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * 读取最近 N 条统计历史快照（按时间正序返回，供统计可视化趋势图使用）。
 * 解析失败或旧格式的快照直接跳过，保证返回的数据结构完整可用。
 */
export async function listStatsSnapshots(limit = 12): Promise<StatsSnapshot[]> {
  try {
    const cur = getDb();
    const rows = cur
      .prepare("SELECT * FROM stats_history ORDER BY createdAt DESC LIMIT ?")
      .all(limit) as unknown as Array<{
      id: number;
      stats: string;
      comment: string | null;
      createdAt: number;
    }>;
    const snaps: StatsSnapshot[] = [];
    for (const row of rows) {
      let raw: Partial<WeeklyStats>;
      try {
        raw = JSON.parse(row.stats) as Partial<WeeklyStats>;
      } catch {
        continue;
      }
      // 兼容旧版本快照：缺少核心字段视为无效，直接跳过。
      if (
        typeof raw.rangeStart !== "number" ||
        typeof raw.rangeEnd !== "number" ||
        !Array.isArray(raw.addedTitles) ||
        !Array.isArray(raw.topUsed)
      ) {
        continue;
      }
      snaps.push({
        id: row.id,
        stats: {
          rangeStart: raw.rangeStart,
          rangeEnd: raw.rangeEnd,
          addedCount: raw.addedCount ?? 0,
          addedTitles: raw.addedTitles,
          usedPromptCount: raw.usedPromptCount ?? 0,
          usageCount: raw.usageCount ?? 0,
          topUsed: raw.topUsed,
          aiRefinedCount: raw.aiRefinedCount ?? 0,
        },
        comment: row.comment ?? "",
        createdAt: row.createdAt,
      });
    }
    // 倒序读取后反转，得到时间正序（旧→新），便于图表直接按序绘制。
    snaps.reverse();
    return Promise.resolve(snaps);
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
    // 立即同步会话级人格注入开关，让勾选即刻生效。
    // 关闭只阻止「新会话」注入，已注入的会话永久保持注入，不受中途开关影响。
    syncCharacterChatInto(next.applyCharacterToChat ?? false);
    return next;
  });
}