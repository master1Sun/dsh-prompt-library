/**
 * 公告弹窗（报纸风格 + 历史翻页）— 右键词库助手菜单里的「公告」入口打开。
 *
 * 以「报纸」为视觉框架，可按期翻页、回顾历史：
 *  - 期次导航：上一期 / 下一期 / 今日 / 历史下拉，随时间轴翻页；切换时带淡入翻页动画；
 *  - 报头：报纸名 + 副题 + 当日日期 + 版次要信息；
 *  - 使用手册（最大）：插件核心能力要点，本地 i18n，占据左栏大版块；
 *  - 每日日报（次之）：host 依据当日本地词库统计由 AI 生成；
 *  - 科技快讯（次之）：优先从 IT之家 RSS 抓取，失败回退 AI 生成；
 *  - 版本信息（最小）：底部细条，仅最新 / 当前版本，可展开。
 *
 * 数据来自 host `/announcement`（手册+版本）与 `/announcement/daily?date=`（日报+新闻）。
 * 交互：点击遮罩/外部区域或右上角关闭按钮均可关闭。
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { type PLT } from "../../i18n/i18n.js";
import {
  getAnnouncement,
  getAnnouncementDaily,
  type AnnouncementData,
  type DailyExtras,
  type VersionEntry,
} from "../../services/api.js";
import { getTone, useThemeSync } from "../../utils/theme.js";
import { DialogCloseButton } from "../common/DialogCloseButton.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../../utils/dialog-style.js";

/** 报纸衬线字体栈（报头大标题 + 栏目题）。 */
const SERIF = 'Georgia, "Times New Roman", "Songti SC", "SimSun", "PMingLiU", serif';

/** 使用手册对应的 i18n 键（按顺序展示），若 host 返回值缺失时回退使用。 */
const MANUAL_KEYS = [
  "pl.announce.manual.0",
  "pl.announce.manual.1",
  "pl.announce.manual.2",
  "pl.announce.manual.3",
  "pl.announce.manual.4",
  "pl.announce.manual.5",
] as const;

/**
 * 去除字符串中的 HTML 标签并解码常见实体（科技快讯 RS 摘要可能残留标签）。
 * 防御性清洗：无论来自 IT之家 还是历史归档，渲染前都去掉标签，避免原样显示。
 */
function sanitizeText(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 把 YYYY-MM-DD 解析为 Date（本地时区），失败回退今天。 */
function parseDate(s: string | undefined): Date {
  try {
    return s ? new Date(`${s}T00:00:00`) : new Date();
  } catch {
    return new Date();
  }
}

/** 本地日期 → YYYY-MM-DD（拷贝 todayLocalDate 语义，前端本地时区）。 */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface Props {
  /** 是否显示。 */
  open: boolean;
  /** 关闭弹窗（仅由关闭按钮触发）。 */
  onClose: () => void;
  /** 翻译函数。 */
  t: PLT;
}

/** 栏目题：衬线大字 + 下方主题色短横线。 */
function ColumnTitle({ children }: { children: ReactNode }): ReactNode {
  const TONE = getTone();
  return (
    <div style={{ marginBottom: 9 }}>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 15,
          fontWeight: 700,
          color: TONE.text,
          letterSpacing: 0.4,
          lineHeight: 1.3,
        }}
      >
        {children}
      </div>
      <div
        style={{
          marginTop: 4,
          height: 2,
          width: 34,
          background: TONE.accent,
          borderRadius: 1,
        }}
      />
    </div>
  );
}

/** 期次导航按钮（文字或箭头）。 */
function NavIcon({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: ReactNode;
}): ReactNode {
  const TONE = getTone();
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        border: `1px solid ${TONE.border}`,
        background: TONE.panel,
        color: disabled ? TONE.quiet : TONE.text,
        borderRadius: 7,
        minWidth: 24,
        height: 22,
        padding: "0 6px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        fontSize: 12,
        lineHeight: 1,
        opacity: disabled ? 0.45 : 1,
        transition: "background 0.24s, color 0.24s",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.background = TONE.row;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = TONE.panel;
      }}
    >
      {children}
    </button>
  );
}

/** 居中遮罩公告弹窗（报纸风格 + 历史翻页）。 */
export function AnnouncementModal({ open, onClose, t }: Props): ReactNode {
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();
  // 语言与界面文案（t）同源推导：界面为英文（t 返回英文）时，日报/成就速报也请求英文版本，
  // 避免用浏览器/宿主 document lang 导致「界面英文、内容中文」不一致。
  const lang: "zh" | "en" = t("pl.announce.dailyTitle") === "Daily Report" ? "en" : "zh";
  // 静态数据：手册 + 版本（/announcement）
  const [data, setData] = useState<AnnouncementData | null>(null);
  // 当前期的动态数据：日报 + 新闻（/announcement/daily?date=）
  const [daily, setDaily] = useState<DailyExtras | null>(null);
  // 当前查看的期次（YYYY-MM-DD）；缺省今天的本地日期
  const [currentDate, setCurrentDate] = useState<string>(() => toDateKey(new Date()));
  // 历史下拉是否展开
  const [historyOpen, setHistoryOpen] = useState(false);

  // 打开弹窗时拉取手册+版本，并按当前日期拉取动态内容
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setData(null);
    setDaily(null);
    setCurrentDate(toDateKey(new Date())); // 每次打开回到今日
    getAnnouncement(lang)
      .then((res) => {
        if (alive) setData(res);
      })
      .catch(() => {
        /* 拉取失败保持 null，使用本地 i18n 回退展示手册，通告为空 */
      });
    getAnnouncementDaily(lang)
      .then((res) => {
        if (alive) setDaily(res);
      })
      .catch(() => {
        /* 拉取失败保持 null，报纸日报/新闻显示「今日暂无推荐」 */
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lang]);

  // 期次切换：拉取指定日期的动态内容
  const goTo = (date: string) => {
    setCurrentDate(date);
    setHistoryOpen(false);
    getAnnouncementDaily(lang, date)
      .then(setDaily)
      .catch(() => setDaily(null));
  };

  // 全部已存档日期（时间倒序，最新在前）；用于翻页定位与历史列表
  const pages = daily?.availableDates ?? ([] as string[]);
  const pageIdx = daily ? pages.indexOf(daily.date) : -1;
  const hasPrev = pageIdx > 0; // 有更新的期（更接近今天的）
  const hasNext = pageIdx >= 0 && pageIdx < pages.length - 1; // 有更早的期

  // 通告版本：优先匹配当前运行版本（data.current），匹配不到时回退最新一个版本。
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

  // 报头日期：优先当前期次的日期，否则取本地当天
  const dateLabel = (() => {
    try {
      const d = parseDate(daily?.date);
      return d.toLocaleDateString(lang === "en" ? "en-US" : "zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });
    } catch {
      return daily?.date ?? "";
    }
  })();

  // 当前期次编号：按时间倒序，最旧=第1期，最新=第 N 期
  const editionNo = pages.length > 0 && pageIdx >= 0 ? pages.length - pageIdx : 1;
  // 是否还在等动态数据加载
  const loadingHint = daily === null;

  // 历史下拉列表项
  const historyLabels = pages.map((d) => ({
    date: d,
    label: (() => {
      try {
        return parseDate(d).toLocaleDateString(lang === "en" ? "en-US" : "zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return d;
      }
    })(),
  }));

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pl.announce.title")}
      className={PL_DIALOG_OVERLAY}
      onClick={onClose}
    >
      <style>{PL_DIALOG_CSS}</style>
      <style>{`@keyframes plPageFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.pl-page-turn{animation:plPageFade .32s ease-out}`}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        className={PL_DIALOG}
        style={{
          width: 780,
          maxWidth: "calc(100vw - 40px)",
          maxHeight: "min(700px, calc(100vh - 40px))",
        }}
      >
        {/* 右上角关闭按钮（仅按钮触发） */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flexShrink: 0 }}>
          <DialogCloseButton onClick={onClose} label={t("pl.close")} />
        </div>

        {/* 内容区：整块限制在弹窗高度内，网格自适应填充，不出现滚动条 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            paddingRight: 10,
            paddingTop: 2,
            paddingBottom: 8,
          }}
        >
          {/* ── 期次导航栏（历史翻页） ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              userSelect: "none",
            }}
          >
            <NavIcon onClick={() => hasNext && pages[pageIdx + 1] && goTo(pages[pageIdx + 1])} disabled={!hasNext} label={t("pl.announce.prevEdition")}>
              ‹ {t("pl.announce.prevEdition")}
            </NavIcon>
            <div style={{ flex: 1, textAlign: "center", fontSize: 12.5, color: TONE.muted, fontFamily: SERIF }}>
              {daily?.date ?? currentDate} · {t("pl.announce.editionNo", { n: editionNo })}
            </div>
            <NavIcon onClick={() => hasPrev && pages[pageIdx - 1] && goTo(pages[pageIdx - 1])} disabled={!hasPrev} label={t("pl.announce.nextEdition")}>
              {t("pl.announce.nextEdition")} ›
            </NavIcon>
            <NavIcon onClick={() => goTo(toDateKey(new Date()))} disabled={daily?.isToday === true} label={t("pl.announce.today")}>
              {t("pl.announce.today")}
            </NavIcon>
            {/* 历史下拉 */}
            <div style={{ position: "relative" }}>
              <NavIcon onClick={() => setHistoryOpen((v) => !v)} disabled={pages.length <= 0} label={t("pl.announce.history")}>
                {t("pl.announce.history")} ▾
              </NavIcon>
              {historyOpen && pages.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 26,
                    zIndex: 40,
                    minWidth: 150,
                    maxHeight: 220,
                    overflow: "auto",
                    background: TONE.panel,
                    border: `1px solid ${TONE.borderStrong}`,
                    borderRadius: 8,
                    padding: 4,
                  }}
                >
                  {historyLabels.map((h) => (
                    <button
                      key={h.date}
                      type="button"
                      onClick={() => goTo(h.date)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: h.date === daily?.date ? TONE.row : "transparent",
                        color: TONE.text,
                        fontSize: 12,
                        padding: "6px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 报纸报头 masthead ── */}
          <header
            style={{
              textAlign: "center",
              paddingBottom: 10,
              borderBottom: `3px double ${TONE.text}`,
              marginBottom: 14,
              userSelect: "none",
            }}
          >
            <div style={{ fontFamily: SERIF, fontSize: 13, color: TONE.quiet, letterSpacing: 2 }}>
              ——— {t("pl.announce.title")} ———
            </div>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 32,
                fontWeight: 800,
                color: TONE.text,
                lineHeight: 1.15,
                letterSpacing: 6,
                marginTop: 2,
              }}
            >
              {t("pl.announce.masthead")}
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 12,
                color: TONE.muted,
                letterSpacing: 1,
              }}
            >
              {t("pl.announce.mastheadSub")}
            </div>
            <div
              style={{
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11.5,
                color: TONE.quiet,
              }}
            >
              <span>{dateLabel}</span>
              <span style={{ letterSpacing: 1 }}>
                {lang === "en" ? "Vol. TODAY · EDITION 1" : "今日 · 第一期"}
              </span>
            </div>
          </header>

          {/* ── 报纸正文（四宫格，期次切换时整块淡入翻页） ── */}
          <div
            key={daily?.date ?? currentDate}
            className="pl-page-turn"
            style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
          >
            {/* 四宫格：上排 = 每日日报 + 科技快讯；下排 = 使用手册 + 版本；两行均分弹窗剩余高度 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gridTemplateRows: "1fr 1fr",
                gap: 20,
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* 上左：每日日报（AI → 词库统计）；与科技快讯等高，内容超出则裁切 */}
              <section
                style={{
                  minWidth: 0,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <ColumnTitle>{t("pl.announce.dailyTitle")}</ColumnTitle>
                {loadingHint || !daily?.report || daily.report.length === 0 ? (
                  <div style={{ fontSize: 12, color: TONE.quiet, fontStyle: "italic", lineHeight: 1.7 }}>
                    {t("pl.announce.noDaily")}
                  </div>
                ) : (
                  <ul
                    style={{
                      margin: 0,
                      padding: "0 6px 0 0",
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 9,
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                    }}
                  >
                    {daily.report.map((item, i) => (
                      <li key={i} style={{ display: "flex", gap: 8 }}>
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 11,
                            lineHeight: "20px",
                            fontFamily: SERIF,
                            fontWeight: 700,
                            color: TONE.accent,
                          }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: SERIF,
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: TONE.text,
                              lineHeight: 1.4,
                              marginBottom: 2,
                            }}
                          >
                            {item.headline}
                          </div>
                          <div style={{ fontSize: 12, color: TONE.muted, lineHeight: 1.6 }}>{item.body}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* 上右：科技快讯（IT之家 优先，失败回退 AI）；与日报等高，内容超出则裁切 */}
              <section
                style={{
                  minWidth: 0,
                  borderLeft: `1px solid ${TONE.border}`,
                  paddingLeft: 18,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <ColumnTitle>{t("pl.announce.techTitle")}</ColumnTitle>
                </div>
                {loadingHint || !daily?.news || daily.news.length === 0 ? (
                  <div style={{ fontSize: 12, color: TONE.quiet, fontStyle: "italic", lineHeight: 1.7 }}>
                    {t("pl.announce.noDaily")}
                  </div>
                ) : (
                  <ul
                    style={{
                      margin: 0,
                      padding: "0 6px 0 0",
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                    }}
                  >
                    {daily.news.map((item, i) => (
                      <li key={i} style={{ borderBottom: `1px dotted ${TONE.border}`, paddingBottom: 8 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                          <span
                            style={{
                              flexShrink: 0,
                              fontSize: 10.5,
                              lineHeight: "18px",
                              fontFamily: SERIF,
                              fontWeight: 700,
                              color: TONE.quiet,
                            }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontFamily: SERIF,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: TONE.text,
                                  lineHeight: 1.4,
                                }}
                              >
                                {sanitizeText(item.title)}
                              </div>
                              <div style={{ fontSize: 12, color: TONE.muted, lineHeight: 1.55, marginTop: 1 }}>
                                {sanitizeText(item.summary)}
                              </div>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer noopener"
                                style={{
                                  fontSize: 11.5,
                                  color: TONE.accent,
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  marginTop: 3,
                                }}
                              >
                                {t("pl.announce.openLink")} →
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* 下左：使用手册 */}
              <section
                style={{
                  minWidth: 0,
                  borderTop: `1px solid ${TONE.border}`,
                  paddingTop: 16,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <ColumnTitle>{t("pl.announce.manualTitle")}</ColumnTitle>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                  }}
                >
                  {manualItems.map((item, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        fontSize: 13,
                        lineHeight: 1.65,
                        color: TONE.muted,
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: TONE.accent,
                          marginTop: 8,
                        }}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 下右：版本（紧凑） */}
              <section
                style={{
                  minWidth: 0,
                  borderTop: `1px solid ${TONE.border}`,
                  borderLeft: `1px solid ${TONE.border}`,
                  paddingLeft: 18,
                  paddingTop: 16,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <ColumnTitle>{t("pl.announce.noticeTitle")}</ColumnTitle>
                {latest ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                        flexWrap: "wrap",
                        minWidth: 0,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: SERIF,
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: TONE.accent,
                          letterSpacing: 0.3,
                        }}
                      >
                        v{latest.version}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: TONE.text }}>{latest.title}</span>
                      {latest.date && (
                        <span style={{ fontSize: 10.5, color: TONE.quiet, fontWeight: 500 }}>{latest.date}</span>
                      )}
                    </div>
                    {latest.items.length > 0 && (
                      <ul
                        style={{
                          margin: 0,
                          padding: "8px 6px 0 0",
                          listStyle: "none",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          flex: 1,
                          minHeight: 0,
                          overflowY: "auto",
                        }}
                      >
                        {latest.items.map((item, i) => (
                          <li
                            key={i}
                            style={{
                              display: "flex",
                              gap: 6,
                              fontSize: 11.5,
                              lineHeight: 1.65,
                              color: TONE.muted,
                            }}
                          >
                            <span style={{ flexShrink: 0, color: TONE.accent, fontWeight: 700 }}>·</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: TONE.quiet, fontStyle: "italic" }}>
                    {t("pl.announce.noNotice")}
                  </span>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

