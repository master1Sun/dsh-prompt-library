/**
 * 看板弹窗 — 右键词库助手时展示。
 *
 * 内嵌统计可视化面板（StatsPanel），提供词库概览、近 7 天分析、每周趋势、
 * 标签分布与近期/沉睡提示词等统计视角。
 * 交互：点击遮罩/外部区域或右上角关闭按钮均可关闭。
 */
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { type PLT } from "../../i18n/i18n.js";
import { StatsPanel } from "../stats/StatsPanel.js";
import { DialogCloseButton } from "../common/DialogCloseButton.js";
import { getTone, useThemeSync } from "../../utils/theme.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../../utils/dialog-style.js";

interface Props {
  /** 是否显示。 */
  open: boolean;
  /** 关闭弹窗（仅由右上角关闭按钮触发）。 */
  onClose: () => void;
  /** 翻译函数。 */
  t: PLT;
}

/** 居中遮罩看板弹窗。 */
export function DashboardModal({ open, onClose, t }: Props): ReactNode {
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pl.ctx.dashboard")}
      className={PL_DIALOG_OVERLAY}
      onClick={onClose}
    >
      <style>{PL_DIALOG_CSS}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        className={PL_DIALOG}
        style={{
          width: 640,
          maxWidth: "calc(100vw - 40px)",
          height: "min(700px, calc(100vh - 40px))",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 标题 + 关闭按钮（仅通过按钮手动关闭） */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <strong style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 560, color: TONE.text }}>
            {t("pl.ctx.dashboard")}
          </strong>
          <DialogCloseButton onClick={onClose} label={t("pl.close")} />
        </div>

        {/* 统计可视化面板：内嵌滚动，标题下对齐 */}
        <div style={{ flex: 1, minHeight: 0, marginTop: 4, display: "flex", flexDirection: "column" }}>
          <StatsPanel t={t} />
        </div>
      </div>
    </div>,
    document.body,
  );
}