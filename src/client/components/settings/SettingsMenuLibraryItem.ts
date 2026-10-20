/**
 * 左下角账户菜单中的「词库」入口 — 纯 DOM 注入，无 React 依赖。
 *
 * 宿主（dsh-client-ui-settings-account）的账户菜单是写死的 [设置, 意见反馈,
 * 退出/登录]，未暴露扩展插槽。这里通过 MutationObserver 在菜单打开时找到
 * 「设置」这一行（`div[role="menu"] button[role="menuitem"]`），克隆其 DOM
 * 结构（因此完全继承原生菜单项的样式与 hover 效果），把图标与文字换成词库，
 * 插入到「设置」**下方**。
 *
 * 点击后先关闭账户菜单，再广播 `pl:open-library-panel`，由全局挂载的
 * LibraryModal 以浮层弹窗形式打开。
 */

/** 词库图标（24 视口，与 LibraryRailIcon / 设置导航图标同款）。 */
const LIBRARY_ICON_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z"/><path d="M8 9h3M8 12h3"/></svg>';

/** 注入项标记，避免重复插入。 */
const MARKER = "data-pl-menu-library";

/** 打开词库弹窗的窗口事件（由全局挂载的 LibraryModal 监听）。 */
export const OPEN_LIBRARY_EVENT = "pl:open-library-panel";

/** 判断某菜单项是否为「设置」（兼容右侧附带快捷键提示的渲染）。 */
function isSettingsItem(item: HTMLElement): boolean {
  // 优先看内部 span 是否有一段纯「设置」文本（label），避免被快捷键污染
  for (const sp of item.querySelectorAll<HTMLElement>("span")) {
    const text = (sp.textContent || "").trim();
    if (text === "设置" || text === "Settings") return true;
  }
  // 兜底：整行以「设置 / Settings」开头（可能后接 Ctrl+… 快捷键）
  const full = (item.textContent || "").trim();
  return full.startsWith("设置") || full.startsWith("Settings");
}

/** 找到账户菜单里「设置」的 label span（用于替换文字）。 */
function findLabelSpan(btn: HTMLElement): HTMLElement | null {
  for (const sp of btn.querySelectorAll<HTMLElement>("span")) {
    const text = (sp.textContent || "").trim();
    if (text === "设置" || text === "Settings") return sp;
  }
  // 结构兜底：[icon span, label span]
  const second = btn.children[1];
  return second instanceof HTMLElement ? second : null;
}

/** 在账户菜单里找到「设置」菜单项（含中英文）。 */
function findSettingsItem(): HTMLElement | null {
  const items = document.querySelectorAll<HTMLElement>(
    'div[role="menu"] button[role="menuitem"]',
  );
  for (const item of items) {
    if (isSettingsItem(item)) return item;
  }
  return null;
}

/** 关闭当前展开的账户菜单：点触发器切回关闭态；找不到触发器时用 Escape 兜底。 */
function closeAccountMenu(): void {
  const trigger = document.querySelector<HTMLElement>(
    'button[aria-haspopup="menu"][aria-expanded="true"]',
  );
  if (trigger) {
    // 触发器的 onClick 是 setOpen(v => !v)，此刻必为打开态，点击即关闭
    trigger.click();
    return;
  }
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

/**
 * 注册账户菜单中的词库入口。
 * @param getLabel 返回词库显示名（随语言变化）。
 * @param getEnabled 异步返回是否显示该入口（设置项 `settingsAboveMenuEnabled`）。
 * @returns 清理函数。
 */
export function registerSettingsMenuLibraryItem(
  getLabel: () => string,
  getEnabled: () => Promise<boolean> = async () => true,
): () => void {
  let disposed = false;
  let enabled = true;
  let rafId = 0;

  const removeItem = (): void => {
    document.querySelectorAll<HTMLElement>(`[${MARKER}]`).forEach((el) => el.remove());
  };

  const inject = (): void => {
    if (disposed || !enabled) return;
    // 已注入（菜单仍打开）则只刷新文字（相等则跳过，避免 childList 变更引发观察器自循环）
    const existing = document.querySelector<HTMLElement>(`[${MARKER}]`);
    if (existing) {
      const exBtn = existing.querySelector<HTMLElement>('button[role="menuitem"]');
      const label = exBtn ? findLabelSpan(exBtn) : null;
      const next = getLabel();
      if (label && label.textContent !== next) label.textContent = next;
      return;
    }

    const settingsBtn = findSettingsItem();
    if (!settingsBtn) return;
    // 菜单项外层（div.itemWrap）；克隆它以保证分隔线/间距与原生一致
    const settingsWrap = settingsBtn.parentElement;
    if (!settingsWrap || !settingsWrap.parentElement) return;

    const wrap = settingsWrap.cloneNode(true) as HTMLElement;
    wrap.setAttribute(MARKER, "");
    const btn = wrap.querySelector<HTMLButtonElement>('button[role="menuitem"]');
    if (!btn) return;
    btn.removeAttribute("disabled");
    btn.removeAttribute("aria-keyshortcuts");
    // 克隆可能带「设置」的快捷键提示/勾选标记，剔除非 icon/label 的节点
    const iconSpan = (btn.children[0] as HTMLElement | undefined) ?? null;
    const labelSpan = findLabelSpan(btn);
    for (const child of Array.from(btn.children)) {
      if (child !== iconSpan && child !== labelSpan) child.remove();
    }
    if (iconSpan) iconSpan.innerHTML = LIBRARY_ICON_SVG;
    if (labelSpan) labelSpan.textContent = getLabel();
    btn.title = getLabel();
    btn.setAttribute("aria-label", getLabel());

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAccountMenu();
      window.dispatchEvent(new CustomEvent(OPEN_LIBRARY_EVENT));
    });

    // 插到「设置」下方（menu 列表内）
    settingsWrap.insertAdjacentElement("afterend", wrap);
  };

  const scheduleInject = (): void => {
    if (rafId || disposed) return;
    // 等 portal 完成这一帧渲染后再找菜单项
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      inject();
    });
  };

  const refreshEnabled = (): void => {
    void Promise.resolve()
      .then(getEnabled)
      .then((v) => {
        if (disposed) return;
        enabled = v;
        if (!enabled) removeItem();
        else scheduleInject();
      })
      .catch(() => {
        /* 拉取失败沿用当前值 */
      });
  };

  // 账户菜单是 portal，打开瞬间触发器 aria-expanded 变为 true；
  // 只监听该属性变化（而非整棵 body 的 childList），避免聊天流式更新时高频回调。
  const observer = new MutationObserver((mutations) => {
    if (disposed) return;
    for (const m of mutations) {
      if (m.type !== "attributes" || m.attributeName !== "aria-expanded") continue;
      const el = m.target as HTMLElement;
      if (el.getAttribute("aria-expanded") === "true") {
        scheduleInject();
        return;
      }
    }
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["aria-expanded"],
    subtree: true,
  });

  const onSettingsChanged = (): void => {
    refreshEnabled();
    scheduleInject();
  };
  window.addEventListener("pl:settings-changed", onSettingsChanged);

  refreshEnabled();
  scheduleInject();

  return () => {
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    observer.disconnect();
    window.removeEventListener("pl:settings-changed", onSettingsChanged);
    removeItem();
  };
}
