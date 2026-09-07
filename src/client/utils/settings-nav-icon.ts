/**
 * 设置导航图标 — 让 DSH 原生设置界面中「词库」「词库管理」两行的图标
 * 与插件功能语义保持一致（提示词 / 数据库）。
 *
 * DSH 0.1.x 的 settings.section 契约只透传 id / order / label，对每个外部插件
 * 都会在设置导航里渲染同一个通用齿轮图标。这里通过 MutationObserver 找到
 * 文本匹配的导航按钮并打上标记，再由注入的 CSS 隐藏默认齿轮、用 mask 方式
 * 渲染对应 SVG 图标（跟随原生 hover/active 变色）。
 */

/** 词库导航行标记。 */
export const SETTINGS_NAV_MARKER_PROMPT = "data-pl-settings-nav-prompt";
/** 词库管理（数据管理）导航行标记。 */
export const SETTINGS_NAV_MARKER_DATA = "data-pl-settings-nav-data";

/**
 * 与聊天栏提示词按钮完全一致的 SVG（描边式），URL 编码后作为 CSS mask 数据。
 */
const NAV_ICON_MASK_PROMPT =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.6' stroke-linejoin='round'%3E%3Cpath d='M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z'/%3E%3Cpath d='M8 9h3M8 12h3' stroke-linecap='round'/%3E%3C/svg%3E";

/**
 * 数据库管理图标（描边式，lucide database 风格）。
 */
const NAV_ICON_MASK_DATA =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.6' stroke-linejoin='round'%3E%3Cellipse cx='12' cy='5' rx='9' ry='3'/%3E%3Cpath d='M3 5v14a9 3 0 0 0 18 0V5'/%3E%3Cpath d='M3 12a9 3 0 0 0 18 0'/%3E%3C/svg%3E";

/** 注入到 document.head 的样式：隐藏默认齿轮，按标记替换为对应图标。 */
export const SETTINGS_NAV_CSS = `
[${SETTINGS_NAV_MARKER_PROMPT}] > svg:first-child,
[${SETTINGS_NAV_MARKER_DATA}] > svg:first-child {
  display: none;
}
[${SETTINGS_NAV_MARKER_PROMPT}]::before,
[${SETTINGS_NAV_MARKER_DATA}]::before {
  content: '';
  flex: none;
  width: 16px;
  height: 16px;
  background: currentColor;
  -webkit-mask: center / contain no-repeat;
  mask: center / contain no-repeat;
}
[${SETTINGS_NAV_MARKER_PROMPT}]::before {
  -webkit-mask-image: url("${NAV_ICON_MASK_PROMPT}");
  mask-image: url("${NAV_ICON_MASK_PROMPT}");
}
[${SETTINGS_NAV_MARKER_DATA}]::before {
  -webkit-mask-image: url("${NAV_ICON_MASK_DATA}");
  mask-image: url("${NAV_ICON_MASK_DATA}");
}
`;

/**
 * 在设置导航按钮（文本等于指定 section 标签）上打标记，供 CSS 替换图标。
 * @param label 设置 section 的当前标签解析器。
 * @param marker 用于匹配该行的标记名。
 * @returns 清理函数：断开观察并移除已打上的标记。
 */
export function registerSettingsNavIcon(
  label: () => string,
  marker: string,
): () => void {
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
      if (matches) button.setAttribute(marker, "");
      else button.removeAttribute(marker);
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
    document.querySelectorAll(`[${marker}]`).forEach((element) => {
      element.removeAttribute(marker);
    });
  };
}
