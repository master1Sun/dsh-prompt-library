/**
 * 词库卡片菜单（官方右侧面板 tab 主体）。
 *
 * 注册于新版右侧面板（`@deepseek-ai/dsh-client-ui-sidebar-right`）的两段式路径：
 *   ① sidebarRightTabs.register({ id, kind, title, guide })
 *   ② slots.register('sidebar.right.pane.tab', key = id)
 * 本组件即 ② 的主体，在官方右侧面板中以「卡片网格」展示词库的功能入口，
 * 取代原先词库助手的右键菜单（右键菜单已移除）。
 * 每张卡片点击后派发 `pl:open-*` 窗口事件，由 PromptAssistant 内的功能弹窗响应打开。
 *
 * 卡片形态参考 QQ 的面板卡片：左图标（彩色圆角底）+ 右侧标题与一行说明，
 * 按容器宽度自适应列数， hover / 按下有与宿主一致的交互反馈。
 */
import { useEffect, useState, type ReactNode } from "react";
import type { PluginSettings } from "../../../types.js";
import { DEFAULT_SETTINGS } from "../../../types.js";
import { getSettings } from "../../utils/api.js";
import { type PLKey, type PLTranslate, usePLT } from "../../utils/i18n.js";

/** 卡片项定义。 */
interface MenuCardItem {
  id: string;
  /** 派发的窗口事件名（PromptAssistant 监听后打开对应弹窗）。 */
  event: string;
  labelKey: PLKey;
  descKey: PLKey;
  /** 图标底色与描边色。 */
  bg: string;
  color: string;
  /** 图标路径（16 视口，描边 1.3）。 */
  icon: ReactNode;
  /** 该功能入口是否展示（由开关设置决定）。 */
  visible: boolean;
}

/** 单张菜单卡片：hover / 按下反馈与宿主交互背景一致。 */
function MenuCard({
  item,
  label,
  desc,
  onOpen,
}: {
  item: MenuCardItem;
  label: string;
  desc: string;
  onOpen: () => void;
}): ReactNode {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setActive(false);
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "10px 11px",
        boxSizing: "border-box",
        borderRadius: 12,
        cursor: "pointer",
        userSelect: "none",
        minWidth: 0,
        border: "1px solid var(--dsw-alias-border-l2, rgba(127, 127, 127, .16))",
        background: hover
          ? "var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, .12))"
          : "var(--dsw-alias-bg-layer-3, rgba(127, 127, 127, .06))",
        transform: active ? "scale(.98)" : "none",
        transition: "background .16s ease, transform .12s ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: 9,
          background: item.bg,
          color: item.color,
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {item.icon}
        </svg>
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            lineHeight: 1.3,
            color: "var(--dsw-alias-label-primary, #1f2937)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 10.5,
            lineHeight: 1.35,
            color: "var(--dsw-alias-label-secondary, #6b7280)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {desc}
        </span>
      </span>
    </div>
  );
}

/** 词库卡片菜单视图（官方右侧面板）。 */
export function AssistantMenuView(props: { t?: PLTranslate }): ReactNode {
  const T = usePLT(props.t);
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);

  // 入口显隐跟随设置；设置保存后（pl:settings-changed）立即同步
  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      getSettings()
        .then((s) => {
          if (!cancelled) setSettings(s);
        })
        .catch(() => {
          /* 读取失败沿用默认值 */
        });
    };
    load();
    const onChanged = (e: Event): void => {
      const detail = (e as CustomEvent).detail as PluginSettings | undefined;
      if (detail) setSettings(detail);
      else load();
    };
    window.addEventListener("pl:settings-changed", onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("pl:settings-changed", onChanged);
    };
  }, []);

  const items: MenuCardItem[] = [
    {
      id: "lexicon",
      event: "pl:open-lexicon",
      labelKey: "pl.ctx.dataManagement",
      descKey: "pl.menu.desc.lexicon",
      bg: "rgba(37, 99, 235, .12)",
      color: "var(--dsw-alias-brand-primary, #2563eb)",
      icon: (
        <>
          <rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1.1" />
          <rect x="8.9" y="2.5" width="4.6" height="4.6" rx="1.1" />
          <rect x="2.5" y="8.9" width="4.6" height="4.6" rx="1.1" />
          <rect x="8.9" y="8.9" width="4.6" height="4.6" rx="1.1" />
        </>
      ),
      visible: settings.rightPanelEnabled ?? DEFAULT_SETTINGS.rightPanelEnabled,
    },
    {
      id: "importExport",
      event: "pl:open-import-export",
      labelKey: "pl.moduleImportExport",
      descKey: "pl.menu.desc.importExport",
      bg: "rgba(37, 99, 235, .12)",
      color: "var(--dsw-alias-brand-primary, #2563eb)",
      icon: <path d="M8 12V4M8 4L5 7M8 4l3 3M8 12l-3-3M8 12l3-3" />,
      visible: settings.dataManagementEnabled ?? DEFAULT_SETTINGS.dataManagementEnabled,
    },
    {
      id: "persona",
      event: "pl:open-persona-manager",
      labelKey: "pl.ctx.personas",
      descKey: "pl.menu.desc.persona",
      bg: "rgba(139, 92, 246, .12)",
      color: "#8b5cf6",
      icon: (
        <>
          <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12Z" />
          <path d="M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12Z" />
        </>
      ),
      visible: settings.personaEnabled ?? DEFAULT_SETTINGS.personaEnabled,
    },
    {
      id: "skill",
      event: "pl:open-skill-manager",
      labelKey: "pl.ctx.inject",
      descKey: "pl.menu.desc.skill",
      bg: "rgba(139, 92, 246, .12)",
      color: "#8b5cf6",
      icon: <path d="M4 5.5h9M4 8.5h5.5M4 11.5h9" />,
      visible: settings.injectEnabled ?? DEFAULT_SETTINGS.injectEnabled,
    },
    {
      id: "dashboard",
      event: "pl:open-dashboard",
      labelKey: "pl.ctx.dashboard",
      descKey: "pl.menu.desc.dashboard",
      bg: "rgba(37, 99, 235, .12)",
      color: "var(--dsw-alias-brand-primary, #2563eb)",
      icon: <path d="M7 13V7M11 13V9M15 13V4M4 13h15" />,
      visible: settings.dashboardEnabled ?? DEFAULT_SETTINGS.dashboardEnabled,
    },
    {
      id: "achievement",
      event: "pl:open-achievement",
      labelKey: "pl.ctx.achievements",
      descKey: "pl.menu.desc.achievement",
      bg: "rgba(217, 119, 6, .14)",
      color: "#b45309",
      icon: (
        <>
          <path d="M5.8 2.5h4.4v3a2.2 2.2 0 0 1-4.4 0v-3Z" />
          <path d="M5.8 3.5H4.2A1.2 1.2 0 0 0 3 4.7v.1a2.6 2.6 0 0 0 2.8 2.6" />
          <path d="M10.2 3.5h1.6A1.2 1.2 0 0 1 13 4.7v.1a2.6 2.6 0 0 1-2.8 2.6" />
          <path d="M8 7.4v1.6M6.5 12.2h3M7.2 14h1.6" />
        </>
      ),
      visible: settings.levelEnabled ?? DEFAULT_SETTINGS.levelEnabled,
    },
    {
      id: "announce",
      event: "pl:open-announcement",
      labelKey: "pl.ctx.announce",
      descKey: "pl.menu.desc.announce",
      bg: "rgba(220, 38, 38, .1)",
      color: "var(--dsw-alias-state-error-primary, #dc2626)",
      icon: (
        <>
          <path d="M3 8.5V7a1.5 1.5 0 0 1 1.5-1.5h1L10 3.5v9l-4.5-2H4.5A1.5 1.5 0 0 1 3 9v-.5Z" />
          <path d="M11 6.5a2.6 2.6 0 0 1 0 3" />
        </>
      ),
      visible: settings.announcementEnabled ?? DEFAULT_SETTINGS.announcementEnabled,
    },
    {
      id: "dbPreview",
      event: "pl:open-db",
      labelKey: "pl.ctx.dbPreview",
      descKey: "pl.menu.desc.dbPreview",
      bg: "rgba(13, 148, 136, .12)",
      color: "#0d9488",
      icon: (
        <>
          <ellipse cx="8" cy="4" rx="5" ry="1.8" />
          <path d="M3 4v5.5c0 1 2.2 1.8 5 1.8s5-.8 5-1.8V4" />
          <path d="M3 9.5V15c0 1 2.2 1.8 5 1.8s5-.8 5-1.8V9.5" />
        </>
      ),
      visible: settings.rightPanelEnabled ?? DEFAULT_SETTINGS.rightPanelEnabled,
    },
    {
      id: "pluginReco",
      event: "pl:open-plugin-reco",
      labelKey: "pl.ctx.pluginReco",
      descKey: "pl.menu.desc.pluginReco",
      bg: "rgba(13, 148, 136, .12)",
      color: "#0d9488",
      icon: (
        <>
          <path d="M3 5.5 8 3l5 2.5v5L8 13 3 10.5Z" />
          <path d="M3 5.5 8 8l5-2.5M8 8v5" />
        </>
      ),
      visible: settings.rightPanelEnabled ?? DEFAULT_SETTINGS.rightPanelEnabled,
    },
  ];

  const visibleItems = items.filter((i) => i.visible);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        height: "100%",
        minHeight: 0,
        padding: 14,
        boxSizing: "border-box",
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--dsw-alias-label-primary, #1f2937)",
          }}
        >
          {T("pl.title")}
        </span>
        <span style={{ fontSize: 11, color: "var(--dsw-alias-label-secondary, #6b7280)" }}>
          {T("pl.menu.hint")}
        </span>
      </div>
      {visibleItems.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 12px",
            textAlign: "center",
            fontSize: 12,
            lineHeight: 1.6,
            color: "var(--dsw-alias-label-tertiary, #9ca3af)",
          }}
        >
          {T("pl.menu.empty")}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))",
            gap: 10,
            alignContent: "start",
            flexShrink: 0,
          }}
        >
          {visibleItems.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              label={T(item.labelKey)}
              desc={T(item.descKey)}
              onOpen={() => {
                try {
                  window.dispatchEvent(new CustomEvent(item.event));
                } catch {
                  /* 事件派发失败忽略 */
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
