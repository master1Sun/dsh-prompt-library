/**
 * Host 侧 AI 润色 / 完善模块。
 *
 * 封装 harness 的 LLM 服务（ctx.llm.stream()）：
 * - registerLlm / isAiAvailable：由 host 入口在 llm 服务可用时注入引用；
 * - enrichLearnedPrompt：保存到词库后，在后台调用 AI 生成/完善
 *   标题、标签/分类、摘要/使用说明，并优化改写正文（仅供词库内完善，不回写灵魂文件）；
 * - polishPromptBody / enrichPromptProfessional：供界面与 /prompts 命令调用的润色与完善。
 *
 * 所有 AI 调用都带超时；任何失败都静默降级，绝不阻塞或破坏主流程。
 */
import { BlockAssembler, createUserMessage } from "@deepseek-ai/dsh-llm";
import type { GenerateOptions, LlmRuntime, LlmModelInfo } from "@deepseek-ai/dsh-llm";
import type { PluginSettings, Prompt } from "../types.js";
import { listTags, updatePrompt } from "./store.js";
import { parseRefineResult, type AiRefineResult } from "./refine.js";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildCharacterSystem, readCharacterDocs } from "./character.js";
import { logDir } from "./paths.js";
import type { CharacterKind } from "./paths.js";

/** 单次 AI 完善调用的超时（毫秒）。 */
const AI_TIMEOUT_MS = 30_000;
/** AI 完善的输出 token 上限（JSON 输出可能较长，留足空间）。 */
const AI_MAX_TOKENS = 2048;

/** 两位数字补零（如 3 → "03"）。 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 系统时区（本地）日期，格式 YYYY-MM-DD。 */
function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 系统时区（本地）时间戳，格式 YYYY-MM-DD HH:mm:ss。 */
function localTime(): string {
  const d = new Date();
  return `${localDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/**
 * 按系统时区日期返回当天的日志文件路径：
 * ~/.dsh/prompt-library/log/ai-YYYY-MM-DD.log（每天一个日志文件）。
 */
function getDailyLogPath(): string {
  return join(logDir(), `ai-${localDate()}.log`);
}

/** 追加一行 AI 诊断日志（按日期分文件，时间戳用系统时区）；写日志失败绝不影响主流程。 */
function logAI(msg: string): void {
  try {
    const logPath = getDailyLogPath();
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, `[${localTime()}] ${msg}\n`);
  } catch {
    /* 忽略 */
  }
}

/** 模块级持有的 harness LLM 服务（由 host 入口注入，可能为 undefined）。 */
let llm: LlmRuntime | undefined;

/**
 * 候选路由的 TTL 缓存（秒级），避免每次 AI 调用都重新遍历 provider / listModels。
 * 以「provider/model 手动配置」为缓存键；注册的 llm 服务变化时会清掉缓存。
 */
const ROUTE_CACHE_TTL_MS = 30_000;
let routeCache: { key: string; ts: number; value: { provider: string; model: string }[] } | undefined;

/** 清空路由缓存（llm 服务注入/注销、或设置变化时调用）。 */
function clearRouteCache(): void {
  routeCache = undefined;
}

/**
 * AI 调用串行锁：同一时刻最多只有一个 LLM 网络调用在跑，
 * 避免连续自动学习时瞬时并发打爆模型配额/拖慢主流程。
 */
let llmQueue: Promise<unknown> = Promise.resolve();
function withLlmLock<T>(task: () => Promise<T>): Promise<T> {
  const run = llmQueue.then(() => task());
  // 无论任务成败都不中断后续排队任务（失败仅让当前调用降级）
  llmQueue = run.catch(() => {});
  return run;
}

/** 由 host 入口在 llm 服务可用/不可用时调用。 */
export function registerLlm(runtime: LlmRuntime | undefined): void {
  llm = runtime;
  // llm 服务变化后，旧 provider/模型列表不再可信，作废路由缓存
  clearRouteCache();
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
  const key = `${settings.aiProvider}|${settings.aiModel}`;
  // 命中未过期的路由缓存时直接复用，避免反复 listModels
  if (routeCache && routeCache.key === key && Date.now() - routeCache.ts < ROUTE_CACHE_TTL_MS) {
    return routeCache.value;
  }
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
  routeCache = { key, ts: Date.now(), value: candidates };
  return candidates;
}

/** 组装 system prompt：把 USER.md 与 MEMORY.md 作为上下文，让 AI 越用越懂用户。 */
function systemPrompt(
  userDoc: string,
  memoryDoc: string,
  existingTags: string[],
  existingVars: string[],
): string {
  const user = userDoc.trim() || "（暂无）";
  const memory = memoryDoc.trim() || "（暂无）";
  // 标签库：优先复用已有标签，避免重复创建
  const tagLib = existingTags.length ? existingTags.join("、") : "（暂无）";
  return [
    "你是一名提示词库整理助手，帮助用户把原始输入整理成高质量、可复用的提示词。",
    "",
    "【用户档案 USER.md】这是用户习惯、偏好与关注领域，请贴合（可能为空，越用越准）：",
    user,
    "",
    "【长期记忆 MEMORY.md】这是此前沉淀的用户风格与经验洞察，供你参考（可能为空）：",
    memory,
    "",
    "【标签库】以下是当前已有的标签，请优先复用最贴合的一个，避免重复创建：",
    tagLib,
    "",
    "请严格输出一个 JSON 对象，不要 Markdown 代码块，不要任何多余文字：",
    '{ "title": "简洁标题", "tags": ["标签"], "summary": "用途摘要与使用说明", "body": "优化改写后的提示词正文" }',
    "",
    "要求：",
    "- title：简洁明了，不超过 30 字；",
    "- tags：只输出 1 个标签；优先从【标签库】中选择最贴合的一个，若没有合适的再新造一个简洁、贴合内容的新标签；",
    "- summary：一两句话说明这个提示词的用途与使用方法；",
    "- body：在保留原意的基础上润色，使表达更清晰、通用、可直接使用，不要丢失关键细节；",
    ...(existingVars.length
      ? [
          "- 正文中的 `{{变量名}}` 是模板变量占位符（运行时由使用者替换）：所有已有的 {{}} 必须原样保留，不得删除、改写或替换其中的变量名、不得修改其括号格式；",
        ]
      : []),
    "- 若正文某处内容会因使用场景而变化（如角色、对象、主题、风格、细节等），可在那处新增命名清晰、贴合语境的 {{变量名}} 占位符，提升提示词可复用性；没有这种需求时不要画蛇添足；",
  ].join("\n");
}

/** 组装 user 消息：原始提示词正文 + 候选标签 + 已有模板变量。 */
function userMessage(rawBody: string, tag?: string, existingVars?: string[]): string {
  const lines = ["以下是用户要学习的原始提示词：", "", rawBody];
  if (tag) lines.push("", `用户给出的候选标签：${tag}`);
  if (existingVars && existingVars.length) {
    lines.push("", `正文已有模板变量（{{}} 内为变量名，运行时替换，必须原样保留）：${existingVars.join("、")}`);
  }
  return lines.join("\n");
}

/**
 * 把五维灵魂边界（SOUL/AGENTS/USER/IDENTITY/MEMORY）注入 AI 的 system prompt，
 * 让 AI 在润色 / 完善 / 洞察时都遵守这些边界。
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
    // 通过全局锁串行执行，保证同一时刻只有一个 LLM 调用
    const text = await withLlmLock(() => collectText(runtime, route, system, content));
    if (text !== undefined) {
      logAI(`fallback: 采用 provider=${route.provider} model=${route.model}`);
      return text;
    }
    logAI(`fallback: provider=${route.provider} model=${route.model} 失败，轮询下一个`);
  }
  logAI("fallback: 所有候选模型均失败");
  return undefined;
}

/** 从模型输出中容错解析完善结果；具体实现见 refine.ts（可脱离 AI 单独测试）。 */
function parseJson(text: string): AiRefineResult | undefined {
  return parseRefineResult(text);
}

/**
 * 后台完善一条自动学习到的提示词：
 * 1. 读取用户画像作为上下文，调用 harness LLM 生成标题/标签/摘要/改写正文；
 * 2. 把结果写回提示词库（标记 aiRefined，改写时保留 sourceBody）。
 *
 * 任何失败都静默返回，不影响主流程。
 */
export async function enrichLearnedPrompt(prompt: Prompt, settings: PluginSettings): Promise<void> {
  logAI(`enrich: 开始 prompt="${prompt.title}" 正文长度=${prompt.body.length}`);
  if (!llm) {
    logAI(`enrich: 跳过（llm 服务未注入）prompt=${prompt.title}`);
    return;
  }
  // 同一提示词只允许一个进行中的 AI 完善，避免并发重复生成
  if (enrichInFlight.has(prompt.id)) {
    logAI(`enrich: 跳过（${prompt.title} 已有完善任务进行中）`);
    return;
  }
  enrichInFlight.add(prompt.id);
  try {
    await enrichLearnedPromptInner(prompt, settings);
  } finally {
    enrichInFlight.delete(prompt.id);
  }
}

/** 正在 AI 完善的提示词 id 集合（去重用，防止同一提示词并发重复完善）。 */
const enrichInFlight = new Set<string>();

/** enrichLearnedPrompt 的实际执行体（被去重外层包裹）。 */
async function enrichLearnedPromptInner(
  prompt: Prompt,
  settings: PluginSettings,
): Promise<void> {
  if (!llm) return;
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return;
  const docs = await readCharacterDocs();
  logAI(`enrich: 灵魂上下文 USER=${docs.USER.length} 字 MEMORY=${docs.MEMORY.length} 字`);
  // 读取标签库，让 AI 优先复用已有标签（不存在时才新建），只生成一个标签
  const tagList = await listTags().catch(() => []);
  const existingTags = tagList.map((t) => t.name);
  logAI(`enrich: 标签库 ${existingTags.length} 个 [${existingTags.join(", ")}]`);
  // 检测正文已有的模板变量（{{}}），告知模型原样保留并可按需新增，与润色的 keepVariables 逻辑保持一致
  const existingVars = [...prompt.body.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)]
    .map((m) => m[1]!.trim())
    .filter(Boolean);
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withCharacterSystem(
      systemPrompt(docs.USER, docs.MEMORY, existingTags, existingVars),
      docs,
    ),
    userMessage(prompt.body, prompt.tags?.[0], existingVars),
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
    // AI 智能完善只创建一个标签，避免生成过多标签；手动多选标签走前端 TagInput，不受影响
    tags: result.tags.length ? result.tags.slice(0, 1) : prompt.tags,
    summary: result.summary || undefined,
    body: changed ? result.body : prompt.body,
    sourceBody: changed ? prompt.body : undefined,
    aiRefined: true,
  });
  logAI(`enrich: 完成 prompt="${result.title || prompt.title}" body ${changed ? "已改写" : "未改写"}`);
}

/**
 * AI 专业完善一段提示词正文（只返回结果，不写回词库）。
 *
 * 与「润色」（polishPromptBody：换得更简洁精炼、保持原长度甚至更短）完全相反：
 * 此处扩写完善 —— 在保留原意与核心要求的前提下，补充方法、步骤、约束与自查要点，
 * 用清晰结构组织，使提示词更全面、更专业、更可执行。
 * 与 -AI 一样不特殊处理 {{}} 模板变量，交由 AI 正常处理。
 * 供 `/prompts -enrich` 使用，把完善后的正文返回打印到聊天。
 * 无可用 LLM / 无法解析路由 / 调用失败时返回 undefined。
 */
export async function enrichPromptProfessional(
  body: string,
  settings: PluginSettings,
): Promise<string | undefined> {
  logAI(`enrich: 开始 正文长度=${body.length}`);
  if (!llm) {
    logAI("enrich: 跳过（llm 服务未注入）");
    return undefined;
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return undefined;
  const docs = await readCharacterDocs();
  logAI(`enrich: 灵魂上下文 USER=${docs.USER.length} 字 MEMORY=${docs.MEMORY.length} 字`);
  const system = [
    "你是一名专业的提示词完善助手，擅长把用户的提示词完善成更全面、更专业、结构完整、可直接执行的高质量作品。",
    "",
    "【用户档案 USER.md】这是用户习惯、偏好与关注领域，请贴合（可能为空）：",
    docs.USER.trim() || "（暂无）",
    "",
    "【长期记忆 MEMORY.md】这是此前沉淀的用户风格与经验洞察，供你参考（可能为空）：",
    docs.MEMORY.trim() || "（暂无）",
    "",
    "要求（与「润色」相反：润色是把内容换得更简洁精炼；此处是扩写完善，使其更完整专业）：",
    "- 只完善提示词正文本身，不要涉及标题、标签、分类；",
    "- 保留原意与核心要求，在此基础上扩写完善：补充必要的方法、步骤、约束、边界与自查要点，使提示词更全面、更专业、更可执行；",
    "- 用清晰的结构组织内容（分步骤 / 分要点 / 分阶段），方便使用者逐项落实；",
    "- 使用专业、精准、规范的表达，避免含糊与口语化；",
    "- 不要刻意缩短或压缩内容，适当扩充细节以提升完成度；",
    "- 直接输出完善后的提示词正文，不要任何解释或 Markdown 代码块。",
  ].join("\n");
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withCharacterSystem(system, docs),
    `请把以下提示词完善成更专业、更全面、结构完整的版本：\n\n${body}`,
  );
  if (!text) return undefined;
  logAI(`enrich: 完成 结果长度=${text.length}`);
  return text;
}

/**
 * AI 润色一段提示词正文（只返回结果，不写回词库；只润色内容本身）。
 * 结合用户档案（prompt-library-user.md 的用户画像）润色，
 * 保持原意与关键细节，优化表达，使其更贴合用户风格、清晰通用、可直接复用。
 * 无可用 LLM / 无法解析路由 / 调用失败时返回 undefined。
 */
export async function polishPromptBody(
  body: string,
  settings: PluginSettings,
  opts?: { keepVariables?: boolean },
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
  // 是否启用「模板变量 {{}} 保留/新增」能力：聊天框按钮润色关闭，词库内润色开启（默认开启）
  const keepVariables = opts?.keepVariables !== false;
  // 检测正文中已有的模板变量（{{变量名}}），用于告知模型原样保留
  const existingVars = keepVariables
    ? [...body.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)]
        .map((m) => m[1]!.trim())
        .filter(Boolean)
    : [];
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
    ...(keepVariables
      ? [
          "- 正文中的 `{{变量名}}` 是模板变量占位符（运行前由使用者替换）：所有已有的 {{}} 必须原样保留，不得删除、改写或替换其中的变量名；",
          "- 若正文某处内容会因使用场景而变化（如角色、对象、主题、风格、细节等），可在该处新增命名清晰、贴合语境的 {{变量名}} 占位符，提升提示词可复用性；没有这种需求时不要画蛇添足；",
        ]
      : []),
    "- 结合 USER.md 中的写作风格与关注领域进行润色，使表达更贴合用户习惯；",
    "- 让提示词更清晰、通用、结构清晰、可直接复用；",
    "- 直接输出润色后的提示词正文，不要任何解释或 Markdown 代码块。",
  ].join("\n");
  const content =
    keepVariables && existingVars.length
      ? `请润色以下提示词内容。其中已有模板变量（{{}} 内为变量名，运行前会被替换，必须原样保留）：${existingVars.join("、")}\n\n${body}`
      : `请润色以下提示词内容：\n\n${body}`;
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withCharacterSystem(system, docs),
    content,
  );
  if (!text) return undefined;
  logAI(`polish: 完成 结果长度=${text.length}`);
  return text;
}

/**
 * 依据「提示词库使用统计」文本调用 AI 生成一段中文点评（总结现状 + 给出可执行建议）。
 * 供 `/prompts -data` 在统计数字之后追加「AI 点评」。AI 不可用或失败时返回空字符串。
 */
export async function commentOnStats(
  statsText: string,
  settings: PluginSettings,
): Promise<string> {
  if (!llm) return "";
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return "";
  const docs = await readCharacterDocs();
  const system = [
    "你是一名提示词库运营分析助手，擅长根据统计数据给出简洁、可执行的点评与改进建议。",
    "",
    "【用户档案 USER.md】这是用户习惯、偏好与关注领域（可能为空）：",
    docs.USER.trim() || "（暂无）",
    "",
    "要求：",
    "- 用一段中文点评以上统计数据（100 字以内），指出亮点与可优化点；",
    "- 结合用户档案给出接地气、可执行的建议，不要空话套话；",
    "- 直接输出点评文本，不要标题、编号或 Markdown 代码块，不要复述原始统计数据。",
  ].join("\n");
  const content = `以下是提示词库的使用统计数据，请点评：\n\n${statsText}`;
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withCharacterSystem(system, docs),
    content,
  );
  return text?.trim() ?? "";
}
