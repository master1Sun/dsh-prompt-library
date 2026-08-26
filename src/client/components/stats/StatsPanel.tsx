/**
 * 词库统计可视化面板。
 *
 * 从 host `/stats` 拉取「当前实时统计 + 近 12 周快照」，用纯 SVG / 内联样式
 * 绘制概览卡片、标签分布、最常使用、最近使用、每周趋势等图表。
 * 配色复用词库面板同款 TONE token，随宿主主题自动深浅；无第三方图表依赖。
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { PLT } from "../../i18n/i18n.js";
import { fallbackT } from "../../i18n/i18n.js";
import { useDataChanged } from "../../services/data-sync.js";
import {
  getStats,
  type HeatmapCell,
  type LibraryStats,
  type PromptStatsData,
  type StatsSnapshot,
} from "../../services/api.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../utils/button-style.js";
import { getTone, useThemeSync } from "../../utils/theme.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

/** 把时间戳格式化为「n 分钟/小时/天前」，超过 60 天显示日期。 */
function formatAgo(ts: number, T: PLT): string {
  if (ts <= 0) return T("pl.stats.neverUsed");
  const diff = Date.now() - ts;
  if (diff < 0) return "—";
  const min = Math.floor(diff / 60000);
  if (min < 1) return T("pl.stats.justNow");
  if (min < 60) return T("pl.stats.minAgo", { n: min });
  const hour = Math.floor(min / 60);
  if (hour < 24) return T("pl.stats.hourAgo", { n: hour });
  const day = Math.floor(hour / 24);
  if (day < 60) return T("pl.stats.dayAgo", { n: day });
  return new Date(ts).toLocaleDateString();
}

/** 把时间戳格式化为本地日期 MM-DD（用于近 7 天分析周期展示）。 */
function formatDay(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

/** 图例小方块。 */
function Legend({ color, label }: { color: string; label: string }): ReactNode {
  const TONE = getTone();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: TONE.muted }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

/** 概览统计卡片：数值 + 标签 + 可选副文案。 */
function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: string }): ReactNode {
  const TONE = getTone();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        padding: "9px 10px",
        background: TONE.row,
        border: `1px solid ${TONE.border}`,
        borderRadius: 8,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 10, color: TONE.quiet, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </span>
      <span style={{ fontSize: 16, fontWeight: 600, color: TONE.text, lineHeight: 1.2 }}>{value}</span>
      {sub ? <span style={{ fontSize: 10, color: TONE.muted }}>{sub}</span> : null}
    </div>
  );
}

/** 区块标题。 */
function Section({ title, children }: { title: string; children?: ReactNode }): ReactNode {
  const TONE = getTone();
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h3
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 560,
          color: TONE.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        {title}
        
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </section>
  );
}

/** 横向条形列表（标签分布 / 最常使用共用）。 */
function BarList({
  rows,
  T,
}: {
  rows: Array<{ key: string; label: string; value: number; sub?: string }>;
  T: PLT;
}): ReactNode {
  const TONE = getTone();
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) {
    return (
      <div style={{ padding: "10px 12px", color: TONE.quiet, fontSize: 12, textAlign: "center" }}>
        {T("pl.stats.emptyList")}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {rows.map((r) => (
        <div key={r.key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", minWidth: 0 }}>
            <span
              style={{ fontSize: 12, color: TONE.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}
              data-tip={r.label}
            >
              {r.label}
            </span>
            <span style={{ fontSize: 11, color: TONE.muted, flexShrink: 0, whiteSpace: "nowrap" }}>
              {r.sub ? `${r.value} · ${r.sub}` : r.value}
            </span>
          </div>
          <div style={{ height: 6, background: TONE.accentSoft, borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${(r.value / max) * 100}%`,
                background: TONE.accent,
                borderRadius: 3,
                transition: "width .3s ease",
                minWidth: r.value > 0 ? 3 : 0,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 每周趋势图：近 7 天「新增 / 使用次数」双系列柱状图（纯 SVG）。 */
function TrendChart({ snapshots, T }: { snapshots: StatsSnapshot[]; T: PLT }): ReactNode {
  const TONE = getTone();
  if (snapshots.length === 0) {
    return (
      <div style={{ padding: "14px 12px", color: TONE.quiet, fontSize: 12, textAlign: "center" }}>
        {T("pl.stats.trendEmpty")}
      </div>
    );
  }
  const W = 340;
  const H = 140;
  const TOP = 10;
  const BOTTOM = 18;
  const innerH = H - TOP - BOTTOM;
  const max = Math.max(1, ...snapshots.map((s) => Math.max(s.stats.addedCount, s.stats.usageCount)));
  const n = snapshots.length;
  const gw = W / n;
  const bw = Math.max(2, Math.min(7, gw * 0.24));
  const gap = Math.max(2, Math.min(5, bw));
  const lines = [0, 0.5, 1];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label={T("pl.stats.trend")}>
        {lines.map((f) => {
          const y = TOP + innerH - innerH * f;
          return <line key={f} x1={0} x2={W} y1={y} y2={y} stroke={TONE.border} strokeWidth={1} />;
        })}
        {snapshots.map((s, i) => {
          const cx = i * gw + gw / 2;
          const a = s.stats.addedCount;
          const u = s.stats.usageCount;
          const ah = (a / max) * innerH;
          const uh = (u / max) * innerH;
          const label = new Date(s.createdAt).toLocaleDateString(undefined, {
            month: "2-digit",
            day: "2-digit",
          });
          // 快照较多时隔条显示日期标签，避免文字重叠
          const showLabel = n <= 8 || i % 2 === 0;
          return (
            <g key={s.id}>
              <rect
                x={cx - gap / 2 - bw}
                y={TOP + innerH - ah}
                width={bw}
                height={Math.max(0, ah)}
                rx={1.5}
                fill={TONE.accent}
                opacity={0.85}
                data-tip={`${T("pl.stats.trendAdded")}: ${a}`}
              >
              </rect>
              <rect
                x={cx + gap / 2}
                y={TOP + innerH - uh}
                width={bw}
                height={Math.max(0, uh)}
                rx={1.5}
                fill={TONE.mint}
                opacity={0.85}
                data-tip={`${T("pl.stats.trendUsage")}: ${u}`}
              >
              </rect>
              {showLabel ? (
                <text x={cx} y={H - 6} textAnchor="middle" fontSize={9} fill={TONE.quiet}>
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center" }}>
        <Legend color={TONE.accent} label={T("pl.stats.trendAdded")} />
        <Legend color={TONE.mint} label={T("pl.stats.trendUsage")} />
      </div>
    </div>
  );
}

/** 统计页「总览」：概览重点卡片 + 近 7 天分析，详细列表放在「明细」标签。 */
export function StatsContent({
  stats,
  snapshots,
  T,
}: {
  stats: LibraryStats;
  snapshots: StatsSnapshot[];
  T: PLT;
}): ReactNode {
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();
  const usedRate = stats.total > 0 ? Math.round((stats.usedCount / stats.total) * 100) : 0;
  // 最近一次每周统计快照（每 7 天自动统计一次），用于「近 7 天分析」
  const lastSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 概览重点卡片（两列网格，只保留最核心的指标） */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatCard label={T("pl.stats.total")} value={stats.total} />
        <StatCard label={T("pl.stats.totalUsage")} value={stats.totalUsage} />
        <StatCard
          label={T("pl.stats.usedRate")}
          value={`${usedRate}%`}
          sub={T("pl.stats.usedCount", { count: stats.usedCount })}
        />
        <StatCard label={T("pl.stats.aiRefined")} value={`${stats.aiRefinedPct}%`} sub={T("pl.stats.aiRefinedCount", { count: stats.aiRefinedCount })} />
        <StatCard label={T("pl.stats.added7")} value={stats.addedIn7Days} />
        <StatCard label={T("pl.stats.used7")} value={stats.usedIn7Days} />
      </div>

      {/* 近 7 天分析（最近一次每周统计快照，每 7 天自动统计一次） */}
      <Section title={T("pl.stats.analysis")}>
        {!lastSnap ? (
          <div style={{ padding: "10px 12px", color: TONE.quiet, fontSize: 12, textAlign: "center" }}>
            {T("pl.stats.analysisEmpty")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: TONE.muted }}>
              {T("pl.stats.analysisPeriod", { start: formatDay(lastSnap.stats.rangeStart), end: formatDay(lastSnap.stats.rangeEnd) })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <StatCard label={T("pl.stats.analysisAdded")} value={lastSnap.stats.addedCount} />
              <StatCard
                label={T("pl.stats.analysisUsage")}
                value={lastSnap.stats.usageCount}
                sub={T("pl.stats.analysisActive", { n: lastSnap.stats.usedPromptCount })}
              />
              <StatCard label={T("pl.stats.analysisAi")} value={lastSnap.stats.aiRefinedCount} />
            </div>
            {/* 每周快照的 AI 点评（生成快照时若 AI 可用自动写入） */}
            {lastSnap.comment ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "9px 11px",
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 560, color: TONE.accent }}>
                  {T("pl.stats.aiComment")}
                </span>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: TONE.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {lastSnap.comment}
                </p>
              </div>
            ) : null}
            {lastSnap.stats.addedTitles.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: TONE.quiet }}>{T("pl.stats.analysisNewTitles")}</span>
                {lastSnap.stats.addedTitles.map((t) => (
                  <div
                    key={t}
                    style={{ padding: "5px 10px", background: TONE.row, border: `1px solid ${TONE.border}`, borderRadius: 7, fontSize: 12, color: TONE.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    data-tip={t}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

/** 统计页「明细」：每周趋势、最常/最近使用、沉睡提示词等详细列表。 */
function StatsDetails({
  stats,
  snapshots,
  T,
}: {
  stats: LibraryStats;
  snapshots: StatsSnapshot[];
  T: PLT;
}): ReactNode {
  useThemeSync();
  const TONE = getTone();
  const topUsedRows = useMemo(
    () =>
      stats.topUsed.map((p) => ({
        key: p.title,
        label: p.title,
        value: p.usageCount,
        sub: formatAgo(p.lastUsedAt, T),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats.topUsed],
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 每周趋势（明细最上方） */}
      <Section title={T("pl.stats.trend")}>
        <TrendChart snapshots={snapshots} T={T} />
      </Section>

      {/* 最常使用 */}
      <Section title={T("pl.stats.topUsed")}>
        <BarList rows={topUsedRows} T={T} />
      </Section>

      {/* 最近使用 */}
      <Section title={T("pl.stats.recentUsed")}>
        {stats.recentUsed.length === 0 ? (
          <div style={{ padding: "10px 12px", color: TONE.quiet, fontSize: 12, textAlign: "center" }}>
            {T("pl.stats.emptyList")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {stats.recentUsed.map((p) => (
              <div
                key={p.title}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "6px 10px",
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 7,
                  alignItems: "baseline",
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: 12, color: TONE.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }} data-tip={p.title}>
                  {p.title}
                </span>
                <span style={{ fontSize: 11, color: TONE.muted, flexShrink: 0, whiteSpace: "nowrap" }}>
                  {formatAgo(p.lastUsedAt, T)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 沉睡提示词 */}
      <Section title={T("pl.stats.sleeper")}>
        {stats.longestUnused.length === 0 ? (
          <div style={{ padding: "10px 12px", color: TONE.quiet, fontSize: 12, textAlign: "center" }}>
            {T("pl.stats.sleeperEmpty")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {stats.longestUnused.map((p) => (
              <div
                key={p.title}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "6px 10px",
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 7,
                  alignItems: "baseline",
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: 12, color: TONE.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }} data-tip={p.title}>
                  {p.title}
                </span>
                <span style={{ fontSize: 11, color: TONE.quiet, flexShrink: 0, whiteSpace: "nowrap" }}>
                  {T("pl.stats.days", { days: p.days })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/** 星期文案 i18n 键（getDay: 0=周日 … 6=周六）。 */
const WEEK_KEYS = [
  "pl.stats.week0",
  "pl.stats.week1",
  "pl.stats.week2",
  "pl.stats.week3",
  "pl.stats.week4",
  "pl.stats.week5",
  "pl.stats.week6",
] as const;

/** 统计页相互独立的视图 Tab。 */
type StatsTab = "overview" | "heatmap" | "lifecycle" | "details";

/** 使用热力图：7×24 网格，按本地时区「星期 × 小时」展示使用频率。 */
function HeatmapChart({ heatmap, T }: { heatmap: HeatmapCell[]; T: PLT }): ReactNode {
  useThemeSync();
  const TONE = getTone();
  if (heatmap.length === 0) {
    return (
      <div style={{ padding: "14px 12px", color: TONE.quiet, fontSize: 12, textAlign: "center" }}>
        {T("pl.stats.heatmapEmpty")}
      </div>
    );
  }
  const max = Math.max(1, ...heatmap.map((c) => c.count));
  const counts = new Map(heatmap.map((c) => [`${c.weekday}:${c.hour}`, c.count]));
  const hours = Array.from({ length: 24 }, (_, h) => h);
  const weeks = Array.from({ length: 7 }, (_, w) => w);
  // 次数越高，accent 不透明度越高；0 用淡边框底。
  const fill = (count: number): string =>
    count <= 0
      ? `color-mix(in srgb, ${TONE.border} 35%, transparent)`
      : `color-mix(in srgb, ${TONE.accent} ${Math.round(20 + (count / max) * 66)}%, transparent)`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* 小时表头（每 4 小时标记一次） */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, marginLeft: 28 }}>
        {hours.map((h) => (
          <span
            key={h}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 8,
              color: TONE.quiet,
              height: 10,
              lineHeight: 1,
            }}
          >
            {h % 4 === 0 ? h : ""}
          </span>
        ))}
      </div>
      {weeks.map((wd) => (
        <div key={wd} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <span
            style={{
              width: 26,
              flexShrink: 0,
              fontSize: 9,
              color: TONE.quiet,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {T(WEEK_KEYS[wd])}
          </span>
          {hours.map((h) => {
            const count = counts.get(`${wd}:${h}`) ?? 0;
            return (
              <div
                key={h}
                style={{ flex: 1, height: 13, borderRadius: 2, minWidth: 2, background: fill(count) }}
                data-tip={`${T(WEEK_KEYS[wd])} ${h}:00 · ${count}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** 生命周期：用「新增 → 复用 → 沉睡 → 回收站」四个阶段概览词库结构（数据来自统计），下方附「近 7 天最常使用」清单。 */
function LifecycleSection({ stats, T }: { stats: LibraryStats; T: PLT }): ReactNode {
  useThemeSync();
  // 近 7 天最常使用的提示词（与生命周期「近 7 天复用」卡片呼应）
  const topUsed7Rows = useMemo(
    () =>
      (stats.topUsed7 ?? []).map((p) => ({
        key: p.title,
        label: p.title,
        value: p.count,
      })),
    [stats.topUsed7],
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatCard label={T("pl.stats.lcAdded")} value={stats.addedIn7Days} />
        <StatCard
          label={T("pl.stats.lcActive")}
          value={stats.usedIn7Days}
          sub={T("pl.stats.lcActive30", { n: stats.usedIn30Days })}
        />
        <StatCard label={T("pl.stats.lcDormant")} value={stats.unusedCount} />
        <StatCard label={T("pl.stats.lcTrash")} value={stats.trashCount} />
      </div>

      {/* 近 7 天最常使用 */}
      <Section title={T("pl.stats.topUsed7")}>
        <BarList rows={topUsed7Rows} T={T} />
      </Section>
    </div>
  );
}

/** 统计页顶部的视图切换（胶囊式 Tab，样式对齐现有按钮）。 */
function StatsTabBar({ active, onChange, T }: { active: StatsTab; onChange: (t: StatsTab) => void; T: PLT }): ReactNode {
  const TONE = getTone();
  const tabs: Array<{ id: StatsTab; label: string }> = [
    { id: "overview", label: T("pl.stats.tabOverview") },
    { id: "heatmap", label: T("pl.stats.tabHeatmap") },
    { id: "lifecycle", label: T("pl.stats.tabLifecycle") },
    { id: "details", label: T("pl.stats.tabDetails") },
  ];
  const activeStyle: CSSProperties = {
    background: TONE.accentSoft,
    color: TONE.accent,
  };
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 3,
        background: TONE.row,
        border: `1px solid ${TONE.border}`,
        borderRadius: 14,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {tabs.map((tb) => (
        <button
          key={tb.id}
          type="button"
          onClick={() => onChange(tb.id)}
          style={{
            flex: 1,
            height: 26,
            padding: "0 10px",
            border: "none",
            borderRadius: 11,
            fontSize: 12,
            whiteSpace: "nowrap",
            cursor: "pointer",
            background: tb.id === active ? activeStyle.background : "transparent",
            color: tb.id === active ? activeStyle.color : TONE.muted,
            transition: "background .24s ease, color .24s ease",
          }}
        >
          {tb.label}
        </button>
      ))}
    </div>
  );
}

/** 统计可视化面板（供词库面板在「统计」视图下渲染）。 */
export function StatsPanel({ t, onBack }: { t?: PLT; onBack?: () => void }): ReactNode {
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();
  const T = t ?? fallbackT;
  const [data, setData] = useState<PromptStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<StatsTab>("overview");

  const load = useCallback(() => {
    getStats()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 词库数据变化（新增/编辑/删除/使用）后自动刷新统计
  useDataChanged(() => {
    load();
  });

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        fontFamily: MONO,
      }}
    >
      {/* 顶部固定工具条：返回按钮 + 视图切换 Tab，固定在头部不随内容滚动 */}
      {(onBack || data) && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "12px 14px 0",
          }}
        >
          {onBack && (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={plBtn("primary", "sm")}
                onClick={onBack}
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 12H5M11 18l-6-6 6-6" />
                  </svg>
                }
              >
                {T("pl.stats.back")}
              </Button>
            </div>
          )}
          {data && <StatsTabBar active={tab} onChange={setTab} T={T} />}
        </div>
      )}
      {/* 独立滚动内容区：过长时出现滚动条，头部保持固定 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "12px 10px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
      {error && (
        <div
          style={{
            padding: "9px 12px",
            color: TONE.red,
            fontSize: 12,
            lineHeight: 1.5,
            textAlign: "center",
            wordBreak: "break-word",
            background: `color-mix(in srgb, ${TONE.red} 8%, transparent)`,
            border: `1px solid ${TONE.border}`,
            borderRadius: 7,
          }}
        >
          {T("pl.stats.loadFail")}：{error}
        </div>
      )}
      {!data && !error && (
        <div style={{ padding: "24px 12px", color: TONE.muted, fontSize: 13, textAlign: "center" }}>
          {T("pl.loading")}
        </div>
      )}
      {data && (
        <>
          {tab === "overview" && <StatsContent stats={data.stats} snapshots={data.snapshots} T={T} />}
          {tab === "heatmap" && <HeatmapChart heatmap={data.heatmap ?? []} T={T} />}
          {tab === "lifecycle" && <LifecycleSection stats={data.stats} T={T} />}
          {tab === "details" && <StatsDetails stats={data.stats} snapshots={data.snapshots} T={T} />}
        </>
      )}
      </div>
    </div>
  );
}