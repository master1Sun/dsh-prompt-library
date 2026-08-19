/**
 * 设置导航图标 — 让 DSH 原生设置界面中「提示词库」一行的图标与聊天栏提示词按钮保持一致。
 *
 * DSH 0.1.x 的 settings.section 契约只透传 id / order / label，对每个外部插件
 * 都会在设置导航里渲染同一个通用齿轮图标。这里通过 MutationObserver 找到
 * 文本匹配「提示词库」的设置导航按钮并打上标记，再由注入的 CSS 隐藏默认齿轮、
 * 用 mask 方式渲染与聊天栏一致的提示词 SVG 图标（跟随原生 hover/active 变色）。
 */

export const SETTINGS_NAV_MARKER = "data-prompt-library-settings-nav";

/**
 * 与聊天栏提示词按钮完全一致的 SVG（描边式），URL 编码后作为 CSS mask 数据。
 */
const NAV_ICON_MASK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.6' stroke-linejoin='round'%3E%3Cpath d='M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z'/%3E%3Cpath d='M8 9h3M8 12h3' stroke-linecap='round'/%3E%3C/svg%3E";

/** 注入到 document.head 的样式：隐藏默认齿轮，替换为提示词图标。 */
export const SETTINGS_NAV_CSS = `
[${SETTINGS_NAV_MARKER}] > svg:first-child {
  display: none;
}
[${SETTINGS_NAV_MARKER}]::before {
  content: '';
  flex: none;
  width: 16px;
  height: 16px;
  background: currentColor;
  -webkit-mask: url("${NAV_ICON_MASK}") center / contain no-repeat;
  mask: url("${NAV_ICON_MASK}") center / contain no-repeat;
}
`;

/**
 * 在设置导航按钮（文本等于当前 section 标签）上打标记，供 CSS 替换图标。
 * @param label 设置 section 的当前标签解析器。
 * @returns 清理函数：断开观察并移除已打上的标记。
 */
export function registerSettingsNavIcon(label: () => string): () => void {
  let disposed = false;

  const sync = (): void => {
    if (disposed) return;
    const currentLabel = label().trim();
    const buttons = document.querySelectorAll<HTMLButtonElement>(
      '[role="dialog"] nav button',
    );
    for (const button of buttons) {
      const matches =
        currentLabel.length > 0 && button.textContent?.trim() === currentLabel;
      if (matches) button.setAttribute(SETTINGS_NAV_MARKER, "");
      else button.removeAttribute(SETTINGS_NAV_MARKER);
    }
  };

  sync();
  const observer = new MutationObserver(sync);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return () => {
    disposed = true;
    observer.disconnect();
    document
      .querySelectorAll(`[${SETTINGS_NAV_MARKER}]`)
      .forEach((element) => {
        element.removeAttribute(SETTINGS_NAV_MARKER);
      });
  };
}
