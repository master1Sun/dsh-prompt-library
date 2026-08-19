/**
 * dsh-prompt-library — 浏览器入口。
 *
 * 注册一个小型语言字典，并将提示词库按钮放置到
 * `conversation.input.left` 插槽（composer 工具栏行，紧邻已有 chrome）。
 * 注册通过 `ctx.slots.inject` 延迟，直到插槽被 conversation 包声明。
 *
 * 同时将设置面板注册到 `settings.section` 插槽，在 harness 原生设置界面中
 * 显示插件的配置项。
 * 将侧边栏面板注册到 `workspace.right.sidebar` 插槽。
 *
 * 此模块以 DSH 客户端模块格式构建到 `lib/client.js`：
 *   window.__ModuleLoader__.load({ id, factory: (require) => {...} })
 * factory 的 `require` 解析注入的运行时包
 *（@deepseek-ai/dsh-client-runtime/client 等）和 react——它们不会被打包。
 */
import type { ReactNode } from "react";
import { PromptLibraryButton } from "./PromptLibraryButton.js";
import { SettingsSection } from "./SettingsSection.js";

const NS = "prompt-library";

const copy = {
  "pl.title": "提示词库",
  "pl.button": "提示词",
  "pl.search": "搜索…",
  "pl.empty": "暂无提示词",
  "pl.loading": "加载中…",
  "pl.new": "+ 新建",
  "pl.insert": "插入",
  "pl.edit": "编辑",
  "pl.delete": "删除",
  "pl.save": "保存",
  "pl.cancel": "取消",
  "pl.refresh": "刷新",
  "pl.titleField": "标题",
  "pl.bodyField": "正文",
  "pl.tagsField": "标签（逗号分隔）",
  "pl.requireTitleBody": "标题和正文为必填项",
  "pl.confirmDelete": "删除 \"{title}\"？",
};
const zh = copy;
const en = copy;

/** 此插件的 apply 依赖的客户端服务。 */
export const inject = ["slots", "locale"];

/** 我们使用的两个服务的最小 ctx 类型。 */
interface ClientCtx {
  effect(fn: () => unknown, label: string): unknown;
  locale: {
    register(namespace: string, dicts: Record<string, Record<string, string>>): unknown;
  };
  slots: {
    inject(slotName: string, factory: () => () => void): unknown;
    register(
      options: {
        name: string;
        id: string;
        order?: number;
        locale?: string;
        label?: () => string;
        inject?: () => Record<string, unknown>;
      },
      component: (props: unknown) => ReactNode,
    ): () => void;
  };
}

export function apply(ctx: ClientCtx): void {
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    "prompt-library: dictionaries",
  );

  // 注册 composer 工具栏按钮
  ctx.slots.inject("conversation.input.left", () =>
    ctx.slots.register(
      {
        name: "conversation.input.left",
        id: "prompt-library",
        order: 60,
        locale: NS,
      },
      PromptLibraryButton as (props: unknown) => ReactNode,
    ),
  );

  // 注册设置面板到 harness 原生设置界面
  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: "prompt-library",
        order: 100,
        label: () => "提示词库",
      },
      SettingsSection as (props: unknown) => ReactNode,
    ),
  );
}