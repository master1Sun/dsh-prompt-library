/**
 * AI 人格 / 边界体系（OpenCLaW 式）。
 *
 * 管理五个独立维度文件（位于 ~/.dsh/prompt-library/character/）：
 * - SOUL.md     灵魂：我是谁、性格、语气、价值观、底线
 * - AGENTS.md   工作手册：做事流程、任务规则、执行步骤
 * - USER.md     用户档案：用户习惯、偏好、环境信息
 * - IDENTITY.md 对外身份：名字、头衔、对外展示形象
 * - MEMORY.md   长期记忆：跨会话沉淀的经验（用户手动维护）
 *
 * 能力：
 * - ensureCharacterFiles：文件缺失时用默认模板初始化，并创建目录；
 * - readCharacterDocs：读取全部维度的当前内容；
 * - buildCharacterSystem：把各维度组装成追加到 AI system prompt 的边界段落，
 *   让 AI 在润色 / 完善 / 洞察时遵守这些灵魂边界。
 *
 * 上述文件均为用户的显式设定（含缺省模板），AI 只读引用、不擅自改写：
 * 不提供任何「自学习写回 USER.md / MEMORY.md」的能力。
 */
import { readFileSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CharacterKind } from "./paths.js";
import { characterPath } from "./paths.js";

/** 五个维度的固定顺序（用于同步读取 / 组装边界）。 */
const CHARACTER_KINDS: CharacterKind[] = ["SOUL", "AGENTS", "USER", "IDENTITY", "MEMORY"];

/** 是否把灵魂边界注入到整个聊天会话（由实验室功能开关控制）。 */
let characterChatInject = false;

/** 设置「整个聊天会话也注入灵魂边界」的开关状态（由设置读写联动）。 */
export function syncCharacterChatInto(enable: boolean): void {
  characterChatInject = enable;
}

/** 当前是否启用「整个聊天会话注入灵魂边界」。 */
export function isCharacterChatInjected(): boolean {
  return characterChatInject;
}

// ── 会话级注入跟踪：只对「新会话」生效，不影响启用前正在进行的对话 ──────────
/** 已注入灵魂边界的新会话 scope。 */
const grantedScopes = new Set<unknown>();
/** 功能启用前就已存在的会话 scope（视为进行中，不注入）。 */
const seenScopes = new Set<unknown>();
/** 跟踪集合上限，超过则清空，避免无限增长。 */
const MAX_TRACKED_SCOPES = 200;

function trimScopeSet(set: Set<unknown>): void {
  if (set.size > MAX_TRACKED_SCOPES) set.clear();
}

/**
 * 判断这次组装（属于会话 scope）是否应注入灵魂边界：
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

/** 去掉 UTF-8 BOM（Windows 工具可能写入），避免首行解析失败。 */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** 各维度的默认模板：提供一套通用助手人设，用户可直接编辑，AI 据此遵守。 */
const DEFAULT_TEMPLATES: Record<CharacterKind, string> = {
  SOUL: `# SOUL · 灵魂

> 我是谁、性格、语气、价值观、底线。AI 在润色与完善时都会遵守；可随时修改。

## 我是谁
- 我是「提示词库助手」，专注帮用户把散乱的输入整理成清晰、通用、可复用的提示词。
- 我的核心价值：让用户的提示词越用越顺手、越用越懂用户。

## 性格
- 贴近用户的写作风格，不喧宾夺主。
- 简洁、务实、条理清晰；不过度修饰，不堆砌空话。

## 语气
- 自然流畅，张弛有度；保留用户原意，只做必要优化。
- 术语与表达遵循行业通用习惯，专业但不说教。

## 价值观
- 只做对用户有用的事：整理、优化、沉淀经验，不擅自歪曲用户意图。
- 追求可复用、可维护、可传承。

## 底线
- 不改变用户的真实意图与关键细节。
- 不做无意义的堆砌或删减；不生成与任务无关的内容。
`,
  AGENTS: `# AGENTS · 工作手册

> 做事流程、任务规则、执行步骤。AI 在执行润色/整理任务时遵循。

## 任务处理流程
1. 理解原意：先读懂用户输入的核心意图与关键细节。
2. 参考边界：结合 SOUL/USER/MEMORY 判断风格与偏好。
3. 优化表达：让内容更清晰、通用、结构清晰、可直接复用。
4. 保留关键：不遗漏、不曲解、不删减必要信息。

## 任务规则
- 只润色提示词内容本身，不改动标题、分类等无关部分。
- 相似内容优先复用既有记忆，不重复造轮子。

## 执行步骤
1. 读取用户待润色 / 待整理的内容。
2. 参考 USER.md 的风格与 MEMORY.md 的经验。
3. 产出清晰、通用、可直接复用、贴合用户风格的结果。
`,
  USER: `# USER · 用户档案

> 用户的习惯、偏好、环境信息。AI 据此贴合用户风格；可随时修改补充。

## 习惯
- 写作风格：简洁、务实、条理清晰
- 偏好格式：清晰小标题配合分点列举

## 常用领域 / 场景
- 提示词梳理：把零散输入整理成清晰、通用、可复用的提示词
- AI 润色 / 完善：让表达更专业、内容更完整

## 环境信息
- 语言：中文为主，兼容英文术语

## 补充说明
（在此记录你在使用中的个性化习惯、偏好与环境信息）
`,
  IDENTITY: `# IDENTITY · 对外身份

> 名字、头衔、对外展示形象。AI 输出对外内容时的落款与身份。

## 名字
- 提示词库助手

## 头衔 / 角色
- Prompt 整理与润色专家

## 对外形象
- 专业、可靠、懂用户；提供可直接使用的提示词。
`,
  MEMORY: `# MEMORY · 长期记忆

> 供 AI 跨会话参考的经验与洞察，帮助 AI 持续理解你。由用户手动维护：修改、补充、裁剪。

## 用户在意的点
- （可记录你希望 AI 跨会话记住的偏好、经验与注意事项）
`,
};

/** 单文件内容读写缓存的失效，直接读盘保证一致。 */

/** 读取某个维度文件内容；文件缺失返回空字符串。 */
async function readKind(kind: CharacterKind): Promise<string> {
  try {
    return stripBom(await readFile(characterPath(kind), "utf8")).trim();
  } catch {
    return "";
  }
}

/** 确保五体征文件存在（缺文件则写入默认模板；目录不存在则创建）。 */
export async function ensureCharacterFiles(): Promise<void> {
  await Promise.all(
    Object.entries(DEFAULT_TEMPLATES).map(async ([kind, template]) => {
      const path = characterPath(kind as CharacterKind);
      try {
        await readFile(path, "utf8");
      } catch {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, template, "utf8");
      }
    }),
  );
}

/** 读取全部五个维度的当前内容。 */
export async function readCharacterDocs(): Promise<Record<CharacterKind, string>> {
  const entries = await Promise.all(
    Object.keys(DEFAULT_TEMPLATES).map(async (kind) => {
      const content = await readKind(kind as CharacterKind);
      return [kind, content] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<CharacterKind, string>;
}

/**
 * 把五个维度组装成追加到 system prompt 的边界段落。
 * 各维度按固定顺序注入，并标注用途，让 AI 遵守这些灵魂边界。
 */
export function buildCharacterSystem(docs: Record<CharacterKind, string>): string {
  const sections: { key: CharacterKind; title: string; guide: string }[] = [
    { key: "SOUL", title: "SOUL · 灵魂", guide: "你的身份、性格、语气、价值观与底线，请严格遵循" },
    { key: "AGENTS", title: "AGENTS · 工作手册", guide: "你执行任务的流程、规则与步骤，请严格遵循" },
    { key: "USER", title: "USER · 用户档案", guide: "用户习惯/偏好/环境，用于贴合用户风格" },
    { key: "IDENTITY", title: "IDENTITY · 对外身份", guide: "你的对外名字/头衔/形象，输出身份落款时使用" },
    { key: "MEMORY", title: "MEMORY · 长期记忆", guide: "跨会话沉淀的经验与洞察，用于持续理解用户" },
  ];
  const parts: string[] = [];
  for (const { key, title, guide } of sections) {
    const content = docs[key].trim();
    parts.push(`【${title}】${guide}：`);
    parts.push(content || "（未配置）");
    parts.push("");
  }
  return parts.join("\n").trim();
}

/**
 * 同步读取五维灵魂边界文本（供每次对话组装 system prompt 时调用）。
 *
 * 与 readCharacterDocs 不同，这里是**同步**返回：宿主在组装对话提示时是同步
 * 回调 text 函数的，无法 await。文件缺失对应维度留空，所有维度都缺失时
 * 返回空字符串。
 *
 * 性能：对话组装每次都会走到这里（热路径）。为避免每次同步读 5 个文件，
 * 用便宜的 stat（mtime/size）做失效判断——文件没变就复用上次拼接结果；
 * 只有某文件 mtime 或 size 变化时才重新 readFileSync。
 */
interface CharMeta {
  mtimeMs: number;
  size: number;
}
/** 面向热路径的组装结果缓存；mtime/size 变化时自动失效。 */
let charSystemCache: { metas: Record<string, CharMeta | null>; assembled: string } | null = null;

/** 查询某维度的 stat 元信息；文件缺失返回 null（用 null 相等表示「一直缺失」）。 */
function kindMeta(kind: CharacterKind): CharMeta | null {
  try {
    const s = statSync(characterPath(kind));
    return { mtimeMs: s.mtimeMs, size: s.size };
  } catch {
    return null;
  }
}

export function characterSystemSync(): string {
  const metas: Record<string, CharMeta | null> = {};
  let unchanged = true;
  for (const kind of CHARACTER_KINDS) {
    const meta = kindMeta(kind);
    metas[kind] = meta;
    const cached = charSystemCache?.metas[kind];
    // 双侧一致（都不存在，或 mtime/size 相同）视为未变化
    if (cached && meta && cached.mtimeMs === meta.mtimeMs && cached.size === meta.size) continue;
    if (!cached && !meta) continue;
    unchanged = false;
  }
  if (unchanged && charSystemCache) return charSystemCache.assembled;

  const docs: Record<CharacterKind, string> = { SOUL: "", AGENTS: "", USER: "", IDENTITY: "", MEMORY: "" };
  let missing = false;
  for (const kind of CHARACTER_KINDS) {
    try {
      docs[kind] = stripBom(readFileSync(characterPath(kind), "utf8")).trim();
    } catch {
      // 文件缺失则留空；并在组装后触发默认模板重建，保证删掉的文件会自动找回
      missing = true;
    }
  }
  const assembled = buildCharacterSystem(docs);
  charSystemCache = { metas, assembled };
  // 发现缺失的灵魂文件时，后台重建默认模板（幂等：只补缺失的文件）
  if (missing) void ensureCharacterFiles().catch(() => {});
  return assembled;
}