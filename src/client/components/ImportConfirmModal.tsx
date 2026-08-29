/**
 * 导入前确认弹窗 — 在真正执行导入前，向用户展示待导入内容的详细预览并要求确认。
 *
 * 支持两种展示形态：
 * - 列表形态（rows）：逐条列出待导入条目（标题 + 副标题），用于技能等批量导入；
 * - 单条预览（contentTitle / content）：展示单个条目的标题与正文预览，用于人格文件导入。
 *
 * 弹窗表面直接继承官方浮层（`.pl-dialog`），样式与 ConfirmDialog 一致，仅确认/取消按钮差异。
 */
import { type ReactNode } from "react";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../utils/dialog-style.js";
import { getTone, useThemeSync } from "../utils/theme.js";

export interface ImportConfirmRow {
  /** 条目主标题（技能名或标题）。 */
  title: string;
  /** 条目副标题（摘要等）。 */
  detail?: string;
}

interface Props {
  /** 是否显示弹窗。 */
  open: boolean;
  /** 主标题。 */
  title: string;
  /** 顶部说明文字。 */
  headline: ReactNode;
  /** 列表形态：待导入条目。 */
  rows?: ImportConfirmRow[];
  /** 单条预览形态：内容标题（人名）。 */
  contentTitle?: string;
  /** 单条预览形态：内容正文。 */
  content?: string;
  /** 确认按钮文字。 */
  confirmLabel?: string;
  /** 取消按钮文字。 */
  cancelLabel?: string;
  /** 取消 / 关闭。 */
  onCancel: () => void;
  /** 确认导入。 */
  onConfirm: () => void;
}

const BLOCK = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

export function ImportConfirmModal({
  open,
  title,
  headline,
  rows,
  contentTitle,
  content,
  confirmLabel = "确认导入",
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
    fontFamily: BLOCK,
    transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
  };
  return (
    <>
      <style>{PL_DIALOG_CSS}</style>
      <div className={PL_DIALOG_OVERLAY}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={PL_DIALOG}
          style={{ width: 480, maxWidth: "calc(100vw - 40px)", maxHeight: "min(560px, calc(100vh - 40px))", gap: 12 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 主标题 */}
          <strong style={{ fontSize: 14, fontWeight: 600, color: TONE.text, flexShrink: 0 }}>{title}</strong>

          {/* 顶部说明 */}
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: TONE.quiet,
              background: TONE.accentSoft,
              border: `1px solid ${TONE.border}`,
              borderRadius: 7,
              padding: "7px 10px",
              flexShrink: 0,
            }}
          >
            {headline}
          </div>

          {/* 待导入内容：列表形态或单条预览形态 */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              border: `1px solid ${TONE.border}`,
              borderRadius: 8,
              background: TONE.row,
              padding: 4,
            }}
          >
            {rows
              ? rows.map((r, i) => (
                <div
                  key={`${r.title}-${i}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: i % 2 === 1 ? TONE.panel : "transparent",
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: TONE.text, wordBreak: "break-word" }}>
                    {r.title || "—"}
                  </span>
                  {r.detail ? (
                    <span style={{ fontSize: 11, lineHeight: 1.5, color: TONE.muted, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                      {r.detail}
                    </span>
                  ) : null}
                </div>
              ))
              : (
                <div style={{ padding: "7px 10px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: TONE.text, marginBottom: 6, wordBreak: "break-word" }}>
                    {contentTitle ?? ""}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: TONE.muted,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: BLOCK,
                    }}
                  >
                    {content && content.trim() ? content : "—"}
                  </div>
                </div>
              )}
          </div>

          {/* 底部操作按钮 */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
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
                color: "var(--dsw-alias-brand-primary, #2563eb)",
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
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