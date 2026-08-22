/**
 * dsh-prompt-library — host 入口。
 *
 * 在 /api/prompt-library 下注册 HTTP CRUD 路由，并将提示词持久化到
 * ~/.dsh/prompt-library.json。路由注册依赖于 webServer 是否可用
 *（无头 profile 得到一个空操作插件——那里没有 UI 来驱动）。
 */
import type { Context } from "@deepseek-ai/cordis";
import { makePromptRoutes } from "./host/routes.js";
import { dataChangedRoute, emitFillDraft } from "./host/events.js";
import { autoLearn, getSettings, readGlobalLocale, welcomePromptOnce } from "./host/store.js";
import { isAiAvailable, polishPromptBody, registerLlm, logAiInjected } from "./host/ai.js";
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
            description: "保存内容到提示词库，AI 自动判断标题与标签",
            hint: "输入要保存为提示词的正文",
            empty: "内容为空，未保存",
            saved: "已保存到提示词库",
            failed: "保存失败",
            aiSuffix: "--dsh-prompt-library 为您服务",
            aiNoInput: "请在 -AI 后输入要润色的正文",
            aiUnavailable: "AI 服务不可用，无法润色",
            aiDone: "已 AI 润色并填充到聊天框",
            help: manualZh,
          }
        : {
            description: "Save content to the prompt library; AI decides the title and tags",
            hint: "Enter the prompt body to save",
            empty: "Content is empty, nothing saved",
            saved: "Saved to the prompt library",
            failed: "Failed to save",
            aiSuffix: "--dsh-prompt-library at your service",
            aiNoInput: "Enter the text to polish after -AI",
            aiUnavailable: "AI service is unavailable, polish failed",
            aiDone: "Polished by AI and filled into the chat box",
            help: manualEn,
          };
      dispose = commands.register({
        name: "prompts",
        description: copy.description,
        input: { hint: copy.hint },
        handler: async (invocation) => {
          const text = (invocation.rawInput ?? "").trim();
          if (text === "-h" || text === "-help" || text === "--help") {
            return { kind: "success", text: copy.help };
          }
          // AI 模式：`-AI`/`-ai`/`-a`/`-A` 后的内容先 AI 润色，再连同服务宣言填充到聊天框。
          const flag = text.split(/\s+/, 1)[0];
          if (flag && /^-a(?:i)?$/i.test(flag)) {
            const body = text.slice(flag.length).trim();
            if (!body) return { kind: "error", text: copy.aiNoInput };
            if (!isAiAvailable()) return { kind: "error", text: copy.aiUnavailable };
            const settings = await getSettings();
            const polished = await polishPromptBody(body, settings).catch(() => undefined);
            if (!polished) return { kind: "error", text: copy.aiUnavailable };
            emitFillDraft(`${polished.trim()}\n\n${copy.aiSuffix}`);
            return { kind: "success", text: copy.aiDone };
          }
          if (!text) {
            return { kind: "error", text: copy.empty };
          }
          try {
            await autoLearn(text);
            return { kind: "success", text: copy.saved };
          } catch (e) {
            return { kind: "error", text: `${copy.failed}：${String(e)}` };
          }
        },
      });
    });
    return () => dispose();
  });
}