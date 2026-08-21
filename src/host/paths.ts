/**
 * Host 侧所有数据文件的统一路径管理。
 *
 * 目标结构（把项目内所有数据文件集中到单一目录，便于管理）：
 *   ~/.dsh/prompt-library/
 *   ├── prompts.json                   # 提示词库
 *   ├── settings.json                  # 插件设置
 *   ├── ai.log                         # AI 调用诊断日志
 *   └── character/                     # AI 人格/边界体系（OpenCLaW 式）
 *       ├── SOUL.md                    # 灵魂：我是谁、性格、语气、价值观、底线
 *       ├── AGENTS.md                  # 工作手册：做事流程、任务规则、执行步骤
 *       ├── USER.md                    # 用户档案：用户习惯、偏好、环境信息
 *       ├── IDENTITY.md                # 对外身份：名字、头衔、展示形象
 *       └── MEMORY.md                  # 长期记忆：跨会话沉淀经验
 *
 * 兼容迁移：读取时若新路径不存在、但旧路径存在，自动读取旧路径数据；
 * 关键写入会在 index.ts 启动时一次性把旧文件迁移到新目录。
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

/** 提示词库文件（新）。 */
export function storePath(): string {
  return join(dataDir(), "prompts.json");
}

/** 设置文件（新）。 */
export function settingsPath(): string {
  return join(dataDir(), "settings.json");
}

/** AI 诊断日志（新）。 */
export function aiLogPath(): string {
  return join(dataDir(), "ai.log");
}

// ── 旧路径（用于一次性迁移）───────────────────────────────────────────────

/** 旧提示词库路径：~/.dsh/prompt-library.json */
export function legacyStorePath(): string {
  return join(dshHome(), "prompt-library.json");
}

/** 旧设置路径：~/.dsh/prompt-library-settings.json */
export function legacySettingsPath(): string {
  return join(dshHome(), "prompt-library-settings.json");
}

/** 旧 AI 日志路径：~/.dsh/prompt-library-ai.log */
export function legacyAiLogPath(): string {
  return join(dshHome(), "prompt-library-ai.log");
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