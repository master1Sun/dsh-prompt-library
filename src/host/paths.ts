/**
 * Host 侧所有数据文件的统一路径管理。
 *
 * 目标结构（把项目内所有数据文件集中到单一目录，便于管理）：
 *   ~/.dsh/prompt-library/
 *   ├── prompts.json                   # 词库
 *   ├── log/                           # AI 调用诊断日志（按系统时区日期分文件）
 *   │   └── ai-YYYY-MM-DD.log
 *   ├── prompts/                       # 会话上下文（harness 文件化）
 *   │   └── HARNESS.md                 # 会话上下文/使用规则：每次发送自动注入会话
 *   └── character/                     # AI 人格文件
 *       └── SOUL.md                    # 人格：身份/性格/语气/工作规范，用户可自定义
 *
 * 插件设置写入系统配置 ~/.dsh/settings.yaml 的 `prompt-library` 命名空间。
 * 所有新路径强制使用：文件不存在即新建，不再保留旧路径回退读取。
 * 词库主存储为 SQLite（~/.dsh/prompt-library/db/prompts.db）：
 * 首次访问数据时一次性把旧 prompts.json 导入 SQLite 并删除，避免历史数据丢失。
 */
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_DSH_HOME = join(homedir(), ".dsh");

/** DSH 数据根目录（可用环境变量覆盖）。 */
export function dshHome(): string {
  return process.env.DSH_HOME || DEFAULT_DSH_HOME;
}

/** 插件数据根目录：~/.dsh/prompt-library/ */
export function dataDir(): string {
  return join(dshHome(), "prompt-library");
}

// ── 数据文件 ────────────────────────────────────────────────────────────────

/** 系统「下载」目录：Windows 取 `USERPROFILE\\Downloads`，其余平台为 `~/Downloads`。 */
export function downloadDir(): string {
  const home = process.env.USERPROFILE || homedir();
  return join(home, "Downloads");
}

/** 词库文件：~/.dsh/prompt-library/prompts.json */
export function storePath(): string {
  return join(dataDir(), "prompts.json");
}

/** SQLite 数据库目录：~/.dsh/prompt-library/db/ */
export function dbDir(): string {
  return join(dataDir(), "db");
}

/** 词库 SQLite 数据库文件：~/.dsh/prompt-library/db/prompts.db */
export function dbPath(): string {
  return join(dbDir(), "prompts.db");
}

/** 报纸旧版 Markdown 记录目录：~/.dsh/prompt-library/newspapers/<zh|en>/（仅用于历史数据迁移读取，当前存储为 newspapers 表） */
export function newspapersDir(): string {
  return join(dataDir(), "newspapers");
}

/** 宿主存储目录：~/.dsh/storages/（workspace.json 等宿主级数据） */
export function storageDir(): string {
  return join(dshHome(), "storages");
}

/** 宿主工作区清单文件：~/.dsh/storages/workspace.json */
export function workspaceStorePath(): string {
  return join(storageDir(), "workspace.json");
}

/** 系统设置文件：~/.dsh/settings.yaml（插件设置写入其 `prompt-library` 命名空间）。 */
export function systemSettingsPath(): string {
  return join(dshHome(), "settings.yaml");
}

/** 插件设置命名空间（写入系统 settings.yaml 时使用的顶层 key）。 */
export const SETTINGS_NAMESPACE = "prompt-library";

/** AI 诊断日志目录：~/.dsh/prompt-library/log/ */
export function logDir(): string {
  return join(dataDir(), "log");
}

/** 自动备份目录：~/.dsh/prompt-library/backup/（数据库备份文件集中存放） */
export function backupDir(): string {
  return join(dataDir(), "backup");
}

// ── AI 人格文件（仅用于历史数据迁移读取，当前存储为数据库 personas 表 / meta 键）────

/** 人格目录：~/.dsh/prompt-library/character/ */
export function characterDir(): string {
  return join(dataDir(), "character");
}

/** 旧版默认人格文件路径：~/.dsh/prompt-library/character/SOUL.md（迁移读取用，当前存于 meta 表） */
export function soulPath(): string {
  return join(characterDir(), "SOUL.md");
}

/** 旧版多人格目录：~/.dsh/prompt-library/character/personas/（迁移读取用） */
export function personasDir(): string {
  return join(characterDir(), "personas");
}

/** 旧版某个人格（非默认）的 SOUL 文件路径：~/.dsh/prompt-library/character/personas/<id>.md（迁移读取用） */
export function personaSoulPath(personaId: string): string {
  return join(personasDir(), `${personaId}.md`);
}

// ── 会话级技能（仅用于历史数据迁移读取，当前存储为数据库 session_prompts 表）────

/** 旧版会话级技能目录：~/.dsh/prompt-library/session-prompts/（迁移读取用） */
export function sessionPromptsDir(): string {
  return join(dataDir(), "session-prompts");
}

/** 旧版某条会话级技能的 MD 文件路径：~/.dsh/prompt-library/session-prompts/<id>.md（迁移读取用） */
export function sessionPromptPath(id: string): string {
  return join(sessionPromptsDir(), `${id}.md`);
}
