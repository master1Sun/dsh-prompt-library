/**
 * Host 侧 AI 润色 / 完善模块。
 *
 * 封装 harness 的 LLM 服务（ctx.llm.stream()）：
 * - registerLlm / isAiAvailable：由 host 入口在 llm 服务可用时注入引用；
 * - enrichLearnedPrompt：保存到词库后，在后台调用 AI 生成/完善
 *   标题、标签/分类、摘要/使用说明，并优化改写正文（仅供词库内完善，不回写人格文件）；
 * - polishPromptBody / enrichPromptProfessional：供界面与 /prompts 命令调用的润色与完善。
 *
 * 所有 AI 调用都带超时；任何失败都静默降级，绝不阻塞或破坏主流程。
 */
import { BlockAssembler, createUserMessage } from "@deepseek-ai/dsh-llm";
import type { GenerateOptions, LlmRuntime, LlmModelInfo } from "@deepseek-ai/dsh-llm";
import type { PluginSettings, Prompt } from "../types.js";
import { listTags, readGlobalLocale, updatePrompt } from "./store.js";
import { parseRefineResult, type AiRefineResult } from "./refine.js";
import { appendFileSync, mkdirSync } from "node:fs";
import { get as httpsGet } from "node:https";
import { dirname, join } from "node:path";
import { buildSoulBoundary, readSoulDoc } from "./character.js";
import { logDir } from "./paths.js";

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
  // 仅开发构建输出 AI 诊断日志；生产构建时 esbuild 将 __DEV__ 替换为 false 并消除该分支
  if (!__DEV__) return;
  try {
    const logPath = getDailyLogPath();
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, `[${localTime()}] ${msg}\n`);
  } catch {
    /* 忽略 */
  }
}

/**
 * AI 日志的文案模板（按语言返回格式化函数），zh / en 双语同步维护。
 * 前缀标签（route / collect / fallback / enrich / parse / polish / intro / skill）保留不译，
 * 便于按固定标签过滤日志；其余旁白按语言切换。
 */
interface AiLogCopy {
  injected: (ok: boolean) => string;
  routeManualOk: (p: string, m: string) => string;
  routeManualBad: (p: string, m: string) => string;
  routeNoProviders: string;
  routeListFail: (id: string, e: string) => string;
  routeNoModel: (id: string) => string;
  routeAuto: (p: string, m: string) => string;
  routeNone: string;
  collectErr: (e: string) => string;
  collectAbort: (kind: string) => string;
  collectEmpty: string;
  collectDone: (kind: string, n: number) => string;
  fbNone: string;
  fbTry: (p: string, m: string) => string;
  fbUse: (p: string, m: string) => string;
  fbNext: (p: string, m: string) => string;
  fbAllFail: string;
  enrichStart: (title: string, n: number) => string;
  enrichSkipNoLlmTitle: (title: string) => string;
  enrichSkipBusy: (title: string) => string;
  enrichTags: (n: number, list: string) => string;
  parseFail: (t: string) => string;
  parseOk: (title: string, tags: string, summary: number, body: number) => string;
  enrichDone: (title: string, changed: boolean) => string;
  enrichStartBody: (n: number) => string;
  enrichSkipNoLlm: string;
  enrichDoneBody: (n: number) => string;
  polishStart: (n: number) => string;
  polishDone: (n: number) => string;
  polishSummaryDone: (n: number) => string;
  introStart: (lang: string) => string;
  introDone: (n: number) => string;
  introLine: (i: number, l: string) => string;
  skillStart: (title: string, n: number) => string;
  skillNoLlm: string;
  skillRetry: (n: number) => string;
  skillParseFail: (t: string) => string;
  skillDone: (name: string, n: number) => string;
  draftStart: (kind: string, title: string) => string;
  draftNoLlm: string;
  draftDone: (kind: string, n: number) => string;
}

/** 构建 AI 日志文案（按语言），zh / en 双语同步维护。 */
function buildAiLogCopy(lang: string): AiLogCopy {
  if (lang === "en") {
    return {
      injected: (ok) => (ok ? "llm service injected (AI enrichment available)" : "llm service unregistered (AI enrichment disabled)"),
      routeManualOk: (p, m) => `route: manual config available provider=${p} model=${m}`,
      routeManualBad: (p, m) => `route: manual model ${p}/${m} unavailable, auto-polling available models`,
      routeNoProviders: "route: listProviders() returned empty (no provider in harness)",
      routeListFail: (id, e) => `route: listModels(${id}) failed: ${e}, trying next provider`,
      routeNoModel: (id) => `route: provider=${id} has no available model, trying next`,
      routeAuto: (p, m) => `route: auto-discovered provider=${p} model=${m}`,
      routeNone: "route: no usable model found",
      collectErr: (e) => `collect: LLM streaming error: ${e}`,
      collectAbort: (kind) => `collect: finish=${kind} (model call failed or aborted)`,
      collectEmpty: "collect: model returned empty text",
      collectDone: (kind, n) => `collect: done kind=${kind} text length=${n}`,
      fbNone: "fallback: no candidate routes, skipping this call",
      fbTry: (p, m) => `fallback: trying provider=${p} model=${m}`,
      fbUse: (p, m) => `fallback: using provider=${p} model=${m}`,
      fbNext: (p, m) => `fallback: provider=${p} model=${m} failed, polling next`,
      fbAllFail: "fallback: all candidate models failed",
      enrichStart: (title, n) => `enrich: start prompt="${title}" body length=${n}`,
      enrichSkipNoLlmTitle: (title) => `enrich: skipped (llm service not injected) prompt=${title}`,
      enrichSkipBusy: (title) => `enrich: skipped (${title} has an ongoing enrichment)`,
      enrichTags: (n, list) => `enrich: tag library ${n} [${list}]`,
      parseFail: (t) => `parse: model output could not be parsed as JSON: ${t}`,
      parseOk: (title, tags, summary, body) =>
        `parse: ok title="${title}" tags=[${tags}] summary length=${summary} rewritten body length=${body}`,
      enrichDone: (title, changed) => `enrich: done prompt="${title}" body ${changed ? "rewritten" : "unchanged"}`,
      enrichStartBody: (n) => `enrich: start body length=${n}`,
      enrichSkipNoLlm: "enrich: skipped (llm service not injected)",
      enrichDoneBody: (n) => `enrich: done result length=${n}`,
      polishStart: (n) => `polish: start body length=${n}`,
      polishDone: (n) => `polish: done result length=${n}`,
      polishSummaryDone: (n) => `polish: summary done length=${n}`,
      introStart: (lang) => `intro: start lang=${lang}`,
      introDone: (n) => `intro: done lines=${n}`,
      introLine: (i, l) => `intro:   [${i}] ${l}`,
      skillStart: (title, n) => `skill: start title="${title}" body length=${n}`,
      skillNoLlm: "skill: skipped (llm service not injected)",
      skillRetry: (n) => `skill: transient failure, retry #${n}`,
      skillParseFail: (t) => `skill: model output could not be parsed as JSON: ${t}`,
      skillDone: (name, n) => `skill: done name="${name}" description length=${n}`,
      draftStart: (kind, title) => `draft: start kind=${kind} title="${title}"`,
      draftNoLlm: "draft: skipped (llm service not injected)",
      draftDone: (kind, n) => `draft: done kind=${kind} result length=${n}`,
    };
  }
  return {
    injected: (ok) => (ok ? "llm 服务已注入（AI 完善可用）" : "llm 服务已注销（AI 完善停用）"),
    routeManualOk: (p, m) => `route: 手动配置可用 provider=${p} model=${m}`,
    routeManualBad: (p, m) => `route: 手动配置模型 ${p}/${m} 不可用，自动轮询可用模型`,
    routeNoProviders: "route: listProviders() 返回空（harness 无可用 provider）",
    routeListFail: (id, e) => `route: listModels(${id}) 失败：${e}，尝试下一个 provider`,
    routeNoModel: (id) => `route: provider=${id} 无可用模型，尝试下一个`,
    routeAuto: (p, m) => `route: 自动发现 provider=${p} model=${m}`,
    routeNone: "route: 未找到任何可用模型",
    collectErr: (e) => `collect: LLM 流式调用异常：${e}`,
    collectAbort: (kind) => `collect: finish=${kind}（模型调用失败或被中止）`,
    collectEmpty: "collect: 模型返回空文本",
    collectDone: (kind, n) => `collect: 完成 kind=${kind} 文本长度=${n}`,
    fbNone: "fallback: 无可用候选路由，跳过本次调用",
    fbTry: (p, m) => `fallback: 尝试 provider=${p} model=${m}`,
    fbUse: (p, m) => `fallback: 采用 provider=${p} model=${m}`,
    fbNext: (p, m) => `fallback: provider=${p} model=${m} 失败，轮询下一个`,
    fbAllFail: "fallback: 所有候选模型均失败",
    enrichStart: (title, n) => `enrich: 开始 prompt="${title}" 正文长度=${n}`,
    enrichSkipNoLlmTitle: (title) => `enrich: 跳过（llm 服务未注入）prompt=${title}`,
    enrichSkipBusy: (title) => `enrich: 跳过（${title} 已有完善任务进行中）`,
    enrichTags: (n, list) => `enrich: 标签库 ${n} 个 [${list}]`,
    parseFail: (t) => `parse: 模型输出无法解析为 JSON：${t}`,
    parseOk: (title, tags, summary, body) =>
      `parse: 成功 title="${title}" tags=[${tags}] 摘要长度=${summary} 改写正文长度=${body}`,
    enrichDone: (title, changed) => `enrich: 完成 prompt="${title}" body ${changed ? "已改写" : "未改写"}`,
    enrichStartBody: (n) => `enrich: 开始 正文长度=${n}`,
    enrichSkipNoLlm: "enrich: 跳过（llm 服务未注入）",
    enrichDoneBody: (n) => `enrich: 完成 结果长度=${n}`,
    polishStart: (n) => `polish: 开始 正文长度=${n}`,
    polishDone: (n) => `polish: 完成 结果长度=${n}`,
    polishSummaryDone: (n) => `polish: 摘要完成 长度=${n}`,
    introStart: (lang) => `intro: 开始 lang=${lang}`,
    introDone: (n) => `intro: 完成 行数=${n}`,
    introLine: (i, l) => `intro:   [${i}] ${l}`,
    skillStart: (title, n) => `skill: 开始 title="${title}" 正文长度=${n}`,
    skillNoLlm: "skill: 跳过（llm 服务未注入）",
    skillRetry: (n) => `skill: 瞬时失败，重试第 ${n} 次`,
    skillParseFail: (t) => `skill: 模型输出无法解析为 JSON：${t}`,
    skillDone: (name, n) => `skill: 完成 name="${name}" 描述长度=${n}`,
    draftStart: (kind, title) => `draft: 开始 kind=${kind} title="${title}"`,
    draftNoLlm: "draft: 跳过（llm 服务未注入）",
    draftDone: (kind, n) => `draft: 完成 kind=${kind} 结果长度=${n}`,
  };
}

/** AI 日志当前使用的语言（模块加载后异步预取，未取到前默认中文）。 */
let aiLogLang = "zh";
// 模块加载即后台预取一次全局语言，供后续同步的 logAI 使用；失败保持默认中文。
void readGlobalLocale()
  .then((lang) => {
    aiLogLang = lang === "en" ? "en" : "zh";
  })
  .catch(() => {});

/** 当前语言对应的 AI 日志文案（每次按需构建，成本可忽略）。 */
function aiLogCopy(): AiLogCopy {
  return buildAiLogCopy(aiLogLang);
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
  logAI(aiLogCopy().injected(injected));
}

/** 当前是否有可用的 harness LLM 服务。 */
export function isAiAvailable(): boolean {
  return llm !== undefined;
}

/**
 * 判断当前是否在使用 DeepSeek API：优先看手动配置的 aiProvider；
 * 否则遍历 harness 已注册的 provider，存在 DeepSeek 提供商即视为使用。
 * 供「DeepSeek 余额」推送能力决定是否显示相关角标。
 */
export function isDeepSeekProviderInUse(settings: PluginSettings): boolean {
  if (settings.aiProvider && /deepseek/i.test(settings.aiProvider)) return true;
  if (llm) {
    return llm
      .listProviders()
      .some((p) => /deepseek/i.test(`${p.id} ${p.name ?? ""}`));
  }
  return false;
}

// ── DeepSeek 余额查询 ──────────────────────────────────────────────

/** DeepSeek 余额信息（来自官方 /user/balance 接口）。 */
export interface DeepSeekCredit {
  currency: string;
  total: number;
}

/** DeepSeek 官方余额查询接口地址。 */
const DEEPSEEK_BALANCE_URL = "https://api.deepseek.com/user/balance";
/** host 侧余额缓存时长：避免客户端每 5 分钟轮询 + 多端并发导致高频请求官方接口。 */
const BALANCE_CACHE_TTL_MS = 3 * 60 * 1000;
let balanceCache: { key: string; ts: number; value: DeepSeekCredit | null } | undefined;

/** 清空 host 侧余额缓存：用户在设置中修改 DeepSeek API Key 后调用，使下次查询立即返回真实余额。 */
export function clearDeepSeekBalanceCache() {
  balanceCache = undefined;
}

/**
 * 查询 DeepSeek 账户余额：调用官方 GET /user/balance（Bearer 鉴权）。
 * 未配置 Key、网络失败、解析失败均返回 null（静默降级，不阻塞主流程）；多币种时优先取首个。
 */
export async function queryDeepSeekBalance(apiKey: string): Promise<DeepSeekCredit | null> {
  if (!apiKey) return null;
  if (balanceCache && balanceCache.key === apiKey && Date.now() - balanceCache.ts < BALANCE_CACHE_TTL_MS) {
    return balanceCache.value;
  }
  let credit: DeepSeekCredit | null = null;
  try {
    const body = (await new Promise<{ balance_infos?: unknown } | null>((resolve) => {
      const req = httpsGet(
        DEEPSEEK_BALANCE_URL,
        { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } },
        (res) => {
          const code = res.statusCode ?? 0;
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c as Buffer));
          res.on("end", () => {
            if (code < 200 || code >= 300) return resolve(null);
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as { balance_infos?: unknown } | null);
            } catch {
              resolve(null);
            }
          });
          res.on("error", () => resolve(null));
        },
      );
      req.on("error", () => resolve(null));
    })) ?? null;
    const infos = body?.balance_infos;
    if (Array.isArray(infos) && infos.length > 0) {
      const first = (infos as { currency?: string; total_balance?: unknown }[])[0]!;
      const total = Number(first?.total_balance);
      if (Number.isFinite(total)) {
        credit = { currency: String(first?.currency ?? "CNY"), total };
      }
    }
  } catch {
    /* 网络/解析失败静默降级为 null */
  }
  balanceCache = { key: apiKey, ts: Date.now(), value: credit };
  return credit;
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
      logAI(aiLogCopy().routeManualOk(settings.aiProvider, settings.aiModel));
    } else {
      logAI(aiLogCopy().routeManualBad(settings.aiProvider, settings.aiModel));
    }
  }

  // 2. 自动发现：遍历各 provider，选第一个有可用模型的
  const providers = runtime.listProviders();
  if (providers.length === 0) {
    logAI(aiLogCopy().routeNoProviders);
  }
  for (const provider of providers) {
    let models: readonly LlmModelInfo[];
    try {
      models = await runtime.listModels(provider.id);
    } catch (e) {
      logAI(aiLogCopy().routeListFail(provider.id, String(e)));
      continue;
    }
    if (models.length === 0) {
      logAI(aiLogCopy().routeNoModel(provider.id));
      continue;
    }
    const pick = models.find((m) => /chat|deepseek/i.test(m.id)) ?? models[0]!;
    const key = `${provider.id}/${pick.id}`;
    if (seen.has(key)) continue;
    candidates.push({ provider: provider.id, model: pick.id });
    seen.add(key);
    logAI(aiLogCopy().routeAuto(provider.id, pick.id));
  }
  if (candidates.length === 0) {
    logAI(aiLogCopy().routeNone);
  }
  routeCache = { key, ts: Date.now(), value: candidates };
  return candidates;
}

/** 组装 system prompt：引导 AI 依据标签库整理提示词（人格由外部 withSoulSystem 注入）。 */
async function systemPrompt(existingTags: string[], existingVars: string[]): Promise<string> {
  // 标签库：优先复用已有标签，避免重复创建
  const tagLib = existingTags.length ? existingTags.join("、") : "（暂无）";
  const system = [
    "你是一名词库整理助手，帮助用户把原始输入整理成高质量、可复用的提示词。",
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
  return withSoulSystem(system);
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
 * 把人格正文注入 AI 的 system prompt，让 AI 遵守用户自定义的人设/语气/工作规范。
 * 读取失败时静默忽略，不影响本次调用。
 *
 * 调用方若已用 readSoulDoc() 读过 soul，应直接传入复用；soul 为空时回退到自行读取。
 */
async function withSoulSystem(system: string, soul?: string): Promise<string> {
  try {
    const boundary = buildSoulBoundary(soul ?? (await readSoulDoc()));
    if (!boundary) return system;
    return [system, "", "# SOUL · 人格", boundary].join("\n");
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
    logAI(aiLogCopy().collectErr(String(e)));
    return undefined;
  }
  if (assembler.finish.kind !== "stop" && assembler.finish.kind !== "max-tokens") {
    logAI(aiLogCopy().collectAbort(assembler.finish.kind));
    return undefined;
  }
  const text = assembler
    .blocks()
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .trim();
  if (!text) {
    logAI(aiLogCopy().collectEmpty);
    return undefined;
  }
  logAI(aiLogCopy().collectDone(assembler.finish.kind, text.length));
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
    logAI(aiLogCopy().fbNone);
    return undefined;
  }
  for (const route of candidates) {
    logAI(aiLogCopy().fbTry(route.provider, route.model));
    // 通过全局锁串行执行，保证同一时刻只有一个 LLM 调用
    const text = await withLlmLock(() => collectText(runtime, route, system, content));
    if (text !== undefined) {
      logAI(aiLogCopy().fbUse(route.provider, route.model));
      return text;
    }
    logAI(aiLogCopy().fbNext(route.provider, route.model));
  }
  logAI(aiLogCopy().fbAllFail);
  return undefined;
}

/** 从模型输出中容错解析完善结果；具体实现见 refine.ts（可脱离 AI 单独测试）。 */
function parseJson(text: string): AiRefineResult | undefined {
  return parseRefineResult(text);
}

/**
 * 后台完善一条自动学习到的提示词：
 * 1. 依据标签库与人格注入调用 harness LLM 生成标题/标签/摘要/改写正文；
 * 2. 把结果写回词库（标记 aiRefined，改写时保留 sourceBody）。
 *
 * 任何失败都静默返回，不影响主流程。
 */
export async function enrichLearnedPrompt(prompt: Prompt, settings: PluginSettings): Promise<void> {
  logAI(aiLogCopy().enrichStart(prompt.title, prompt.body.length));
  if (!llm) {
    logAI(aiLogCopy().enrichSkipNoLlmTitle(prompt.title));
    return;
  }
  // 同一提示词只允许一个进行中的 AI 完善，避免并发重复生成
  if (enrichInFlight.has(prompt.id)) {
    logAI(aiLogCopy().enrichSkipBusy(prompt.title));
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
  // 读取标签库，让 AI 优先复用已有标签（不存在时才新建），只生成一个标签
  const tagList = await listTags().catch(() => []);
  const existingTags = tagList.map((t) => t.name);
  logAI(aiLogCopy().enrichTags(existingTags.length, existingTags.join(", ")));
  // 检测正文已有的模板变量（{{}}），告知模型原样保留并可按需新增，与润色的 keepVariables 逻辑保持一致
  const existingVars = [...prompt.body.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)]
    .map((m) => m[1]!.trim())
    .filter(Boolean);
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await systemPrompt(existingTags, existingVars),
    userMessage(prompt.body, prompt.tags?.[0], existingVars),
  );
  if (!text) return;
  const result = parseJson(text);
  if (!result) {
    logAI(aiLogCopy().parseFail(text.slice(0, 300)));
    return;
  }
  logAI(aiLogCopy().parseOk(result.title || "", result.tags.join(", "), result.summary.length, result.body.length));

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
  logAI(aiLogCopy().enrichDone(result.title || prompt.title, changed));
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
  logAI(aiLogCopy().enrichStartBody(body.length));
  if (!llm) {
    logAI(aiLogCopy().enrichSkipNoLlm);
    return undefined;
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return undefined;
  const system = [
    "你是一名专业的提示词完善助手，擅长把用户的提示词完善成更全面、更专业、结构完整、可直接执行的高质量作品。",
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
    await withSoulSystem(system),
    `请把以下提示词完善成更专业、更全面、结构完整的版本：\n\n${body}`,
  );
  if (!text) return undefined;
  logAI(aiLogCopy().enrichDoneBody(text.length));
  return text;
}

/**
 * AI 润色一段提示词正文（只返回结果，不写回词库；只润色内容本身）。
 * 保持原意与关键细节，优化表达，使其更清晰通用、可直接复用。
 * 无可用 LLM / 无法解析路由 / 调用失败时返回 undefined。
 */
export async function polishPromptBody(
  body: string,
  settings: PluginSettings,
  opts?: { keepVariables?: boolean },
): Promise<string | undefined> {
  logAI(aiLogCopy().polishStart(body.length));
  if (!llm) {
    logAI(aiLogCopy().enrichSkipNoLlm);
    return undefined;
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return undefined;
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
    "要求：",
    "- 只润色提示词内容本身，不要涉及标题、标签、分类等；",
    "- 保持原意与所有关键细节，不得遗漏、曲解或删减；",
    ...(keepVariables
      ? [
          "- 正文中的 `{{变量名}}` 是模板变量占位符（运行前由使用者替换）：所有已有的 {{}} 必须原样保留，不得删除、改写或替换其中的变量名；",
          "- 若正文某处内容会因使用场景而变化（如角色、对象、主题、风格、细节等），可在该处新增命名清晰、贴合语境的 {{变量名}} 占位符，提升提示词可复用性；没有这种需求时不要画蛇添足；",
        ]
      : []),
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
    await withSoulSystem(system),
    content,
  );
  if (!text) return undefined;
  logAI(aiLogCopy().polishDone(text.length));
  return text;
}

/**
 * 润色 + 用途摘要的结果（AI 优化完成后展示并保存）。
 * summary 为空串表示摘要生成失败（不影响润色正文返回）。
 */
export interface PolishWithSummary {
  polished: string;
  summary?: string;
}

/** 从模型输出中容错解析用途摘要 JSON（容忍 ```json 包裹 / 前后杂质）；解析失败返回 undefined。 */
function parseSummaryJson(text: string): string | undefined {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]! : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return undefined;
  try {
    const obj = JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
    const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";
    return summary || undefined;
  } catch {
    return undefined;
  }
}

/**
 * AI 润色一段提示词正文，并额外生成一条「用途摘要」（一两句话说明用途与用法）。
 * 供「AI 优化后显示 AI 摘要」使用：先按 polishPromptBody 的规则润色正文，
 * 再用一次独立调用生成摘要；摘要失败时静默降级（仅返回 polished）。
 * 无可用 LLM / 润色失败时返回 undefined。
 */
export async function polishPromptBodyWithSummary(
  body: string,
  settings: PluginSettings,
  opts?: { keepVariables?: boolean },
): Promise<PolishWithSummary | undefined> {
  const polished = await polishPromptBody(body, settings, opts);
  if (polished === undefined) return undefined;
  if (!llm) return { polished };
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return { polished };
  const summarySystem = [
    "你是一名专业的提示词分析师，擅长用一句话概括提示词的用途与用法。",
    "",
    "要求：",
    "- 用一两句话说明这条提示词的核心用途与大致使用方法（适用场景/使用方式）；",
    "- 简洁自然，不要复述正文的具体细节与步骤，50 字以内；",
    "- 直接输出 JSON：{ \"summary\": \"用途摘要\" }，不要任何解释或 Markdown 代码块。",
  ].join("\n");
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withSoulSystem(summarySystem),
    `请为以下提示词生成用途摘要：\n\n${polished}`,
  );
  if (!text) return { polished };
  const summary = parseSummaryJson(text);
  logAI(aiLogCopy().polishSummaryDone(summary?.length ?? 0));
  return summary ? { polished, summary } : { polished };
}

/**
 * 依据「词库使用统计」文本调用 AI 生成一段点评（总结现状 + 给出可执行建议）。
 * 供 `/prompts -data` 在统计数字之后追加「AI 点评」，以及公告看板「AI 建议」卡片。
 * AI 不可用或失败时返回空字符串。
 */
export async function commentOnStats(
  statsText: string,
  settings: PluginSettings,
  lang: "zh" | "en" = "zh",
): Promise<string> {
  if (!llm) return "";
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return "";
  const system =
    lang === "en"
      ? [
          "You are a prompt-library operations analyst who gives concise, actionable reviews and suggestions based on stats.",
          "",
          "Requirements:",
          "- Write one paragraph (within 100 words) in English, highlighting strengths and areas to improve;",
          "- Give practical, actionable suggestions, no empty talk;",
          "- Output only the review text: no headings, numbering, or Markdown code blocks; do not restate raw stats.",
        ].join("\n")
      : [
          "你是一名词库运营分析助手，擅长根据统计数据给出简洁、可执行的点评与改进建议。",
          "",
          "要求：",
          "- 用一段中文点评以上统计数据（100 字以内），指出亮点与可优化点；",
          "- 给出接地气、可执行的建议，不要空话套话；",
          "- 直接输出点评文本，不要标题、编号或 Markdown 代码块，不要复述原始统计数据。",
        ].join("\n");
  const content = `以下是词库的使用统计数据，请点评：\n\n${statsText}`;
  const text = await collectTextWithFallback(llm, candidates, system, content);
  return text?.trim() ?? "";
}

/**
 * 依据指定语言调用 AI 生成「词库」的功能简介（5 句，一行一句）。
 * 供浮动助手悬停气泡轮询展示；AI 不可用或失败时返回 undefined，由调用方回退到内置简介。
 */
export async function generateIntro(
  lang: "zh" | "en",
  settings: PluginSettings,
): Promise<string[] | undefined> {
  logAI(aiLogCopy().introStart(lang));
  if (!llm) {
    logAI(aiLogCopy().enrichSkipNoLlm);
    return undefined;
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return undefined;
  const zhMode = lang !== "en";
  const system = zhMode
    ? [
        "你是一名擅长拟广告文案的中文文案，为「词库」（一款保存、组织、AI 润色并复用提示词的小工具）撰写简洁走心的功能简介。",
        "",
        "要求：",
        "- 输出恰好 5 句简介，每句一行，分别从记录、润色、整理、一键使用、随时可得等角度介绍价值；",
        "- 风格有文气、有画面感、自然灵动，避免文言堆砌与空洞套话（如“受益无穷”“多多益善”）；",
        "- 每句 10~20 字，朗朗上口，长短错落，不要全都一个句式；",
        "- 不要编号、项目符号、引号、语气词或任何解释。",
        "",
        "风格示范（仅参考，勿照抄）：",
        "- 慧心记之，随取随用。",
        "- AI 润饰，炼字成句。",
        "- 分门别类，检索如流。",
      ].join("\n")
    : [
        "You are a copywriter crafting elegant short taglines for a prompt library where users save, organize, AI-polish, and reuse prompts.",
        "",
        "Requirements:",
        "- Output exactly 5 taglines, one per line, covering saving, polishing, organizing, one-tap use and always-on access;",
        "- Keep the tone refined, vivid and memorable, 6-12 words each; avoid clichés and empty praise;",
        "- Vary the sentence shapes a little; no numbering, bullets, quotes, filler words, or explanation.",
      ].join("\n");
  const content = zhMode
    ? "为「词库」工具写 5 句简介。"
    : "Write 5 taglines for the prompt library tool.";
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withSoulSystem(system),
    content,
  );
  if (!text) return undefined;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^\d+[.、)）]\s*/, "").replace(/^-+\s*/, ""))
    .filter(Boolean);
  logAI(aiLogCopy().introDone(lines.length));
  lines.forEach((l, i) => logAI(aiLogCopy().introLine(i, l)));
  return lines.slice(0, 5);
}

/** 报纸「今日词库日报」单条。 */
export interface DailyReportItem {
  /** 醒目短标题（10 字内）。 */
  headline: string;
  /** 一句话展开说明（40 字内）。 */
  body: string;
}

/** 报纸「今日科技快讯」单条。 */
export interface TechNewsItem {
  /** 新闻标题。 */
  title: string;
  /** 一句话摘要。 */
  summary: string;
  /** 新闻原文链接（AI 自选权威科技媒体地址）。 */
  url: string;
}

/** 从 AI 输出里解析 JSON 数组（容忍 ```json 包裹与首尾杂质），解析失败返回 undefined。 */
function parseJsonArray(text: string): unknown[] | undefined {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start < 0 || end <= start) return undefined;
  try {
    const v = JSON.parse(t.slice(start, end + 1));
    return Array.isArray(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

/** 当前本地日期 YYYY-MM-DD（本地时区），用于日报/新闻的「今日」语义与缓存键。 */
export function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 依据「当日词库使用统计」文本调用 AI 生成「今日词库日报」要点列表。
 * 供公告报纸「每日日报」栏目；AI 不可用或失败时返回 undefined（前端显示「今日暂无推荐」）。
 */
export async function generateDailyReport(
  statsText: string,
  settings: PluginSettings,
  lang: "zh" | "en" = "zh",
): Promise<DailyReportItem[] | undefined> {
  if (!llm) return undefined;
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return undefined;
  const zhMode = lang !== "en";
  const system = zhMode
    ? [
        "你是一名「词库日报」编辑，根据当日的词库使用数据，为使用者撰写一份简明、有温度的今日词库日报。",
        "",
        "要求：",
        "- 基于给出的统计数据，提炼 3~5 条核心要点（不宜过多）；",
        "- 每条要点为一个 JSON 对象 { headline, body }：headline 是 10 字以内的醒目短标题，body 是一句话展开说明（40 字内）；",
        "- 语气自然亲切、接地气，避免套话与空洞鼓励；",
        "- 只输出一个 JSON 数组，例如 [{\"headline\":\"使用渐入佳境\",\"body\":\"今日共使用 12 次提示词，较此前更频繁。\"}]；不要任何解释或 Markdown 代码块。",
      ].join("\n")
    : [
        "You are the editor of a \"daily library report\" (词库日报). Based on today's library usage data, write a brief and warm report for the user.",
        "",
        "Requirements:",
        "- Distill 3-5 core points from the given stats (not too many);",
        "- Each point is a JSON object { headline, body }: headline is a punchy short title (within 10 words), body is a one-sentence explanation (within 40 words);",
        "- Keep the tone natural, friendly and down-to-earth; avoid clichés and empty praise;",
        "- Output only a JSON array, e.g. [{\"headline\":\"Usage on the rise\",\"body\":\"Used 12 prompts today, more than before.\"}]; no explanation or Markdown fences.",
        "- IMPORTANT: reply entirely in English, even though the stats may be described in Chinese.",
      ].join("\n");
  const text = await collectTextWithFallback(
    llm,
    candidates,
    system,
    zhMode
      ? `以下是今日词库的统计数据：\n\n${statsText}`
      : `Here are today's library usage stats:\n\n${statsText}\n\nWrite the daily report in English.`,
  );
  if (!text) return undefined;
  const arr = parseJsonArray(text);
  if (!arr) return undefined;
  const items: DailyReportItem[] = [];
  for (const x of arr) {
    if (typeof x !== "object" || x === null) continue;
    const o = x as Record<string, unknown>;
    const headline = String(o.headline ?? "").trim();
    const body = String(o.body ?? "").trim();
    if (!headline || !body) continue;
    items.push({ headline, body });
  }
  if (items.length === 0) return undefined;
  logAI(aiLogCopy().introDone(items.length));
  return items.slice(0, 5);
}

/** 由 AI 依据提示词内容生成的技能描述符。 */
export interface SkillDescriptor {
  name: string;
  description: string;
  whenToUse?: string;
}

/** 技能描述符生成失败原因码：no-llm 未连接 LLM / route 无可用模型 / empty 模型返回空 / parse 输出无法解析。 */
export type SkillDescribeFail = "no-llm" | "route" | "empty" | "parse";

/** 生成结果：{ desc } 成功；{ fail } 失败并给出原因码，供前端展示准确提示。 */
export interface SkillDescribeResult {
  desc?: SkillDescriptor;
  fail?: SkillDescribeFail;
}

/** 从模型输出中容错解析技能描述符 JSON（容忍 ```json 代码块包裹 / 前后杂质）；解析失败返回 undefined。 */
function parseSkillJson(text: string): SkillDescriptor | undefined {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]! : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return undefined;
  try {
    const obj = JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
    const name = typeof obj.name === "string" ? obj.name.trim() : "";
    if (!name) return undefined;
    return {
      name,
      description: typeof obj.description === "string" ? obj.description.trim() : "",
      whenToUse: typeof obj.whenToUse === "string" ? obj.whenToUse.trim() : undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * 用 AI 依据提示词内容生成技能描述符（英文 kebab-case 技能名 + 描述 + 使用时机）。
 * 仅供导出 Skill 弹窗「校验并 AI 生成」使用：不改写正文，正文中的 {{变量名}} 模板变量
 * 必须原样保留，并在描述中说明该技能需要用户提供的输入变量，便于 DSH 技能 AI 识别。
 * 返回 { desc } 表示成功；{ fail } 表示失败并给出原因码。
 * 模型返回空文本 / 输出无法解析多为瞬时故障，自动重试最多 3 次后再判定失败。
 */
export async function generateSkillDescriptor(
  prompt: { title: string; body: string; summary?: string; tags?: string[] },
  settings: PluginSettings,
): Promise<SkillDescribeResult> {
  logAI(aiLogCopy().skillStart(prompt.title, prompt.body.length));
  if (!llm) {
    logAI(aiLogCopy().skillNoLlm);
    return { fail: "no-llm" };
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return { fail: "route" };
  // 检测正文已有的模板变量（{{}}），提示 AI 原样保留并在描述中说明
  const vars = [...prompt.body.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)]
    .map((m) => m[1]!.trim())
    .filter(Boolean);
  const system = [
    "你是一名 DSH 技能（SKILL）设计助手。用户会给你一条提示词，请把它转化为一个规范、可直接复用的技能。",
    "",
    "要求：",
    "- name：英文小写 kebab-case（仅字母/数字/连字符，4-40 个字符），简洁达意，作为技能目录名与聊天框 /触发名；",
    "- description：用一句英文描述该技能的用途与适用场景（不要 Markdown），供技能 AI 在合适时机自动触发；",
    "- whenToUse：英文，一两句话说明什么场景下应该使用该技能；",
    `- 正文中的 {{变量名}} 是模板变量占位符（运行时由使用者替换），必须原样保留，不得删除、改写或替换其中的变量名；${vars.length ? `该技能需要用户提供的输入变量有：${vars.join("、")}，请在描述中体现。` : "该技能没有模板变量。"}`,
    "请严格输出一个 JSON 对象，不要 Markdown 代码块，不要任何多余文字：",
    '{ "name": "skill-name", "description": "...", "whenToUse": "..." }',
  ].join("\n");
  const content = [
    `提示词标题：${prompt.title}`,
    ...(prompt.summary ? [`提示词摘要：${prompt.summary}`] : []),
    ...(prompt.tags?.length ? [`提示词标签：${prompt.tags.join("、")}`] : []),
    "",
    "以下是提示词正文（{{变量名}} 为模板变量，必须原样保留）：",
    prompt.body,
  ].join("\n");
  const sysText = await withSoulSystem(system);
  for (let attempt = 0; attempt < 3; attempt++) {
    const text = await collectTextWithFallback(llm, candidates, sysText, content);
    if (!text) {
      if (attempt < 2) logAI(aiLogCopy().skillRetry(attempt + 1));
      else return { fail: "empty" };
      continue;
    }
    const parsed = parseSkillJson(text);
    if (!parsed) {
      logAI(aiLogCopy().skillParseFail(text.slice(0, 300)));
      if (attempt < 2) logAI(aiLogCopy().skillRetry(attempt + 1));
      else return { fail: "parse" };
      continue;
    }
    logAI(aiLogCopy().skillDone(parsed.name, parsed.description.length));
    return { desc: parsed };
  }
  return { fail: "empty" };
}

/** AI 生成失败原因码：no-llm 未连接 LLM / route 无可用模型 / empty 模型返回空。 */
export type DraftGenerateFail = "no-llm" | "route" | "empty";

/** AI 生成结果：{ content } 成功；{ fail } 失败并给出原因码。 */
export interface DraftGenerateResult {
  content?: string;
  fail?: DraftGenerateFail;
}

/**
 * 依据「标题 + 用户输入」用 AI 生成一段技能（skill）或人格（soul）正文草稿。
 * 供人格管理 / 技能管理编辑区「AI 生成」按钮使用：仅生成文本返回，不落盘、不写回。
 * 返回 { content } 表示成功；{ fail } 表示失败并给出原因码（前端展示准确提示）。
 * 模型返回空文本多为瞬时故障，自动重试最多 3 次后再判定失败。
 */
export async function generateDraft(
  kind: "soul" | "skill",
  title: string,
  input: string,
  settings: PluginSettings,
  lang: "zh" | "en" = "zh",
): Promise<DraftGenerateResult> {
  logAI(aiLogCopy().draftStart(kind, title));
  if (!llm) {
    logAI(aiLogCopy().draftNoLlm);
    return { fail: "no-llm" };
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return { fail: "route" };
  const enMode = lang === "en";
  const system = enMode
    ? kind === "soul"
      ? [
          "You are an expert at writing a SOUL.md persona for an AI assistant. Based on the given persona name and any draft notes, write a complete, well-structured persona definition.",
          "",
          "Requirements:",
          "- Write the full SOUL.md content in English, with clear sections (identity, tone, working rules) using Markdown headings;",
          "- Keep it practical and warm, matching the persona's purpose; avoid clichés;",
          "- Output only the SOUL.md content — no extra explanation, no code fence.",
        ].join("\n")
      : [
          "You are an expert at writing a DSH skill (SKILL.md) instruction for an AI assistant. Based on the given skill title and any draft notes, write a complete, actionable skill definition.",
          "",
          "Requirements:",
          "- Write the full skill content in English, starting with a short summary, then concrete instructions the assistant should follow, using Markdown;",
          "- Keep it specific, actionable and easy to reuse; avoid vagueness;",
          "- Output only the skill content — no extra explanation, no code fence.",
        ].join("\n")
    : kind === "soul"
      ? [
          "你是一名擅长编写 AI 人格（SOUL.md）的专家。根据用户给的人格名称与草稿，生成一段完整、结构清晰的人格设定。",
          "",
          "要求：",
          "- 用中文写完整的 SOUL.md 内容，用 Markdown 标题分节（身份设定 / 语气风格 / 工作规范等）；",
          "- 内容务实、有温度，贴合人格用途，避免套话空话；",
          "- 只输出 SOUL.md 正文，不要任何解释，不要 Markdown 代码块。",
        ].join("\n")
      : [
          "你是一名擅长编写 DSH 技能（SKILL.md）指令的专家。根据用户给的技能标题与草稿，生成一段完整、可直接复用的技能定义。",
          "",
          "要求：",
          "- 用中文写完整技能正文，先写一段简短用途说明，再写具体、可执行的指令（用 Markdown 组织）；",
          "- 内容具体、可落地、便于复用，避免空泛；",
          "- 只输出技能正文，不要任何解释，不要 Markdown 代码块。",
        ].join("\n");
  const content = [
    `标题：${title}`,
    input && input.trim() ? `以下是已有的草稿 / 补充要求（可在此基础完善）：\n${input.trim()}` : "（暂无草稿，请根据标题展开完整内容）",
  ].join("\n\n");
  // 注意：这里不使用 withSoulSystem 注入当前人格，保证生成内容只跟「标题 + 输入」相关，
  // 不携带其它人格 / 技能等无关上下文。
  const sysText = system;
  for (let attempt = 0; attempt < 3; attempt++) {
    const text = await collectTextWithFallback(llm, candidates, sysText, content);
    if (!text) {
      if (attempt < 2) logAI(aiLogCopy().skillRetry(attempt + 1));
      else return { fail: "empty" };
      continue;
    }
    // 清理可能的代码块包裹后直接作为草稿返回
    const cleaned = text
      .replace(/^```(?:md|markdown|soul|skill)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    if (!cleaned) return { fail: "empty" };
    logAI(aiLogCopy().draftDone(kind, cleaned.length));
    return { content: cleaned };
  }
  return { fail: "empty" };
}
