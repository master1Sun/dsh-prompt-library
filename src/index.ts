/**
 * dsh-prompt-library — host 入口。
 *
 * 在 /api/prompt-library 下注册 HTTP CRUD 路由，并将提示词持久化到
 * ~/.dsh/prompt-library.json。路由注册依赖于 webServer 是否可用
 *（无头 profile 得到一个空操作插件——那里没有 UI 来驱动）。
 */
import type { Context } from "@deepseek-ai/cordis";
import { makePromptRoutes } from "./host/routes.js";
import { dataChangedRoute, emitExportDownload } from "./host/events.js";
import {
  autoLearn,
  computeLibraryStats,
  exportPrompts,
  getSettings,
  listPrompts,
  readGlobalLocale,
  welcomePromptOnce,
} from "./host/store.js";
import {
  commentOnStats,
  enrichPromptProfessional,
  isAiAvailable,
  logAiInjected,
  polishPromptBody,
  registerLlm,
} from "./host/ai.js";
import { characterSystemSync, ensureCharacterFiles, shouldInjectChatCharacter } from "./host/character.js";
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
  { flags: "-AI / -a", zh: "AI润色", en: "AI polish", zhExample: "/prompts -AI 请把这段润色得更简洁", enExample: "/prompts -AI make this more concise" },
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

export function apply(ctx: Context): void {
  const routes = makePromptRoutes();

  // 数据库懒初始化：首次访问数据时自动创建 prompts.db 表，
  // 并在 db 无数据时一次性迁移旧 prompts.json 到 SQLite（导入后删除旧文件）。
  // 失败静默忽略，不影响其他功能，故此处无需显式初始化调用。

  // 确保 AI 人格/边界体系（OpenCLaW 式）五维文件存在（SOUL/AGENTS/USER/IDENTITY/MEMORY），
  // 缺失时写入默认模板，供 AI 润色/完善/洞察时遵守这些灵魂边界。
  ensureCharacterFiles().catch(() => {});

  // [实验室功能] 把灵魂边界注入「新会话」整个聊天，约束整个对话；不影响启用前正在进行的对话。
  // systemPrompt 服务可用时注册一个动态 prompt section：每次对话组装时，按会话 scope 判断：
  // - 功能关闭 → 返回空串（不注入），并把该会话记为既存；
  // - 功能开启 → 这个 scope 若是「新会话」（从未见过）才注入五维边界，既存会话返回空串。
  ctx.inject(["systemPrompt"], (promptCtx: Context) => {
    // 宿主会把 systemPrompt 服务挂到注入的 ctx 上，但宿主类型未声明，这里作结构化类型转换
    const sp = (promptCtx as unknown as { systemPrompt: { section: (s: PromptSection) => () => void } }).systemPrompt;
    const dispose = sp.section({
      name: "prompt-library-character",
      order: 50,
      text: (context) => {
        const scope = (context as { scope?: unknown } | undefined)?.scope;
        // 灵魂边界（实验室开关控制）+ 首次使用欢迎（只对第一个新会话注入一次）
        const parts: string[] = [];
        if (shouldInjectChatCharacter(scope)) parts.push(characterSystemSync());
        const welcome = welcomePromptOnce(scope);
        if (welcome) parts.push(welcome);
        return parts.filter((p) => p.trim()).join("\n\n");
      },
    });
    return () => dispose();
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

  // 注册 `/prompts` 斜杠命令：把聊天框里 `/prompts` 后面的内容自动保存到提示词库，
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
      const copy = isZh
        ? {
            description: "保存/润色/完善提示词，并输出词库统计",
            hint: "输入命令或要保存/处理的正文，直接输入 /prompts 可查看命令示例",
            cmdExamples: buildCmdExamples("zh"),
            unknownFlag: buildUnknownFlag("zh"),
            saved: "已保存到提示词库",
            failed: "操作失败",
            addEmpty: "请在 -add 后输入要保存的正文",
            tagEmpty: "用法：/prompts -tag <标签> <正文>",
            searchEmpty: "未找到匹配的提示词",
            searchUsage: "用法：/prompts -s <关键词>（检索词库，支持大小写不敏感）",
            exportEmpty: "词库为空，无内容可导出",
            aiNoInput: "请在 -AI 后输入要润色的正文",
            aiUnavailable: "AI 服务不可用，无法处理",
            aiDone: "已 AI 润色完成，请复制下方内容：",
            enrichNoInput: "请在 -enrich 后输入要完善的正文",
            enrichFailed: "AI 完善失败",
            enrichDone: "已 AI 专业完善（扩写，与 -AI 相反），请复制下方内容：",
            help: manualZh,
            // 命令实际输出文案（-s / -e / -data 等），避免英文环境仍输出中文
            fmt: {
              searchLine: (i: number, title: string, tag: string, usage: string, summary: string) => `${i}. ${title}${tag}（使用${usage}次）${summary}`,
              matchCount: (n: number) => `匹配 ${n} 条：`,
              summaryPrefix: (s: string) => `\n   摘要：${s}`,
              dataHeader: "提示词库数据统计：",
              dataTotal: (n: number) => `- 提示词总数：${n}`,
              dataTotalUsage: (n: number) => `- 累计使用次数：${n}`,
              dataUsed: (used: number, unused: number, pct: number) => `- 曾使用 / 从未使用：${used} / ${unused}（使用率 ${pct}%）`,
              dataTop: (n: number) => `- 最常用 Top ${n}：`,
              dataTopItem: (title: string, count: number) => `    ${title}（${count}次）`,
              dataNoUsage: "- 尚无使用记录",
              dataRecent: (titles: string) => `- 最近使用：${titles}`,
              dataTagDist: (part: string) => `- 标签分布：${part}`,
              dataNoTags: "- 暂无标签",
              dataTrash: (n: number) => `- 回收站条数：${n}`,
              aiComment: "【AI 点评】",
              exportDownloaded: (n: number) => `已导出 ${n} 条提示词：JSON 备份文件已下载到浏览器本地。`,
              exportTextHeader: (n: number) => `提示词库导出（共 ${n} 条）：`,
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
              searchLine: (i: number, title: string, tag: string, usage: string, summary: string) => `${i}. ${title}${tag} (used ${usage} times)${summary}`,
              matchCount: (n: number) => `Matched ${n}: `,
              summaryPrefix: (s: string) => `\n   Summary: ${s}`,
              dataHeader: "Prompt Library Stats:",
              dataTotal: (n: number) => `- Total prompts: ${n}`,
              dataTotalUsage: (n: number) => `- Total usage: ${n}`,
              dataUsed: (used: number, unused: number, pct: number) => `- Used / never used: ${used} / ${unused} (usage rate ${pct}%)`,
              dataTop: (n: number) => `- Top ${n}: `,
              dataTopItem: (title: string, count: number) => `    ${title} (${count} times)`,
              dataNoUsage: "- No usage records",
              dataRecent: (titles: string) => `- Recently used: ${titles}`,
              dataTagDist: (part: string) => `- Tags: ${part}`,
              dataNoTags: "- No tags",
              dataTrash: (n: number) => `- Trash count: ${n}`,
              aiComment: "[AI Review]",
              exportDownloaded: (n: number) => `Exported ${n} prompts: JSON backup downloaded to your browser.`,
              exportTextHeader: (n: number) => `Prompt library export (${n} items):`,
            },
          };
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

          // -data：输出 prompts.db 的使用统计，末尾追加 AI 点评
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
}