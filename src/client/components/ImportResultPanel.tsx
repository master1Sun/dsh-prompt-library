/**
 * 导入/导出结果面板 — 逐条展示每个条目的成功 / 失败 / 跳过状态。
 *
 * 词库导入（ImportEditModal）与技能导入/导出（SkillImportModal）共用，
 * 样式与各弹窗的校验面板一致：顶部标题 + 汇总，下面逐条列出状态标签与标题，
 * 失败条目额外展示原因；底部提供「完成」按钮手动关闭（不响应遮罩点击）。
 */
import type { ReactNode } from "react";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../utils/button-style.js";

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  success: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)",
} as const;

/** 逐条结果的一行：状态标签已本地化，kind 决定着色，error 时可带原因。 */
export interface ImportResultRow {
  title: string;
  /** 已本地化的状态标签（如 导入成功 / 已更新 / 失败）。 */
  label: string;
  kind: "ok" | "updated" | "skipped" | "error";
  /** 失败原因（仅 error 时展示）。 */
  reason?: string;
}

/** 结果状态对应的主题色。 */
function kindColor(kind: ImportResultRow["kind"]): string {
  switch (kind) {
    case "ok":
      return TONE.success;
    case "updated":
      return TONE.accent;
    case "skipped":
      return TONE.quiet;
    case "error":
      return TONE.red;
  }
}

/** 导入/导出结果面板。 */
export function ImportResultPanel(props: {
  /** 面板标题（导入结果 / 导出结果）。 */
  title: string;
  /** 汇总文案（含成功/失败条数）。 */
  summary: string;
  rows: ImportResultRow[];
  onDone: () => void;
  /** 「完成」按钮文案。 */
  doneLabel: string;
}): ReactNode {
  const { title, summary, rows, onDone, doneLabel } = props;
  return (
    <div
      role="status"
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
        background: TONE.row,
        border: `1px solid ${TONE.border}`,
        borderRadius: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13, color: TONE.text }}>{title}</strong>
        <span style={{ fontSize: 12, color: TONE.muted }}>{summary}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          maxHeight: 200,
          overflow: "auto",
          paddingRight: 4,
        }}
      >
        {rows.map((row, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <span style={{ flexShrink: 0, color: kindColor(row.kind), fontWeight: 560 }}>
              {row.label}
            </span>
            <span style={{ minWidth: 0, color: TONE.text, wordBreak: "break-word" }}>
              {row.title}
            </span>
            {row.reason ? (
              <span style={{ minWidth: 0, color: TONE.muted, wordBreak: "break-word" }}>
                （{row.reason}）
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className={plBtn("primary", "sm")}
          onClick={onDone}
        >
          {doneLabel}
        </Button>
      </div>
    </div>
  );
}
