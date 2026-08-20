/**
 * Host 侧提示词持久化。
 *
 * 在 DSH_HOME（默认 ~/.dsh）下读写单个 JSON 文件。
 * 所有访问通过互斥锁串行化，防止并发 HTTP 处理程序交错执行
 * 读-修改-写而导致丢失更新。
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { PluginSettings, Prompt, PromptStoreFile } from "../types.js";
import { DEFAULT_SETTINGS } from "../types.js";
import { enrichLearnedPrompt, isAiAvailable } from "./ai.js";

const DEFAULT_DSH_HOME = join(homedir(), ".dsh");

function dshHome(): string {
  return process.env.DSH_HOME || DEFAULT_DSH_HOME;
}

function storePath(): string {
  return join(dshHome(), "prompt-library.json");
}

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
      if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
        return EMPTY;
      }
      throw err;
    });
}

async function writeRaw(store: PromptStoreFile): Promise<void> {
  await mkdir(dirname(storePath()), { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2), "utf8");
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
      title: input.title.trim(),
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
      title: patch.title !== undefined ? patch.title.trim() : current.title,
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
 * 从用户输入中自动学习提示词。
 *
 * 通过精确正文匹配（trim + 忽略大小写）去重。如果正文已存在，
 * 返回已有的提示词；否则创建一个新提示词，自动生成标题
 *（首行或前 40 个字符），并标记 "auto-learned" 标签。
 *
 * 保存成功后，如果开启 AI 智能完善且有可用 LLM 服务，
 * 会在后台调用 harness AI 生成标题/标签/摘要并改写正文，
 * 同时更新用户画像（不阻塞 /learn 响应，失败静默）。
 */
export function autoLearn(body: string, tag?: string): Promise<Prompt> {
  const created = transaction(async (store) => {
    const normalized = body.trim().toLowerCase();
    const existing = store.prompts.find(
      (p) => p.body.trim().toLowerCase() === normalized,
    );
    if (existing) return existing;

    // 自动生成标题：首行最多 40 个字符。
    const firstLine = (body.split("\n")[0] ?? "").trim();
    const title =
      firstLine.length > 40 ? firstLine.slice(0, 37) + "..." : firstLine || "Learned Prompt";

    const now = Date.now();
    const prompt: Prompt = {
      id: randomUUID(),
      title,
      body: body.trim(),
      tags: tag ? [tag] : ["auto-learned"],
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

  return created.then(async (prompt) => {
    // 后台 AI 完善：不阻塞响应，任何失败静默降级
    const settings = await readSettingsRaw();
    if (settings.aiEnrichEnabled && isAiAvailable()) {
      enrichLearnedPrompt(prompt, settings).catch(() => {
        /* 静默：AI 完善失败不影响已保存的提示词 */
      });
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

// ── 设置存储 ────────────────────────────────────────────────────────────────

function settingsPath(): string {
  return join(dshHome(), "prompt-library-settings.json");
}

/** 读取设置，如果文件不存在则返回默认值。 */
async function readSettingsRaw(): Promise<PluginSettings> {
  try {
    const text = await readFile(settingsPath(), "utf8");
    const parsed = JSON.parse(stripBom(text)) as Partial<PluginSettings>;
    // 合并默认值，确保所有字段都存在
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...DEFAULT_SETTINGS };
    }
    throw err;
  }
}

async function writeSettingsRaw(settings: PluginSettings): Promise<void> {
  await mkdir(dirname(settingsPath()), { recursive: true });
  await writeFile(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
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
    return next;
  });
}