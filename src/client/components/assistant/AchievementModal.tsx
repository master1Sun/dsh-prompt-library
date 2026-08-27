/**
 * 成就弹窗 — 右键词库助手菜单里的「成就」入口打开。
 *
 * 腾讯 QQ 风格成就展示：
 * - 等级区块：圆形等级徽章（环形进度 + 中心等级号/称号），右侧升级进度条；
 *   若因长期未使用触发等级回落，附回落提示。
 * - 成就区块：奖牌墙（每项一枚圆形奖牌，已解锁金色奖杯 / 未解锁灰色锁）。
 *
 * 数据来自 host 的 `/assistant/status`（等级、成就均已按系统语言翻译）。
 * 交互：点击遮罩/外部区域、右上角关闭按钮或底部「知道了」按钮均可关闭。
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { type PLT } from "../../i18n/i18n.js";
import {
  getAssistantStatus,
  type AssistantAchievement,
  type AssistantLevel,
  type AssistantStatus,
} from "../../services/api.js";
import { getTone, useThemeSync, type ThemeTone } from "../../utils/theme.js";
import { DialogCloseButton } from "../common/DialogCloseButton.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../../utils/dialog-style.js";
import { LEVEL_COLORS } from "../../utils/sprite.js";

interface Props {
  /** 是否显示。 */
  open: boolean;
  /** 关闭弹窗（仅由关闭按钮 / 「知道了」按钮触发）。 */
  onClose: () => void;
  /** 翻译函数。 */
  t: PLT;
}

/** 归一化语言：zh / en。 */
function currentLang(): "zh" | "en" {
  const raw =
    (typeof document !== "undefined" ? document.documentElement.lang : "") ||
    (typeof navigator !== "undefined" ? navigator.language : "zh") ||
    "zh";
  return raw.toLowerCase().startsWith("en") ? "en" : "zh";
}

/** 等级对应的分阶色（与助手身体/胸前星章同源，QQ 式成长色阶）。 */
function levelColor(level: number): string {
  return LEVEL_COLORS[Math.min(Math.max(level, 1), LEVEL_COLORS.length) - 1];
}

/** 圆形等级徽章：环形进度 + 中心「Lv.N · 称号」，QQ 风格。 */
function LevelRing({ level, TONE }: { level: AssistantLevel; TONE: ThemeTone }): ReactNode {
  const R = 40;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, level.pct));
  const dash = (pct / 100) * C;
  const color = levelColor(level.level);
  return (
    <div style={{ position: "relative", width: 108, height: 108, flexShrink: 0 }} aria-hidden="true">
      <svg width="108" height="108" viewBox="0 0 108 108">
        {/* 底色圆盘 + 进度轨道 */}
        <circle cx="54" cy="54" r={R} fill={TONE.panel} stroke={TONE.border} strokeWidth="8" />
        {/* 进度弧：按 pct 画圈，圆角端点 */}
        <circle
          cx="54"
          cy="54"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C - dash}`}
          transform="rotate(-90 54 54)"
          style={{ transition: "stroke-dasharray .4s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 21, fontWeight: 800, color, lineHeight: 1.05, letterSpacing: 0.3 }}>
          Lv.{level.level}
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: TONE.muted,
            whiteSpace: "nowrap",
            maxWidth: 92,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {level.title}
        </span>
      </div>
    </div>
  );
}

/** 稀有度 → 主色（奖牌渐变主色 + 高光 + 边框 + 阴影）。 */
const RARITY_COLORS: Record<
  string,
  { base: string; high: string; deep: string; border: string; shadow: string; text: string }
> = {
  common: { base: "#94a3b8", high: "#cbd5e1", deep: "#64748b", border: "rgba(148,163,184,.55)", shadow: "rgba(148,163,184,.28)", text: "#94a3b8" },
  rare: { base: "#3b82f6", high: "#93c5fd", deep: "#1d4ed8", border: "rgba(59,130,246,.55)", shadow: "rgba(59,130,246,.35)", text: "#3b82f6" },
  epic: { base: "#8b5cf6", high: "#c4b5fd", deep: "#6d28d9", border: "rgba(139,92,246,.55)", shadow: "rgba(139,92,246,.35)", text: "#8b5cf6" },
  legendary: { base: "#f59e0b", high: "#fde68a", deep: "#b45309", border: "rgba(245,158,11,.6)", shadow: "rgba(245,158,11,.38)", text: "#d97706" },
};

/** 稀有度标签文案（映射到 i18n 键）。 */
function rarityLabel(rarity: string, t: PLT): string {
  const key =
    rarity === "legendary"
      ? "pl.rarity.legendary"
      : rarity === "epic"
        ? "pl.rarity.epic"
        : rarity === "rare"
          ? "pl.rarity.rare"
          : "pl.rarity.common";
  return t(key);
}

/** 成就图标：已解锁 = 该稀有度的奖杯，未解锁 = 灰色锁。 */
function RarityMedal({ achieved, TONE }: { achieved: boolean; TONE: ThemeTone }): ReactNode {
  const color = achieved ? "#fff" : TONE.quiet;
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" style={{ flexShrink: 0, color }} aria-hidden="true">
      {achieved ? (
        <path
          d="M4.5 2h7v3a3.5 3.5 0 0 1-7 0V2zM5 4.5h6M4.5 2V1h7v1M5 9.5h6M5 11h6M8 7.5V14M6.5 14h3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <rect x="5" y="7" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="8" cy="10" r="1" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/** 单条成就卡片：稀有度奖牌 + 标题 / 描述 + 稀有度徽标 + 解锁进度条。 */
function AchievementCard({ achievement, t, TONE }: { achievement: AssistantAchievement; t: PLT; TONE: ThemeTone }): ReactNode {
  const a = achievement;
  const c = RARITY_COLORS[a.rarity] ?? RARITY_COLORS.common;
  const pct = a.target > 0 ? Math.max(0, Math.min(100, (a.progress / a.target) * 100)) : 0;
  const achievedColor = `radial-gradient(circle at 35% 28%, ${c.high}, ${c.base} 78%)`;
  return (
    <li
      title={a.achieved ? rarityLabel(a.rarity, t) + " · +" + a.points : t("pl.achievements.lockedHint")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 12,
        lineHeight: 1.5,
        padding: "9px 10px",
        borderRadius: 9,
        background: TONE.row,
        border: `1px solid ${a.achieved ? c.border : TONE.border}`,
        opacity: a.achieved ? 1 : 0.72,
        transition: "transform .16s ease, box-shadow .16s ease",
      }}
    >
      {/* 奖章：按稀有度渐变色圆牌，未解锁灰色 */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: a.achieved ? achievedColor : TONE.panel,
          border: `1px solid ${a.achieved ? c.border : TONE.border}`,
          boxShadow: a.achieved ? `0 2px 7px ${c.shadow}` : "none",
        }}
      >
        <RarityMedal achieved={a.achieved} TONE={TONE} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span
            style={{
              fontWeight: 600,
              color: a.achieved ? TONE.text : TONE.quiet,
              fontSize: 12.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {a.title}
          </span>
          {a.achieved && (
            <span
              style={{
                flexShrink: 0,
                fontSize: 10,
                lineHeight: "16px",
                padding: "0 5px",
                borderRadius: 8,
                fontWeight: 700,
                color: "#fff",
                background: `linear-gradient(135deg, ${c.high}, ${c.deep})`,
              }}
            >
              +{a.points}
            </span>
          )}
        </div>
        <div
          style={{
            color: a.achieved ? TONE.muted : TONE.quiet,
            fontSize: 11.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {a.desc}
        </div>
        {/* 解锁进度条：展示 progress / target */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
          <div
            style={{
              flex: 1,
              height: 5,
              borderRadius: 3,
              background: TONE.panel,
              border: `1px solid ${TONE.border}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                borderRadius: 3,
                background: a.achieved ? `linear-gradient(90deg, ${c.base}, ${c.high})` : TONE.accent,
                transition: "width .3s ease",
              }}
            />
          </div>
          <span style={{ fontSize: 10.5, color: TONE.quiet, fontWeight: 600, whiteSpace: "nowrap" }}>
            {a.achieved
              ? "100%"
              : t("pl.achievements.progress")
                  .replace("{progress}", String(a.progress))
                  .replace("{target}", String(a.target))}
          </span>
        </div>
      </div>
    </li>
  );
}

/** 居中遮罩成就弹窗（QQ 风格：等级圆环 + 奖牌墙）。 */
export function AchievementModal({ open, onClose, t }: Props): ReactNode {
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();
  // 区块小标题样式（跟随当前主题）
  const sectionTitleStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: TONE.text,
    marginBottom: 8,
  };
  // 打开时拉取游戏化快照；传入浏览器/系统语言，host 返回对应语言的等级与成就
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const lang = useMemo(() => currentLang(), [open]);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setStatus(null);
    getAssistantStatus(lang)
      .then((s) => {
        if (alive) setStatus(s);
      })
      .catch(() => {
        /* 拉取失败保持 null，展示加载/空状态 */
      });
    return () => {
      alive = false;
    };
  }, [open, lang]);

  const level = status?.level;
  const achievements = status?.achievements ?? [];
  const achievedCount = achievements.filter((a) => a.achieved).length;
  const summary = status?.achievementSummary;
  const overallPct = summary && summary.total > 0 ? Math.round((summary.unlocked / summary.total) * 100) : 0;

  // 近期待解锁：未解锁且进度 ≥ 60% 的成就，按完成度降序取前 4
  const upNext = useMemo(() => {
    return achievements
      .filter((a) => !a.achieved && a.target > 0 && a.progress / a.target >= 0.6)
      .sort((x, y) => y.progress / y.target - x.progress / x.target)
      .slice(0, 4);
  }, [achievements]);

  // 成就稀有度筛选（all = 全部）
  const [filter, setFilter] = useState<"all" | AssistantAchievement["rarity"]>("all");
  // 各稀有度的收集完成度统计（仅统计存在该稀有度成就的档位）
  const RARITIES: AssistantAchievement["rarity"][] = ["common", "rare", "epic", "legendary"];
  const rarityStats = useMemo(
    () =>
      RARITIES.map((r) => {
        const list = achievements.filter((a) => a.rarity === r);
        return { rarity: r, total: list.length, unlocked: list.filter((a) => a.achieved).length };
      }).filter((s) => s.total > 0),
    [achievements],
  );

  // 按当前稀有度筛选后的成就列表与解锁数
  const filteredAchievements =
    filter === "all" ? achievements : achievements.filter((a) => a.rarity === filter);
  const filteredAchieved = filteredAchievements.filter((a) => a.achieved).length;

  // 关闭时不渲染弹窗。注意：该提前返回必须位于所有 hooks 之后，避免渲染期间 hook 数量变化（React #310）
  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pl.achievements.title")}
      className={PL_DIALOG_OVERLAY}
      onClick={onClose}
    >
      <style>{PL_DIALOG_CSS}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        className={PL_DIALOG}
        style={{
          width: 560,
          maxWidth: "calc(100vw - 40px)",
          maxHeight: "min(660px, calc(100vh - 40px))",
        }}
      >
        {/* 标题行 + 右上角关闭按钮 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <strong style={{ flex: 1, fontSize: 15, fontWeight: 600, color: TONE.text }}>
            {t("pl.achievements.title")}
          </strong>
          <DialogCloseButton onClick={onClose} label={t("pl.close")} />
        </div>

        {/* 内容区：超出最大高度时独立滚动 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            /* 内容与滚动条之间预留 10px 间距（与官方一致） */
            paddingRight: 10,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            paddingTop: 14,
            paddingBottom: 4,
          }}
        >
          {/* 成长称号总览：称号 + 达成数 + 成就点 + 总进度 */}
          {summary && (
            <section
              style={{
                background: TONE.row,
                border: `1px solid ${TONE.border}`,
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {/* 称号徽标 */}
                <div
                  style={{
                    flexShrink: 0,
                    padding: "3px 10px",
                    borderRadius: 12,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "#fff",
                    background:
                      summary.rankKey === "legend"
                        ? "linear-gradient(135deg, #fde68a, #d97706)"
                        : summary.rankKey === "star"
                          ? "linear-gradient(135deg, #c4b5fd, #7c3aed)"
                          : summary.rankKey === "collector"
                            ? "linear-gradient(135deg, #93c5fd, #2563eb)"
                            : summary.rankKey === "explorer"
                              ? "linear-gradient(135deg, #6ee7b7, #059669)"
                              : "linear-gradient(135deg, #cbd5e1, #64748b)",
                  }}
                >
                  {summary.rank}
                </div>
                <span style={{ flex: 1 }} />
                {/* 达成数与成就点 */}
                <span style={{ fontSize: 12, color: TONE.quiet, fontWeight: 500 }}>
                  {t("pl.achievements.collected").replace("{n}", String(summary.unlocked))} · {summary.unlocked} /{" "}
                  {summary.total}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: summary.earnedPoints > 0 ? "#d97706" : TONE.quiet,
                  }}
                >
                  {t("pl.achievements.points")} {summary.earnedPoints} / {summary.maxPoints}
                </span>
              </div>
              {/* 总收集进度条 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 5,
                    background: TONE.panel,
                    border: `1px solid ${TONE.border}`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${overallPct}%`,
                      height: "100%",
                      borderRadius: 5,
                      background:
                        overallPct >= 100
                          ? "linear-gradient(90deg, #fde68a, #f59e0b)"
                          : "linear-gradient(90deg, #93c5fd, #8b5cf6, #f59e0b)",
                      transition: "width .4s ease",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11.5, color: TONE.quiet, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {overallPct}%
                </span>
              </div>
            </section>
          )}

          {/* 等级区块：QQ 风格圆形徽章 + 升级进度 + 回落提示 */}
          <section>
            <div style={sectionTitleStyle}>{t("pl.achievements.levelLabel")}</div>
            {!level ? (
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
                {t("pl.achievements.loading")}
              </div>
            ) : (
              <div
                style={{
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <LevelRing level={level} TONE={TONE} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* 升级进度条 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        flex: 1,
                        height: 7,
                        borderRadius: 4,
                        background: TONE.panel,
                        border: `1px solid ${TONE.border}`,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${level.pct}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${levelColor(level.level)}, ${TONE.accent})`,
                          borderRadius: 4,
                          transition: "width .3s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11.5, color: TONE.quiet, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {level.pct}%
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: TONE.quiet }}>
                    {level.next > level.current
                      ? t("pl.gamification.progress").replace("{n}", String(level.next - level.current))
                      : t("pl.gamification.maxed")}
                  </div>
                  {/* 等级回落提示：长期未使用触发时展示 */}
                  {level.decayed && level.inactiveDays !== undefined && (
                    <div style={{ fontSize: 11.5, color: TONE.red, fontWeight: 500 }}>
                      {t("pl.achievements.decayed").replace("{days}", String(level.inactiveDays))}
                    </div>
                  )}
                  {/* 距上一档的衰减警示：已衰减且非初始档时，提示距再回落还有多少积分空间 */}
                  {level.decayed && level.level > 1 && level.dropGap !== undefined && level.prevTitle && (
                    <div style={{ fontSize: 11.5, color: TONE.red, fontWeight: 500 }}>
                      {t("pl.achievements.dropGap")
                        .replace("{prev}", level.prevTitle)
                        .replace("{n}", String(level.dropGap))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* 等级激励提示（彩蛋式）：未满级以神秘语气激励升级，满级告知尘封惊喜已苏醒 */}
            {level && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  lineHeight: 1.6,
                  padding: "9px 11px",
                  borderRadius: 7,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: TONE.row,
                  border: "1px solid transparent",
                  borderColor:
                    level.next > level.current
                      ? TONE.accent
                      : "var(--dsw-alias-state-success-primary, #78dda0)",
                  color:
                    level.next > level.current
                      ? TONE.accent
                      : "var(--dsw-alias-state-success-primary, #78dda0)",
                  fontWeight: 600,
                }}
              >
                {level.next > level.current
                  ? t("pl.achievements.unlockAssistant")
                  : t("pl.achievements.unlockAssistantDone")}
              </div>
            )}
          </section>

          {/* 近期待解锁：进度最高的未解锁成就，增强目标感 */}
          {status && upNext.length > 0 && (
            <section>
              <div style={{ ...sectionTitleStyle, display: "flex", alignItems: "center" }}>
                <span style={{ flex: 1 }}>{t("pl.achievements.upNext")}</span>
                <span style={{ fontSize: 11, color: TONE.quiet, fontWeight: 500 }}>
                  {t("pl.achievements.collected").replace("{n}", String(achievedCount))} · {achievedCount} /{" "}
                  {achievements.length}
                </span>
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))",
                  gap: 8,
                }}
              >
                {upNext.map((a) => (
                  <AchievementCard key={a.id} achievement={a} t={t} TONE={TONE} />
                ))}
              </ul>
            </section>
          )}

          {/* 成就奖牌墙：标题行含解锁计数 */}
          <section>
            <div style={{ ...sectionTitleStyle, display: "flex", alignItems: "center" }}>
              <span style={{ flex: 1 }}>{t("pl.achievements.title")}</span>
              <span style={{ fontSize: 11, color: TONE.quiet, fontWeight: 500 }}>
                {t("pl.achievements.count")
                  .replace("{n}", String(filteredAchieved))
                  .replace("{total}", String(filteredAchievements.length))}
              </span>
            </div>
            {/* 按稀有度分组的收集完成度统计条 */}
            {rarityStats.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                  margin: "2px 0 10px",
                  padding: "10px 11px",
                  borderRadius: 9,
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                }}
              >
                {rarityStats.map((s) => {
                  const c = RARITY_COLORS[s.rarity] ?? RARITY_COLORS.common;
                  const p = s.total > 0 ? Math.round((s.unlocked / s.total) * 100) : 0;
                  return (
                    <div key={s.rarity} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                      <span style={{ width: 44, flexShrink: 0, color: c.text, fontWeight: 600 }}>
                        {rarityLabel(s.rarity, t)}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: TONE.panel,
                          border: `1px solid ${TONE.border}`,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${p}%`,
                            height: "100%",
                            borderRadius: 3,
                            background: `linear-gradient(90deg, ${c.base}, ${c.high})`,
                            transition: "width .3s ease",
                          }}
                        />
                      </div>
                      <span style={{ flexShrink: 0, color: TONE.quiet, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {s.unlocked}/{s.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {/* 稀有度筛选 tab */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "0 0 10px" }}>
              {(["all", ...RARITIES] as ("all" | AssistantAchievement["rarity"])[]).map((r) => {
                const active = filter === r;
                const c = r === "all" ? { deep: TONE.accent, border: TONE.border } : RARITY_COLORS[r] ?? RARITY_COLORS.common;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFilter(r)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: `1px solid ${active ? c.deep : TONE.border}`,
                      color: active ? "#fff" : TONE.quiet,
                      background: active ? c.deep : TONE.row,
                      transition: "background .16s ease, color .16s ease, border-color .16s ease",
                    }}
                  >
                    {r === "all" ? t("pl.achievements.all") : rarityLabel(r, t)}
                  </button>
                );
              })}
            </div>
            {!status ? (
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
                {t("pl.achievements.loading")}
              </div>
            ) : filteredAchievements.length === 0 ? (
              <div
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  color: TONE.quiet,
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 7,
                  padding: "9px 11px",
                }}
              >
                {t("pl.achievements.empty")}
              </div>
            ) : (
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))",
                  gap: 8,
                }}
              >
                {filteredAchievements.map((a) => (
                  <AchievementCard key={a.id} achievement={a} t={t} TONE={TONE} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
