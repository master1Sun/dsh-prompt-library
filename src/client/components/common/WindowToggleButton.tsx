/**
 * 弹窗统一的「最大化 / 还原」切换按钮 — 与关闭按钮（DialogCloseButton）同款视觉与渲染方式。
 *
 * 置于关闭 ✕ 左侧；最大化态显示还原符号（🗗），还原态显示最大化符号（🗖）。
 * 与关闭按钮一致直接用文本字形渲染（U+FE0E 强制文本呈现、继承按钮颜色），
 * 并在可读时渲染为 ✕ 同大的单色字形，规避宿主环境下图标不显示的问题。
 */
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { getTone } from "../../utils/theme.js";

interface Props {
  /** 当前是否处于最大化状态。 */
  maximized: boolean;
  /** 切换最大化 / 还原。 */
  onToggle: () => void;
  /** 悬浮提示 / 无障碍文本（最大化态）。 */
  maximizeLabel: string;
  /** 悬浮提示 / 无障碍文本（还原态）。 */
  restoreLabel: string;
}

/** 弹窗统一最大化 / 还原按钮（🗖 最大化 ↔ 🗗 还原，文本字形渲染）。 */
export function WindowToggleButton({ maximized, onToggle, maximizeLabel, restoreLabel }: Props): ReactNode {
  const TONE = getTone();
  const label = maximized ? restoreLabel : maximizeLabel;
  const glyph = maximized ? "\uD83D\uDDD7\uFE0E" : "\uD83D\uDDD6\uFE0E";
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
        fontSize: 15,
        lineHeight: 1,
        transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
      }}
      onMouseEnter={(e: ReactMouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
        e.currentTarget.style.color = TONE.text;
      }}
      onMouseLeave={(e: ReactMouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = TONE.muted;
      }}
    >
      {glyph}
    </button>
  );
}