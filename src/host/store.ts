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
import type { Prompt, PromptStoreFile } from "../types.js";

const DEFAULT_DSH_HOME = join(homedir(), ".dsh");

function dshHome(): string {
  return process.env.DSH_HOME || DEFAULT_DSH_HOME;
}

function storePath(): string {
  return join(dshHome(), "prompt-library.json");
}

const EMPTY: PromptStoreFile = { version: 1, prompts: [] };

/** 单管道读-修改-写队列。 */
let chain: Promise<unknown> = Promise.resolve();

function readRaw(): Promise<PromptStoreFile> {
  return readFile(storePath(), "utf8")
    .then((text) => {
      const parsed = JSON.parse(text) as PromptStoreFile;
      if (parsed?.version !== 1 || !Array.isArray(parsed.prompts)) {
        throw new Error("prompt-library.json: unexpected shape");
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

export function listPrompts(): Promise<Prompt[]> {
  return transaction((store) => store.prompts.slice());
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
    };
    store.prompts.unshift(prompt);
    await writeRaw(store);
    return prompt;
  });
}

export function updatePrompt(
  id: string,
  patch: { title?: string; body?: string; tags?: string[] },
): Promise<Prompt | undefined> {
  return transaction(async (store) => {
    const idx = store.prompts.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    const current = store.prompts[idx]!;
    const next: Prompt = {
      id: current.id,
      title: patch.title !== undefined ? patch.title.trim() : current.title,
      body: patch.body !== undefined ? patch.body : current.body,
      tags: patch.tags !== undefined ? patch.tags : current.tags,
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
 */
export function autoLearn(body: string): Promise<Prompt> {
  return transaction(async (store) => {
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
      tags: ["auto-learned"],
      updatedAt: now,
    };
    store.prompts.unshift(prompt);
    await writeRaw(store);
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