/**
 * 「词库」独立面板 —— 由「设置 → 词库设置」页里的入口卡片弹出。
 *
 * 为什么是独立面板而不是内嵌折叠项：这套 UI（数据管理 / 导入导出 / 标签 / 回收站）是按
 * ~800px 宽度设计的，内嵌进设置页那条 520px 的内容列后，列表与详情两栏被同时压扁，
 * 实际观感就是「太小了」。因此改成点击入口后弹出居中浮层，尺寸与插件内其它弹窗一致
 * （850×800，可最大化，走 `PL_DIALOG_CSS` 里的官方浮层表面）。
 *
 * 与上游实现的差异：
 * 1. 不再用 MutationObserver 往宿主「设置」按钮上方注入按钮 —— 那会让同一个按钮同时长在
 *    设置导航顶部和侧边栏左下角菜单里，且无法只关一处；
 * 2. 不再经 `pl:show-panel-content` / `pl:hide-panel-content` 窗口事件 + PromptAssistant
 *    中转，四项功能直接渲染，因此不依赖会话页是否挂载；
 * 3. 由设置页入口触发，而不是常驻在宿主侧边栏中。
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { type PLKey, type PLTranslate, usePLT } from "../../utils/i18n.js";
import {
  PL_DIALOG,
  PL_DIALOG_CSS,
  PL_DIALOG_MAX,
  PL_DIALOG_OVERLAY,
  PL_DIALOG_OVERLAY_MAX,
} from "../../utils/dialog-style.js";
import { getTone, useThemeSync } from "../../utils/theme.js";
import { DialogCloseButton } from "../common/DialogCloseButton.js";
import { PanelHeader } from "../common/PanelHeader.js";
import { LexiconManagerModal } from "../data/LexiconManagerModal.js";
import { ImportExportModal } from "../import-export/ImportExportModal.js";
import { TagManagePanel } from "../data/TagManagePanel.js";
import { RecycleManagePanel } from "../data/RecycleManagePanel.js";

/** 导航项（沿用上游浮动面板的四项与配色）。 */
interface NavItem {
  id: string;
  /** i18n 键（用 PLKey 收窄，保证 T(labelKey) 类型安全）。 */
  labelKey: PLKey;
  iconBg: string;
  iconColor: string;
  /** 图标内部子元素（16 视口、描边 1.3）。 */
  iconBody: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "lexicon",
    labelKey: "pl.ctx.dataManagement",
    iconBg: "rgba(37, 99, 235, .12)",
    iconColor: "var(--dsw-alias-brand-primary,#2563eb)",
    iconBody: '<rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1.1"/><rect x="8.9" y="2.5" width="4.6" height="4.6" rx="1.1"/><rect x="2.5" y="8.9" width="4.6" height="4.6" rx="1.1"/><rect x="8.9" y="8.9" width="4.6" height="4.6" rx="1.1"/>',
  },
  {
    id: "importExport",
    labelKey: "pl.moduleImportExport",
    iconBg: "rgba(37, 99, 235, .12)",
    iconColor: "var(--dsw-alias-brand-primary,#2563eb)",
    iconBody: '<path d="M8 12V4M8 4L5 7M8 4l3 3M8 12l-3-3M8 12l3-3"/>',
  },
  {
    id: "tags",
    labelKey: "pl.ctx.tags",
    iconBg: "rgba(234, 88, 12, .12)",
    iconColor: "#ea580c",
    iconBody: '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h4.6c.4 0 .8.15 1.1.44l7 6.1a1.6 1.6 0 0 1 0 2.34l-5.7 5.7a1.6 1.6 0 0 1-2.34 0l-6.1-7A2.5 2.5 0 0 1 3 9.1V5.5Z"/><circle cx="7.4" cy="7.4" r="1.2"/>',
  },
  {
    id: "trash",
    labelKey: "pl.ctx.trash",
    iconBg: "rgba(220, 38, 38, .1)",
    iconColor: "var(--dsw-alias-state-error-primary,#dc2626)",
    iconBody: '<path d="M5 6.5h14M9 6.5V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8v1.7M6.5 6.5l.7 12a1 1 0 0 0 1 .9h7.6a1 1 0 0 0 1-.9l.7-12M9.5 10v5M14.5 10v5"/>',
  },
];

/** 默认尺寸（与上游浮动面板一致，随视口自适应）。 */
const PANEL_WIDTH = 850;
const PANEL_HEIGHT = 800;
const PANEL_SHADOW = "0 10px 32px rgba(2,6,23,.2), 0 2px 8px rgba(2,6,23,.1)";

/**
 * 面板样式：内嵌内容区的布局契约 + Tab 样式 + 官方浮层表面。
 * 内嵌态下 Modal 不会自己注入 PL_DIALOG_CSS，所以这里必须带上。
 */
const PANEL_CSS = `
.pl-lib-content{flex:1;min-width:0;min-height:0;overflow:hidden;padding:5px;position:relative;display:flex;flex-direction:column}
.pl-lib-content > [role="dialog"]{flex:1;min-height:0;display:flex;flex-direction:column}
.pl-lib-content > [role="dialog"] > .pl-dialog{flex:1;min-height:0;height:auto}
.pl-lib-tab{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:8px;flex:1 0 auto;padding:7px 12px;border:none;border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer;user-select:none;white-space:nowrap;transition:background .12s ease}
.pl-lib-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}
.pl-lib-tab[aria-selected="true"]{background:var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.14))}
${PL_DIALOG_CSS}
`;

/**
 * 最大化 / 还原按钮 —— 内联 SVG 图标，与上游那个浮动面板同款。
 *
 * 不用共享的 WindowToggleButton：它渲染的是文本字形 🗖 / 🗗（U+1F5D6 / U+1F5D7），
 * 在宿主环境里缺字体时会被回退成一个「≡」似的怪符号（见 issue：图标样式不对）。
 * ViewBox 24、描边 1.7，与上游 `buildPanel` 里手写的图标逐字一致。
 */
function MaximizeButton(props: {
  maximized: boolean;
  onToggle: () => void;
  maximizeLabel: string;
  restoreLabel: string;
}): ReactNode {
  const { maximized, onToggle, maximizeLabel, restoreLabel } = props;
  const TONE = getTone();
  const label = maximized ? restoreLabel : maximizeLabel;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      data-tip={label}
      style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        border: "none",
        outline: "none",
        borderRadius: 6,
        background: "transparent",
        color: TONE.muted,
        cursor: "pointer",
        transition:
          "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
        e.currentTarget.style.color = TONE.text;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = TONE.muted;
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {maximized ? (
          <>
            <rect x="5" y="9" width="10" height="10" rx="2" />
            <path d="M9 9V5h10v10h-4" />
          </>
        ) : (
          <rect x="5" y="5" width="14" height="14" rx="2" />
        )}
      </svg>
    </button>
  );
}

/** 按导航项渲染对应功能：能内嵌的 Modal 交给 container，纯面板直接渲染。 */
function renderModule(
  key: string,
  T: ReturnType<typeof usePLT>,
  host: HTMLElement,
  onRequestClose: () => void,
): ReactNode {
  switch (key) {
    case "lexicon":
      return <LexiconManagerModal open onClose={onRequestClose} t={T} container={host} />;
    case "importExport":
      return <ImportExportModal open onClose={onRequestClose} t={T} container={host} />;
    case "tags":
      return (
        <>
          <PanelHeader title={T("pl.moduleTags")} desc={T("pl.moduleTagsDesc")} />
          <TagManagePanel t={T} />
        </>
      );
    case "trash":
      return (
        <>
          <PanelHeader title={T("pl.moduleTrash")} desc={T("pl.moduleTrashDesc")} />
          <RecycleManagePanel t={T} />
        </>
      );
    default:
      return null;
  }
}

/**
 * 「词库」独立面板：居中浮层 + 顶部四 Tab + 内嵌功能区。
 * 关闭方式：右上角 ✕ 或 Esc（遮罩点击不关闭，与本插件其它弹窗约定一致，避免误触丢失编辑）。
 */
export function LibraryPanelModal(props: {
  open: boolean;
  onClose: () => void;
  t?: PLTranslate;
}): ReactNode {
  const { open, onClose, t } = props;
  const T = usePLT(t);
  const TONE = getTone();
  useThemeSync();
  const [activeKey, setActiveKey] = useState<string>(NAV_ITEMS[0]!.id);
  const [maximized, setMaximized] = useState(false);
  // 内嵌 Modal 需要真实 DOM 容器：ref 回调拿到元素后再渲染，避免首帧传 null 落到 document.body
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  const close = useCallback((): void => {
    onClose();
  }, [onClose]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // 关闭后复位，下次打开回到默认 Tab / 非最大化
  useEffect(() => {
    if (!open) {
      setMaximized(false);
      setActiveKey(NAV_ITEMS[0]!.id);
      setHost(null);
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T("pl.title")}
      className={maximized ? `${PL_DIALOG_OVERLAY} ${PL_DIALOG_OVERLAY_MAX}` : PL_DIALOG_OVERLAY}
    >
      <style>{PANEL_CSS}</style>
      <div
        className={maximized ? `${PL_DIALOG} ${PL_DIALOG_MAX}` : PL_DIALOG}
        style={
          maximized
            ? { boxShadow: PANEL_SHADOW }
            : {
                width: PANEL_WIDTH,
                height: PANEL_HEIGHT,
                maxWidth: "calc(100vw - 40px)",
                maxHeight: "calc(100vh - 40px)",
                boxShadow: PANEL_SHADOW,
              }
        }
      >
        {/* 标题行：标题 + 最大化 + 关闭 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            padding: "0 2px 8px",
          }}
        >
          <strong
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 15,
              fontWeight: 600,
              color: TONE.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {T("pl.title")}
          </strong>
          <MaximizeButton
            maximized={maximized}
            onToggle={() => setMaximized((v) => !v)}
            maximizeLabel={T("pl.windowMaximize")}
            restoreLabel={T("pl.windowRestore")}
          />
          <DialogCloseButton onClick={close} label={T("pl.close")} />
        </div>

        {/* 顶部横向 Tab：四项功能 */}
        <div
          role="tablist"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
            padding: "2px 0 10px",
            borderBottom: `1px solid ${TONE.border}`,
            overflowX: "auto",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = item.id === activeKey;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className="pl-lib-tab"
                style={{ color: TONE.text }}
                onClick={() => setActiveKey(item.id)}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    flexShrink: 0,
                    background: item.iconBg,
                    color: item.iconColor,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${item.iconBody}</svg>`,
                  }}
                />
                <span>{T(item.labelKey)}</span>
              </button>
            );
          })}
        </div>

        {/* 功能内容区：撑满剩余高度，内容自行滚动 */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div className="pl-lib-content" ref={setHost}>
            {host ? renderModule(activeKey, T, host, close) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
