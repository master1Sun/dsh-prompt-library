/**
 * 公告弹窗 — 右键词库助手时展示。
 *
 * 内容为使用手册（插件核心能力要点）+ 版本说明（优先当前运行版本对应的更新说明，
 * 当前版本无内置说明时回退到最新一个版本；数据来自 host/services/update/version-notes.ts）。
 * 与其它弹窗交互保持一致：只能通过右上角关闭按钮或底部「知道了」按钮关闭，
 * 禁止点击遮罩/外部区域关闭。
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../utils/button-style.js";
import { type PLT } from "../../i18n/i18n.js";
import {
  getAnnouncement,
  type AnnouncementData,
  type VersionEntry,
} from "../../services/api.js";
import { getTone, useThemeSync } from "../../utils/theme.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

/** 手册条目图标：小型对勾。 */
function CheckIcon(): ReactNode {
  const TONE = getTone();
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

/** 版本要点条目图标：小菱形点。 */
function BulletIcon(): ReactNode {
  const TONE = getTone();
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      style={{ flexShrink: 0, color: TONE.accent, marginTop: 8 }}
      aria-hidden="true"
    >
      <path d="M4 0 L8 4 L4 8 L0 4 Z" fill="currentColor" />
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

/** 使用手册对应的 i18n 键（按顺序展示），若 host 返回值缺失时回退使用。 */
const MANUAL_KEYS = [
  "pl.announce.manual.0",
  "pl.announce.manual.1",
  "pl.announce.manual.2",
  "pl.announce.manual.3",
  "pl.announce.manual.4",
  "pl.announce.manual.5",
] as const;

/** 归一化语言：zh / en。 */
function currentLang(): "zh" | "en" {
  const raw =
    (typeof document !== "undefined" ? document.documentElement.lang : "") ||
    (typeof navigator !== "undefined" ? navigator.language : "zh") ||
    "zh";
  return raw.toLowerCase().startsWith("en") ? "en" : "zh";
}

/** 居中遮罩公告弹窗。 */
export function AnnouncementModal({ open, onClose, t }: Props): ReactNode {
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();
  // 区块小标题样式（跟随当前主题）
  const sectionTitleStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: TONE.text,
    marginBottom: 8,
  };
  // 打开时拉取版本通告数据；传入浏览器/系统语言，host 返回对应语言的 manual 与 versions
  const [data, setData] = useState<AnnouncementData | null>(null);
  const lang = useMemo(() => currentLang(), [open]);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setData(null);
    getAnnouncement(lang)
      .then((res) => {
        if (alive) setData(res);
      })
      .catch(() => {
        /* 拉取失败保持 null，使用本地 i18n 回退展示手册，通告为空 */
      });
    return () => {
      alive = false;
    };
  }, [open, lang]);

  // 通告版本：优先匹配当前运行版本（data.current）的更新说明（版本说明推送跟当前版本对应），
  // 匹配不到（如当前版本无内置说明）时回退到最新一个版本。
  // 注意：必须放在提前返回（open 为 false 时 return null）之前，保证每次渲染 hook 数量一致，
  // 否则 open 由 false 变 true 时会触发 React 错误 #310（Rendered fewer hooks than expected）。
  const latest: VersionEntry | null = useMemo(() => {
    if (!data?.versions || data.versions.length === 0) return null;
    const byCurrent = data.current
      ? data.versions.find((v) => v.version === data.current)
      : undefined;
    return byCurrent ?? data.versions[0];
  }, [data]);

  if (!open) return null;

  // 使用手册：优先 host 返回的 manual（已按语言翻译），缺失则用前端 i18n 回退
  const manualItems: string[] =
    data?.manual && data.manual.length > 0
      ? data.manual.map((m) => m.text).filter(Boolean)
      : MANUAL_KEYS.map((key) => t(key));

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
          width: 600,
          maxWidth: "calc(100vw - 40px)",
          maxHeight: "min(680px, calc(100vh - 40px))",
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
          <>
            {/* 使用手册 */}
            <section>
              <div style={sectionTitleStyle}>{t("pl.announce.manualTitle")}</div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
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

            {/* 版本说明（仅最新一个版本） */}
            <section>
              <div style={sectionTitleStyle}>{t("pl.announce.noticeTitle")}</div>
              {!latest ? (
                <div
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.7,
                    color: TONE.quiet,
                    background: TONE.row,
                    border: `1px solid ${TONE.border}`,
                    borderRadius: 7,
                    padding: "9px 11px",
                    fontStyle: "italic",
                  }}
                >
                  {t("pl.announce.noNotice")}
                </div>
              ) : (
                <div
                  style={{
                    background: TONE.row,
                    border: `1px solid ${TONE.border}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  {/* 版本号 + 标题 + 日期行 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "rgba(142, 197, 255, 0.14)",
                        color: TONE.accent,
                        border: `1px solid ${TONE.border}`,
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.5,
                        letterSpacing: 0.2,
                      }}
                    >
                      v{latest.version}
                    </span>
                    <strong style={{ fontSize: 13, fontWeight: 600, color: TONE.text, flex: "1 1 auto" }}>
                      {latest.title}
                    </strong>
                    {latest.date && (
                      <span
                        style={{
                          fontSize: 11.5,
                          color: TONE.quiet,
                          fontWeight: 500,
                        }}
                      >
                        {latest.date}
                      </span>
                    )}
                  </div>
                  {/* 版本要点列表 */}
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {latest.items.map((item, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          fontSize: 12,
                          lineHeight: 1.65,
                          color: TONE.muted,
                        }}
                      >
                        <BulletIcon />
                        <span style={{ flex: 1 }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
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
