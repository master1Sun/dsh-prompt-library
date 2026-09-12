/**
 * 新版右侧面板（`@deepseek-ai/dsh-client-ui-sidebar-right`）的「打开 tab」能力桥。
 *
 * 组件层拿不到插件 `apply(ctx)` 的 ctx，因此在 apply 时把
 * `ctx.sidebarRight.openTab` 登记到这里，供 React 组件调用。
 */

type OpenTab = (kind: string) => void;

/** 词库面板 tab 的判别符（与客户端入口注册时的 kind 保持一致）。 */
export const PANEL_TAB_KIND = "prompt-library";

let openTabRef: OpenTab | null = null;

/** apply 时登记打开 tab 的能力。 */
export function setOpenTab(fn: OpenTab | null): void {
  openTabRef = fn;
}

/**
 * 打开指定 kind 的右侧面板 tab。
 * @returns 是否成功调用（宿主尚未就绪时返回 false，不抛错）。
 */
export function openPanelTab(kind: string): boolean {
  try {
    openTabRef?.(kind);
    return openTabRef !== null;
  } catch (err) {
    // 尚无挂载的 right-sidebar 座位时会抛错，此处静默降级。
    console.warn("[dsh-prompt-library] openTab failed:", err);
    return false;
  }
}
