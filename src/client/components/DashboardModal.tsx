/**
 * 看板弹窗 — 右键词库助手时展示。
 *
 * 内嵌统计可视化面板（StatsPanel），提供词库概览、近 7 天分析、每周趋势、
 * 标签分布与近期/沉睡提示词等统计视角。
 * 交互约束（与人格管理一致）：可通过右上角关闭按钮或点击蒙层空白处关闭。
 */
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { type PLT } from "../utils/i18n.js";
import { StatsPanel } from "./StatsPanel.js";
import { DialogCloseButton } from "./DialogCloseButton.js";
import { BookIcon } from "./BookIcon.js";
import { getTone, useThemeSync } from "../utils/theme.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../utils/dialog-style.js";

interface Props {
  /** 是否显示。 */
  open: boolean;
  /** 关闭弹窗（仅由右上角关闭按钮触发）。 */
  onClose: () => void;
  /** 翻译函数。 */
  t: PLT;
  /** 渲染容器（可选，默认 document.body）。 */
  container?: HTMLElement;
}

/** 居中遮罩看板弹窗。 */
export function DashboardModal({ open, onClose, t, container }: Props): ReactNode {
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pl.ctx.dashboard")}
      className={container ? undefined : PL_DIALOG_OVERLAY}
      onClick={(e) => {
        // 点击蒙层（空白处）关闭；点击对话框内部不关闭
        if (!container && e.target === e.currentTarget) onClose();
      }}
    >
      {!container && <style>{PL_DIALOG_CSS}</style>}
      <div
        className={PL_DIALOG}
        style={{
          ...(container ? {} : { width: 800, height: 800 }),
          maxWidth: "calc(100vw - 40px)",
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 标题 + 关闭按钮（按钮或点击蒙层空白处关闭） */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <strong style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: TONE.text, display: "flex", alignItems: "center", gap: 7 }}>
            <BookIcon color={TONE.accent} size={15} />
            <span style={{ minWidth: 0 }}>{t("pl.ctx.dashboard")}</span>
          </strong>
          {!container && <DialogCloseButton onClick={onClose} label={t("pl.close")} />}
        </div>

        {/* 说明 */}
        <div
          style={{
            marginTop: 10,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: TONE.quiet,
            background: TONE.accentSoft,
            border: `1px solid ${TONE.border}`,
            borderRadius: 7,
            padding: "7px 10px",
            flexShrink: 0,
          }}
        >
          {t("pl.stats.desc")}
        </div>

        {/* 统计可视化面板：内嵌滚动，标题下对齐 */}
        <div style={{ flex: 1, minHeight: 0, marginTop: 10, display: "flex", flexDirection: "column" }}>
          <StatsPanel t={t} />
        </div>
      </div>
    </div>,
    container || document.body,
  );
}