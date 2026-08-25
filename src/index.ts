/**
 * dsh-prompt-library — host 入口。
 *
 * 在 /api/prompt-library 下注册 HTTP CRUD 路由，并将提示词持久化到
 * ~/.dsh/prompt-library.json。路由注册依赖于 webServer 是否可用
 *（无头 profile 得到一个空操作插件——那里没有 UI 来驱动）。
 */
import type { Context } from "@deepseek-ai/cordis";
import { makePromptRoutes } from "./host/routes/routes.js";
import { registerActivity } from "./host/services/assistant/activity.js";
import { dataChangedRoute, emitExportDownload } from "./host/services/sse/events.js";
import {
  autoLearn,
  computeLibraryStats,
  computeWeeklyStats,
  exportPrompts,
  getLastSnapshotAt,
  getLastStatsSnapshot,
  getSettings,
  listPrompts,
  readGlobalLocale,
  saveStatsSnapshot,
  welcomePromptOnce,
} from "./host/services/data/store.js";
import {
  commentOnStats,
  enrichPromptProfessional,
  isAiAvailable,
  logAiInjected,
  polishPromptBody,
  registerLlm,
} from "./host/services/ai/ai.js";
import { soulSystemSync, ensureSoulFile, shouldInjectChatCharacter } from "./host/services/assistant/character.js";
import { ensureHarnessFile, harnessSystemSync } from "./host/services/harness/harness.js";
import { autoUpdateDaily } from "./host/services/update/update.js";
// 操作手册：纯文本字符串，聊天消息按纯文本渲染（markdown/HTML 都无法解析），用换行符排版
import { manualEn, manualZh } from "./manual.js";

export const name = "prompt-library";

/** systemPrompt.section 注册项的结构化形状（宿主类型未导出，故本地声明）。 */
interface PromptSection {
  name: string;
  order: number;
  text: string | ((context: unknown) => string);
}

/** 没有静态声明的必需服务；webServer / llm / systemPrompt 按条件注入。 */
export const inject: string[] = [];

/** 命令一览表：单一来源，用于生成「命令示例」与「未知指令」提示（中/英共用同一套旗标）。 */
interface CommandSpec {
  flags: string; // 展示用旗标（含别名，如 "-add / -ad"）
  zh: string; // 中文指令名
  en: string; // 英文指令名
  zhExample: string; // 中文示例正文
  enExample: string; // 英文示例正文
}
const COMMAND_SPECS: CommandSpec[] = [
  { flags: "-add / -ad", zh: "保存", en: "save", zhExample: "/prompts -add 把这段好的提示词保存下来", enExample: "/prompts -add save this great prompt" },
  { flags: "-tag / -t", zh: "按标签保存", en: "save with tag", zhExample: "/prompts -tag 写作 请写一段产品介绍", enExample: "/prompts -tag writing write a product intro" },
  { flags: "-s", zh: "检索", en: "search", zhExample: "/prompts -s 写作", enExample: "/prompts -s writing" },
  { flags: "-enrich / -en", zh: "AI专业完善", en: "AI professional enrichment", zhExample: "/prompts -enrich 请把这段完善得更全面专业", enExample: "/prompts -enrich make this more comprehensive and professional" },
  { flags: "-e / -exp", zh: "导出", en: "export", zhExample: "/prompts -e", enExample: "/prompts -e" },
  { flags: "-data / -d", zh: "统计", en: "stats", zhExample: "/prompts -data", enExample: "/prompts -data" },
  { flags: "-AI / -a", zh: "AI优化", en: "AI polish", zhExample: "/prompts -AI 请把这段优化得更简洁", enExample: "/prompts -AI make this more concise" },
  { flags: "-h", zh: "帮助", en: "help", zhExample: "/prompts -h", enExample: "/prompts -h" },
];

/** 依据命令一览表生成「命令示例」文案（按语言）。 */
function buildCmdExamples(lang: "zh" | "en"): string {
  const header =
    lang === "zh"
      ? "/prompts 可用命令（不区分大小写，可写简化别名）："
      : "/prompts available commands (case-insensitive, shorter aliases ok):";
  const lines = COMMAND_SPECS.map((s) =>
    lang === "zh"
      ? `  ${s.flags} ${s.zh}：${s.zhExample}`
      : `  ${s.flags} ${s.en}: ${s.enExample}`,
  );
  return [header, ...lines].join("\n");
}

/** 依据命令一览表生成「未知指令」提示（按语言）。 */
function buildUnknownFlag(lang: "zh" | "en"): string {
  const prefix = lang === "zh" ? "未知指令。可用：" : "Unknown command. Available: ";
  const parts = COMMAND_SPECS.map((s) => {
    const flags = s.flags.replace(/ /g, "");
    return lang === "zh" ? `${flags} ${s.zh}` : `${flags} ${s.en}`;
  });
  return `${prefix}${parts.join(" / ")}`;
}

/** `/prompts` 命令实际输出文案的聚合格式函数（-s / -e / -data 等）。 */
interface FmtCopy {
  searchLine: (i: number, title: string, tag: string, usage: string, summary: string) => string;
  matchCount: (n: number) => string;
  summaryPrefix: (s: string) => string;
  dataHeader: string;
  dataTotal: (n: number) => string;
  dataTotalUsage: (n: number) => string;
  dataUsed: (used: number, unused: number, pct: number) => string;
  dataTop: (n: number) => string;
  dataTopItem: (title: string, count: number) => string;
  dataNoUsage: string;
  dataRecent: (titles: string) => string;
  dataTagDist: (part: string) => string;
  dataNoTags: string;
  dataTrash: (n: number) => string;
  dataUsageVitality: (used7: number, used30: number) => string;
  dataSleeping: (items: Array<{ title: string; days: number }>) => string;
  dataBodyStats: (total: number, avg: number) => string;
  dataAiRefined: (count: number, pct: number) => string;
  dataAddedTrend: (added7: number, added30: number) => string;
  aiComment: string;
  historyHeader: (date: string) => string;
  historyRange: (from: string, to: string) => string;
  historyAdded: (n: number) => string;
  historyAddedTitles: (titles: string) => string;
  historyUsage: (count: number, usedCount: number) => string;
  historyTop: (n: number) => string;
  historyTopItem: (title: string, count: number) => string;
  historyAiRefined: (n: number) => string;
  historyNone: string;
  exportDownloaded: (n: number) => string;
  exportTextHeader: (n: number) => string;
}

/** `/prompts` 命令的全部可译文案（元数据 + 输出格式）。 */
export interface Copy {
  description: string;
  hint: string;
  cmdExamples: string;
  unknownFlag: string;
  saved: string;
  failed: string;
  addEmpty: string;
  tagEmpty: string;
  searchEmpty: string;
  searchUsage: string;
  exportEmpty: string;
  aiNoInput: string;
  aiUnavailable: string;
  aiDone: string;
  enrichNoInput: string;
  enrichFailed: string;
  enrichDone: string;
  help: string;
  fmt: FmtCopy;
}

/**
 * 按语言构建 `/prompts` 命令的中/英文案。
 *
 * 返回类型统一为 `Copy`：新增/删除任一字段时，TypeScript 会强制两分支同步修改，
 * 避免中英文案「改漏一边」导致结构不一致。
 */
function buildCopy(lang: "zh" | "en"): Copy {
  const isZh = lang === "zh";
  return isZh
    ? {
        description: "保存/优化/完善提示词，并输出词库统计",
        hint: "输入命令或要保存/处理的正文，直接输入 /prompts 可查看命令示例",
        cmdExamples: buildCmdExamples("zh"),
        unknownFlag: buildUnknownFlag("zh"),
        saved: "已保存到词库",
        failed: "操作失败",
        addEmpty: "请在 -add 后输入要保存的正文",
        tagEmpty: "用法：/prompts -tag <标签> <正文>",
        searchEmpty: "未找到匹配的提示词",
        searchUsage: "用法：/prompts -s <关键词>（检索词库，支持大小写不敏感）",
        exportEmpty: "词库为空，无内容可导出",
        aiNoInput: "请在 -AI 后输入要优化的正文",
        aiUnavailable: "AI 服务不可用，无法处理",
        aiDone: "已 AI 优化完成，请复制下方内容：",
        enrichNoInput: "请在 -enrich 后输入要完善的正文",
        enrichFailed: "AI 完善失败",
        enrichDone: "已 AI 专业完善（扩写，与 -AI 相反），请复制下方内容：",
        help: manualZh,
        // 命令实际输出文案（-s / -e / -data 等），避免英文环境仍输出中文
        fmt: {
          searchLine: (i, title, tag, usage, summary) => `${i}. ${title}${tag}（使用${usage}次）${summary}`,
          matchCount: (n) => `匹配 ${n} 条：`,
          summaryPrefix: (s) => `\n   摘要：${s}`,
          dataHeader: "词库数据统计：",
          dataTotal: (n) => `- 提示词总数：${n}`,
          dataTotalUsage: (n) => `- 累计使用次数：${n}`,
          dataUsed: (used, unused, pct) => `- 曾使用 / 从未使用：${used} / ${unused}（使用率 ${pct}%）`,
          dataTop: (n) => `- 最常用 Top ${n}：`,
          dataTopItem: (title, count) => `    ${title}（${count}次）`,
          dataNoUsage: "- 尚无使用记录",
          dataRecent: (titles) => `- 最近使用：${titles}`,
          dataTagDist: (part) => `- 标签分布：${part}`,
          dataNoTags: "- 暂无标签",
          dataTrash: (n) => `- 回收站条数：${n}`,
          dataUsageVitality: (used7, used30) => `- 复用活力：近7天 ${used7} 条，近30天 ${used30} 条`,
          dataSleeping: (items) => `- 沉睡提示词：${items.map((i) => `${i.title}（${i.days}天）`).join("、")}`,
          dataBodyStats: (total, avg) => `- 正文体量：共 ${total} 字，平均每条 ${avg} 字`,
          dataAiRefined: (count, pct) => `- AI 完善占比：${count} 条（${pct}%）`,
          dataAddedTrend: (added7, added30) => `- 新增趋势：近7天 ${added7} 条，近30天 ${added30} 条`,
          aiComment: "【AI 点评】",
          // 最近一周统计历史（每7天自动统计写入 stats_history 后，-data 结尾展示）
          historyHeader: (date) => `【最近7天统计 · ${date}】`,
          historyRange: (from, to) => `统计周期：${from} ~ ${to}`,
          historyAdded: (n) => `- 新增提示词：${n} 条`,
          historyAddedTitles: (titles) => `    ${titles}`,
          historyUsage: (count, usedCount) => `- 使用次数：${count} 次（覆盖 ${usedCount} 条）`,
          historyTop: (n) => `- 近7天最常用 Top ${n}：`,
          historyTopItem: (title, count) => `    ${title}（${count}次）`,
          historyAiRefined: (n) => `- AI 完善：${n} 条`,
          historyNone: "（暂无历史统计，7天后自动生成）",
          exportDownloaded: (n) => `已导出 ${n} 条提示词：JSON 备份文件已下载到浏览器本地。`,
          exportTextHeader: (n) => `词库导出（共 ${n} 条）：`,
        },
      }
    : {
        description: "Save/polish/enrich prompts and output library stats",
        hint: "Enter a command or the body to save/process; type /prompts alone to see command examples",
        cmdExamples: buildCmdExamples("en"),
        unknownFlag: buildUnknownFlag("en"),
        saved: "Saved to the prompt library",
        failed: "Operation failed",
        addEmpty: "Enter the body to save after -add",
        tagEmpty: "Usage: /prompts -tag <tag> <body>",
        searchEmpty: "No matching prompts found",
        searchUsage: "Usage: /prompts -s <keyword> (search library, case-insensitive)",
        exportEmpty: "The library is empty, nothing to export",
        aiNoInput: "Enter the text to polish after -AI",
        aiUnavailable: "AI service is unavailable, cannot process",
        aiDone: "Polished by AI. Please copy the content below:",
        enrichNoInput: "Enter the body to enrich after -enrich",
        enrichFailed: "AI enrichment failed",
        enrichDone: "Professionally enriched by AI (expands, opposite of -AI polish). Please copy the content below:",
        help: manualEn,
        // Command output wording for -s / -e / -data, so Chinese is not shown in English locale
        fmt: {
          searchLine: (i, title, tag, usage, summary) => `${i}. ${title}${tag} (used ${usage} times)${summary}`,
          matchCount: (n) => `Matched ${n}: `,
          summaryPrefix: (s) => `\n   Summary: ${s}`,
          dataHeader: "Prompt Library Stats:",
          dataTotal: (n) => `- Total prompts: ${n}`,
          dataTotalUsage: (n) => `- Total usage: ${n}`,
          dataUsed: (used, unused, pct) => `- Used / never used: ${used} / ${unused} (usage rate ${pct}%)`,
          dataTop: (n) => `- Top ${n}: `,
          dataTopItem: (title, count) => `    ${title} (${count} times)`,
          dataNoUsage: "- No usage records",
          dataRecent: (titles) => `- Recently used: ${titles}`,
          dataTagDist: (part) => `- Tags: ${part}`,
          dataNoTags: "- No tags",
          dataTrash: (n) => `- Trash count: ${n}`,
          dataUsageVitality: (used7, used30) => `- Reuse vitality: ${used7} in 7d, ${used30} in 30d`,
          dataSleeping: (items) => `- Dormant prompts: ${items.map((i) => `${i.title} (${i.days}d)`).join(", ")}`,
          dataBodyStats: (total, avg) => `- Body size: ${total} chars total, ${avg} avg`,
          dataAiRefined: (count, pct) => `- AI-refined: ${count} (${pct}%)`,
          dataAddedTrend: (added7, added30) => `- Added: ${added7} in 7d, ${added30} in 30d`,
          aiComment: "[AI Review]",
          // Recent 7-day stats history (auto-snapshotted every 7 days, shown at the end of -data)
          historyHeader: (date) => `[Last 7 days stats · ${date}]`,
          historyRange: (from, to) => `Period: ${from} ~ ${to}`,
          historyAdded: (n) => `- Added: ${n}`,
          historyAddedTitles: (titles) => `    ${titles}`,
          historyUsage: (count, usedCount) => `- Used: ${count} times (${usedCount} prompts)`,
          historyTop: (n) => `- Top ${n} used this week:`,
          historyTopItem: (title, count) => `    ${title} (${count} times)`,
          historyAiRefined: (n) => `- AI-refined: ${n}`,
          historyNone: "(No history yet; auto-generated after 7 days)",
          exportDownloaded: (n) => `Exported ${n} prompts: JSON backup downloaded to your browser.`,
          exportTextHeader: (n) => `Prompt library export (${n} items):`,
        },
      };
}

export function apply(ctx: Context) {
  const routes = makePromptRoutes();
  // 注册词库助手活动状态机：监听官方会话事件，投影为驱动小人动画的 phase。
  const disposeActivity = registerActivity(ctx);

  // 数据库懒初始化：首次访问数据时自动创建 prompts.db 表，
  // 并在 db 无数据时一次性迁移旧 prompts.json 到 SQLite（导入后删除旧文件）。
  // 失败静默忽略，不影响其他功能，故此处无需显式初始化调用。

  // 确保 AI 人格文件 SOUL.md 存在（缺失时写入默认模板），供 AI 润色/完善/会话组装时遵守。
  ensureSoulFile().catch(() => {});
  // 确保 HARNESS 会话上下文文件存在（~/.dsh/prompt-library/prompts/HARNESS.md），
  // 缺失时写入默认模板；每次发送消息时自动注入当前会话（不进聊天框）。
  ensureHarnessFile().catch(() => {});

  // 把「会话上下文」注入当前聊天：HARNESS 文件内容每次发送都注入（不要求回显）；
  // 人格（实验室开关控制）只对「新会话」注入整个聊天；首次使用再附一句简短欢迎。
  // systemPrompt 服务可用时注册一个动态 prompt section：每次对话组装时，按会话 scope 判断：
  // - HARNESS：恒注入当前会话（内部上下文，不要向用户回显）；
  // - 人格：功能关闭 → 不注入，并把该会话记为既存；开启且是新会话 → 注入 SOUL.md；
  // - 欢迎：只对第一个新会话注入一次简短问候（手册不再打印，用户可用 /prompts -h 查看）。
  ctx.inject(["systemPrompt"], (promptCtx: Context) => {
    // 宿主会把 systemPrompt 服务挂到注入的 ctx 上，但宿主类型未声明，这里作结构化类型转换
    const sp = (promptCtx as unknown as {
      systemPrompt: {
        section: (s: PromptSection) => () => void;
      };
    }).systemPrompt;
    const dispose = sp.section({
      name: "prompt-library-character",
      order: 50,
      text: (context) => {
        const scope = (context as { scope?: unknown } | undefined)?.scope;
        // HARNESS 会话上下文（每次发送注入）+ 人格（实验室开关控制，仅新会话）+ 简短欢迎（仅首次）
        const parts: string[] = [];
        parts.push(harnessSystemSync());
        if (shouldInjectChatCharacter(scope)) parts.push(soulSystemSync());
        const welcome = welcomePromptOnce(scope);
        if (welcome) parts.push(welcome);
        return parts.filter((p) => p.trim()).join("\n\n");
      },
    });
    return () => {
      dispose();
    };
  });

  // 注入 LLM 服务：可用时把 harness 的 AI 能力提供给自学习模块；
  // llm 不可用（如无模型配置）时 AI 完善自动停用，不影响其他功能。
  ctx.inject(["llm"], (llmCtx: Context) => {
    registerLlm(llmCtx.llm);
    logAiInjected(true);
    return () => {
      registerLlm(undefined);
      logAiInjected(false);
    };
  });

  ctx.inject(["webServer"], (httpCtx: Context) => {
    httpCtx.effect(() => {
      const all = [...routes, dataChangedRoute];
      const disposers = all.map((route) => httpCtx.webServer.register(route));
      return () => {
        for (const dispose of disposers) dispose();
      };
    }, "prompt-library: routes");
  });

  // 注册 `/prompts` 斜杠命令：把聊天框里 `/prompts` 后面的内容自动保存到词库，
  // 标题与标签由 AI 依据内容自动判断（复用 autoLearn 的 AI 完善流程；命令触发不发给模型）。
  ctx.inject(["commands"], (cmdCtx: Context) => {
    const commands = (cmdCtx as unknown as {
      commands: {
        register(definition: {
          name: string;
          description: string;
          input?: { hint: string };
          handler: (invocation: { rawInput: string }) => Promise<
            | { kind: "success"; text?: string }
            | { kind: "error"; text: string }
          >;
        }): () => void;
      };
    }).commands;

    // 描述了按宿主界面语言（locale.preference）选择中/英文案；注册前异步读取。
    let dispose: () => void = () => {};
    void readGlobalLocale().then((locale) => {
      const isZh = locale.startsWith("zh") || locale === "";
      const copy = buildCopy(isZh ? "zh" : "en");
      dispose = commands.register({
        name: "prompts",
        description: copy.description,
        input: { hint: copy.hint },
        handler: async (invocation) => {
          const text = (invocation.rawInput ?? "").trim();
          if (!text) {
            // 不带任何命令时，输出各命令示例
            return { kind: "success", text: copy.cmdExamples };
          }
          if (/^-(?:h|help)$/i.test(text) || text === "--help") {
            return { kind: "success", text: copy.help };
          }

          // 首个以 `-` 开头的 token 作为指令，其余为该指令的入参
          const flagMatch = text.match(/^(-\S+)(?:\s+([\s\S]*))?$/);
          if (!flagMatch) {
            return { kind: "error", text: copy.unknownFlag };
          }
          // 归一化指令：大小写不敏感，并支持简化别名
          const flag = flagMatch[1]!.toLowerCase();
          const arg = (flagMatch[2] ?? "").trim();
          const alias: Record<string, string> = {
            "-ai": "ai",
            "-a": "ai",
            "-add": "add",
            "-ad": "add",
            "-t": "tag",
            "-tag": "tag",
            "-s": "search",
            "-en": "enrich",
            "-enrich": "enrich",
            "-e": "export",
            "-exp": "export",
            "-d": "data",
            "-data": "data",
            "-h": "help",
            "-help": "help",
          };
          const cmd = alias[flag] ?? flag;

          // -AI / -a（-a 为简化）：AI 润色后把结果打印到聊天返回，用户自行复制
          if (cmd === "ai") {
            if (!arg) return { kind: "error", text: copy.aiNoInput };
            if (!isAiAvailable()) return { kind: "error", text: copy.aiUnavailable };
            const settings = await getSettings();
            const polished = await polishPromptBody(arg, settings, { keepVariables: false }).catch(() => undefined);
            if (!polished) return { kind: "error", text: copy.aiUnavailable };
            return { kind: "success", text: `\u2501\u2501\u2501 ${copy.aiDone} \u2501\u2501\u2501\n${polished.trim()}\n${"\u2500".repeat(60)}` };
          }

          // -add：保存正文到词库，AI 自动判断标题与标签
          if (cmd === "add") {
            if (!arg) return { kind: "error", text: copy.addEmpty };
            try {
              await autoLearn(arg);
              return { kind: "success", text: copy.saved };
            } catch (e) {
              return { kind: "error", text: `${copy.failed}：${String(e)}` };
            }
          }

          // -tag <标签> <正文>：按指定标签保存到词库
          if (cmd === "tag") {
            const m = arg.match(/^(\S+)\s+([\s\S]+)$/);
            if (!m) return { kind: "error", text: copy.tagEmpty };
            const [, tagName, body] = m;
            try {
              await autoLearn(body.trim(), tagName.trim());
              return { kind: "success", text: copy.saved };
            } catch (e) {
              return { kind: "error", text: `${copy.failed}：${String(e)}` };
            }
          }

          // -s <关键词>：检索词库，列出匹配的提示词
          if (cmd === "search") {
            const keyword = arg.toLowerCase();
            if (!keyword) return { kind: "error", text: copy.searchUsage };
            const prompts = await listPrompts().catch(() => []);
            const matches = prompts.filter(
              (p) =>
                p.title.toLowerCase().includes(keyword) || p.body.toLowerCase().includes(keyword),
            );
            if (matches.length === 0) return { kind: "success", text: copy.searchEmpty };
            const lines = matches.slice(0, 15).map((p, i) => {
              const tag = p.tags?.[0] ? `[${p.tags[0]}]` : "";
              const summary = p.summary ? copy.fmt.summaryPrefix(p.summary) : "";
              return copy.fmt.searchLine(i + 1, p.title, tag, `${p.usageCount}`, summary);
            });
            return {
              kind: "success",
              text: `${copy.fmt.matchCount(matches.length)}\n${lines.join("\n")}`,
            };
          }

          // -enrich <正文>：AI 专业完善（与 -AI 润色完全相反：扩写完善，而非精简润色），
          // 把完善后的正文打印到聊天返回，用户自行复制
          if (cmd === "enrich") {
            if (!arg) return { kind: "error", text: copy.enrichNoInput };
            if (!isAiAvailable()) return { kind: "error", text: copy.aiUnavailable };
            const settings = await getSettings();
            const enriched = await enrichPromptProfessional(arg, settings).catch(() => undefined);
            if (!enriched) return { kind: "error", text: copy.enrichFailed };
            return { kind: "success", text: `\u2501\u2501\u2501 ${copy.enrichDone} \u2501\u2501\u2501\n${enriched.trim()}\n${"\u2500".repeat(60)}` };
          }

          // -e：导出全部提示词。优先把 JSON 备份推送到浏览器本地下载；无订阅者时回退为纯文本聊天输出。
          if (cmd === "export") {
            const backup = await exportPrompts().catch(() => undefined);
            if (!backup) return { kind: "error", text: copy.failed };
            if (backup.prompts.length === 0) return { kind: "success", text: copy.exportEmpty };
            const d = new Date();
            const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            const sent = emitExportDownload(
              `prompt-library-backup-${stamp}.json`,
              JSON.stringify(backup, null, 2),
            );
            if (sent) {
              return {
                kind: "success",
                text: copy.fmt.exportDownloaded(backup.prompts.length),
              };
            }
            const blocks = backup.prompts.map((p) => {
              const tag = p.tags?.[0] ? ` [${p.tags[0]}]` : "";
              return `【${p.title}】${tag}\n${p.body}`;
            });
            return {
              kind: "success",
              text: `${copy.fmt.exportTextHeader(backup.prompts.length)}\n\n${blocks.join("\n\n")}`,
            };
          }

          // -data：输出 prompts.db 的使用统计（复用活力/正文体量/AI完善占比/新增趋势），末尾追加 AI 点评
          if (cmd === "data") {
            const stats = await computeLibraryStats().catch(() => undefined);
            if (!stats) return { kind: "error", text: copy.failed };
            const usedPct = stats.total ? Math.round((stats.usedCount / stats.total) * 100) : 0;
            const f = copy.fmt;
            const lines = [
              f.dataHeader,
              f.dataTotal(stats.total),
              f.dataTotalUsage(stats.totalUsage),
              f.dataUsed(stats.usedCount, stats.unusedCount, usedPct),
              // 精细化统计维度
              f.dataUsageVitality(stats.usedIn7Days, stats.usedIn30Days),
              stats.longestUnused.length ? f.dataSleeping(stats.longestUnused) : "",
              f.dataBodyStats(stats.totalBodyLength, stats.avgBodyLength),
              f.dataAiRefined(stats.aiRefinedCount, stats.aiRefinedPct),
              f.dataAddedTrend(stats.addedIn7Days, stats.addedIn30Days),
              // 原有统计维度
              stats.topUsed.length
                ? `${f.dataTop(stats.topUsed.length)}\n${stats.topUsed
                    .map((p) => f.dataTopItem(p.title, p.usageCount))
                    .join("\n")}`
                : f.dataNoUsage,
              stats.recentUsed.length
                ? f.dataRecent(stats.recentUsed.map((p) => p.title).join(", "))
                : "",
              stats.tagStats.length
                ? f.dataTagDist(stats.tagStats.slice(0, 6).map((t) => `${t.name}(${t.count})`).join(", "))
                : f.dataNoTags,
              f.dataTrash(stats.trashCount),
            ];
            let output = lines.filter((l) => l !== "").join("\n");
            // 结尾追加最近一周统计历史（每 7 天自动统计写入 stats_history 的快照）
            const snap = await getLastStatsSnapshot().catch(() => undefined);
            if (snap) {
              const fmtDate = (t: number) =>
                `${new Date(t).getFullYear()}-${String(new Date(t).getMonth() + 1).padStart(2, "0")}-${String(new Date(t).getDate()).padStart(2, "0")}`;
              const s = snap.stats;
              const his: string[] = [
                `\n${f.historyHeader(fmtDate(snap.createdAt))}`,
                f.historyRange(fmtDate(s.rangeStart), fmtDate(s.rangeEnd)),
                f.historyAdded(s.addedCount),
              ];
              if (s.addedTitles.length) his.push(f.historyAddedTitles(s.addedTitles.join("、")));
              his.push(f.historyUsage(s.usageCount, s.usedPromptCount));
              if (s.topUsed.length) {
                his.push(f.historyTop(s.topUsed.length));
                for (const t of s.topUsed) his.push(f.historyTopItem(t.title, t.count));
              }
              his.push(f.historyAiRefined(s.aiRefinedCount));
              output += his.join("\n");
            } else {
              output += `\n\n${f.historyHeader("")}\n${f.historyNone}`;
            }
            if (isAiAvailable()) {
              const settings = await getSettings();
              const comment = await commentOnStats(output, settings).catch(() => "");
              if (comment) output += `\n\n${f.aiComment}\n${comment}`;
            }
            return { kind: "success", text: output };
          }

          return { kind: "error", text: copy.unknownFlag };
        },
      });
    });
    return () => dispose();
  });

  // —— 版本更新检查：服务启动即查一次，此后每 24 小时复查 ——
  // 正式版（npm）有更新则后台静默升级；测试版（GitHub 领先）只提示用户手动点击更新。
  // 定时器随 disposer 在插件卸载时清理，避免残留。
  void autoUpdateDaily();
  const versionTimer = setInterval(() => {
    void autoUpdateDaily();
  }, 24 * 60 * 60 * 1000);

  // —— 每周自动统计：每 7 天生成一次「近 7 天」统计快照写入 stats_history ——
  // 统计的只是近 7 天的增量数据（新增/使用/AI 完善），避免把历史累计反复重复统计；
  // 不调用 AI 点评（点评仅用于 /prompts -data 的实时全量统计）。
  // 在插件启动时立即检查一次；此后每 24 小时复查一次，距上次快照满 7 天即生成新快照。
  // 定时器随 apply 返回的 disposer 在插件卸载时清理，避免残留。
  const weeklySnapshotTimer = setInterval(() => {
    void checkAndGenerateWeeklySnapshot();
  }, 24 * 60 * 60 * 1000);
  void checkAndGenerateWeeklySnapshot();
  return () => {
    disposeActivity?.();
    if (weeklySnapshotTimer) clearInterval(weeklySnapshotTimer);
    if (versionTimer) clearInterval(versionTimer);
  };
}

/** 一周的毫秒数（与 store 内常量保持一致）。 */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 每 7 天自动统计门控：距上次快照不足 7 天时跳过；
 * 满 7 天（或尚无快照）则生成「近 7 天」统计快照写入 stats_history 表。
 * 任何失败都静默降级，不影响主流程。
 */
async function checkAndGenerateWeeklySnapshot(): Promise<void> {
  try {
    const lastAt = await getLastSnapshotAt().catch(() => 0);
    if (lastAt > 0 && Date.now() - lastAt < WEEK_MS) return;
    const stats = await computeWeeklyStats();
    await saveStatsSnapshot(stats);
  } catch {
    /* 快照失败静默，不影响主流程 */
  }
}