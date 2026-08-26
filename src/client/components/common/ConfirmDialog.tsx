/**
 * 通用确认弹窗：替代系统 confirm()，跟随宿主主题样式。
 *
 * - 固定蒙层 + 居中卡片，含取消 / 确认按钮；
 * - danger 时确认按钮显示为红色，用于删除等危险操作。
 *
 * 弹窗表面直接继承官方浮层（`.pl-dialog`，圆角 / 底色 / 边框 / 投影与官方逐字一致，
 * 见 dialog-style.ts），不再内联重写；按钮对齐官方 Button 的 `pl-btn--sm`（高 28、
 * 圆角 14、hover 官方交互背景）。
 */
import type { ReactNode } from "react";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../../utils/dialog-style.js";
import { getTone, useThemeSync } from "../../utils/theme.js";

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
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  if (!open) return null;
  const TONE = getTone();
  // 按钮统一胶囊式（`pl-btn--sm` 同款口径）：默认透明、hover 出现官方交互背景
  const btn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--dsw-alias-border-l2)",
    outline: "none",
    height: 28,
    padding: "0 10px",
    fontSize: 12,
    lineHeight: 1,
    borderRadius: 14,
    cursor: "pointer",
    background: "transparent",
    transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
  };
  return (
    <>
      <style>{PL_DIALOG_CSS}</style>
      <div className={PL_DIALOG_OVERLAY}>
        <div
          role="dialog"
          aria-modal="true"
          className={PL_DIALOG}
          style={{ width: 360, maxWidth: "100%", gap: 14 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{message}</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              style={{ ...btn, color: TONE.text }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              style={{
                ...btn,
                color: danger ? RED : "var(--dsw-alias-brand-primary, #2563eb)",
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                // hover 仅染背景，文字色保留确认色（危险=红 / 常规=品牌色）
                e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}