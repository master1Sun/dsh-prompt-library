/**
 * dsh-prompt-library — 浏览器入口。
 *
 * 注册一个小型语言字典，并将词库按钮放置到
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
// 副作用引入：注册全局 data-tip 主题自适应提示的监听（取代原生 title，适配黑夜/白天模式）
import "./components/common/Tooltip.js";
import { PromptLibraryButton } from "./components/chat/PromptLibraryButton.js";
import { AIPolishButton } from "./components/chat/AIPolishButton.js";
import { ContextRecommendations } from "./components/chat/ContextRecommendations.js";
import { SettingsSection } from "./components/settings/SettingsSection.js";
import { SettingsDataSection } from "./components/settings/SettingsDataSection.js";
import { en, NS, zh } from "./i18n/i18n.js";
import { startDataChangedSubscription } from "./services/data-sync.js";
import {
  registerSettingsNavIcon,
  SETTINGS_NAV_CSS,
  SETTINGS_NAV_MARKER_DATA,
  SETTINGS_NAV_MARKER_PROMPT,
} from "./utils/settings-nav-icon.js";

/** 此插件的 apply 依赖的客户端服务。 */
export const inject = ["slots", "locale"];

/** 我们使用的两个服务的最小 ctx 类型。 */
interface ClientCtx {
  effect(fn: () => unknown, label: string): unknown;
  locale: {
    register(namespace: string, dicts: Record<string, Record<string, string>>): unknown;
    bind(namespace: string): (key: string, params?: Record<string, unknown>) => string;
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
  // 注册完整中英文字典：系统语言切换后自动跟随
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    "prompt-library: dictionaries",
  );
  // 页面加载即建立到 host 的 SSE 订阅，从而在组件挂载前就具备接收
  // `/prompts -AI`（fill-draft）/ `/prompts -e`（export-download）的能力，
  // 避免依赖某个按钮的 useEffect 才建连而漏再接早到的推送。
  ctx.effect(
    () => {
      startDataChangedSubscription();
      return () => {};
    },
    "prompt-library: sse subscription",
  );
  // 绑定命名空间的翻译函数，用于设置导航标签（每次读取当前语言）
  const t = ctx.locale.bind(NS);

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

  // 注册 AI 润色按钮：紧邻词库按钮（order 61），复用同一输入框插槽。
  // AI 能力复用 host 侧 ai.ts（polishPromptBody）。
  ctx.slots.inject("conversation.input.left", () =>
    ctx.slots.register(
      {
        name: "conversation.input.left",
        id: "prompt-library-ai-polish",
        order: 61,
        locale: NS,
      },
      AIPolishButton as (props: unknown) => ReactNode,
    ),
  );

  // 注册上下文提示词推荐：渲染在输入框上方的整行座位（conversation.input.dock），
  // 依据最近聊天上下文推荐匹配的提示词，点击即插入草稿。
  ctx.slots.inject("conversation.input.dock", () =>
    ctx.slots.register(
      {
        name: "conversation.input.dock",
        id: "prompt-library-recommend",
        order: 30,
        locale: NS,
      },
      ContextRecommendations as (props: unknown) => ReactNode,
    ),
  );

  // 设置导航图标：与聊天栏提示词按钮保持一致
  ctx.effect(
    () => {
      // 注入一次样式（幂等，重复 apply 时复用同一个 style 元素）
      let style = document.getElementById("pl-settings-nav-style") as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement("style");
        style.id = "pl-settings-nav-style";
        style.textContent = SETTINGS_NAV_CSS;
        document.head.appendChild(style);
      }
      // 给设置导航中文本为「词库设置」的按钮打标记，替换为提示词图标
      // 给文本为「词库管理」的按钮打标记，替换为数据库图标
      const disposePromptMarker = registerSettingsNavIcon(
        () => t("pl.setSectionTitle"),
        SETTINGS_NAV_MARKER_PROMPT,
      );
      const disposeDataMarker = registerSettingsNavIcon(
        () => t("pl.set.dataSection"),
        SETTINGS_NAV_MARKER_DATA,
      );
      return () => {
        disposePromptMarker();
        disposeDataMarker();
        style?.remove();
      };
    },
    "prompt-library: settings navigation icon",
  );

  // 注册设置面板到 harness 原生设置界面
  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: "prompt-library",
        order: 100,
        locale: NS,
        label: () => t("pl.setSectionTitle"),
      },
      SettingsSection as (props: unknown) => ReactNode,
    ),
  );

  // 注册数据管理面板（独立设置槽位）：导入导出 + 标签集中管理
  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: "prompt-library-data",
        order: 101,
        locale: NS,
        label: () => t("pl.set.dataSection"),
      },
      SettingsDataSection as (props: unknown) => ReactNode,
    ),
  );
}