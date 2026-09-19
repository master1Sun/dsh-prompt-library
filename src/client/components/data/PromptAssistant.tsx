/**
 * 词库功能弹窗宿主（挂载壳）。
 *
 * 左侧「词库菜单」（SettingsAboveMenuButton）经 `pl:show-panel-content`
 * 窗口事件把对应功能（数据管理 / 导入导出 / 标签 / 回收站 / 工作区指令）
 * 的 Modal 内嵌渲染到面板内容区；设置面板关闭时经
 * `pl:hide-panel-content` 清除内嵌内容。
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { type PLTranslate, usePLT } from "../../utils/i18n.js";

import { PromptInjectPanel } from "../persona-skill/PromptInjectPanel.js";
import { PersonaManagerModal } from "../persona-skill/PersonaManagerModal.js";
import { ImportExportModal } from "../import-export/ImportExportModal.js";
import { LexiconManagerModal } from "./LexiconManagerModal.js";
import { TagManagePanel } from "./TagManagePanel.js";
import { RecycleManagePanel } from "./RecycleManagePanel.js";
import { PanelHeader } from "../common/PanelHeader.js";

export function PromptAssistant({ t }: { t?: PLTranslate }): ReactNode {
  const T = usePLT(t);

  // ── 设置面板内嵌模式：将 Modal 渲染到面板内容区而非独立弹窗 ──
  const panelContainerRef = useRef<HTMLElement | null>(null);
  const [panelNavKey, setPanelNavKey] = useState<string | null>(null);
  const closePanelContent = useCallback(() => {
    setPanelNavKey(null);
    panelContainerRef.current = null;
  }, []);

  useEffect(() => {
    // 设置面板内嵌模式：在面板内容区直接渲染 Modal
    const onPanelContent = (e: Event) => {
      const custom = e as CustomEvent<{ container: HTMLElement; key: string }>;
      panelContainerRef.current = custom.detail.container;
      setPanelNavKey(custom.detail.key);
    };
    window.addEventListener("pl:show-panel-content", onPanelContent);

    // 设置面板关闭时清除内嵌内容
    const onHidePanelContent = () => {
      closePanelContent();
      panelContainerRef.current = null;
    };
    window.addEventListener("pl:hide-panel-content", onHidePanelContent);

    return () => {
      window.removeEventListener("pl:show-panel-content", onPanelContent);
      window.removeEventListener("pl:hide-panel-content", onHidePanelContent);
    };
  }, [closePanelContent]);

  const panelContentPortal =
    panelNavKey && panelContainerRef.current
      ? createPortal(
          (() => {
            switch (panelNavKey) {
              case "lexicon":
                return (
                  <LexiconManagerModal
                    open
                    onClose={closePanelContent}
                    t={T}
                    container={panelContainerRef.current}
                  />
                );
              case "importExport":
                return (
                  <ImportExportModal
                    open
                    onClose={closePanelContent}
                    t={T}
                    container={panelContainerRef.current}
                  />
                );
              case "persona":
                return (
                  <PersonaManagerModal
                    open
                    onClose={closePanelContent}
                    t={T}
                    container={panelContainerRef.current}
                  />
                );
              case "workspaceInstructions":
                return (
                  <PromptInjectPanel
                    open
                    onClose={closePanelContent}
                    t={T}
                    container={panelContainerRef.current}
                  />
                );
              case "tags":
                return (
                  <>
                    <PanelHeader
                      title={T("pl.moduleTags")}
                      desc={T("pl.moduleTagsDesc")}
                    />
                    <TagManagePanel t={T} />
                  </>
                );
              case "trash":
                return (
                  <>
                    <PanelHeader
                      title={T("pl.moduleTrash")}
                      desc={T("pl.moduleTrashDesc")}
                    />
                    <RecycleManagePanel t={T} />
                  </>
                );
              default:
                return null;
            }
          })(),
          panelContainerRef.current,
        )
      : null;

  return panelContentPortal;
}
