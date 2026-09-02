/**
 * 设置按钮上方词库菜单按钮 — 纯 DOM 操作，无 React 依赖。
 *
 * 通过 MutationObserver 找到原生「设置」按钮，在其上方插入按钮，
 * 点击后弹出居中、随屏幕自适应的「左侧导航 + 右侧内容」面板
 * （无蒙层、无标题栏/关闭按钮，再次点击词库按钮可切换关闭）。
 * 面板本身不出现滚动条，右侧内容区由 PromptAssistant 通过 `pl:show-panel-content`
 * 事件将对应功能 Modal 以 container 方式内嵌渲染并自行滚动（嵌入内容不显示关闭按钮）；
 * 词库助手右键菜单打开功能则始终以独立居中蒙层弹窗呈现。
 * 显隐独立于词库助手开关，始终可用。
 */

/** 注入到 document.head 的面板样式。 */
export const SETTINGS_ABOVE_CSS = `
.pl-sa-backdrop{position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.35);backdrop-filter:var(--dsw-mask-blur,blur(12px));-webkit-backdrop-filter:var(--dsw-mask-blur,blur(12px));animation:pl-sa-fade-in .15s ease}
@keyframes pl-sa-fade-in{from{opacity:0}to{opacity:1}}
.pl-sa-panel{position:fixed;z-index:2147483647;background:var(--dsw-specific-sidebar-fill,#f5f6f7);box-shadow:0 10px 32px rgba(2,6,23,.2),0 2px 8px rgba(2,6,23,.1);opacity:0;transition:opacity .15s ease}
.pl-sa-panel-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;flex-shrink:0}
.pl-sa-close-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary,#1f2937);cursor:pointer;transition:background .12s ease}
.pl-sa-close-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}
.pl-sa-sidebar{width:115px;flex-shrink:0;overflow-y:auto;padding:8px 6px}
.pl-sa-nav-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;user-select:none;color:var(--dsw-alias-label-primary,#1f2937);transition:background .12s ease}
.pl-sa-nav-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}
.pl-sa-nav-item.active{background:var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.14))}
.pl-sa-nav-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;flex-shrink:0}
.pl-sa-content-area{flex:1;overflow:hidden;padding:5px;min-width:0;position:relative;display:flex;flex-direction:column}
.pl-sa-content-area > [role="dialog"]{flex:1;min-height:0;display:flex;flex-direction:column}
.pl-sa-content-area > [role="dialog"] > .pl-dialog{flex:1;min-height:0;height:auto}
${PL_DIALOG_CSS}
`;

import { PL_DIALOG_CSS } from "../../utils/dialog-style.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/** 7 个导航项配置。 */
interface NavItem {
  id: string;
  labelKey: string;
  iconBg: string;
  iconColor: string;
  /** 图标内部子元素，与词库助手右键菜单 CtxIcon 同款（16 视口、描边 1.3）。 */
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
  {
    id: "persona",
    labelKey: "pl.ctx.personas",
    iconBg: "rgba(139, 92, 246, .12)",
    iconColor: "#8b5cf6",
    iconBody: '<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12Z"/><path d="M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12Z"/>',
  },
  {
    id: "skill",
    labelKey: "pl.ctx.inject",
    iconBg: "rgba(139, 92, 246, .12)",
    iconColor: "#8b5cf6",
    iconBody: '<path d="M4 5.5h9M4 8.5h5.5M4 11.5h9"/>',
  },
  {
    id: "dashboard",
    labelKey: "pl.ctx.dashboard",
    iconBg: "rgba(37, 99, 235, .12)",
    iconColor: "var(--dsw-alias-brand-primary,#2563eb)",
    iconBody: '<path d="M7 13V7M11 13V9M15 13V4M4 13h15"/>',
  },
  {
    id: "achievement",
    labelKey: "pl.ctx.achievements",
    iconBg: "rgba(217, 119, 6, .14)",
    iconColor: "#b45309",
    iconBody: '<path d="M5.8 2.5h4.4v3a2.2 2.2 0 0 1-4.4 0v-3Z"/><path d="M5.8 3.5H4.2A1.2 1.2 0 0 0 3 4.7v.1a2.6 2.6 0 0 0 2.8 2.6"/><path d="M10.2 3.5h1.6A1.2 1.2 0 0 1 13 4.7v.1a2.6 2.6 0 0 1-2.8 2.6"/><path d="M8 7.4v1.6M6.5 12.2h3M7.2 14h1.6"/>',
  },
  {
    id: "announce",
    labelKey: "pl.ctx.announce",
    iconBg: "rgba(220, 38, 38, .1)",
    iconColor: "var(--dsw-alias-state-error-primary,#dc2626)",
    iconBody: '<path d="M3 8.5V7a1.5 1.5 0 0 1 1.5-1.5h1L10 3.5v9l-4.5-2H4.5A1.5 1.5 0 0 1 3 9v-.5Z"/><path d="M11 6.5a2.6 2.6 0 0 1 0 3"/>',
  },
  {
    id: "dbPreview",
    labelKey: "pl.ctx.dbPreview",
    iconBg: "rgba(13, 148, 136, .12)",
    iconColor: "#0d9488",
    iconBody: '<ellipse cx="8" cy="4" rx="5" ry="1.8"/><path d="M3 4v5.5c0 1 2.2 1.8 5 1.8s5-.8 5-1.8V4"/><path d="M3 9.5V15c0 1 2.2 1.8 5 1.8s5-.8 5-1.8V9.5"/>',
  },
];

/** 各导航项对应的功能类型（与 PromptAssistant panelNavKey 值一致）。 */
const PANEL_TYPE_MAP: Record<string, string> = {
  lexicon: "lexicon",
  importExport: "importExport",
  persona: "persona",
  skill: "skill",
  dashboard: "dashboard",
  achievement: "achievement",
  announce: "announce",
  tags: "tags",
  trash: "trash",
  dbPreview: "dbPreview",
};

let pendingPanelType: string | null = null;

/** 设置面板打开后，向 PromptAssistant 请求渲染对应的内嵌内容。 */
function schedulePanelContent(container: HTMLElement, type: string): void {
  pendingPanelType = type;
  // 微任务：等 React 完成本次渲染后再 dispatch，确保容器已挂载到 DOM
  queueMicrotask(() => {
    window.dispatchEvent(
      new CustomEvent("pl:show-panel-content", {
        detail: { container, key: pendingPanelType },
      }),
    );
    pendingPanelType = null;
  });
}

/**
 * 注册设置按钮上方的词库菜单按钮。
 * @param getTranslation 翻译函数。
 * @param getSettingsEnabled 返回各功能启用状态的函数。
 * @param getEnabled 异步返回左侧词库按钮开关（设置 `settingsAboveMenuEnabled`，默认开启）。
 * @returns 清理函数。
 */
export function registerSettingsAboveMenu(
  getTranslation: (key: string) => string,
  _getSettingsEnabled: () => Record<string, boolean> | Promise<Record<string, boolean>>,
  getEnabled: () => Promise<boolean> = async () => true,
): () => void {
  let disposed = false;
  let panelOpen = false;
  let activeNavId = "lexicon";
  // 按钮开关缓存：异步拉取设置后写入，同步读取避免 Promise 判定失效
  let enabled = true;

  /** 重新拉取按钮开关，并根据状态隐藏/显示。 */
  const refreshEnabled = (): void => {
    Promise.resolve()
      .then(getEnabled)
      .then((v) => {
        if (disposed) return;
        enabled = v;
        const wrap = document.querySelector("[data-pl-sa-wrap]");
        if (!enabled) {
          closePanel();
          if (wrap) wrap.remove();
        } else if (!wrap) {
          doInject();
        }
      })
      .catch(() => {
        /* 拉取失败沿用当前值 */
      });
  };

  const buildPanel = (): HTMLElement => {
    // 遮罩层：点击空白区域关闭
    const backdrop = document.createElement("div");
    backdrop.className = "pl-sa-backdrop";
    backdrop.addEventListener("click", closePanel);
    document.body.appendChild(backdrop);

    // 面板容器：居中显示，尺寸与设置弹窗一致（800x800，随屏幕自适应）
    const panel = document.createElement("div");
    panel.className = "pl-sa-panel";
    panel.style.left = "50%";
    panel.style.top = "50%";
    panel.style.bottom = "auto";
    panel.style.right = "auto";
    panel.style.transform = "translate(-50%, -50%)";
    panel.style.width = "min(850px, calc(100vw - 40px))";
    panel.style.height = "min(800px, calc(100vh - 40px))";
    panel.style.borderRadius = "24px";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.overflow = "hidden";
    panel.addEventListener("click", (e) => e.stopPropagation());
    document.body.appendChild(panel);

    // 头部：标题 + 右侧关闭按钮
    const header = document.createElement("div");
    header.className = "pl-sa-panel-header";
    const titleSpan = document.createElement("span");
    titleSpan.textContent = getTranslation("pl.title");
    titleSpan.style.cssText = "font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2937);";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "pl-sa-close-btn";
    closeBtn.setAttribute("aria-label", getTranslation("pl.close"));
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round"/></svg>';
    closeBtn.addEventListener("click", closePanel);
    header.appendChild(titleSpan);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // 主体区域（侧边栏 + 内容）
    const body = document.createElement("div");
    body.style.cssText = "display:flex;flex:1;min-height:0;overflow:hidden;";
    panel.appendChild(body);

    // 左侧导航栏
    const sidebar = document.createElement("div");
    sidebar.className = "pl-sa-sidebar";
    NAV_ITEMS.forEach((item) => {
      const el = document.createElement("div");
      el.className = "pl-sa-nav-item";
      if (item.id === activeNavId) el.classList.add("active");
      el.dataset.navId = item.id;

      const iconWrap = document.createElement("span");
      iconWrap.className = "pl-sa-nav-icon";
      iconWrap.style.background = item.iconBg;
      iconWrap.style.color = item.iconColor;
      iconWrap.innerHTML = `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${item.iconBody}</svg>`;

      const label = document.createElement("span");
      label.textContent = getTranslation(item.labelKey);
      label.style.cssText = "font-size:13px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";

      el.appendChild(iconWrap);
      el.appendChild(label);
      el.addEventListener("click", () => selectNav(item.id));
      sidebar.appendChild(el);
    });
    body.appendChild(sidebar);

    // 右侧内容区：PromptAssistant 将对应 Modal 内嵌渲染到这里，内容自己滚动
    const contentArea = document.createElement("div");
    contentArea.className = "pl-sa-content-area";
    body.appendChild(contentArea);

    // 向 PromptAssistant 请求渲染内嵌内容
    const type = PANEL_TYPE_MAP[activeNavId];
    if (type) schedulePanelContent(contentArea, type);

    return panel;
  };

  const selectNav = (id: string): void => {
    activeNavId = id;
    // 更新侧边栏激活状态
    const navItems = document.querySelectorAll<HTMLElement>(".pl-sa-nav-item");
    navItems.forEach((el) => {
      el.classList.toggle("active", el.dataset.navId === id);
    });
    // 向 PromptAssistant 请求渲染对应内嵌内容
    const contentArea = document.querySelector(".pl-sa-content-area") as HTMLElement | null;
    if (contentArea) {
      const type = PANEL_TYPE_MAP[id];
      if (type) schedulePanelContent(contentArea, type);
    }
  };

  const closePanel = (): void => {
    panelOpen = false;
    // 通知 PromptAssistant 清除内嵌内容
    window.dispatchEvent(new CustomEvent("pl:hide-panel-content"));
    const panel = document.querySelector(".pl-sa-panel") as HTMLElement | null;
    const backdrop = document.querySelector(".pl-sa-backdrop") as HTMLElement | null;
    if (panel) panel.remove();
    if (backdrop) backdrop.remove();
  };

  const doInject = (): void => {
    if (document.querySelector("[data-pl-sa-wrap]")) return;

    // 开关关闭时隐藏按钮
    if (!enabled) return;

    let settingsBtn = Array.from(document.querySelectorAll<HTMLElement>(
      "button, [role=\"button\"], a, span, div"
    )).find((el) => {
      const text = (el.textContent || "").trim();
      return text === "设置" || text === "Settings";
    });

    if (!settingsBtn) {
      console.debug("[pl-sa] 未找到设置按钮，等待 DOM 加载...");
      return;
    }

    const existing = document.querySelector("[data-pl-sa-wrap]");
    if (existing) existing.remove();

    const wrapper = document.createElement("div");
    wrapper.dataset.plSaWrap = "";
    wrapper.style.cssText = "position:relative;display:flex;flex-direction:column;gap:4px;width:100%;align-items:stretch;overflow:visible;";

    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.title = getTranslation("pl.title");
    menuBtn.style.cssText = [
      "box-sizing:border-box;cursor:pointer;width:calc(100% + 4px);height:42px;",
      "color:var(--dsw-alias-label-primary);background:0 0;border:none;border-radius:12px;",
      "flex:none;align-items:center;gap:8px;margin:4px -2px;padding:0 10px 0 8px;",
      "font-family:inherit;font-size:14px;line-height:22px;display:flex;overflow:hidden;",
      "user-select:none;transition:background .15s ease;outline:none;",
    ].join("");

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    // 与设置面板「词库」导航同款图标（文件/文本式）
    svg.innerHTML = '<path d="M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z"/><path d="M8 9h3M8 12h3"/>';
    menuBtn.appendChild(svg);

    const label = document.createElement("span");
    label.className = "pl-sa-btn-label";
    label.textContent = getTranslation("pl.title");
    label.style.cssText = "font-size:14px;";
    menuBtn.appendChild(label);

    // hover 效果
    menuBtn.addEventListener("mouseenter", () => {
      if (!panelOpen) menuBtn.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.08))";
    });
    menuBtn.addEventListener("mouseleave", () => {
      if (!panelOpen) menuBtn.style.background = "transparent";
    });
    menuBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      menuBtn.style.background = "var(--dsw-alias-interactive-bg-active, rgba(127,127,127,0.14))";
    });
    menuBtn.addEventListener("mouseup", () => {
      if (!panelOpen) menuBtn.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.08))";
    });
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openPanel(menuBtn);
      // 点击后不做「选中高亮」，面板打开状态下按钮保持普通样式
      menuBtn.style.background = "transparent";
    });

    wrapper.appendChild(menuBtn);

    const parent = settingsBtn.parentNode;
    if (parent) parent.insertBefore(wrapper, settingsBtn);
    console.debug("[pl-sa] 词库按钮已注入到设置按钮上方");
  };

  const openPanel = (_btn: HTMLElement): void => {
    // 切换开关：再次点击词库按钮则关闭面板
    if (panelOpen) {
      closePanel();
      return;
    }
    panelOpen = true;
    const panel = buildPanel();
    requestAnimationFrame(() => {
      panel.style.opacity = "1";
    });
  };

  // 立即注入一次
  doInject();

  // 等待 DOM 加载完成后重试
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(doInject, 100));
  } else {
    setTimeout(doInject, 500);
  }

  // MutationObserver
  let observerRunning = false;
  const observer = new MutationObserver((mutations) => {
    if (disposed || observerRunning) return;
    observerRunning = true;
    for (const m of mutations) {
      if (m.type === "childList") {
        for (const node of Array.from(m.addedNodes)) {
          if (node instanceof HTMLElement) {
            const candidates = [node, ...node.querySelectorAll('button, [role="button"], a, span, div')];
            for (const el of candidates) {
              const text = (el.textContent || "").trim();
              if (text === "设置" || text === "Settings") {
                doInject();
                break;
              }
            }
          }
        }
      }
    }
    observerRunning = false;
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 设置变更时重建菜单项（根据启用状态过滤）
  const onSettingsChanged = (_e: Event) => {
    if (disposed) return;
    refreshEnabled();
    // 面板打开时重新构建以反映新的启用状态
    if (panelOpen) {
      const panel = document.querySelector(".pl-sa-panel") as HTMLElement | null;
      if (panel) {
        panel.remove();
        panelOpen = false;
        const btn = document.querySelector("[data-pl-sa-wrap] button") as HTMLElement | null;
        if (btn) openPanel(btn);
      }
    }
  };
  window.addEventListener("pl:settings-changed", onSettingsChanged);

  // 语言切换时刷新菜单按钮文字（已注入的 DOM 不随语言自动更新）
  const langObserver = new MutationObserver(() => {
    if (disposed) return;
    document.querySelectorAll<HTMLElement>(".pl-sa-btn-label").forEach((el) => {
      el.textContent = getTranslation("pl.title");
      const btn = el.closest("button");
      if (btn) btn.title = getTranslation("pl.title");
    });
  });
  langObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang", "class"],
  });

  // 初始拉取一次开关 + 立即注入
  refreshEnabled();
  doInject();

  return () => {
    disposed = true;
    observer.disconnect();
    langObserver.disconnect();
    window.removeEventListener("pl:settings-changed", onSettingsChanged);
    closePanel();
    const wrapper = document.querySelector("[data-pl-sa-wrap]");
    if (wrapper) wrapper.remove();
  };
}
