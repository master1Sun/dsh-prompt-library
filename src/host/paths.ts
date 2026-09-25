/**
 * Host 侧所有数据文件的统一路径管理。
 *
 * 目标结构（把项目内所有数据文件集中到单一目录，便于管理）：
 *   ~/.dsh/prompt-library/
 *   ├── db/prompts.db                  # 词库主存储（SQLite），含人格 / 技能绑定 / meta
 *   └── log/                           # AI 调用诊断日志（按系统时区日期分文件）
 *       └── ai-YYYY-MM-DD.log
 *   HARNESS 会话上下文来自插件包外置文件 doc/harness.default.md（不再写用户目录）。
 *
 * 插件设置写入 ~/.dsh/prompt-library/settings.json 的 `prompt-library` 命名空间，
 * 不再写入系统配置 ~/.dsh/settings.yaml（仅读取其中的 `locale.preference`）。
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
function dataDir(): string {
  return join(dshHome(), "prompt-library");
}

// ── 数据文件 ────────────────────────────────────────────────────────────────

/** 系统「下载」目录：Windows 取 `USERPROFILE\\Downloads`，其余平台为 `~/Downloads`。 */
export function downloadDir(): string {
  const home = process.env.USERPROFILE || homedir();
  return join(home, "Downloads");
}

/** 旧版词库文件：~/.dsh/prompt-library/prompts.json（迁移读取用，当前主存储为 SQLite） */
export function storePath(): string {
  return join(dataDir(), "prompts.json");
}

/** 词库 SQLite 数据库文件：~/.dsh/prompt-library/db/prompts.db */
export function dbPath(): string {
  return join(dataDir(), "db", "prompts.db");
}

/** 宿主工作区清单文件：~/.dsh/storages/workspace.json */
export function workspaceStorePath(): string {
  return join(dshHome(), "storages", "workspace.json");
}

/**
 * 系统设置文件：~/.dsh/settings.yaml（宿主全局配置，如 `locale.preference` 语言偏好）。
 * 本插件自身的设置已不再写入此处，见 `pluginSettingsPath()`。
 */
export function systemSettingsPath(): string {
  return join(dshHome(), "settings.yaml");
}

/** 插件设置文件：~/.dsh/prompt-library/settings.json（仅保存本插件的 `prompt-library` 命名空间）。 */
export function pluginSettingsPath(): string {
  return join(dataDir(), "settings.json");
}

/** 插件设置命名空间（写入插件 settings.yaml 时使用的顶层 key）。 */
export const SETTINGS_NAMESPACE = "prompt-library";

/** AI 诊断日志目录：~/.dsh/prompt-library/log/ */
export function logDir(): string {
  return join(dataDir(), "log");
}

// ── 历史数据迁移读取（当前存储均已迁入数据库）──────────────────────────────

/** 旧版默认人格文件路径：~/.dsh/prompt-library/character/SOUL.md（迁移读取用，当前存于 meta 表） */
export function soulPath(): string {
  return join(dataDir(), "character", "SOUL.md");
}

/** 旧版某条会话级技能的 MD 文件路径：~/.dsh/prompt-library/session-prompts/<id>.md（迁移读取用） */
export function sessionPromptPath(id: string): string {
  return join(dataDir(), "session-prompts", `${id}.md`);
}
