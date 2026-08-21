/**
 * AI 人格 / 边界体系（OpenCLaW 式）。
 *
 * 管理五个独立维度文件（位于 ~/.dsh/prompt-library/character/）：
 * - SOUL.md     灵魂：我是谁、性格、语气、价值观、底线
 * - AGENTS.md   工作手册：做事流程、任务规则、执行步骤
 * - USER.md     用户档案：用户习惯、偏好、环境信息
 * - IDENTITY.md 对外身份：名字、头衔、对外展示形象
 * - MEMORY.md   长期记忆：跨会话沉淀的经验（AI 可维护）
 *
 * 能力：
 * - ensureCharacterFiles：文件缺失时用默认模板初始化，并创建目录；
 * - readCharacterDocs：读取全部维度的当前内容；
 * - buildCharacterSystem：把各维度组装成追加到 AI system prompt 的边界段落，
 *   让 AI 在润色 / 完善 / 洞察时遵守这些灵魂边界；
 * - appendMemory：AI 维护长期记忆 —— 把一条经验追加写入 MEMORY.md。
 *
 * AI 可维护全部文件：真正由 AI 自动写入的是 MEMORY（跨会话经验沉淀）；
 * SOUL/AGENTS/USER/IDENTITY 是用户的显式设定，AI 只读引用、不擅自改写，
 * 避免算法覆盖用户手写的灵魂边界。
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

// ── AI 维护的大小与结构约束（让自学习文件始终精简有界）────────────────────
/** MEMORY.md 的大标题。 */
const MEMORY_H1 = "# MEMORY · 长期记忆";
/** MEMORY.md 的引言。 */
const MEMORY_INTRO = "> AI 跨会话沉淀的经验与洞察，越用越熟练。由系统维护：修改、补充、裁剪。";
/** MEMORY.md 最多保留的经验条数，超出裁掉最旧的。 */
const MAX_MEMORY_ENTRIES = 20;
/** USER.md 里 AI 维护的「学习到的风格与偏好」小节标题。 */
const USER_INSIGHT_HEADING = "## 学习到的风格与偏好";
/** USER.md 里学习到的洞察最多保留条数，超出裁掉最旧的。 */
const MAX_USER_INSIGHTS = 20;

// ── 填充价值边界：只把有价值的内容写入灵魂文件，避免噪音污染 ──────────────
/** 过短文本视为噪音（如「无」「好」），不沉淀。 */
const MIN_INSIGHT_LENGTH = 8;
/** 超过该长度说明不是「一句话洞察」，也不写入。 */
const MAX_INSIGHT_LENGTH = 60;
/** 命中这些占位 / 空壳文本时不写入。 */
const INSIGHT_NOISE = ["（暂无）", "（无）", "暂无", "无", "待补充", "none", "n/a"];

/** 判断一段自学习文本是否有价值：长度适中且非占位噪音。 */
function isValuable(text: string, lenient = false): boolean {
  const t = text.trim();
  if (t.length < MIN_INSIGHT_LENGTH) return false;
  if (!lenient && t.length > MAX_INSIGHT_LENGTH) return false;
  const low = t.toLowerCase();
  return !INSIGHT_NOISE.some((n) => low.includes(n));
}

/** 读取文件内容；文件缺失或读取失败返回空字符串。 */
async function readUnsafe(path: string): Promise<string> {
  try {
    return stripBom(await readFile(path, "utf8"));
  } catch {
    return "";
  }
}

/** 各维度的默认模板：提供一套通用助手人设，用户可直接编辑，AI 据此遵守并自学习。 */
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
1. 读取用户待学习 / 待润色的内容。
2. 参考 USER.md 的风格与 MEMORY.md 的经验。
3. 产出结果，并把有价值的洞察沉淀到 USER/MEMORY（有界）。
`,
  USER: `# USER · 用户档案

> 用户的习惯、偏好、环境信息。AI 据此贴合用户风格；本文件随自学习持续补充。

## 习惯
- 写作风格 / 偏好格式：由 AI 根据你的使用习惯自动学习

## 常用领域 / 场景
- 由 AI 根据你的提示词自动归纳

## 环境信息
- 由 AI 在学习中补充

## 学习到的风格与偏好
（AI 会根据你的使用习惯持续补充有价值的洞察，始终有上限）
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

> AI 跨会话沉淀的经验与洞察，越用越懂用户。由系统自动维护：修改、补充、裁剪。
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
 * 把一条经验**修改/补充**写入 MEMORY.md（AI 维护长期记忆，有界）。
 *
 * 维护策略（让技能越用越熟练、文件不过大）：
 * - 内容高度相似的条目会被替换，而不是无限追加（修改式）；
 * - 只保留最近 MAX_MEMORY_ENTRIES 条，超出裁掉最旧的（补充式 + 有界）；
 * - 保留带时间戳的历史，跨会话持续累积但始终有上限。
 */
export async function appendMemory(entry: string): Promise<void> {
  const path = characterPath("MEMORY");
  const text = entry.trim();
  if (!text) return;
  // 价值边界：过短或占位噪音不沉淀为经验
  if (!isValuable(text, true)) return;
  const existing = await readUnsafe(path);
  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const block = `## ${stamp}\n${text}`;

  // 按顶层 `## ` 标题拆分出已有条目（保留首个 # H1 大标题与引言）
  const sections = existing
    .split(/(?=^## )/m)
    .map((s) => s.trim())
    .filter(Boolean);

  // 相似去重：正文前若干字符撞到已有条目则替换之（只记一种写法，收紧记忆）
  const key = text.slice(0, 40);
  const dupIdx = sections.findIndex((s) => s.startsWith("## ") && s.includes(key));
  if (dupIdx >= 0) sections.splice(dupIdx, 1, block);
  else sections.push(block);

  // 有界：只保留最近 MAX_MEMORY_ENTRIES 条经验
  const kept = sections.slice(-MAX_MEMORY_ENTRIES);

  await mkdir(dirname(path), { recursive: true });
  const body = [MEMORY_H1, "", MEMORY_INTRO, "", kept.join("\n\n")].join("\n");
  await writeFile(path, `${body}\n`, "utf8");
}

/**
 * 把一条 AI 洞察**补充**进 USER.md 的「学习到的风格与偏好」小节（有界）。
 *
 * 维护策略：
 * - 高度相似的洞察会被更新，而不是无限堆叠（修改式）；
 * - 只保留最近 MAX_USER_INSIGHTS 条，超出裁掉最旧的（有界）；
 * - AI 越用越懂用户，但始终有上限，不让文件膨胀。
 */
export async function noteInsight(insight: string): Promise<void> {
  const text = insight.trim();
  if (!text) return;
  // 价值边界：太短/太长或占位噪音不写入，只填有价值洞察
  if (!isValuable(text)) return;
  const key = text.slice(0, 30);
  const path = characterPath("USER");
  await mkdir(dirname(path), { recursive: true });
  const existing = await readUnsafe(path);

  // 去掉旧小节内已有列表，重建
  const lines = existing.split("\n");
  const sectionStart = lines.findIndex((l) => l.trim() === USER_INSIGHT_HEADING);
  const keep: string[] = [];
  if (sectionStart >= 0) {
    // 收集该小节内已有的洞察行
    let end = sectionStart + 1;
    while (end < lines.length && !lines[end]!.trim().startsWith("#")) {
      const t = lines[end]!.trim();
      if (t.startsWith("- ")) keep.push(t);
      end++;
    }
    // 移除旧小节（从标题到下一个标题）
    lines.splice(sectionStart, end - sectionStart);
  }
  // 相似去重
  const sameIdx = keep.findIndex((l) => l.includes(key));
  if (sameIdx >= 0) keep.splice(sameIdx, 1, `- ${text}`);
  else keep.push(`- ${text}`);
  // 有界：只保留最近 MAX_USER_INSIGHTS 条
  const capped = keep.slice(-MAX_USER_INSIGHTS);

  lines.push(USER_INSIGHT_HEADING, "", ...capped, "");
  const body = lines.filter(Boolean).join("\n").replace(/\n{3,}/g, "\n\n");
  await writeFile(path, `${body}\n`, "utf8");
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
  for (const kind of CHARACTER_KINDS) {
    try {
      docs[kind] = stripBom(readFileSync(characterPath(kind), "utf8")).trim();
    } catch {
      /* 文件缺失则留空 */
    }
  }
  const assembled = buildCharacterSystem(docs);
  charSystemCache = { metas, assembled };
  return assembled;
}