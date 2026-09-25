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
// 惰性加载 node:sqlite（屏蔽实验特性警告），DatabaseSync 仅作类型使用
import { createDatabase } from "./node-sqlite.js";
import type { DatabaseSync } from "node:sqlite";
import { load, dump } from "js-yaml";
import type { PluginSettings, Prompt, TrashItem } from "../types.js";
import { clampTitle, DEFAULT_SETTINGS, TITLE_MAX_LEN } from "../types.js";
import {
  dbPath,
  pluginSettingsPath,
  sessionPromptPath,
  SETTINGS_NAMESPACE,
  soulPath,
  storePath,
  systemSettingsPath,
} from "./paths.js";
import { stripBom } from "./text.js";

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
  const next = createDatabase(path);
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
  // 多人格数据表：自定义人格的元信息 + SOUL 正文（正文直接存库，不再落盘 md 文件）。
  // （技能管理界面仅读取本表用于展示已绑定人格名称；人格 CRUD 已移除。）
  next.exec(`
    CREATE TABLE IF NOT EXISTS personas (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      enabled   INTEGER NOT NULL DEFAULT 1,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      body      TEXT NOT NULL DEFAULT ''
    );
  `);
  // 兼容早期库：缺少 body 列则补建（正文此前存于 character/personas/<id>.md）。
  try {
    next.exec("ALTER TABLE personas ADD COLUMN body TEXT NOT NULL DEFAULT ''");
  } catch {
    /* 列已存在，忽略 */
  }
  // 工作区/项目路径 → 人格 绑定表：按目录路径记录当前启用人格。
  // 路径即「工作区或其下项目」的绝对路径，人格解析时按「最深的祖先/相等匹配」生效。
  // （技能管理界面仅读取本表用于展示路径级人格绑定；人格写入口已移除。）
  next.exec(`
    CREATE TABLE IF NOT EXISTS persona_scope_bindings (
      path      TEXT PRIMARY KEY,
      personaId TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
  // 工作区/项目路径 → 会话级技能 绑定表：按目录路径记录绑定的技能 id 列表（JSON 数组）。
  // 解析规则：最深的祖先/相等匹配。
  next.exec(`
    CREATE TABLE IF NOT EXISTS prompt_scope_bindings (
      path      TEXT PRIMARY KEY,
      promptIds TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
  // 会话级技能元信息 + 正文表（正文直接存库，不再落盘 session-prompts/<id>.md）。
  next.exec(`
    CREATE TABLE IF NOT EXISTS session_prompts (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      tags       TEXT,
      enabled    INTEGER NOT NULL DEFAULT 1,
      createdAt  INTEGER NOT NULL,
      updatedAt  INTEGER NOT NULL,
      usageCount INTEGER NOT NULL DEFAULT 0,
      lastUsedAt INTEGER NOT NULL DEFAULT 0,
      body       TEXT NOT NULL DEFAULT ''
    );
  `);
  // 兼容早期库：缺少 body 列则补建（正文此前存于 session-prompts/<id>.md）。
  try {
    next.exec("ALTER TABLE session_prompts ADD COLUMN body TEXT NOT NULL DEFAULT ''");
  } catch {
    /* 列已存在，忽略 */
  }
  // 会话 id → 人格 + 会话级技能 绑定表：按「会话 id」持久绑定（优先于工作区/项目路径绑定生效）。
  // 一个会话一行，personaId 为空表示会话未绑定自定义人格（回落默认/上游），
  // promptIds 为该会话持久绑定的会话级技能 id 列表（JSON 数组，空/缺省表示未绑定技能）。
  next.exec(`
    CREATE TABLE IF NOT EXISTS session_scope_bindings (
      sessionId  TEXT PRIMARY KEY,
      personaId  TEXT,
      promptIds  TEXT,
      updatedAt  INTEGER NOT NULL
    );
  `);
  // 提示词版本历史表：创建/更新/精炼时写一份快照，支持回溯任意历史状态。
  next.exec(`
    CREATE TABLE IF NOT EXISTS pl_prompt_versions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      promptId   TEXT NOT NULL,
      version    INTEGER NOT NULL,
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      tags       TEXT,
      summary    TEXT,
      sourceBody TEXT,
      reason     TEXT NOT NULL DEFAULT 'update',
      snapshotAt INTEGER NOT NULL
    );
  `);
  next.exec("CREATE INDEX IF NOT EXISTS idx_pl_prompt_versions_prompt ON pl_prompt_versions (promptId, version)");
  // 一次性把提示词中已有的标签同步进标签表（幂等）。
  syncTagsFromPrompts(next);
  // 首次使用（词库为空）时写入一条默认提示词与标签，作为上手引导。
  seedDefaultPromptIfEmpty(next);
  db = next;
  // 一次性迁移历史 JSON 数据（失败静默，不影响使用）。
  migrateLegacyJsonIfNeeded().catch(() => {});
  // 一次性把旧 md 文件中的正文迁入数据库（人格 SOUL / 会话技能正文 / 公告报纸），
  // 迁移后正文以库为准，md 文件不再被读取（保留原文件不删除）。
  try {
    migrateMdContentToDb();
  } catch {
    // 迁移失败静默，不影响使用
  }
  return next;
}

/** 读取 meta 表值（key 不存在或读取失败时返回空串）。 */
export function getMetaValue(key: string): string {
  try {
    const row = getDb()
      .prepare("SELECT value FROM meta WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value ?? "";
  } catch {
    return "";
  }
}

/** 写入 meta 表值（key 已存在则覆盖）。 */
export function setMetaValue(key: string, value: string): void {
  try {
    getDb()
      .prepare(
        "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run(key, value);
  } catch {
    /* 写入失败不阻断调用方 */
  }
}

/**
 * 同步读取宿主界面语言（`~/.dsh/settings.yaml` 的 `locale.preference`）。
 * 供默认播种等同步流程判断中/英文案；读取失败默认按中文处理。
 */
export function readUiLangSync(): "zh" | "en" {
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
        "· 打开左侧菜单的「数据管理」浏览、编辑、检索整库；",
        "· 在聊天输入框旁用「AI 优化 / AI 完善」按钮加工选中文本；",
        "· 在「导入导出」里备份或恢复整个词库。",
        "",
        "也可以直接编辑这条提示词，替换为你自己的内容，并在设置里为它打上标签。",
      ].join("\n")
    : [
        "This is the first prompt you saved and your quick guide to the prompt library.",
        "",
        "Here is how to use this plugin:",
        "· Open \"Data Management\" in the left menu to browse, edit and search the whole library;",
        "· Use the \"AI polish / AI enrich\" buttons next to the chat input to process selected text;",
        "· Back up or restore the whole library from \"Import / Export\".",
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
// 这里不得书写任何字面 {{}}。

/** 首次欢迎时注入到 system prompt 的简短问候（不再输出整本手册）。 */
const WELCOME_SYSTEM = [
  "（首次使用引导）这是你与带「词库」插件的助手第一次对话。",
  "请在本次会话的【第一条回复】中用一句简洁、自然、友好的话欢迎用户即可。",
].join("\n");

/** 已展示过首次欢迎（持久化标记读取后锁定，进程内只判定一次）。 */
let welcomeBound = false;
/** 首次欢迎实际绑定到的会话 scope（仅该会话能看到欢迎指令，后续组装不再注入）。 */
let welcomeScope: unknown;

/**
 * 判断本次组装是否应注入首次欢迎开场指令：
 * - 已绑定到某会话 scope：仅当同一会话再次组装时返回欢迎文本（保证首条回复必含欢迎），
 *   其他会话一律不注入；
 * - 持久化标记 welcomeShown 已存在（跨重启只欢迎一次）：不注入；
 * - 全局首次：把本次组装的会话 scope 记为欢迎会话并写持久化标记。
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
 * 一次性把旧 md 文件中的正文迁入数据库（全局默认人格 SOUL、会话级技能正文）。
 *
 * 仅在数据库中对应正文为空时从 md 文件读入（幂等）；迁移后正文以库为准，
 * 后续读写不再依赖 md 文件（原文件保留不删除）。任何单条失败都静默忽略。
 */
function migrateMdContentToDb(): void {
  // 1. 全局默认人格 SOUL：character/SOUL.md → meta 键
  if (!getDefaultPersonaSoul()) {
    try {
      const content = stripBom(readFileSync(soulPath(), "utf8")).trim();
      if (content) setDefaultPersonaSoul(content);
    } catch {
      /* 文件不存在，忽略 */
    }
  }
  // 2. 会话级技能正文：session-prompts/<id>.md → session_prompts.body
  for (const r of listSessionPromptRecords()) {
    if (r.body) continue;
    try {
      const content = stripBom(readFileSync(sessionPromptPath(r.id), "utf8")).trim();
      if (content) updateSessionPromptMeta(r.id, { body: content });
    } catch {
      /* 文件不存在，忽略 */
    }
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
 * 使用次数少、更新旧者优先淘汰。
 */
async function enforceMaxCount(maxCount: number): Promise<void> {
  const cur = getDb();
  const { total } = cur.prepare("SELECT COUNT(*) AS total FROM prompts").get() as { total: number };
  if (total <= maxCount) return;
  const toRemove = total - maxCount;

  const rows = cur
    .prepare("SELECT id, usageCount, updatedAt FROM prompts")
    .all() as unknown as Array<{ id: string; usageCount: number; updatedAt: number }>;
  // 最少使用 + 最旧者优先（排序函数）
  const byLeastUsed = (
    a: { usageCount: number; updatedAt: number },
    b: { usageCount: number; updatedAt: number },
  ): number => a.usageCount - b.usageCount || a.updatedAt - b.updatedAt;
  const candidates = [...rows.sort(byLeastUsed)];

  const rm = cur.prepare("DELETE FROM prompts WHERE id = ?");
  for (const { id } of candidates.slice(0, toRemove)) rm.run(id);
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

/** 依据技能名反查已关联的提示词 id（逆向导入时用于去重/更新）；未关联过返回 undefined。 */
export function getPromptIdBySkillName(skillName: string): string | undefined {
  if (!db) return undefined;
  const row = db
    .prepare("SELECT promptId FROM prompt_skill_links WHERE skillName = ? LIMIT 1")
    .get(skillName) as { promptId: string } | undefined;
  return row?.promptId;
}

/** 判断指定 id 是否仍是活动提示词（存在于 prompts 表，而非回收站 trash 表）。 */
export function isPromptActive(id: string): boolean {
  if (!db || !id) return false;
  return !!db.prepare("SELECT id FROM prompts WHERE id = ?").get(id);
}

/** 判断指定 id 是否位于回收站（trash 表）。 */
export function isPromptTrashed(id: string): boolean {
  if (!db || !id) return false;
  return !!db.prepare("SELECT id FROM trash WHERE id = ?").get(id);
}

export function createPrompt(input: {
  title: string;
  body: string;
  tags?: string[];
  summary?: string;
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
      summary: input.summary?.trim() || undefined,
      updatedAt: now,
      createdAt: now,
      usageCount: 0,
      lastUsedAt: 0,
    };
    const cur = getDb();
    cur
      .prepare(
        `INSERT INTO prompts
           (id, title, body, tags, summary, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      )
      .run(
        prompt.id,
        prompt.title,
        prompt.body,
        tagsToJson(prompt.tags),
        prompt.summary ?? null,
        now,
        0,
        0,
        now,
      );
    // 用用户配置的真实上限做后台淘汰（getSettingsSync 只回默认值）
    void getSettings().then((s) => enforceMaxCount(s.maxPromptCount));
    // 版本历史：创建时快照 v1
    snapshotPromptVersion(prompt, "create");
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
    // 版本历史：内容有实质变化时快照。首次 AI 完善记为 refine，其余记为 update。
    const contentChanged =
      next.title !== current.title ||
      next.body !== current.body ||
      next.summary !== current.summary ||
      next.sourceBody !== current.sourceBody;
    if (contentChanged) {
      snapshotPromptVersion(next, aiRefined && !current.aiRefined ? "refine" : "update");
    }
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
 * 返回导入/更新/跳过条数及逐条结果（供前端逐条展示成功/跳过）。
 */
export function importPrompts(
  raw: unknown,
  opts?: { keepUsage?: boolean },
): Promise<{
  imported: number;
  updated: number;
  skipped: number;
  /** 逐条结果（title 为空表示该行无可用标题）。 */
  items: Array<{ title: string; status: "imported" | "updated" | "skipped" }>;
}> {
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
    // 逐条结果（供前端逐条展示成功/跳过）
    const items: Array<{ title: string; status: "imported" | "updated" | "skipped" }> = [];
    cur.exec("BEGIN");
    try {
      for (const rawItem of list) {
        if (typeof rawItem !== "object" || rawItem === null) {
          skipped++;
          items.push({ title: "", status: "skipped" });
          continue;
        }
        const p = rawItem as Record<string, unknown>;
        const body = typeof p.body === "string" ? p.body : "";
        if (!body.trim()) {
          skipped++;
          items.push({
            title: typeof p.title === "string" ? p.title.trim() : "",
            status: "skipped",
          });
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
        // 普通导入视为「新数据」：使用次数与上次使用时间一律归零（含覆盖更新的已有条），
        // 避免沿用导出文件里的使用统计；仅备份恢复（keepUsage）才保留原次数。
        const usageCount = opts?.keepUsage ? (typeof p.usageCount === "number" ? p.usageCount : 0) : 0;
        const lastUsedAt = opts?.keepUsage ? (typeof p.lastUsedAt === "number" ? p.lastUsedAt : 0) : 0;
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
        items.push({ title, status: existing ? "updated" : "imported" });
      }
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve({ imported, updated, skipped, items });
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

// ── 设置存储（~/.dsh/prompt-library/settings.json）──────────────────────────────────

/**
 * 读取插件设置文件（~/.dsh/prompt-library/settings.json）中的命名空间（`prompt-library`）。
 * 文件不存在、无法解析或命名空间缺失/非对象时返回 undefined；
 * 任何读取失败都不向上抛错，避免干扰主流程。
 */
async function readSystemSettingsNamespace(): Promise<Partial<PluginSettings> | undefined> {
  let text: string;
  try {
    text = await readFile(pluginSettingsPath(), "utf8");
  } catch {
    return undefined;
  }
  let root: unknown;
  try {
    root = JSON.parse(stripBom(text));
  } catch {
    return undefined; // 插件配置文件格式错误：不动它，视为命名空间缺失
  }
  if (typeof root !== "object" || root === null || Array.isArray(root)) return undefined;
  const ns = (root as Record<string, unknown>)[SETTINGS_NAMESPACE];
  if (typeof ns !== "object" || ns === null || Array.isArray(ns)) return undefined;
  return ns as Partial<PluginSettings>;
}

/**
 * 不落盘设置项：该开关已从设置界面移除（词库助手下的显隐控制），
 * 不写入配置文件，读取时一律回退默认值，保持默认态以便后续复用。
 */
const PERSIST_EXCLUDED_KEYS = new Set<keyof PluginSettings>([
  "dataManagementEnabled",
]);

/** 剔除不落盘设置项（返回新对象，不修改入参）。 */
function stripPersistExcluded<T>(obj: T): T {
  const next: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  for (const key of PERSIST_EXCLUDED_KEYS) {
    delete next[key];
  }
  return next as T;
}

/**
 * 把插件设置写入 ~/.dsh/prompt-library/settings.json 的 `prompt-library` 命名空间：
 * 读取整个插件配置文件 → 仅追加/替换自己的命名空间 → 整体写回。
 * 文件不存在或无法解析时按空配置处理，不覆盖、不误改。
 */
async function writeSettingsRaw(settings: PluginSettings): Promise<void> {
  let root: Record<string, unknown> = {};
  try {
    const text = await readFile(pluginSettingsPath(), "utf8");
    const parsed: unknown = JSON.parse(stripBom(text));
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      root = parsed as Record<string, unknown>;
    }
  } catch {
    // 插件配置缺失或不可读：从空配置开始，仅写入自己的命名空间
  }
  root[SETTINGS_NAMESPACE] = stripPersistExcluded(settings) as unknown as Record<string, unknown>;
  // 确保插件目录存在（首次写入时 ~/.dsh/prompt-library/ 可能尚未创建）
  mkdirSync(dirname(pluginSettingsPath()), { recursive: true });
  await writeFile(pluginSettingsPath(), JSON.stringify(root, null, 2), "utf8");
}

/**
 * 旧版迁移（一次性）：把系统 `~/.dsh/settings.yaml` 里本插件的 `prompt-library`
 * 命名空间搬到新的 `~/.dsh/prompt-library/settings.json`，并从旧文件移除该命名空间，
 * 避免重复/陈旧配置。满足以下任一条件即视为已迁移，跳过：
 *   1. 新插件配置文件已存在且含 `prompt-library` 命名空间；
 *   2. 旧系统配置文件不存在、无法解析，或其不含 `prompt-library` 命名空间。
 * 任何步骤失败都不向上抛错，保证主流程不被迁移逻辑阻断。
 */
async function migrateLegacySettingsIfNeeded(): Promise<void> {
  // 1) 新文件已有命名空间 → 已迁移，跳过
  try {
    const text = await readFile(pluginSettingsPath(), "utf8");
    const root = JSON.parse(stripBom(text));
    if (
      root && typeof root === "object" && !Array.isArray(root) &&
      (root as Record<string, unknown>)[SETTINGS_NAMESPACE]
    ) {
      return;
    }
  } catch {
    // 新文件不存在或解析失败：继续尝试迁移
  }

  // 2) 读取旧系统 settings.yaml 的 prompt-library 命名空间
  let legacy: Partial<PluginSettings> | undefined;
  try {
    const text = await readFile(systemSettingsPath(), "utf8");
    const root = load(stripBom(text));
    if (root && typeof root === "object" && !Array.isArray(root)) {
      const ns = (root as Record<string, unknown>)[SETTINGS_NAMESPACE];
      if (ns && typeof ns === "object" && !Array.isArray(ns)) {
        legacy = ns as Partial<PluginSettings>;
      }
    }
  } catch {
    return; // 旧文件不存在/不可读：无需迁移
  }
  if (!legacy) return; // 旧文件无本插件命名空间：无需迁移

  // 3) 写入新插件配置文件（合并已有内容，剔除不落盘项）
  let nextRoot: Record<string, unknown> = {};
  try {
    const text = await readFile(pluginSettingsPath(), "utf8");
    const parsed = JSON.parse(stripBom(text));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      nextRoot = parsed as Record<string, unknown>;
    }
  } catch {
    // 新文件不存在：从空开始
  }
  nextRoot[SETTINGS_NAMESPACE] = stripPersistExcluded(legacy) as unknown as Record<string, unknown>;
  mkdirSync(dirname(pluginSettingsPath()), { recursive: true });
  await writeFile(pluginSettingsPath(), JSON.stringify(nextRoot, null, 2), "utf8");

  // 4) 从旧系统 settings.yaml 移除 prompt-library 命名空间，完成「搬移」
  try {
    const text = await readFile(systemSettingsPath(), "utf8");
    const sysRoot = load(stripBom(text));
    if (
      sysRoot && typeof sysRoot === "object" && !Array.isArray(sysRoot) &&
      (sysRoot as Record<string, unknown>)[SETTINGS_NAMESPACE] !== undefined
    ) {
      delete (sysRoot as Record<string, unknown>)[SETTINGS_NAMESPACE];
      await writeFile(systemSettingsPath(), dump(sysRoot, { indent: 2 }), "utf8");
    }
  } catch {
    // 清理旧键失败不阻断：新位置已写入，旧键仅作为冗余存在，不影响功能
  }
}

/**
 * 读取设置：优先从 ~/.dsh/prompt-library/settings.json 的 `prompt-library` 命名空间读取；
 * 首次读取时若新文件尚无配置，则尝试从旧系统 settings.yaml 迁移（见 migrateLegacySettingsIfNeeded）。
 * 命名空间缺失时用默认值并写入插件配置文件。任何写入失败都不影响本次读取。
 */
async function readSettingsRaw(): Promise<PluginSettings> {
  await migrateLegacySettingsIfNeeded().catch(() => undefined);
  const ns = await readSystemSettingsNamespace().catch(() => undefined);
  if (ns !== undefined) {
    const settings: PluginSettings = stripPersistExcluded({ ...DEFAULT_SETTINGS, ...ns });
    return settings;
  }
  // 命名空间缺失：用默认值初始化并写入插件配置文件
  const settings: PluginSettings = stripPersistExcluded({ ...DEFAULT_SETTINGS });
  try {
    await writeSettingsRaw(settings);
  } catch {
    /* 写入失败也照常返回设置值，不影响本次读取 */
  }
  return settings;
}

export function getSettings(): Promise<PluginSettings> {
  return readSettingsRaw();
}

/**
 * 读取宿主界面语言偏好（`~/.dsh/settings.yaml` 的 `locale.preference`）。
 * 供宿主侧文案（AI 提示词语言等）在启动时按语言选择；读取失败返回空字符串。
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
    return next;
  });
}

// ── 会话级技能（元信息 + 正文）数据访问 ────────────────────────────────────
// 元信息（标题/标签/启用等）+ 正文（body）都直接存 SQLite。

/** 会话级技能记录（含正文，正文直接存于本表 body 列）。 */
export interface SessionPromptRecord {
  id: string;
  title: string;
  tags?: string[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  lastUsedAt: number;
  /** 注入到系统提示/输入框的技能正文。 */
  body: string;
}

/** 读取一行会话级技能记录的辅助函数（tags 列为 JSON 数组或 NULL）。 */
function sessionPromptFromRow(row: {
  id: string;
  title: string;
  tags: string | null;
  enabled: number;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  lastUsedAt: number;
  body: string;
}): SessionPromptRecord {
  let tags: string[] | undefined;
  if (row.tags) {
    try {
      const parsed = JSON.parse(row.tags) as unknown;
      if (Array.isArray(parsed)) tags = parsed.filter((x): x is string => typeof x === "string");
    } catch {
      tags = undefined;
    }
  }
  return {
    id: row.id,
    title: row.title,
    tags: tags && tags.length > 0 ? tags.slice(0, 1) : undefined,
    enabled: row.enabled === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    usageCount: row.usageCount,
    lastUsedAt: row.lastUsedAt,
    body: row.body ?? "",
  };
}

/** 列出全部会话级技能（按更新时间倒序）。 */
export function listSessionPromptRecords(): SessionPromptRecord[] {
  try {
    const rows = getDb()
      .prepare(
        "SELECT id, title, tags, enabled, createdAt, updatedAt, usageCount, lastUsedAt, body FROM session_prompts ORDER BY updatedAt DESC",
      )
      .all() as Array<{
      id: string;
      title: string;
      tags: string | null;
      enabled: number;
      createdAt: number;
      updatedAt: number;
      usageCount: number;
      lastUsedAt: number;
      body: string;
    }>;
    return rows.map(sessionPromptFromRow);
  } catch {
    return [];
  }
}

/** 按 id 读取一条会话级技能；不存在返回 undefined。 */
export function getSessionPromptRecord(id: string): SessionPromptRecord | undefined {
  try {
    const row = getDb()
      .prepare(
        "SELECT id, title, tags, enabled, createdAt, updatedAt, usageCount, lastUsedAt, body FROM session_prompts WHERE id = ?",
      )
      .get(id) as
      | {
          id: string;
          title: string;
          tags: string | null;
          enabled: number;
          createdAt: number;
          updatedAt: number;
          usageCount: number;
          lastUsedAt: number;
          body: string;
        }
      | undefined;
    return row ? sessionPromptFromRow(row) : undefined;
  } catch {
    return undefined;
  }
}

/** 创建会话级技能记录（元信息 + 正文，一并存库）。 */
export function createSessionPromptRecord(
  id: string,
  title: string,
  init: { tags?: string[]; enabled?: boolean; createdAt?: number; updatedAt?: number; body?: string } = {},
): SessionPromptRecord {
  const now = Date.now();
  const createdAt = init.createdAt ?? now;
  const updatedAt = init.updatedAt ?? now;
  const tags = Array.isArray(init.tags)
    ? (() => {
        const t = init.tags!.filter(Boolean);
        return t.length > 0 ? t.slice(0, 1) : undefined;
      })()
    : undefined;
  const enabled = init.enabled ?? true;
  const body = init.body ?? "";
  getDb()
    .prepare(
      "INSERT INTO session_prompts (id, title, tags, enabled, createdAt, updatedAt, usageCount, lastUsedAt, body) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)",
    )
    .run(id, title, tags ? JSON.stringify(tags) : null, enabled ? 1 : 0, createdAt, updatedAt, body);
  return { id, title, tags, enabled, createdAt, updatedAt, usageCount: 0, lastUsedAt: 0, body };
}

/** 更新会话级技能（title / tags / enabled / usageCount / lastUsedAt / body）；记录不存在返回 false。 */
export function updateSessionPromptMeta(
  id: string,
  patch: {
    title?: string;
    tags?: string[];
    enabled?: boolean;
    usageCount?: number;
    lastUsedAt?: number;
    body?: string;
  },
): boolean {
  const existing = getSessionPromptRecord(id);
  if (!existing) return false;
  const next: SessionPromptRecord = {
    ...existing,
    title: patch.title ?? existing.title,
    tags:
      patch.tags !== undefined
        ? (() => {
            const t = patch.tags!.filter(Boolean);
            return t.length > 0 ? t.slice(0, 1) : undefined;
          })()
        : existing.tags,
    enabled: patch.enabled ?? existing.enabled,
    usageCount: patch.usageCount ?? existing.usageCount,
    lastUsedAt: patch.lastUsedAt ?? existing.lastUsedAt,
    body: patch.body ?? existing.body,
    updatedAt: Date.now(),
  };
  getDb()
    .prepare(
      "UPDATE session_prompts SET title = ?, tags = ?, enabled = ?, updatedAt = ?, usageCount = ?, lastUsedAt = ?, body = ? WHERE id = ?",
    )
    .run(
      next.title,
      next.tags ? JSON.stringify(next.tags) : null,
      next.enabled ? 1 : 0,
      next.updatedAt,
      next.usageCount,
      next.lastUsedAt,
      next.body,
      id,
    );
  return true;
}

/** 删除会话级技能记录（正文随记录一并删除）。 */
export function deleteSessionPromptRecord(id: string): boolean {
  const db_ = getDb();
  db_.prepare("DELETE FROM session_prompts WHERE id = ?").run(id);
  return true;
}

// ── 全局默认人格 SOUL（meta 表存储）───────────────────────────────────────

/** 默认人格 SOUL 在 meta 表中的键（正文直接存库，不再落盘 character/SOUL.md）。 */
const DEFAULT_SOUL_META_KEY = "pl:default-persona-soul";

/** 读取全局默认人格 SOUL 正文；未初始化返回空串。 */
export function getDefaultPersonaSoul(): string {
  return getMetaValue(DEFAULT_SOUL_META_KEY);
}

/** 写入全局默认人格 SOUL 正文。 */
export function setDefaultPersonaSoul(content: string): void {
  setMetaValue(DEFAULT_SOUL_META_KEY, content);
}

// ── 工作区/项目路径 → 会话级技能 绑定（存库）──────────────────────────────

/** 记录某路径（工作区或其下项目）绑定的会话级技能 id 列表（空数组 → 解除绑定）。 */
export function setScopePromptBinding(path: string, promptIds: string[]): void {
  const ids = [...new Set(promptIds.filter(Boolean))];
  const db_ = getDb();
  db_
    .prepare(
      "INSERT INTO prompt_scope_bindings (path, promptIds, updatedAt) VALUES (?, ?, ?) ON CONFLICT(path) DO UPDATE SET promptIds = excluded.promptIds, updatedAt = excluded.updatedAt",
    )
    .run(path, JSON.stringify(ids), Date.now());
}

/** 解析 prompt_scope_bindings 表里的 promptIds 列（JSON 数组 → 字符串数组）。 */
function parsePromptIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** 读取某路径精确绑定的会话级技能 id 列表；无精确记录返回空数组。 */
export function getScopeBoundPromptIds(path: string): string[] {
  try {
    const row = getDb()
      .prepare("SELECT promptIds FROM prompt_scope_bindings WHERE path = ?")
      .get(path) as { promptIds: string } | undefined;
    return row ? parsePromptIds(row.promptIds) : [];
  } catch {
    return [];
  }
}

/** 列出全部路径 → 会话级技能 绑定（仅含非空列表的记录）。 */
export function listScopePromptBindings(): Array<{ path: string; promptIds: string[] }> {
  try {
    const rows = getDb()
      .prepare("SELECT path, promptIds FROM prompt_scope_bindings")
      .all() as Array<{ path: string; promptIds: string }>;
    return rows
      .map((r) => ({ path: r.path, promptIds: parsePromptIds(r.promptIds) }))
      .filter((b) => b.promptIds.length > 0);
  } catch {
    return [];
  }
}

/** 清空某路径的会话级技能绑定。 */
export function clearScopePromptBinding(path: string): void {
  try {
    getDb().prepare("DELETE FROM prompt_scope_bindings WHERE path = ?").run(path);
  } catch {
    /* 删除失败静默 */
  }
}

/** 清空全部路径（工作区/项目）的会话级技能绑定。 */
export function clearAllScopePromptBindings(): void {
  try {
    getDb().prepare("DELETE FROM prompt_scope_bindings").run();
  } catch {
    /* 删除失败静默 */
  }
}

// ── 人格读取（仅展示用：技能管理界面显示已绑定人格名称；人格 CRUD 已移除）──

/** 人格记录（元信息 + SOUL 正文）。 */
export interface PersonaRecord {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  /** SOUL 正文（自定义人格直接存于本表 body 列）。 */
  body: string;
}

/** 读取一行人格记录的辅助函数（codec 内联，避免重复写列映射）。 */
function personaFromRow(row: {
  id: string;
  name: string;
  enabled: number;
  createdAt: number;
  updatedAt: number;
  body: string;
}): PersonaRecord {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    body: row.body ?? "",
  };
}

/** 列出全部自定义人格（按创建时间升序）。 */
export function listPersonas(): PersonaRecord[] {
  try {
    const rows = getDb()
      .prepare("SELECT id, name, enabled, createdAt, updatedAt, body FROM personas ORDER BY createdAt ASC")
      .all() as Array<{ id: string; name: string; enabled: number; createdAt: number; updatedAt: number; body: string }>;
    return rows.map(personaFromRow);
  } catch {
    return [];
  }
}

/** 按 id 读取单个人格；不存在返回 undefined。 */
export function getPersona(id: string): PersonaRecord | undefined {
  try {
    const row = getDb()
      .prepare("SELECT id, name, enabled, createdAt, updatedAt, body FROM personas WHERE id = ?")
      .get(id) as
      | { id: string; name: string; enabled: number; createdAt: number; updatedAt: number; body: string }
      | undefined;
    return row ? personaFromRow(row) : undefined;
  } catch {
    return undefined;
  }
}

/** 创建人格记录（元信息 + SOUL 正文，一并存库）。 */
export function createPersona(id: string, name: string, body: string = ""): PersonaRecord {
  const now = Date.now();
  const db_ = getDb();
  db_
    .prepare("INSERT INTO personas (id, name, enabled, createdAt, updatedAt, body) VALUES (?, ?, 1, ?, ?, ?)")
    .run(id, name, now, now, body);
  return { id, name, enabled: true, createdAt: now, updatedAt: now, body };
}

/** 更新人格（name / enabled / body）；记录不存在返回 false。 */
export function updatePersonaMeta(
  id: string,
  patch: { name?: string; enabled?: boolean; body?: string },
): boolean {
  const existing = getPersona(id);
  if (!existing) return false;
  const next: PersonaRecord = {
    ...existing,
    name: patch.name ?? existing.name,
    enabled: patch.enabled ?? existing.enabled,
    body: patch.body ?? existing.body,
    updatedAt: Date.now(),
  };
  getDb()
    .prepare("UPDATE personas SET name = ?, enabled = ?, body = ?, updatedAt = ? WHERE id = ?")
    .run(next.name, next.enabled ? 1 : 0, next.body, next.updatedAt, id);
  return true;
}

/** 删除人格记录及其（工作区/项目）绑定（SOUL 文件删除由 persona 服务负责）。 */
export function deletePersona(id: string): boolean {
  const db_ = getDb();
  db_.prepare("DELETE FROM personas WHERE id = ?").run(id);
  db_.prepare("DELETE FROM persona_scope_bindings WHERE personaId = ?").run(id);
  // 清理所有会话绑定中引用该人格的维度（回到默认人格）。
  for (const b of listSessionScopeBindings()) {
    if (b.personaId === id) {
      setSessionScopeBinding(b.sessionId, null, b.promptIds);
    }
  }
  return true;
}

// ── 工作区/项目路径 → 人格 绑定（存库，最深的祖先/相等匹配解析）──────────

/** 记录某路径（工作区或其下项目）当前绑定的人格（personaId 为 'default' 或空表示使用全局默认人格）。 */
export function setScopePersonaBinding(path: string, personaId: string): void {
  const db_ = getDb();
  db_
    .prepare(
      "INSERT INTO persona_scope_bindings (path, personaId, updatedAt) VALUES (?, ?, ?) ON CONFLICT(path) DO UPDATE SET personaId = excluded.personaId, updatedAt = excluded.updatedAt",
    )
    .run(path, personaId, Date.now());
}

/** 读取某路径精确绑定的人格 id；无绑定返回空串。 */
export function getScopeBoundPersonaId(path: string): string {
  try {
    const row = getDb()
      .prepare("SELECT personaId FROM persona_scope_bindings WHERE path = ?")
      .get(path) as { personaId: string } | undefined;
    return row?.personaId ?? "";
  } catch {
    return "";
  }
}

/** 列出全部路径 → 人格 绑定（personaId 均为非空有效 id，不含 'default'）。 */
export function listScopeBindings(): Array<{ path: string; personaId: string }> {
  try {
    return getDb()
      .prepare("SELECT path, personaId FROM persona_scope_bindings")
      .all() as Array<{ path: string; personaId: string }>;
  } catch {
    return [];
  }
}

/** 清空某路径的人格绑定（回到默认人格）。 */
export function clearScopePersonaBinding(path: string): void {
  try {
    getDb().prepare("DELETE FROM persona_scope_bindings WHERE path = ?").run(path);
  } catch {
    /* 删除失败静默 */
  }
}

/** 清空全部路径（工作区/项目）的人格绑定（一律回到默认人格）。 */
export function clearAllScopePersonaBindings(): void {
  try {
    getDb().prepare("DELETE FROM persona_scope_bindings").run();
  } catch {
    /* 删除失败静默 */
  }
}

// ── 会话 id → 人格 + 会话级技能 绑定（存库，优先于路径绑定生效）──────────

/** 记录某会话 id 绑定的人格与会话级技能 id 列表（personaId 为空 / promptIds 空 → 相应维度未绑定）。 */
export function setSessionScopeBinding(
  sessionId: string,
  personaId: string | null,
  promptIds: string[],
): void {
  const ids = [...new Set(promptIds.filter(Boolean))];
  const db_ = getDb();
  db_
    .prepare(
      "INSERT INTO session_scope_bindings (sessionId, personaId, promptIds, updatedAt) VALUES (?, ?, ?, ?) ON CONFLICT(sessionId) DO UPDATE SET personaId = excluded.personaId, promptIds = excluded.promptIds, updatedAt = excluded.updatedAt",
    )
    .run(sessionId, personaId ?? "", JSON.stringify(ids), Date.now());
}

/** 读取某会话 id 绑定的完整记录；无绑定返回 undefined。 */
export function getSessionScopeBinding(
  sessionId: string,
): { personaId: string; promptIds: string[] } | undefined {
  try {
    const row = getDb()
      .prepare("SELECT personaId, promptIds FROM session_scope_bindings WHERE sessionId = ?")
      .get(sessionId) as { personaId: string; promptIds: string } | undefined;
    if (!row) return undefined;
    return { personaId: row.personaId, promptIds: parsePromptIds(row.promptIds) };
  } catch {
    return undefined;
  }
}

/** 列出全部会话 id → 人格 + 技能 绑定（仅含存在记录的会话）。 */
export function listSessionScopeBindings(): Array<{
  sessionId: string;
  personaId: string;
  promptIds: string[];
}> {
  try {
    return getDb()
      .prepare("SELECT sessionId, personaId, promptIds FROM session_scope_bindings")
      .all()
      .map((r) => {
        const row = r as { sessionId: string; personaId: string; promptIds: string };
        return { sessionId: row.sessionId, personaId: row.personaId, promptIds: parsePromptIds(row.promptIds) };
      });
  } catch {
    return [];
  }
}

/** 清除某会话 id 的绑定（回到默认人格 / 不注入技能）。 */
export function clearSessionScopeBinding(sessionId: string): void {
  try {
    getDb().prepare("DELETE FROM session_scope_bindings WHERE sessionId = ?").run(sessionId);
  } catch {
    /* 删除失败静默 */
  }
}

/** 清空全部会话技能绑定（仅置空各会话的技能维度，保留人格绑定 —— 人格与技能是两个独立模块）。 */
export function clearAllSessionPromptBindings(): void {
  try {
    getDb().prepare("UPDATE session_scope_bindings SET promptIds = '[]', updatedAt = ?").run(Date.now());
  } catch {
    /* 更新失败静默 */
  }
}

/** 清空全部会话人格绑定（仅置空各会话的人格维度，保留技能绑定 —— 人格与技能是两个独立模块）。 */
export function clearAllSessionPersonaBindings(): void {
  try {
    getDb().prepare("UPDATE session_scope_bindings SET personaId = '', updatedAt = ?").run(Date.now());
  } catch {
    /* 更新失败静默 */
  }
}

// ── 提示词版本历史 ──────────────────────────────────────────────────────────

/**
 * 为指定提示词写一份版本快照（创建/更新/精炼时调用）。
 * version 从 1 递增，按 (promptId, version) 记录完整历史，快照失败不阻断主流程。
 */
export function snapshotPromptVersion(
  prompt: { id: string; title: string; body: string; tags?: string[]; summary?: string; sourceBody?: string },
  reason: "create" | "update" | "refine",
): void {
  try {
    const cur = getDb();
    const last = cur
      .prepare("SELECT MAX(version) AS v FROM pl_prompt_versions WHERE promptId = ?")
      .get(prompt.id) as { v: number };
    cur
      .prepare(
        `INSERT INTO pl_prompt_versions
           (promptId, version, title, body, tags, summary, sourceBody, reason, snapshotAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        prompt.id,
        (last?.v ?? 0) + 1,
        prompt.title,
        prompt.body,
        tagsToJson(prompt.tags ?? []),
        prompt.summary ?? null,
        prompt.sourceBody ?? null,
        reason,
        Date.now(),
      );
  } catch {
    /* 快照失败静默，不影响提示词主流程 */
  }
}