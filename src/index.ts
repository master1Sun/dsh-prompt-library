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
import { ensureProfileFile } from "./host/user-profile.js";

export const name = "prompt-library";

/** 没有静态声明的必需服务；webServer 与 llm 按条件注入。 */
export const inject: string[] = [];

export function apply(ctx: Context): void {
  const routes = makePromptRoutes();

  // 启动时确保用户画像文件存在（~/.dsh/prompt-library-user.md），
  // 便于用户确认画像落盘与路径；失败静默忽略，不影响其他功能。
  ensureProfileFile().catch(() => {});

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