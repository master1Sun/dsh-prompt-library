/**
 * 词库助手独立挂载壳：自管理设置加载，渲染浮动词库助手（PromptAssistant）。
 *
 * 词库助手原随 SidebarPromptLibrary 一并挂载；移除该插件后改为独立组件，
 * 由 PromptLibraryButton（composer 插槽）统一挂载。助手仍自管理位置/冒泡/简介，
 * 形象统一为静态鲸鱼娘（whale），不再受「显示词库助手」开关的旧逻辑影响。
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { PluginSettings } from "../../types.js";
import { DEFAULT_SETTINGS } from "../../types.js";
import { getSettings as apiGetSettings } from "../utils/api.js";
import { type PLTranslate } from "../utils/i18n.js";
import { PromptAssistant } from "./PromptAssistant.js";

export function AssistantHost({ t }: { t?: PLTranslate }): ReactNode {
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  const load = useCallback(() => {
    apiGetSettings()
      .then((s) => {
        setSettings(s);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  // 监听设置变更事件，实现保存后立即生效
  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as PluginSettings | undefined;
      if (detail) setSettings(detail);
      else load();
    };
    window.addEventListener("pl:settings-changed", onChanged);
    return () => window.removeEventListener("pl:settings-changed", onChanged);
  }, [load]);

  return <PromptAssistant t={t} settings={settings} settingsReady={ready} />;
}
