/**
 * Host 侧提示词持久化。
 *
 * 在 DSH_HOME（默认 ~/.dsh）下读写单个 JSON 文件。
 * 所有访问通过互斥锁串行化，防止并发 HTTP 处理程序交错执行
 * 读-修改-写而导致丢失更新。
 */
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { load, dump } from "js-yaml";
import type { PluginSettings, Prompt, PromptStoreFile } from "../types.js";
import { clampTitle, DEFAULT_SETTINGS, TITLE_MAX_LEN } from "../types.js";
import { enrichLearnedPrompt, isAiAvailable } from "./ai.js";
import { syncCharacterChatInto } from "./character.js";
import {
  legacyStorePath,
  SETTINGS_NAMESPACE,
  storePath,
  systemSettingsPath,
} from "./paths.js";

/** 去掉 UTF-8 BOM（Windows 记事本/PowerShell 等工具可能写入），避免 JSON.parse 失败。 */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

const EMPTY: PromptStoreFile = { version: 1, prompts: [] };

/** 单管道读-修改-写队列。 */
let chain: Promise<unknown> = Promise.resolve();

function readRaw(): Promise<PromptStoreFile> {
  return readFile(storePath(), "utf8")
    .then((text) => {
      const parsed = JSON.parse(stripBom(text)) as PromptStoreFile;
      if (parsed?.version !== 1 || !Array.isArray(parsed.prompts)) {
        throw new Error("prompt-library.json: unexpected shape");
      }
      // 迁移旧数据：为新字段设置默认值
      for (const p of parsed.prompts) {
        if (typeof p.usageCount !== "number") p.usageCount = 0;
        if (typeof p.lastUsedAt !== "number") p.lastUsedAt = 0;
      }
      return parsed;
    })
    .catch((err) => {
      // 新路径不存在：返回空库，写入时自动新建
      if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
        return EMPTY;
      }
      throw err;
    });
}

async function writeRaw(store: PromptStoreFile): Promise<void> {
  // 写入前若旧路径存在且新路径不存在，先归档旧文件到新路径（一次性迁移）
  await migrateLegacyIfNeeded();
  await mkdir(dirname(storePath()), { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2), "utf8");
}

/** 若旧提示词库 ~/.dsh/prompt-library.json 存在且新文件不存在，迁移到新路径（一次性）。 */
export async function migrateLegacyIfNeeded(): Promise<void> {
  const legacy = legacyStorePath();
  const next = storePath();
  try {
    await stat(legacy);
  } catch {
    return; // 旧文件不存在
  }
  try {
    await stat(next);
  } catch {
    // 新文件不存在：迁移旧文件到新路径
    try {
      await mkdir(dirname(next), { recursive: true });
      await rename(legacy, next);
    } catch {
      /* 迁移失败则保留旧文件 */
    }
  }
}

/** 串行化一个读-修改-写事务。 */
function transaction<T>(fn: (store: PromptStoreFile) => Promise<T> | T): Promise<T> {
  const run = chain.then(() => readRaw().then(fn));
  // 吞掉链驱动上的拒绝，使失败的事务不会毒害后续事务；
  // 调用者仍然能看到自己的拒绝。
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
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

/**
 * 如果超过最大数量，删除最不常用的提示词。
 * 优先删除使用次数为 0 且最旧的。
 */
async function enforceMaxCount(store: PromptStoreFile, maxCount: number): Promise<void> {
  if (store.prompts.length <= maxCount) return;
  // 按使用次数升序排序（最不常用的在前），使用次数相同的按更新时间升序
  const sorted = [...store.prompts].sort((a, b) => {
    if (a.usageCount !== b.usageCount) return a.usageCount - b.usageCount;
    return a.updatedAt - b.updatedAt;
  });
  const toRemove = store.prompts.length - maxCount;
  const removeIds = new Set(sorted.slice(0, toRemove).map((p) => p.id));
  store.prompts = store.prompts.filter((p) => !removeIds.has(p.id));
  await writeRaw(store);
}

export function listPrompts(): Promise<Prompt[]> {
  return transaction((store) => sortPrompts(store.prompts.slice()));
}

export function createPrompt(input: {
  title: string;
  body: string;
  tags?: string[];
}): Promise<Prompt> {
  return transaction(async (store) => {
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
    store.prompts.unshift(prompt);
    await writeRaw(store);
    // 创建后检查是否超过最大数量
    const settings = await readSettingsRaw();
    await enforceMaxCount(store, settings.maxPromptCount);
    return prompt;
  });
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
  return transaction(async (store) => {
    const idx = store.prompts.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    const current = store.prompts[idx]!;
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
    store.prompts[idx] = next;
    await writeRaw(store);
    return next;
  });
}

/**
 * 记录提示词的使用（点击插入）。
 * 递增使用次数并更新最后使用时间。
 */
export function recordUsage(id: string): Promise<Prompt | undefined> {
  return transaction(async (store) => {
    const idx = store.prompts.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    const current = store.prompts[idx]!;
    const next: Prompt = {
      ...current,
      usageCount: current.usageCount + 1,
      lastUsedAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.prompts[idx] = next;
    await writeRaw(store);
    return next;
  });
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
  const created = transaction(async (store) => {
    const normalized = body.trim().toLowerCase();
    const existing = store.prompts.find(
      (p) => p.body.trim().toLowerCase() === normalized,
    );
    if (existing) return existing;

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
    store.prompts.unshift(prompt);
    await writeRaw(store);
    // 创建后检查是否超过最大数量
    const settings = await readSettingsRaw();
    await enforceMaxCount(store, settings.maxPromptCount);
    return prompt;
  });

  return created.then(async (prompt) => {
    // 后台 AI 完善：不阻塞响应，任何失败静默降级。
    // 若是手动确认里已点过「AI 润色」的正文（skipEnrich），不再重复调用 AI 完善。
    if (!skipEnrich) {
      const settings = await readSettingsRaw();
      if (settings.aiEnrichEnabled && isAiAvailable()) {
        enrichLearnedPrompt(prompt, settings).catch(() => {
          /* 静默：AI 完善失败不影响已保存的提示词 */
        });
      }
    }
    return prompt;
  });
}

export function deletePrompt(id: string): Promise<boolean> {
  return transaction(async (store) => {
    const before = store.prompts.length;
    store.prompts = store.prompts.filter((p) => p.id !== id);
    const changed = store.prompts.length !== before;
    if (changed) await writeRaw(store);
    return changed;
  });
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

/** 设置读-修改-写队列。 */
let settingsChain: Promise<unknown> = Promise.resolve();

function settingsTransaction<T>(fn: (settings: PluginSettings) => Promise<T> | T): Promise<T> {
  const run = settingsChain.then(() => readSettingsRaw().then(fn));
  settingsChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function getSettings(): Promise<PluginSettings> {
  return settingsTransaction(async (settings) => ({ ...settings }));
}

export function updateSettings(patch: Partial<PluginSettings>): Promise<PluginSettings> {
  return settingsTransaction(async (settings) => {
    const next: PluginSettings = { ...settings, ...patch };
    await writeSettingsRaw(next);
    // 立即同步会话级灵魂边界开关，让勾选即刻生效。
    // 关闭只阻止「新会话」注入，已注入的会话永久保持注入，不受中途开关影响。
    syncCharacterChatInto(next.applyCharacterToChat ?? false);
    return next;
  });
}
