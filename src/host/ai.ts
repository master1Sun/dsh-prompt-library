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
import type { PluginSettings, Prompt, UserProfile } from "../types.js";
import { readProfile, updateProfileWith } from "./user-profile.js";
import { updatePrompt } from "./store.js";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/** 单次 AI 完善调用的超时（毫秒）。 */
const AI_TIMEOUT_MS = 30_000;
/** AI 完善的输出 token 上限（JSON 输出可能较长，留足空间）。 */
const AI_MAX_TOKENS = 2048;
/** AI 完善诊断日志路径（用于排查「AI 智能完善未生效」）。 */
const AI_LOG = join(homedir(), ".dsh", "prompt-library-ai.log");

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

/** AI 完善结果：AI 生成的标题/标签/摘要/正文，以及用于画像的一句话洞察。 */
export interface AiRefineResult {
  title: string;
  tags: string[];
  summary: string;
  body: string;
  insight: string;
}

/**
 * 解析 provider/model 路由：
 * 优先使用设置中显式配置的 aiProvider/aiModel；
 * 否则自动发现首个可用 provider 的模型（优先选 id 含 chat/deepseek 的）。
 * 无法确定路由时返回 undefined（跳过 AI 完善）。
 */
async function resolveRoute(
  runtime: LlmRuntime,
  settings: PluginSettings,
): Promise<{ provider: string; model: string } | undefined> {
  if (settings.aiProvider && settings.aiModel) {
    logAI(`route: 使用手动配置 provider=${settings.aiProvider} model=${settings.aiModel}`);
    return { provider: settings.aiProvider, model: settings.aiModel };
  }
  const providers = runtime.listProviders();
  if (providers.length === 0) {
    logAI("route: listProviders() 返回空（harness 无可用 provider）");
    return undefined;
  }
  const provider = providers[0]!.id;
  let models: readonly LlmModelInfo[];
  try {
    models = await runtime.listModels(provider);
  } catch (e) {
    logAI(`route: listModels(${provider}) 失败：${String(e)}`);
    return undefined;
  }
  if (models.length === 0) {
    logAI(`route: listModels(${provider}) 返回空模型列表`);
    return undefined;
  }
  const pick = models.find((m) => /chat|deepseek/i.test(m.id)) ?? models[0]!;
  logAI(`route: 自动发现 provider=${provider} model=${pick.id}`);
  return { provider, model: pick.id };
}

/** 组装 system prompt：把用户画像与最近样本作为上下文，让 AI 越用越懂用户。 */
function systemPrompt(profile: UserProfile): string {
  const samples = profile.recentSamples.length
    ? profile.recentSamples.map((s) => `- 【${s.title}】${s.body}`).join("\n")
    : "（暂无）";
  return [
    "你是一名提示词库整理助手，帮助用户把原始输入整理成高质量、可复用的提示词，并洞察用户的写作风格与关注领域。",
    "",
    "【用户画像】这是此前积累的关于用户风格与偏好的摘要（可能为空，越用越准）：",
    profile.summary || "（暂无）",
    "",
    "【用户最近学习的提示词】供你参考用户风格（可能为空）：",
    samples,
    "",
    "请严格输出一个 JSON 对象，不要 Markdown 代码块，不要任何多余文字：",
    '{ "title": "简洁标题", "tags": ["标签1", "标签2"], "summary": "用途摘要与使用说明", "body": "优化改写后的提示词正文", "insight": "一句话总结用户写作风格或关注领域" }',
    "",
    "要求：",
    "- title：简洁明了，不超过 30 字；",
    "- tags：2~5 个，用于分类与筛选，可沿用用户画像中出现的高频主题；",
    "- summary：一两句话说明这个提示词的用途与使用方法；",
    "- body：在保留原意的基础上润色，使表达更清晰、通用、可直接使用，不要丢失关键细节；",
    "- insight：用一句话描述这条提示词反映的用户写作风格或关注领域，用于持续完善用户画像。",
  ].join("\n");
}

/** 组装 user 消息：原始提示词正文 + 候选标签。 */
function userMessage(rawBody: string, tag?: string): string {
  const lines = ["以下是用户要学习的原始提示词：", "", rawBody];
  if (tag) lines.push("", `用户给出的候选标签：${tag}`);
  return lines.join("\n");
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
  if (!text) logAI("collect: 模型返回空文本");
  return text || undefined;
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
  if (!llm) {
    logAI(`enrich: 跳过（llm 服务未注入）prompt=${prompt.title}`);
    return;
  }
  const route = await resolveRoute(llm, settings);
  if (!route) return;
  const profile = await readProfile();
  const text = await collectText(llm, route, systemPrompt(profile), userMessage(prompt.body, prompt.tags?.[0]));
  if (!text) return;
  const result = parseJson(text);
  if (!result) {
    logAI(`parse: 模型输出无法解析为 JSON：${text.slice(0, 200)}`);
    return;
  }

  const changed = result.body !== prompt.body;
  await updatePrompt(prompt.id, {
    title: result.title || prompt.title,
    tags: result.tags.length ? result.tags : prompt.tags,
    summary: result.summary || undefined,
    body: changed ? result.body : prompt.body,
    sourceBody: changed ? prompt.body : undefined,
    aiRefined: true,
  });
  await updateProfileWith(
    {
      title: result.title || prompt.title,
      body: result.body,
      tags: result.tags.length ? result.tags : (prompt.tags ?? []),
    },
    result.insight,
  );
  logAI(`enrich: 完成 prompt=${result.title || prompt.title}（body ${changed ? "已改写" : "未改写"}）`);
}
