/**
 * 词库面板 tab 的 chip 标题 / guide 入口图标。
 *
 * 注册于 `sidebar.right.pane.tab.title`（key = 插件包名）。不注册也可以，
 * 那时 chip 会显示注册表在打开时捕获的 `title(address)` 文本；这里提供一个
 * 自定义标题，便于在多个 tab 中快速辨认。
 *
 * 图标与设置导航里的「词库」行、聊天栏提示词按钮完全一致（描边式书签 + 文本行），
 * 描边落在 `currentColor` 上，可跟随宿主 hover / active 变色。
 */
import type { CSSProperties, ReactNode } from "react";
import { type PLTranslate, usePLT } from "../../utils/i18n.js";

const wrap: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  overflow: "hidden",
  whiteSpace: "nowrap",
};

/**
 * 词库图标（与设置导航 / 聊天栏提示词按钮同一造型）。
 * 作为 React 组件导出，供 guide 入口胶囊复用（宿主按 currentColor 着色）。
 */
export function PromptLibraryGlyph({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0, display: "block" }}
    >
      <path
        d="M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h3M8 12h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 右侧面板 tab 的 chip 标题：词库图标 + 「词库」。 */
export function AssistantMenuTitleView(props: { t?: PLTranslate }): ReactNode {
  const T = usePLT(props.t);
  return (
    <span style={wrap}>
      <PromptLibraryGlyph size={14} />
      {T("pl.view.menu")}
    </span>
  );
}
