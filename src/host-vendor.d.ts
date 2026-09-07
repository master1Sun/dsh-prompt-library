/**
 * 宿主运行时模块的最小类型声明。
 *
 * DSH 桌面端自带的宿主包（cordis / dsh-llm / dsh-host-webserver）随应用分发、
 * 只有 JS 实现没有 .d.ts，开发环境下通过 app.asar.unpacked 的 node_modules 解析。
 * 这里按本项目实际用到的形状写最小结构化声明，消除 TS7016 / TS2709。
 *
 * 注意：这是「按用到的面」写的窄声明，不是官方完整类型；宿主服务在运行时
 * 仍统一通过 ctx.inject + as 断言访问，缺的形状靠索引签名兜底为宽松类型。
 */
import type { IncomingMessage, ServerResponse } from "node:http";

declare module "@deepseek-ai/cordis" {
  /** Cordis 上下文：inject 等待服务注入；服务槽位通过索引签名宽松访问。 */
  export interface Context {
    inject(
      services: readonly string[],
      callback: (ctx: Context) => unknown,
      name?: string,
    ): unknown;
    effect(fn: () => (() => void) | void, name?: string): unknown;
    /** 服务槽位（llm / webServer / sessionQuery / commands / systemPrompt …）。 */
    [key: string]: any;
  }
}

declare module "@deepseek-ai/dsh-llm" {
  export interface LlmModelInfo {
    id: string;
    name?: string;
    [key: string]: unknown;
  }

  export interface LlmProviderInfo {
    id: string;
    name?: string;
    [key: string]: unknown;
  }

  /** harness LLM 运行时：provider / model 枚举与生成调用。 */
  export interface LlmRuntime {
    listProviders(): LlmProviderInfo[];
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    [key: string]: any;
  }

  export interface GenerateOptions {
    provider?: string;
    model?: string;
    messages: unknown[];
    [key: string]: unknown;
  }

  /** 消息块的流式收集器：push 增量、finish 取结束原因、blocks 取全部块。 */
  export declare class BlockAssembler {
    constructor();
    push(chunk: unknown): void;
    readonly finish: { kind: string; [key: string]: unknown };
    blocks(): Array<{ type: string; text?: string; [key: string]: unknown }>;
  }

  export declare function createUserMessage(
    msg: {
      content: Array<{ type: string; text?: string; [key: string]: unknown }>;
      source?: { kind: string; plugin?: string; [key: string]: unknown };
      [key: string]: unknown;
    },
  ): any;
}

declare module "@deepseek-ai/dsh-host-webserver" {
  /** 宿主 webServer 路由：kind=prefix 时按 path 前缀分发。 */
  export interface WebRoute {
    kind: string;
    path: string;
    handler(req: IncomingMessage, res: ServerResponse): void | Promise<void>;
    [key: string]: unknown;
  }
}
