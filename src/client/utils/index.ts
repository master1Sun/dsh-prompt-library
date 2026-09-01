/**
 * dsh-prompt-library — 浏览器入口。
 *
 * 注册一个小型语言字典，并将词库按钮放置到
 * `conversation.input.left` 插槽（composer 工具栏行，紧邻已有 chrome）。
 * 注册通过 `ctx.slots.inject` 延迟，直到插槽被 conversation 包声明。
 *
 * 同时将设置面板注册到 `settings.section` 插槽，在 harness 原生设置界面中
 * 显示插件的配置项。
 * 将词库助手注册到页面浮动助手位（见 PromptAssistant）。
 *
 * 此模块以 DSH 客户端模块格式构建到 `lib/client.js`：
 *   window.__ModuleLoader__.load({ id, factory: (require) => {...} })
 * factory 的 `require` 解析注入的运行时包
 *（@deepseek-ai/dsh-client-runtime/client 等）和 react——它们不会被打包。
 */
import { type ReactNode } from "react";
// 副作用引入：注册全局 data-tip 主题自适应提示的监听（取代原生 title，适配黑夜/白天模式）
import "../components/Tooltip.js";
import { PromptLibraryButton } from "../components/PromptLibraryButton.js";
import { AIPolishButton } from "../components/AIPolishButton.js";
import { ContextRecommendations } from "../components/ContextRecommendations.js";
// 会话监控 / 文件预览已拆分为独立插件 dsh-session-monitor，能力代码保留、仅停用注册：
import { TokenMonitorView } from "../components/TokenMonitorView.js";
import { PreviewView } from "../components/PreviewView.js";
import { SettingsSection } from "../components/SettingsSection.js";
import { registerSettingsAboveMenu, SETTINGS_ABOVE_CSS } from "../components/SettingsAboveMenuButton.js";
import { en, NS, zh } from "./i18n.js";
import { startDataChangedSubscription } from "./data-sync.js";
import { registerWorkspaces } from "./workspace-picker.js";
import { getSettings } from "./api.js";
import { registerProducedFileIntercept } from "./preview-target.js";
import {
  registerSettingsNavIcon,
  SETTINGS_NAV_CSS,
  SETTINGS_NAV_MARKER_PROMPT,
} from "./settings-nav-icon.js";

/** 此插件的 apply 依赖的客户端服务。 */
export const inject = ["slots", "locale", "workspaces"];

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
  /** 宿主工作区运行时（由 dsh-client-runtime 提供），提供目录选择与浏览能力。 */
  workspaces: {
    pickDirectory(): Promise<string | null>;
    listDirectory(path?: string, signal?: AbortSignal): Promise<{
      path: string;
      home: string;
      crumbs: { name: string; path: string; hidden: boolean }[];
      entries: { name: string; path: string; hidden: boolean }[];
      truncated: boolean;
    }>;
    createDirectory(path: string, name: string): Promise<string>;
  };
}

export function apply(ctx: ClientCtx): void {
  // 缓存宿主工作区运行时引用，供目录选择（技能导出项目路径）使用
  registerWorkspaces(ctx.workspaces ?? null);

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
  // 拦截官方聊天结果内「产物文件」卡片的点击，改跳自研预览面板打开该文件。
  // 与独立插件 dsh-session-monitor 的接线一致：
  ctx.effect(
    () => registerProducedFileIntercept(),
    "prompt-library: produced-file intercept",
  );
  // 绑定命名空间的翻译函数，用于设置导航标签（每次读取当前语言）
  const t = ctx.locale.bind(NS);

  // 注册 composer 工具栏按钮
  ctx.slots.inject("conversation.input.left", () =>
    ctx.slots.register(
      {
        name: "conversation.input.left",
        id: "prompt-library",
        order: 10,
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
        order: 11,
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
        order: 10,
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
      const disposePromptMarker = registerSettingsNavIcon(
        () => t("pl.setSectionTitle"),
        SETTINGS_NAV_MARKER_PROMPT,
      );
      return () => {
        disposePromptMarker();
        style?.remove();
      };
    },
    "prompt-library: settings navigation icon",
  );

  // 注册会话监控面板：作为会话轨迹旁的独立监控视图标签（conversation.view 插槽）。
  // 已拆分为独立插件 dsh-session-monitor，能力代码保留、仅停用：
  ctx.slots.inject("conversation.view", () =>
    ctx.slots.register(
      {
        name: "conversation.view",
        id: "prompt-library-monitor",
        order: 20,
        locale: NS,
        label: () => t("pl.view.tokenMonitor"),
      },
      TokenMonitorView as (props: unknown) => ReactNode,
    ),
  );
  
  // 注册会话预览面板：读取当前会话工作目录下的 md 文件并渲染预览，
  // 多文件时左侧文件列表 + 右侧正文，正文含大纲时再分左右（大纲 + 正文）。
  ctx.slots.inject("conversation.view", () =>
    ctx.slots.register(
      {
        name: "conversation.view",
        id: "prompt-library-preview",
        order: 21,
        locale: NS,
        label: () => t("pl.view.preview"),
      },
      PreviewView as (props: unknown) => ReactNode,
    ),
  );

  // 注册设置面板到 harness 原生设置界面
  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: "prompt-library",
        order: 30,
        locale: NS,
        label: () => t("pl.setSectionTitle"),
      },
      SettingsSection as (props: unknown) => ReactNode,
    ),
  );

  // 设置按钮上方词库菜单按钮：通过 MutationObserver 找到原生「设置」按钮，在其上方注入同样样式的按钮
  ctx.effect(
    () => {
      // 注入样式
      let style = document.getElementById("pl-settings-above-style") as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement("style");
        style.id = "pl-settings-above-style";
        style.textContent = SETTINGS_ABOVE_CSS;
        document.head.appendChild(style);
      }

      // 注册菜单按钮（纯 DOM 操作，无需 React）
      const dispose = registerSettingsAboveMenu(
        (key) => t(key),
        async () => {
          try {
            const settings = await getSettings();
            return {
              lexicon: settings.rightPanelEnabled ?? true,
              importExport: settings.dataManagementEnabled ?? true,
              persona: settings.personaEnabled ?? true,
              skill: settings.injectEnabled ?? true,
              dashboard: settings.dashboardEnabled ?? true,
              achievement: settings.levelEnabled ?? true,
              announce: settings.announcementEnabled ?? true,
            };
          } catch {
            return { lexicon: true, importExport: true, persona: true, skill: true, dashboard: true, achievement: true, announce: true };
          }
        },
        async () => {
          try {
            const settings = await getSettings();
            return settings.settingsAboveMenuEnabled ?? true;
          } catch {
            return true;
          }
        },
      );
      return () => {
        dispose();
        style?.remove();
      };
    },
    "prompt-library: settings-above menu button",
  );
}