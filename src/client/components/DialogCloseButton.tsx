/**
 * 弹窗统一的右上角关闭按钮 — 与导入导出弹窗保持一致。
 *
 * 26×26 无边框方形，hover 时显示交互背景；仅由鼠标操作触发关闭，
 * 禁止任何点击遮罩/外部区域关闭的逻辑。
 */
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { getTone } from "../utils/theme.js";

interface Props {
  /** 点击关闭回调。 */
  onClick: () => void;
  /** 无障碍标签/悬浮提示文案（如「关闭」）。 */
  label?: string;
}

/** 弹窗统一关闭按钮（✕）。 */
export function DialogCloseButton({ onClick, label = "关闭" }: Props): ReactNode {
  const TONE = getTone();
  return (
    <button
      type="button"
      onClick={onClick}
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
      ✕
    </button>
  );
}