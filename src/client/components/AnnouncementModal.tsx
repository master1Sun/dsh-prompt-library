/**
 * 公告弹窗 — 双击词库助手时展示。
 *
 * 内容分两块：插件使用手册（要点列表）与通告（版本/更新说明）。
 * 通告内容实时读取：打开时若设置了远程公告地址（设置 → 公告通告），
 * 通过 host 接口拉取远程 manual/notice；失败或未配置时回退内置 i18n 文案。
 * 与其它弹窗交互保持一致：只能通过右上角关闭按钮或底部「知道了」按钮关闭，
 * 禁止点击遮罩/外部区域关闭。
 */
import { type CSSProperties, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../utils/button-style.js";
import { type PLT } from "../i18n/i18n.js";
import { getAnnouncement, type AnnouncementData } from "../services/api.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
} as const;

/** 区块小标题样式。 */
const sectionTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: TONE.text,
  marginBottom: 8,
};

/** 手册条目图标：小型对勾。 */
function CheckIcon(): ReactNode {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      style={{ flexShrink: 0, color: TONE.accent, marginTop: 3 }}
      aria-hidden="true"
    >
      <path
        d="M3 8.5l3.2 3.2L13 4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface Props {
  /** 是否显示。 */
  open: boolean;
  /** 关闭弹窗（仅由关闭按钮 / 「知道了」按钮触发）。 */
  onClose: () => void;
  /** 翻译函数。 */
  t: PLT;
}

/** 使用手册条目对应的 i18n 键（按顺序展示）。 */
const MANUAL_KEYS = [
  "pl.announce.manual.0",
  "pl.announce.manual.1",
  "pl.announce.manual.2",
  "pl.announce.manual.3",
  "pl.announce.manual.4",
] as const;

/** 居中遮罩公告弹窗：使用手册 + 通告。 */
export function AnnouncementModal({ open, onClose, t }: Props): ReactNode {
  // 远程通告内容：打开时拉取；拉取成功（source=remote）则用它覆盖展示
  const [remote, setRemote] = useState<AnnouncementData | null>(null);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setRemote(null); // 重新打开时先回退默认展示，再等远程返回
    getAnnouncement()
      .then((data) => {
        if (alive) setRemote(data);
      })
      .catch(() => {
        /* 拉取失败保持默认展示 */
      });
    return () => {
      alive = false;
    };
  }, [open]);

  if (!open) return null;

  // 手册条目：远程提供 manual 时优先，否则回退内置 i18n
  const manualItems: string[] =
    remote?.source === "remote" && remote.manual && remote.manual.length > 0
      ? remote.manual
      : MANUAL_KEYS.map((key) => t(key));
  // 通告正文：远端有内容时显示内容，否则显示「暂无通告」
  const noticeText: string =
    remote?.source === "remote" && remote.notice ? remote.notice : t("pl.announce.noNotice");

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pl.announce.title")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: "calc(100vw - 40px)",
          maxHeight: "min(560px, calc(100vh - 40px))",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          background: TONE.panel,
          border: `1px solid ${TONE.borderStrong}`,
          borderRadius: 12,
          padding: "18px 20px",
          color: TONE.text,
          fontFamily: MONO,
        }}
      >
        {/* 标题行 + 右上角关闭按钮 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <strong style={{ flex: 1, fontSize: 15, fontWeight: 600, color: TONE.text }}>
            {t("pl.announce.title")}
          </strong>
          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </Button>
        </div>

        {/* 内容区：超出最大高度时独立滚动 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            paddingTop: 14,
            paddingBottom: 4,
          }}
        >
          {/* 使用手册 */}
          <section>
            <div style={sectionTitleStyle}>{t("pl.announce.manualTitle")}</div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {manualItems.map((item, idx) => (
                <li
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: 12.5,
                    lineHeight: 1.6,
                    color: TONE.muted,
                    background: TONE.row,
                    border: `1px solid ${TONE.border}`,
                    borderRadius: 7,
                    padding: "7px 10px",
                  }}
                >
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 通告 */}
          <section>
            <div style={sectionTitleStyle}>{t("pl.announce.noticeTitle")}</div>
            <div
              style={{
                fontSize: 12.5,
                lineHeight: 1.7,
                color: TONE.muted,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: TONE.row,
                border: `1px solid ${TONE.border}`,
                borderRadius: 7,
                padding: "9px 11px",
              }}
            >
              {noticeText}
            </div>
          </section>
        </div>

        {/* 底部按钮：仅「知道了」可关闭 */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, flexShrink: 0 }}>
          <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={onClose}>
            {t("pl.announce.dismiss")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
