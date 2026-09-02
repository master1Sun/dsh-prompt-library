/**
 * 通用翻页组件 — 用于提示词列表分页展示。
 *
 * 展示上一页/下一页与当前页码，样式跟随宿主主题 token。
 * 当总页数 <= 1 时渲染 null，不占位。
 */
import type { ReactNode } from "react";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";

const TONE = {
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
} as const;

export function Pagination({
  page,
  totalPages,
  onChange,
  prevLabel,
  nextLabel,
  textColor,
}: {
  /** 当前页码，从 1 开始 */
  page: number;
  /** 总页数 */
  totalPages: number;
  /** 翻页回调 */
  onChange: (p: number) => void;
  /** 上一页文案（i18n），默认「‹ 上一页」 */
  prevLabel?: string;
  /** 下一页文案（i18n），默认「下一页 ›」 */
  nextLabel?: string;
  /** 文字颜色覆盖，用于暗色浮层场景；默认使用组件内定义色 */
  textColor?: string;
}): ReactNode {
  if (totalPages <= 1) return null;
  const text = textColor ?? TONE.text;
  return (
    <div
      style={{
        padding: "8px 12px",
        borderTop: `1px solid ${TONE.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 12, color: text }}>
        {page} / {totalPages}
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <Button
          type="button"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          style={{ color: text }}
        >
          {prevLabel ?? "\u2039 上一页"}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          style={{ color: text }}
        >
          {nextLabel ?? `下一页 \u203A`}
        </Button>
      </div>
    </div>
  );
}