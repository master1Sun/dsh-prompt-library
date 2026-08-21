/**
 * Host 侧所有数据文件的统一路径管理。
 *
 * 目标结构（把项目内所有数据文件集中到单一目录，便于管理）：
 *   ~/.dsh/prompt-library/
 *   ├── prompts.json                   # 提示词库
 *   ├── log/                           # AI 调用诊断日志（按系统时区日期分文件）
 *   │   └── ai-YYYY-MM-DD.log
 *   └── character/                     # AI 人格/边界体系（OpenCLaW 式）
 *       ├── SOUL.md                    # 灵魂：我是谁、性格、语气、价值观、底线
 *       ├── AGENTS.md                  # 工作手册：做事流程、任务规则、执行步骤
 *       ├── USER.md                    # 用户档案：用户习惯、偏好、环境信息
 *       ├── IDENTITY.md                # 对外身份：名字、头衔、展示形象
 *       └── MEMORY.md                  # 长期记忆：跨会话沉淀经验
 *
 * 插件设置写入系统配置 ~/.dsh/settings.yaml 的 `prompt-library` 命名空间。
 * 所有新路径强制使用：文件不存在即新建，不再保留旧路径回退读取；
 * 唯一例外是提示词库 prompts.json：旧路径 ~/.dsh/prompt-library.json
 * 存在时做一次性迁移（rename 到新路径），避免历史数据丢失。
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

/** 提示词库文件：~/.dsh/prompt-library/prompts.json */
export function storePath(): string {
  return join(dataDir(), "prompts.json");
}

/** SQLite 数据库目录：~/.dsh/prompt-library/db/ */
export function dbDir(): string {
  return join(dataDir(), "db");
}

/** 提示词库 SQLite 数据库文件：~/.dsh/prompt-library/db/prompts.db */
export function dbPath(): string {
  return join(dbDir(), "prompts.db");
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

// ── 旧路径（仅提示词库用于一次性迁移）──────────────────────────────────────

/** 旧提示词库路径：~/.dsh/prompt-library.json（仅用于迁移到 prompts.json） */
export function legacyStorePath(): string {
  return join(dshHome(), "prompt-library.json");
}

// ── 人格 / 边界体系文件 ─────────────────────────────────────────────────────

/** 可用的五个维度 key。 */
export const CHARACTER_KINDS = ["SOUL", "AGENTS", "USER", "IDENTITY", "MEMORY"] as const;
export type CharacterKind = (typeof CHARACTER_KINDS)[number];

/** 人格目录：~/.dsh/prompt-library/character/ */
export function characterDir(): string {
  return join(dataDir(), "character");
}

/** 某个维度的人格文件路径。 */
export function characterPath(kind: CharacterKind): string {
  return join(characterDir(), `${kind}.md`);
}
