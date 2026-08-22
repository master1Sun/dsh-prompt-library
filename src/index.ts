/**
 * dsh-prompt-library — host 入口。
 *
 * 在 /api/prompt-library 下注册 HTTP CRUD 路由，并将提示词持久化到
 * ~/.dsh/prompt-library.json。路由注册依赖于 webServer 是否可用
 *（无头 profile 得到一个空操作插件——那里没有 UI 来驱动）。
 */
import type { Context } from "@deepseek-ai/cordis";
import { makePromptRoutes } from "./host/routes.js";
import { dataChangedRoute, emitExportDownload, emitFillDraft } from "./host/events.js";
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
            cmdExamples: [
              "/prompts 可用命令（不区分大小写，可写简化别名）：",
              "  -add / -ad 保存： /prompts -add 把这段好的提示词保存下来",
              "  -tag / -t 按标签保存： /prompts -tag 写作 请写一段产品介绍",
              "  -s 检索： /prompts -s 写作",
              "  -enrich / -en AI专业完善： /prompts -enrich 请把这段完善得更全面专业",
              "  -e / -exp 导出： /prompts -e",
              "  -data / -d 统计： /prompts -data",
              "  -AI / -a AI润色： /prompts -AI 请把这段润色得更简洁",
              "  -h 帮助： /prompts -h",
            ].join("\n"),
            unknownFlag: "未知指令。可用：-add/-ad 保存 / -AI/-a 润色 / -s 检索 / -tag/-t 按标签保存 / -enrich/-en AI专业完善 / -e/-exp 导出 / -data/-d 统计 / -h 帮助",
            saved: "已保存到提示词库",
            failed: "操作失败",
            addEmpty: "请在 -add 后输入要保存的正文",
            tagEmpty: "用法：/prompts -tag <标签> <正文>",
            searchEmpty: "未找到匹配的提示词",
            exportEmpty: "词库为空，无内容可导出",
            aiSuffix: "--dsh-prompt-library 为您服务",
            aiNoInput: "请在 -AI 后输入要润色的正文",
            aiUnavailable: "AI 服务不可用，无法处理",
            aiDone: "已 AI 润色并填充到聊天框",
            enrichNoInput: "请在 -enrich 后输入要完善的正文",
            enrichFailed: "AI 完善失败",
            enrichSuffix: "--dsh-prompt-library 更专业",
            enrichDone: "已 AI 专业完善并填充到聊天框（扩写完善，与 -AI 润色相反）",
            help: manualZh,
          }
        : {
            description: "Save/polish/enrich prompts and output library stats",
            hint: "Enter a command or the body to save/process; type /prompts alone to see command examples",
            cmdExamples: [
              "/prompts available commands (case-insensitive, shorter aliases ok):",
              "  -add / -ad save: /prompts -add save this great prompt",
              "  -tag / -t save with tag: /prompts -tag writing write a product intro",
              "  -s search: /prompts -s writing",
              "  -enrich / -en AI professional enrichment: /prompts -enrich make this more comprehensive and professional",
              "  -e / -exp export: /prompts -e",
              "  -data / -d stats: /prompts -data",
              "  -AI / -a AI polish: /prompts -AI make this more concise",
              "  -h help: /prompts -h",
            ].join("\n"),
            unknownFlag: "Unknown command. Available: -add/-ad save / -AI/-a polish / -s search / -tag/-t save with tag / -enrich/-en professional enrich / -e/-exp export / -data/-d stats / -h help",
            saved: "Saved to the prompt library",
            failed: "Operation failed",
            addEmpty: "Enter the body to save after -add",
            tagEmpty: "Usage: /prompts -tag <tag> <body>",
            searchEmpty: "No matching prompts found",
            exportEmpty: "The library is empty, nothing to export",
            aiSuffix: "--dsh-prompt-library at your service",
            aiNoInput: "Enter the text to polish after -AI",
            aiUnavailable: "AI service is unavailable, cannot process",
            aiDone: "Polished by AI and filled into the chat box",
            enrichNoInput: "Enter the body to enrich after -enrich",
            enrichFailed: "AI enrichment failed",
            enrichSuffix: "--dsh-prompt-library more professional",
            enrichDone: "Professionally enriched by AI and filled into the chat box (expands, opposite of -AI polish)",
            help: manualEn,
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

          // -AI / -a（-a 为简化）：AI 润色后连同服务宣言填充到聊天框
          if (cmd === "ai") {
            if (!arg) return { kind: "error", text: copy.aiNoInput };
            if (!isAiAvailable()) return { kind: "error", text: copy.aiUnavailable };
            const settings = await getSettings();
            const polished = await polishPromptBody(arg, settings, { keepVariables: false }).catch(() => undefined);
            if (!polished) return { kind: "error", text: copy.aiUnavailable };
            emitFillDraft(`${polished.trim()}\n\n${copy.aiSuffix}`);
            return { kind: "success", text: copy.aiDone };
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
            if (!keyword) return { kind: "error", text: copy.unknownFlag };
            const prompts = await listPrompts().catch(() => []);
            const matches = prompts.filter(
              (p) =>
                p.title.toLowerCase().includes(keyword) || p.body.toLowerCase().includes(keyword),
            );
            if (matches.length === 0) return { kind: "success", text: copy.searchEmpty };
            const lines = matches.slice(0, 15).map((p, i) => {
              const tag = p.tags?.[0] ? `[${p.tags[0]}]` : "";
              const usage = `${p.usageCount}次`;
              const summary = p.summary ? `\n   摘要：${p.summary}` : "";
              return `${i + 1}. ${p.title} ${tag}（使用${usage}）${summary}`;
            });
            return {
              kind: "success",
              text: `匹配 ${matches.length} 条：\n${lines.join("\n")}`,
            };
          }

          // -enrich <正文>：AI 专业完善（与 -AI 润色完全相反：扩写完善，而非精简润色），
          // 把完善后的正文连同服务宣言填充到聊天框
          if (cmd === "enrich") {
            if (!arg) return { kind: "error", text: copy.enrichNoInput };
            if (!isAiAvailable()) return { kind: "error", text: copy.aiUnavailable };
            const settings = await getSettings();
            const enriched = await enrichPromptProfessional(arg, settings).catch(() => undefined);
            if (!enriched) return { kind: "error", text: copy.enrichFailed };
            emitFillDraft(`${enriched.trim()}\n\n${copy.enrichSuffix}`);
            return { kind: "success", text: copy.enrichDone };
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
                text: `已导出 ${backup.prompts.length} 条提示词：JSON 备份文件已下载到浏览器本地。`,
              };
            }
            const blocks = backup.prompts.map((p) => {
              const tag = p.tags?.[0] ? ` [${p.tags[0]}]` : "";
              return `【${p.title}】${tag}\n${p.body}`;
            });
            return {
              kind: "success",
              text: `提示词库导出（共 ${backup.prompts.length} 条）：\n\n${blocks.join("\n\n")}`,
            };
          }

          // -data：输出 prompts.db 的使用统计，末尾追加 AI 点评
          if (cmd === "data") {
            const stats = await computeLibraryStats().catch(() => undefined);
            if (!stats) return { kind: "error", text: copy.failed };
            const usedPct = stats.total ? Math.round((stats.usedCount / stats.total) * 100) : 0;
            const lines = [
              "提示词库数据统计：",
              `- 提示词总数：${stats.total}`,
              `- 累计使用次数：${stats.totalUsage}`,
              `- 曾使用 / 从未使用：${stats.usedCount} / ${stats.unusedCount}（使用率 ${usedPct}%）`,
              stats.topUsed.length
                ? `- 最常用 Top ${stats.topUsed.length}：\n${stats.topUsed
                    .map((p) => `    ${p.title}（${p.usageCount}次）`)
                    .join("\n")}`
                : "- 尚无使用记录",
              stats.recentUsed.length
                ? `- 最近使用：${stats.recentUsed.map((p) => p.title).join("、")}`
                : "",
              stats.tagStats.length
                ? `- 标签分布：${stats.tagStats.slice(0, 6).map((t) => `${t.name}(${t.count})`).join("、")}`
                : "- 暂无标签",
              `- 回收站条数：${stats.trashCount}`,
            ];
            let output = lines.filter((l) => l !== "").join("\n");
            if (isAiAvailable()) {
              const settings = await getSettings();
              const comment = await commentOnStats(output, settings).catch(() => "");
              if (comment) output += `\n\n【AI 点评】\n${comment}`;
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