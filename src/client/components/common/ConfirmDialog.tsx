/**
 * 通用确认弹窗：替代系统 confirm()，跟随宿主主题样式。
 *
 * - 固定蒙层 + 居中卡片，含取消 / 确认按钮；
 * - danger 时确认按钮显示为红色，用于删除等危险操作。
 */
import type { CSSProperties, ReactNode } from "react";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
const TEXT = "var(--dsw-alias-label-primary, #1f2937)";
const PANEL = "var(--dsw-specific-sidebar-fill, #f5f6f7)";
const BORDER = "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))";
const RED = "var(--dsw-alias-state-error-primary, #f87171)";

interface Props {
  /** 是否显示弹窗。 */
  open: boolean;
  /** 提示文案。 */
  message: ReactNode;
  /** 危险操作：确认按钮显示为红色。 */
  danger?: boolean;
  /** 确认按钮文字。 */
  confirmLabel?: string;
  /** 取消按钮文字。 */
  cancelLabel?: string;
  /** 取消 / 关闭。 */
  onCancel: () => void;
  /** 确认。 */
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  message,
  danger = false,
  confirmLabel = "确定",
  cancelLabel = "取消",
  onCancel,
  onConfirm,
}: Props): ReactNode {
  if (!open) return null;
  const btn: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    outline: "none",
    height: 28,
    padding: "0 10px",
    fontSize: 12,
    lineHeight: 1,
    borderRadius: 14,
    cursor: "pointer",
    fontFamily: MONO,
    background: "transparent",
    transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
  };
  // 与其他按钮（pl-btn）一致的交互高亮：hover 用官方交互背景 token
  const hover: CSSProperties = {
    background: "var(--dsw-alias-interactive-bg-hover)",
    color: TEXT,
  };
  const hoverAccent: CSSProperties = {
    background: "var(--dsw-alias-interactive-bg-hover)",
  };
  const hoverDanger: CSSProperties = {
    background: "var(--dsw-alias-interactive-bg-hover)",
    color: RED,
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,.32)",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: 360,
          maxWidth: "100%",
          background: PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: "16px 18px",
          boxShadow: "0 8px 32px rgba(0,0,0,.12)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          color: TEXT,
          fontFamily: MONO,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" style={{ ...btn, color: TEXT }} onMouseEnter={(e) => Object.assign(e.currentTarget.style, hover)} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            style={{
              ...btn,
              color: danger ? RED : "var(--dsw-alias-brand-primary, #2563eb)",
              fontWeight: 600,
            }}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, danger ? hoverDanger : hoverAccent)}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}