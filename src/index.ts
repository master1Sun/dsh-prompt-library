/**
 * dsh-prompt-library — host 入口。
 *
 * 在 /api/prompt-library 下注册 HTTP CRUD 路由，并将提示词持久化到
 * ~/.dsh/prompt-library.json。路由注册依赖于 webServer 是否可用
 *（无头 profile 得到一个空操作插件——那里没有 UI 来驱动）。
 */
import type { Context } from "@deepseek-ai/cordis";
import { makePromptRoutes } from "./host/routes.js";
import { registerLlm, logAiInjected } from "./host/ai.js";
import { characterSystemSync, ensureCharacterFiles, shouldInjectChatCharacter } from "./host/character.js";
import { migrateLegacyIfNeeded } from "./host/store.js";

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

  // 启动时一次性迁移：若旧提示词库 ~/.dsh/prompt-library.json 存在且新文件不存在，
  // 迁移到 ~/.dsh/prompt-library/prompts.json。失败静默忽略，不影响其他功能。
  migrateLegacyIfNeeded().catch(() => {});

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
        if (!shouldInjectChatCharacter(scope)) return "";
        return characterSystemSync();
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
      const disposers = routes.map((route) => httpCtx.webServer.register(route));
      return () => {
        for (const dispose of disposers) dispose();
      };
    }, "prompt-library: routes");
  });
}