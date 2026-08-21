/**
 * Host 侧 AI 自学习完善模块。
 *
 * 封装 harness 的 LLM 服务（ctx.llm.stream()）：
 * - registerLlm / isAiAvailable：由 host 入口在 llm 服务可用时注入引用；
 * - enrichLearnedPrompt：自动学习到新提示词后，在后台调用 AI 生成/完善
 *   标题、标签/分类、摘要/使用说明，并优化改写正文，同时把洞察写回用户画像，
 *   实现「越学越聪明」。
 *
 * 所有 AI 调用都带超时；任何失败都静默降级，绝不阻塞或破坏自动学习主流程。
 */
import { BlockAssembler, createUserMessage } from "@deepseek-ai/dsh-llm";
import type { GenerateOptions, LlmRuntime, LlmModelInfo } from "@deepseek-ai/dsh-llm";
import type { PluginSettings, Prompt } from "../types.js";
import { updatePrompt } from "./store.js";
import { appendFileSync } from "node:fs";
import { appendMemory, buildCharacterSystem, noteInsight, readCharacterDocs } from "./character.js";
import { aiLogPath } from "./paths.js";
import type { CharacterKind } from "./paths.js";

/** 单次 AI 完善调用的超时（毫秒）。 */
const AI_TIMEOUT_MS = 30_000;
/** AI 完善的输出 token 上限（JSON 输出可能较长，留足空间）。 */
const AI_MAX_TOKENS = 2048;
/** AI 完善诊断日志路径（位于统一数据目录 ~/.dsh/prompt-library/ai.log）。 */
const AI_LOG = aiLogPath();

/** 追加一行 AI 诊断日志；写日志失败绝不影响主流程。 */
function logAI(msg: string): void {
  try {
    appendFileSync(AI_LOG, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {
    /* 忽略 */
  }
}

/** 模块级持有的 harness LLM 服务（由 host 入口注入，可能为 undefined）。 */
let llm: LlmRuntime | undefined;

/** 由 host 入口在 llm 服务可用/不可用时调用。 */
export function registerLlm(runtime: LlmRuntime | undefined): void {
  llm = runtime;
}

/** 记录 llm 服务注入状态（供入口调用，用于排查 AI 完善未生效）。 */
export function logAiInjected(injected: boolean): void {
  logAI(injected ? "llm 服务已注入（AI 完善可用）" : "llm 服务已注销（AI 完善停用）");
}

/** 当前是否有可用的 harness LLM 服务。 */
export function isAiAvailable(): boolean {
  return llm !== undefined;
}

/** 设置界面用：单个提供方可选择的模型。 */
export interface AiSelectableModel {
  id: string;
  name: string;
}
/** 设置界面用：单个提供方及其模型列表。 */
export interface AiSelectable {
  provider: string;
  name: string;
  models: AiSelectableModel[];
}

/**
 * 读取系统中可用的 AI provider 及其模型列表，供设置界面下拉选择。
 * 只返回「能成功列出模型」的提供方分类数据；llm 未注入时返回空数组。
 */
export async function listAiSelectables(): Promise<AiSelectable[]> {
  if (!llm) return [];
  const out: AiSelectable[] = [];
  for (const provider of llm.listProviders()) {
    let models: readonly LlmModelInfo[] = [];
    try {
      models = await llm.listModels(provider.id);
    } catch {
      /* 某提供方无法列出模型，跳过即可，不影响其它提供方 */
    }
    out.push({
      provider: provider.id,
      name: provider.name || provider.id,
      models: models.map((m) => ({ id: m.id, name: m.name || m.id })),
    });
  }
  return out;
}

/** AI 完善结果：AI 生成的标题/标签/摘要/正文，以及用于画像的一句话洞察。 */
export interface AiRefineResult {
  title: string;
  tags: string[];
  summary: string;
  body: string;
  insight: string;
}

/**
 * 判断一个手工配置的 provider/model 是否当前可用：
 * 能成功列出模型，且模型 id（忽略大小写）在列表中。
 */
async function isModelAvailable(
  runtime: LlmRuntime,
  provider: string,
  model: string,
): Promise<boolean> {
  try {
    const models = await runtime.listModels(provider);
    return models.some((m) => m.id.toLowerCase() === model.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * 解析 provider/model 候选路由（按优先级排列，供失败时自动轮询）：
 * 1. 设置中显式配置的 aiProvider/aiModel——先校验该模型当前是否可用，
 *    不可用时记录日志并跳过，进入自动发现；
 * 2. 否则按顺序遍历各 provider，选第一个「有可用模型」的，并优先挑 id 含
 *    chat/deepseek 的模型。首个 provider 无模型时继续尝试后续，避免固定失败。
 *
 * 返回有序候选列表；所有 provider 都无可用模型时返回空数组。
 * 每次路由判断（手动不可用、自动发现、失败）都会写入 ai.log。
 */
async function resolveCandidates(
  runtime: LlmRuntime,
  settings: PluginSettings,
): Promise<{ provider: string; model: string }[]> {
  const candidates: { provider: string; model: string }[] = [];
  const seen = new Set<string>();

  // 1. 手动配置的路由：只有确认该模型可用才采用，否则轮询可用模型
  if (settings.aiProvider && settings.aiModel) {
    const avail = await isModelAvailable(runtime, settings.aiProvider, settings.aiModel);
    if (avail) {
      candidates.push({ provider: settings.aiProvider, model: settings.aiModel });
      seen.add(`${settings.aiProvider}/${settings.aiModel}`);
      logAI(`route: 手动配置可用 provider=${settings.aiProvider} model=${settings.aiModel}`);
    } else {
      logAI(
        `route: 手动配置模型 ${settings.aiProvider}/${settings.aiModel} 不可用，自动轮询可用模型`,
      );
    }
  }

  // 2. 自动发现：遍历各 provider，选第一个有可用模型的
  const providers = runtime.listProviders();
  if (providers.length === 0) {
    logAI("route: listProviders() 返回空（harness 无可用 provider）");
  }
  for (const provider of providers) {
    let models: readonly LlmModelInfo[];
    try {
      models = await runtime.listModels(provider.id);
    } catch (e) {
      logAI(`route: listModels(${provider.id}) 失败：${String(e)}，尝试下一个 provider`);
      continue;
    }
    if (models.length === 0) {
      logAI(`route: provider=${provider.id} 无可用模型，尝试下一个`);
      continue;
    }
    const pick = models.find((m) => /chat|deepseek/i.test(m.id)) ?? models[0]!;
    const key = `${provider.id}/${pick.id}`;
    if (seen.has(key)) continue;
    candidates.push({ provider: provider.id, model: pick.id });
    seen.add(key);
    logAI(`route: 自动发现 provider=${provider.id} model=${pick.id}`);
  }
  if (candidates.length === 0) {
    logAI("route: 未找到任何可用模型");
  }
  return candidates;
}

/** 组装 system prompt：把 USER.md 与 MEMORY.md 作为上下文，让 AI 越用越懂用户。 */
function systemPrompt(userDoc: string, memoryDoc: string): string {
  const user = userDoc.trim() || "（暂无）";
  const memory = memoryDoc.trim() || "（暂无）";
  return [
    "你是一名提示词库整理助手，帮助用户把原始输入整理成高质量、可复用的提示词，并洞察用户的写作风格与关注领域。",
    "",
    "【用户档案 USER.md】这是用户习惯、偏好与关注领域，请贴合（可能为空，越用越准）：",
    user,
    "",
    "【长期记忆 MEMORY.md】这是此前沉淀的用户风格与经验洞察，供你参考（可能为空）：",
    memory,
    "",
    "请严格输出一个 JSON 对象，不要 Markdown 代码块，不要任何多余文字：",
    '{ "title": "简洁标题", "tags": ["标签1", "标签2"], "summary": "用途摘要与使用说明", "body": "优化改写后的提示词正文", "insight": "一句话总结用户写作风格或关注领域" }',
    "",
    "要求：",
    "- title：简洁明了，不超过 30 字；",
    "- tags：2~5 个，用于分类与筛选，可沿用 USER.md 中出现的高频主题；",
    "- summary：一两句话说明这个提示词的用途与使用方法；",
    "- body：在保留原意的基础上润色，使表达更清晰、通用、可直接使用，不要丢失关键细节；",
    "- insight：用一句话描述这条提示词反映的用户写作风格或关注领域，用于持续完善用户档案。",
  ].join("\n");
}

/** 组装 user 消息：原始提示词正文 + 候选标签。 */
function userMessage(rawBody: string, tag?: string): string {
  const lines = ["以下是用户要学习的原始提示词：", "", rawBody];
  if (tag) lines.push("", `用户给出的候选标签：${tag}`);
  return lines.join("\n");
}

/**
 * 把五维灵魂边界（SOUL/AGENTS/USER/IDENTITY/MEMORY）注入 AI 的 system prompt，
 * 让 AI 在润色 / 完善 / 洞察时都遵守这些边界（OpenCLaW 式自学习的前置条件）。
 * 读取失败时静默忽略，不影响本次调用。
 *
 * 调用方若已用 readCharacterDocs() 读过 docs，应直接传入复用，避免重复读盘；
 * docs 为空时回退到自行读取。
 */
async function withCharacterSystem(system: string, docs?: Record<CharacterKind, string>): Promise<string> {
  try {
    const boundaryDocs = docs ?? (await readCharacterDocs());
    const boundary = buildCharacterSystem(boundaryDocs);
    if (!boundary) return system;
    return [
      system,
      "",
      "【灵魂边界】以下是你在本次任务中必须严格遵循的身份与行为边界：",
      boundary,
    ].join("\n");
  } catch {
    return system;
  }
}

/**
 * 调用一次 harness LLM 并收集纯文本输出。
 * 流式收集 text 块；finish 非 stop、超时或异常都返回 undefined。
 */
async function collectText(
  runtime: LlmRuntime,
  route: { provider: string; model: string },
  system: string,
  content: string,
): Promise<string | undefined> {
  const options: GenerateOptions = {
    provider: route.provider,
    model: route.model,
    messages: [
      createUserMessage({
        content: [{ type: "text", text: content }],
        source: { kind: "plugin", plugin: "prompt-library" },
      }),
    ],
    system,
    maxTokens: AI_MAX_TOKENS,
    temperature: 0.4,
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  };
  const assembler = new BlockAssembler();
  try {
    for await (const chunk of runtime.stream(options)) {
      assembler.push(chunk);
    }
  } catch (e) {
    logAI(`collect: LLM 流式调用异常：${String(e)}`);
    return undefined;
  }
  if (assembler.finish.kind !== "stop" && assembler.finish.kind !== "max-tokens") {
    logAI(`collect: finish=${assembler.finish.kind}（模型调用失败或被中止）`);
    return undefined;
  }
  const text = assembler
    .blocks()
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .trim();
  if (!text) {
    logAI("collect: 模型返回空文本");
    return undefined;
  }
  logAI(`collect: 完成 kind=${assembler.finish.kind} 文本长度=${text.length}`);
  return text;
}

/**
 * 带自动轮询的 LLM 调用：按候选路由顺序依次调用 collectText，
 * 第一个成功返回文本的路由即采用；每个候选的开始、失败、成功都写入 ai.log。
 * 全部候选都失败时返回 undefined。
 */
async function collectTextWithFallback(
  runtime: LlmRuntime,
  candidates: { provider: string; model: string }[],
  system: string,
  content: string,
): Promise<string | undefined> {
  if (candidates.length === 0) {
    logAI("fallback: 无可用候选路由，跳过本次调用");
    return undefined;
  }
  for (const route of candidates) {
    logAI(`fallback: 尝试 provider=${route.provider} model=${route.model}`);
    const text = await collectText(runtime, route, system, content);
    if (text !== undefined) {
      logAI(`fallback: 采用 provider=${route.provider} model=${route.model}`);
      return text;
    }
    logAI(`fallback: provider=${route.provider} model=${route.model} 失败，轮询下一个`);
  }
  logAI("fallback: 所有候选模型均失败");
  return undefined;
}

/** 从模型输出中容错解析 JSON：剥离 markdown 围栏，截取首个对象。 */
function parseJson(text: string): AiRefineResult | undefined {
  let json = text.trim();
  const fence = json.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) json = fence[1]!.trim();
  const start = json.indexOf("{");
  const end = json.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return undefined;
  try {
    const parsed = JSON.parse(json.slice(start, end + 1)) as Partial<AiRefineResult>;
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    if (!body) return undefined;
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags
          .filter((t): t is string => typeof t === "string" && !!t.trim())
          .map((t) => t.trim())
      : [];
    return {
      title: typeof parsed.title === "string" ? parsed.title.trim() : "",
      tags,
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      body,
      insight: typeof parsed.insight === "string" ? parsed.insight.trim() : "",
    };
  } catch {
    return undefined;
  }
}

/**
 * 后台完善一条自动学习到的提示词：
 * 1. 读取用户画像作为上下文，调用 harness LLM 生成标题/标签/摘要/改写正文；
 * 2. 把结果写回提示词库（标记 aiRefined，改写时保留 sourceBody）；
 * 3. 把洞察合并进用户画像（累积摘要、主题频次、最近样本）。
 *
 * 任何失败都静默返回，不影响主流程。
 */
export async function enrichLearnedPrompt(prompt: Prompt, settings: PluginSettings): Promise<void> {
  logAI(`enrich: 开始 prompt="${prompt.title}" 正文长度=${prompt.body.length}`);
  if (!llm) {
    logAI(`enrich: 跳过（llm 服务未注入）prompt=${prompt.title}`);
    return;
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return;
  const docs = await readCharacterDocs();
  logAI(`enrich: 灵魂上下文 USER=${docs.USER.length} 字 MEMORY=${docs.MEMORY.length} 字`);
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withCharacterSystem(systemPrompt(docs.USER, docs.MEMORY), docs),
    userMessage(prompt.body, prompt.tags?.[0]),
  );
  if (!text) return;
  const result = parseJson(text);
  if (!result) {
    logAI(`parse: 模型输出无法解析为 JSON：${text.slice(0, 300)}`);
    return;
  }
  logAI(
    `parse: 成功 title="${result.title}" tags=[${result.tags.join(", ")}] 摘要长度=${result.summary.length} 改写正文长度=${result.body.length}`,
  );

  const changed = result.body !== prompt.body;
  await updatePrompt(prompt.id, {
    title: result.title || prompt.title,
    tags: result.tags.length ? result.tags : prompt.tags,
    summary: result.summary || undefined,
    body: changed ? result.body : prompt.body,
    sourceBody: changed ? prompt.body : undefined,
    aiRefined: true,
  });
  // 自学习都写入灵魂文件：风格洞察进 USER.md，学习经验进 MEMORY.md（有界维护）
  noteInsight(result.insight).catch((e) => logAI(`写 USER.md 洞察失败：${String(e)}`));
  appendMemory(
    `自动学习了提示词「${result.title || prompt.title}」，并提炼出用户风格洞察：${result.insight || "（无）"}`,
  ).catch((e) => logAI(`写 MEMORY.md 经验失败：${String(e)}`));
  logAI(
    `enrich: 完成 prompt="${result.title || prompt.title}" body ${changed ? "已改写" : "未改写"} 洞察="${result.insight}"`,
  );
}

/**
 * AI 润色一段提示词正文（只返回结果，不写回词库；只润色内容本身）。
 * 结合用户画像（prompt-library-user.md 的自学习积累）润色，
 * 保持原意与关键细节，优化表达，使其更贴合用户风格、清晰通用、可直接复用。
 * 是否把润色结果并入画像学习由用户确认（见 learnPolished），此处不自动学习。
 * 无可用 LLM / 无法解析路由 / 调用失败时返回 undefined。
 */
export async function polishPromptBody(
  body: string,
  settings: PluginSettings,
): Promise<string | undefined> {
  logAI(`polish: 开始 正文长度=${body.length}`);
  if (!llm) {
    logAI("polish: 跳过（llm 服务未注入）");
    return undefined;
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return undefined;
  // 读取灵魂文件（USER.md / MEMORY.md）作为上下文，让润色更贴合用户（越用越准）
  const docs = await readCharacterDocs();
  logAI(`polish: 灵魂上下文 USER=${docs.USER.length} 字 MEMORY=${docs.MEMORY.length} 字`);
  const system = [
    "你是一名专业的提示词润色助手，擅长贴合用户的写作风格对提示词进行润色。",
    "",
    "【用户档案 USER.md】这是用户习惯、偏好与关注领域，请贴合（可能为空）：",
    docs.USER.trim() || "（暂无）",
    "",
    "【长期记忆 MEMORY.md】这是此前沉淀的用户风格与经验洞察，供你参考（可能为空）：",
    docs.MEMORY.trim() || "（暂无）",
    "",
    "要求：",
    "- 只润色提示词内容本身，不要涉及标题、标签、分类等；",
    "- 保持原意与所有关键细节，不得遗漏、曲解或删减；",
    "- 结合 USER.md 中的写作风格与关注领域进行润色，使表达更贴合用户习惯；",
    "- 让提示词更清晰、通用、结构清晰、可直接复用；",
    "- 直接输出润色后的提示词正文，不要任何解释或 Markdown 代码块。",
  ].join("\n");
  const content = `请润色以下提示词内容：\n\n${body}`;
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withCharacterSystem(system, docs),
    content,
  );
  if (!text) return undefined;
  logAI(`polish: 完成 结果长度=${text.length}（等待用户确认许可后并入 USER/MEMORY 学习）`);
  return text;
}

/**
 * 用户确认许可后，把一段 AI 润色内容并入灵魂文件（AI 自学习），
 * 让润色也积累用户习惯、越用越贴合。
 * 会调用 AI 从润色内容中提炼一句风格洞察，补充写入 USER.md；
 * 并把此次学习经验写入 MEMORY.md。AI 不可用或失败时静默降级。
 */
export async function learnPolished(body: string, settings: PluginSettings): Promise<void> {
  const sampleTitle = body.split("\n")[0]?.trim().slice(0, 30) || "AI 润色";
  const insight = await generateInsight(body, settings);
  noteInsight(insight).catch((e) => logAI(`写 USER.md 洞察失败（人工润色）：${String(e)}`));
  appendMemory(`用户确认学习了润色内容「${sampleTitle}」。洞察：${insight || "（无）"}`).catch((e) =>
    logAI(`写 MEMORY.md 经验失败（人工润色）：${String(e)}`),
  );
  logAI(
    `polish: 用户确认学习 "${sampleTitle}" 长度=${body.length} 洞察长度=${insight.length}（已写入 USER/MEMORY）`,
  );
}

/**
 * 从一段提示词内容中提炼一句话用户风格/关注领域洞察，
 * 用于补充到 USER.md（越学越准）。失败时返回空字符串。
 */
async function generateInsight(body: string, settings: PluginSettings): Promise<string> {
  if (!llm) return "";
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return "";
  const docs = await readCharacterDocs();
  const system = [
    "你是一名用户洞察助手，擅长从用户使用的提示词中提炼用户的写作风格与关注领域。",
    "",
    "【用户档案 USER.md】此前积累的风格与偏好（可能为空）：",
    docs.USER.trim() || "（暂无）",
    "",
    "【长期记忆 MEMORY.md】此前沉淀的用户风格与经验洞察（可能为空）：",
    docs.MEMORY.trim() || "（暂无）",
    "",
    "要求：",
    "- 用一句中文（不超过 40 字）总结这条提示词反映的用户写作风格或关注领域；",
    "- 不要引用或重复提示词原文，只提炼抽象特征；",
    "- 直接输出这一句话，不要任何解释或 Markdown 代码块。",
  ].join("\n");
  const content = `请提炼以下提示词反映的用户风格或关注领域：\n\n${body}`;
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withCharacterSystem(system, docs),
    content,
  );
  return text?.trim() ?? "";
}
