import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { usePLT, type PLKey } from "../../utils/i18n.js";
import { LexiconManagerModal } from "./LexiconManagerModal.js";
import { ImportExportModal } from "../import-export/ImportExportModal.js";
import { TagManagePanel } from "./TagManagePanel.js";
import { RecycleManagePanel } from "./RecycleManagePanel.js";
import { PanelHeader } from "../common/PanelHeader.js";
import { OPEN_LIBRARY_EVENT } from "../settings/SettingsMenuLibraryItem.js";
import { PL_DIALOG_CSS } from "../../utils/dialog-style.js";

/**
 * 词库弹窗（居中浮层）。
 *
 * 还原「之前弹窗」形态：点击设置菜单里的「词库」→ 打开一个**居中浮层面板**
 * （半透明遮罩 + 标题栏 + 最大化/还原 + 关闭 + 顶部标签栏 + 内容区），
 * 而非占据中心主面板。
 *
 * 与最初版本不同：内容由本组件**直接自渲染**（复用 LexiconManagerModal /
 * ImportExportModal 的 container 内联模式，以及 TagManagePanel /
 * RecycleManagePanel），不再经 `pl:show-panel-content` 委托给 PromptAssistant
 * （其注册在 conversation.input.dock，仅对话视图挂载，会导致内容空白）。
 *
 * 本组件由入口模块通过 `createRoot(document.body)` 全局挂载，监听
 * `OPEN_LIBRARY_EVENT` 显隐，因此从任意视图（含设置菜单）点击都能弹出。
 */

/** 弹窗外壳样式（遮罩 / 面板 / 标题栏 / 导航 / 内容区）。 */
const LIBRARY_MODAL_CSS = `
.pl-sa-backdrop{position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.35);backdrop-filter:var(--dsw-mask-blur,blur(12px));-webkit-backdrop-filter:var(--dsw-mask-blur,blur(12px));animation:pl-sa-fade-in .15s ease forwards}
@keyframes pl-sa-fade-in{from{opacity:0}to{opacity:1}}
.pl-sa-panel{position:fixed;z-index:2147483647;background:var(--dsw-specific-sidebar-fill,#f5f6f7);box-shadow:0 10px 32px rgba(2,6,23,.2),0 2px 8px rgba(2,6,23,.1);opacity:0;animation:pl-sa-fade-in .15s ease forwards;display:flex;flex-direction:column;overflow:hidden}
.pl-sa-panel-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;flex-shrink:0}
.pl-sa-close-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary,#1f2937);cursor:pointer;transition:background .12s ease}
.pl-sa-close-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}
.pl-sa-tabs{display:flex;align-items:stretch;gap:6px;padding:0 16px 12px;flex-shrink:0}
.pl-sa-tab{display:flex;align-items:center;justify-content:center;gap:7px;flex:1;padding:7px 11px;border-radius:9px;cursor:pointer;user-select:none;color:var(--dsw-alias-label-primary,#1f2937);transition:background .12s ease;white-space:nowrap}
.pl-sa-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}
.pl-sa-tab.active{background:var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.14))}
.pl-sa-tab-icon{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:7px;flex-shrink:0}
.pl-sa-tab-label{font-size:13px}
.pl-sa-content-area{flex:1;overflow:hidden;padding:5px;min-width:0;position:relative;display:flex;flex-direction:column}
.pl-sa-content-area > [role="dialog"]{flex:1;min-height:0;display:flex;flex-direction:column}
.pl-sa-content-area > [role="dialog"] > .pl-dialog{flex:1;min-height:0;height:auto}
${PL_DIALOG_CSS}
`;

/** 导航项配置。 */
interface NavItem {
  id: string;
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
    iconBody: '<path d="M2.8 4.4h10.4"/><path d="M6.2 4.4V2.9c0-.4.3-.7.7-.7h2.2c.4 0 .7.3.7.7v1.5"/><path d="M4.2 4.4l.5 9.3c0 .5.4.9.9.9h4.8c.5 0 .9-.4.9-.9l.5-9.3"/><path d="M6.6 7v4.2M9.4 7v4.2"/>',
  },
];

/** 渲染某个 tab 的图标（供标题行复用，尺寸/位置与数据管理的 BookIcon 一致）。 */
function navIcon(id: string, size: number): ReactNode {
  const item = NAV_ITEMS.find((i) => i.id === id);
  if (!item) return null;
  return (
    <span
      aria-hidden="true"
      style={{ display: "inline-flex", flexShrink: 0, color: item.iconColor }}
      dangerouslySetInnerHTML={{
        __html: `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${item.iconBody}</svg>`,
      }}
    />
  );
}

/** 桌面端宿主在顶部保留 36px 标题条，最大化只铺满其下内容区。 */
function fillDesktopRect(): { left: number; top: number; width: number; height: number } {
  const root = document.getElementById("root");
  const r = root?.getBoundingClientRect();
  if (r && r.width > 0 && r.height > 0) {
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  return { left: 0, top: 36, width: window.innerWidth, height: Math.max(0, window.innerHeight - 36) };
}

function isDesktopMode(): boolean {
  const m = (document.body.getAttribute("data-dsh-desktop-mode") || "").toLowerCase();
  return m === "compatibility" || m === "extended";
}

const MAX_ICON = (on: boolean): string =>
  on
    ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="9" width="10" height="10" rx="2"/><path d="M9 9V5h10v10h-4"/></svg>'
    : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
const CLOSE_ICON =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round"/></svg>';

/**
 * 词库弹窗（全局挂载，默认 null；收到 OPEN_LIBRARY_EVENT 后显示）。
 */
export function LibraryModal(_props: unknown): ReactNode {
  const T = usePLT();
  const [open, setOpen] = useState(false);
  const [activeNavId, setActiveNavId] = useState<string>("lexicon");
  const [maximized, setMaximized] = useState(false);
  // 内容容器用 state 回调 ref 捕获，确保 modal 拿到真实 DOM 节点后再渲染内联内容
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);

  // 监听打开事件（由设置菜单「词库」入口广播）
  useEffect(() => {
    const onOpen = (): void => setOpen(true);
    window.addEventListener(OPEN_LIBRARY_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_LIBRARY_EVENT, onOpen);
  }, []);

  // Esc 关闭（遮罩点击不关闭，与最初行为一致：只能通过关闭按钮或再次点击词库入口关闭）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  // 面板几何：默认居中 850x800，最大化铺满视口（桌面端避开顶部 36px 标题条）
  const panelStyle: CSSProperties = maximized
    ? isDesktopMode()
      ? (() => {
          const r = fillDesktopRect();
          return {
            left: `${r.left}px`,
            top: `${r.top}px`,
            width: `${r.width}px`,
            height: `${r.height}px`,
            transform: "none",
            maxWidth: "none",
            maxHeight: "none",
            borderRadius: 0,
          } as CSSProperties;
        })()
      : ({
          inset: 0,
          width: "auto",
          height: "auto",
          transform: "none",
          maxWidth: "none",
          maxHeight: "none",
          borderRadius: 0,
        } as CSSProperties)
    : ({
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(850px, calc(100vw - 40px))",
        height: "min(800px, calc(100vh - 40px))",
        borderRadius: 24,
        maxWidth: "none",
        maxHeight: "none",
      } as CSSProperties);

  const renderActive = (): ReactNode => {
    switch (activeNavId) {
      case "lexicon":
        return (
          <LexiconManagerModal
            open
            onClose={() => setOpen(false)}
            t={T}
            container={contentEl ?? undefined}
          />
        );
      case "importExport":
        return (
          <ImportExportModal
            open
            onClose={() => setOpen(false)}
            t={T}
            container={contentEl ?? undefined}
          />
        );
      case "tags":
        return (
          <div
            role="dialog"
            aria-label={T("pl.moduleTags")}
            style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
          >
            <div className="pl-dialog" style={{ flex: 1, minHeight: 0, position: "relative" }}>
              <PanelHeader title={T("pl.moduleTags")} desc={T("pl.moduleTagsDesc")} icon={navIcon("tags", 14)} />
              <TagManagePanel t={T} />
            </div>
          </div>
        );
      case "trash":
        return (
          <div
            role="dialog"
            aria-label={T("pl.moduleTrash")}
            style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
          >
            <div className="pl-dialog" style={{ flex: 1, minHeight: 0, position: "relative" }}>
              <PanelHeader title={T("pl.moduleTrash")} desc={T("pl.moduleTrashDesc")} icon={navIcon("trash", 14)} />
              <RecycleManagePanel t={T} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <style>{LIBRARY_MODAL_CSS}</style>
      <div className="pl-sa-backdrop" />
      <div className="pl-sa-panel" style={panelStyle}>
        <header className="pl-sa-panel-header">
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--dsw-alias-label-primary,#1f2937)",
            }}
          >
            {T("pl.title")}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 12 }}>
            <button
              type="button"
              className="pl-sa-close-btn"
              onClick={() => setMaximized((v) => !v)}
              aria-label={T(maximized ? "pl.windowRestore" : "pl.windowMaximize")}
              title={T(maximized ? "pl.windowRestore" : "pl.windowMaximize")}
              dangerouslySetInnerHTML={{ __html: MAX_ICON(maximized) }}
            />
            <button
              type="button"
              className="pl-sa-close-btn"
              onClick={() => setOpen(false)}
              aria-label={T("pl.close")}
              title={T("pl.close")}
              dangerouslySetInnerHTML={{ __html: CLOSE_ICON }}
            />
          </div>
        </header>
        <nav className="pl-sa-tabs">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={"pl-sa-tab" + (item.id === activeNavId ? " active" : "")}
              onClick={() => setActiveNavId(item.id)}
            >
              <span
                className="pl-sa-tab-icon"
                style={{ background: item.iconBg, color: item.iconColor }}
                dangerouslySetInnerHTML={{
                  __html: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${item.iconBody}</svg>`,
                }}
              />
              <span className="pl-sa-tab-label">{T(item.labelKey)}</span>
            </div>
          ))}
        </nav>
        <div className="pl-sa-content-area" ref={setContentEl}>
          {contentEl && renderActive()}
        </div>
      </div>
    </>
  );
}
