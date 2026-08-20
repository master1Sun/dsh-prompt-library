/**
 * /api/prompt-library 的浏览器端 fetch 封装。
 *
 * host 路由的薄封装层；每个函数在成功时返回 `data` 字段，
 * 在非 ok 信封或传输失败时抛出异常。
 */
import type { PluginSettings, Prompt, PromptInput, PromptPatch } from "../types.js";

const BASE = "/api/prompt-library/prompts";

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, headers: {} };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(path, init);
  let payload: ApiResponse<T>;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`prompt-library: bad response (${res.status})`);
  }
  if (!payload.ok || payload.data === undefined) {
    throw new Error(payload.error || `prompt-library: ${res.status}`);
  }
  return payload.data;
}

export function listPrompts(): Promise<Prompt[]> {
  return send<Prompt[]>("GET", BASE);
}

export function createPrompt(input: PromptInput): Promise<Prompt> {
  return send<Prompt>("POST", BASE, input);
}

export function updatePrompt(id: string, patch: PromptPatch): Promise<Prompt> {
  return send<Prompt>("PUT", `${BASE}/${encodeURIComponent(id)}`, patch);
}

export function deletePrompt(id: string): Promise<{ id: string }> {
  return send<{ id: string }>("DELETE", `${BASE}/${encodeURIComponent(id)}`);
}

/** 从原始草稿正文自动学习提示词（去重在 host 侧完成）。 */
export function learnPrompt(body: string, tag?: string): Promise<Prompt> {
  return send<Prompt>("POST", "/api/prompt-library/learn", { body, tag });
}

/** 记录提示词的使用（点击插入时调用）。 */
export function usePrompt(id: string): Promise<Prompt> {
  return send<Prompt>("POST", `${BASE}/${encodeURIComponent(id)}`);
}

/** 调用 harness AI 润色提示词正文，返回润色后的文本。 */
export function polishPrompt(body: string, title?: string): Promise<{ polished: string }> {
  return send<{ polished: string }>("POST", "/api/prompt-library/ai/polish", { body, title });
}

const SETTINGS_BASE = "/api/prompt-library/settings";

/** 获取插件设置。 */
export function getSettings(): Promise<PluginSettings> {
  return send<PluginSettings>("GET", SETTINGS_BASE);
}

/** 更新插件设置（部分更新）。 */
export function updateSettings(patch: Partial<PluginSettings>): Promise<PluginSettings> {
  return send<PluginSettings>("PUT", SETTINGS_BASE, patch);
}