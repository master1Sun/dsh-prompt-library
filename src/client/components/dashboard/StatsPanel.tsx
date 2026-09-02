/**
 * 词库统计可视化面板。
 *
 * 从 host `/stats` 拉取「当前实时统计 + 近 12 周快照」，用纯 SVG / 内联样式
 * 绘制概览卡片、标签分布、最常使用、最近使用、每周趋势等图表。
 * 配色复用词库面板同款 TONE token，随宿主主题自动深浅；无第三方图表依赖。
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { PLT } from "../../utils/i18n.js";
import { fallbackT } from "../../utils/i18n.js";
import { useDataChanged } from "../../utils/data-sync.js";
import {
  getStats,
  type HeatmapCell,
  type LibraryStats,
  type PromptStatsData,
  type StatsSnapshot,
} from "../../utils/api.js";
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

/** 概览统计卡片：标签 + 大号数值 + 可选副文案。 */
function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: string }): ReactNode {
  const TONE = getTone();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        padding: "9px 11px",
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
/** 核心 KPI 大数字卡：用于概览页定位最关键指标，突出大号数字。 */
function KpiCard({ label, value, sub }: { label: string; value: ReactNode; sub?: string }): ReactNode {
  const TONE = getTone();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "10px 12px",
        background: TONE.row,
        border: `1px solid ${TONE.border}`,
        borderRadius: 8,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 10, color: TONE.quiet, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </span>
      <span style={{ fontSize: 26, fontWeight: 700, color: TONE.text, lineHeight: 1.15 }}>{value}</span>
      {sub ? <span style={{ fontSize: 10, color: TONE.muted }}>{sub}</span> : null}
    </div>
  );
}

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
          gap: 8,
        }}
      >
        {/* 主题色引导条：统一各 tab 区块标题的可读层级 */}
        <span style={{ width: 3, height: 13, borderRadius: 2, background: TONE.accent, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>{title}</span>
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
                opacity={0.88}
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
                opacity={0.88}
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
  // 彩色热力：次数越高颜色沿 蓝→青→绿→黄→橙→红 渐变；0 用淡边框底。
  const heatStops: Array<[number, [number, number, number]]> = [
    [0, [59, 130, 246]], // 蓝
    [0.2, [6, 182, 212]], // 青
    [0.4, [34, 197, 94]], // 绿
    [0.6, [234, 179, 8]], // 黄
    [0.8, [249, 115, 22]], // 橙
    [1, [239, 68, 68]], // 红
  ];
  const heatColor = (ratio: number): string => {
    const r = Math.max(0, Math.min(1, ratio));
    for (let i = 1; i < heatStops.length; i++) {
      const [t0, c0] = heatStops[i - 1];
      const [t1, c1] = heatStops[i];
      if (r <= t1) {
        const k = (r - t0) / (t1 - t0);
        const ch = c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
        return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`;
      }
    }
    return "rgb(239, 68, 68)";
  };
  const fill = (count: number): string => (count <= 0 ? `color-mix(in srgb, ${TONE.border} 35%, transparent)` : heatColor(count / max));
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

// ── 「洞察」tab：词库健康评分 / 成长曲线 / 使用高峰 / 词库热榜 ──────────────

/** 词库健康评分卡：综合「利用率 / 近30天活跃 / AI完善率」算 0-100 分并分档。 */
function HealthCard({ stats, T }: { stats: LibraryStats; T: PLT }): ReactNode {
  const TONE = getTone();
  const util = stats.total > 0 ? Math.round((stats.usedCount / stats.total) * 100) : 0;
  const active30 = stats.total > 0 ? Math.round((stats.usedIn30Days / stats.total) * 100) : 0;
  const ai = stats.aiRefinedPct;
  const score = Math.round(util * 0.45 + active30 * 0.35 + ai * 0.2);
  const lv =
    score >= 85 ? "great" : score >= 70 ? "good" : score >= 50 ? "ok" : "poor";
  const color = lv === "great" ? TONE.mint : lv === "good" ? TONE.accent : lv === "ok" ? "#f59e0b" : TONE.red;
  const label =
    lv === "great" ? T("pl.stats.healthGreat") : lv === "good" ? T("pl.stats.healthGood") : lv === "ok" ? T("pl.stats.healthOk") : T("pl.stats.healthPoor");
  const dims = [
    { key: "util", label: T("pl.stats.healthDimUtil"), val: util },
    { key: "act", label: T("pl.stats.healthDimActive"), val: active30 },
    { key: "ai", label: T("pl.stats.healthDimAi"), val: ai },
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "12px 14px",
        background: TONE.row,
        border: `1px solid ${TONE.border}`,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          width: 74,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color }}>{score}</span>
        <span style={{ fontSize: 11, color, fontWeight: 560 }}>{label}</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        {dims.map((d) => (
          <div key={d.key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: TONE.muted }}>
              <span>{d.label}</span>
              <span>{d.val}%</span>
            </div>
            <div style={{ height: 5, background: TONE.accentSoft, borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, d.val)}%`,
                  background: color,
                  borderRadius: 3,
                  transition: "width .3s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 成长曲线：把每周快照的「新增 / 使用」累计成两条面积折线，看长期成长。 */
function GrowthChart({ snapshots, T }: { snapshots: StatsSnapshot[]; T: PLT }): ReactNode {
  const TONE = getTone();
  if (snapshots.length === 0) {
    return (
      <div style={{ padding: "14px 12px", color: TONE.quiet, fontSize: 12, textAlign: "center" }}>
        {T("pl.stats.trendEmpty")}
      </div>
    );
  }
  let ca = 0;
  let cu = 0;
  const added: number[] = [];
  const used: number[] = [];
  snapshots.forEach((s) => {
    ca += s.stats.addedCount;
    cu += s.stats.usageCount;
    added.push(ca);
    used.push(cu);
  });
  const W = 340;
  const H = 120;
  const TOP = 8;
  const BOT = 16;
  const innerH = H - TOP - BOT;
  const max = Math.max(1, ...added, ...used);
  const n = snapshots.length;
  const x = (i: number): number => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number): number => TOP + innerH - (v / max) * innerH;
  const linePath = (arr: number[]): string =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPath = (arr: number[]): string =>
    `${linePath(arr)} L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const lastAdded = added[added.length - 1];
  const lastUsed = used[used.length - 1];
  const dayLabel = (i: number): string =>
    new Date(snapshots[i].createdAt).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label={T("pl.stats.growthTitle")}>
        {[0, 0.5, 1].map((f) => {
          const yy = TOP + innerH - innerH * f;
          return <line key={f} x1={0} x2={W} y1={yy} y2={yy} stroke={TONE.border} strokeWidth={1} />;
        })}
        <path d={areaPath(used)} fill={TONE.mint} opacity={0.18} />
        <path d={linePath(used)} stroke={TONE.mint} strokeWidth={1.8} fill="none" />
        <path d={areaPath(added)} fill={TONE.accent} opacity={0.16} />
        <path d={linePath(added)} stroke={TONE.accent} strokeWidth={1.8} fill="none" />
        {n > 1 && (
          <>
            <text x={x(0)} y={H - 4} textAnchor="start" fontSize={8} fill={TONE.quiet}>
              {dayLabel(0)}
            </text>
            <text x={x(n - 1)} y={H - 4} textAnchor="end" fontSize={8} fill={TONE.quiet}>
              {dayLabel(n - 1)}
            </text>
          </>
        )}
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center" }}>
        <Legend color={TONE.accent} label={`${T("pl.stats.cumAdded")} · ${lastAdded}`} />
        <Legend color={TONE.mint} label={`${T("pl.stats.cumUsed")} · ${lastUsed}`} />
      </div>
    </div>
  );
}

/** 使用高峰洞察：从热力图取最高频时段 + 高频时段小榜。 */
function PeakInsight({ heatmap, T }: { heatmap: HeatmapCell[]; T: PLT }): ReactNode {
  const TONE = getTone();
  if (heatmap.length === 0) {
    return (
      <div style={{ padding: "14px 12px", color: TONE.quiet, fontSize: 12, textAlign: "center" }}>
        {T("pl.stats.emptyList")}
      </div>
    );
  }
  const sorted = [...heatmap].sort((a, b) => b.count - a.count);
  const p1 = sorted[0];
  const p2 = sorted.find((c) => !(c.weekday === p1.weekday && c.hour === p1.hour));
  const top5 = sorted.slice(0, 5);
  const max5 = Math.max(1, top5[0].count);
  const hourLabel = (h: number): string => `${String(h).padStart(2, "0")}:00`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
        <span style={{ fontSize: 12, fontWeight: 560, color: TONE.accent }}>
          {T("pl.stats.peakPrimary", { day: T(WEEK_KEYS[p1.weekday]), hour: hourLabel(p1.hour), n: p1.count })}
        </span>
        {p2 ? (
          <span style={{ fontSize: 11, color: TONE.muted }}>
            {T("pl.stats.peakSecondary", { day: T(WEEK_KEYS[p2.weekday]), hour: hourLabel(p2.hour) })}
          </span>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {top5.map((c) => (
          <div key={`${c.weekday}:${c.hour}`} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: TONE.muted }}>
              <span>
                {T(WEEK_KEYS[c.weekday])} {hourLabel(c.hour)}
              </span>
              <span>{c.count} {T("pl.stats.times")}</span>
            </div>
            <div style={{ height: 5, background: TONE.accentSoft, borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(c.count / max5) * 100}%`,
                  background: TONE.accent,
                  borderRadius: 3,
                  transition: "width .3s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 词库热榜：最热标签 + 本周最热技能。 */
function HotRank({ stats, T }: { stats: LibraryStats; T: PLT }): ReactNode {
  const tagRows: Array<{ key: string; label: string; value: number }> = stats.tagStats
    .slice(0, 8)
    .map((t) => ({ key: t.name, label: t.name, value: t.count }));
  const weekRows: Array<{ key: string; label: string; value: number }> = (stats.topUsed7 ?? []).map((p) => ({
    key: p.title,
    label: p.title,
    value: p.count,
  }));
  return (
    <>
      <Section title={T("pl.stats.hotRankTags")}>
        <BarList rows={tagRows} T={T} />
      </Section>
      <Section title={T("pl.stats.hotRankWeek")}>
        <BarList rows={weekRows} T={T} />
      </Section>
    </>
  );
}

/** 汇总各统计视角的单页看板：去除顶部 tab 切换，一屏纵览全部指标。
 *  返回左右两栏内容（左：总览核心；右：深度洞察），由 StatsPanel 组装成与人格管理一致的两栏布局。 */
function StatsDashboard({
  stats,
  snapshots,
  heatmap,
  T,
}: {
  stats: LibraryStats;
  snapshots: StatsSnapshot[];
  heatmap: HeatmapCell[];
  T: PLT;
}): ReactNode {
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();
  const usedRate = stats.total > 0 ? Math.round((stats.usedCount / stats.total) * 100) : 0;
  // 最近一次每周统计快照（每 7 天自动统计一次），用于「近 7 天分析」
  const lastSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  // 最常使用（全量）
  const topUsedRows = stats.topUsed.map((p) => ({
    key: p.title,
    label: p.title,
    value: p.usageCount,
    sub: formatAgo(p.lastUsedAt, T),
  }));

  // 左栏：总览核心（健康评分 / 核心 KPI / 近 7 天分析 / 生命周期 / 每周趋势 / 成长曲线）
  const left = (
    <>
      {/* 词库健康评分 */}
      <Section title={T("pl.stats.healthTitle")}>
        <HealthCard stats={stats} T={T} />
      </Section>

      {/* 概览核心 KPI：大数字仪表盘 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <KpiCard label={T("pl.stats.total")} value={stats.total} />
        <KpiCard label={T("pl.stats.totalUsage")} value={stats.totalUsage} />
        <KpiCard label={T("pl.stats.usedRate")} value={`${usedRate}%`} sub={T("pl.stats.usedCount", { count: stats.usedCount })} />
        <KpiCard label={T("pl.stats.aiRefined")} value={`${stats.aiRefinedPct}%`} sub={T("pl.stats.aiRefinedCount", { count: stats.aiRefinedCount })} />
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
              <StatCard label={T("pl.stats.analysisUsage")} value={lastSnap.stats.usageCount} sub={T("pl.stats.analysisActive", { n: lastSnap.stats.usedPromptCount })} />
              <StatCard label={T("pl.stats.analysisAi")} value={lastSnap.stats.aiRefinedCount} />
            </div>
            {/* 每周快照的 AI 点评（生成快照时若 AI 可用自动写入） */}
            {lastSnap.comment ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "9px 11px", background: TONE.row, border: `1px solid ${TONE.border}`, borderRadius: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 560, color: TONE.accent }}>{T("pl.stats.aiComment")}</span>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: TONE.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{lastSnap.comment}</p>
              </div>
            ) : null}
            {/* 新增提示词 */}
            {lastSnap.stats.addedTitles.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: TONE.quiet }}>{T("pl.stats.analysisNewTitles")}</span>
                {lastSnap.stats.addedTitles.map((tt) => (
                  <div key={tt} style={{ padding: "5px 10px", background: TONE.row, border: `1px solid ${TONE.border}`, borderRadius: 7, fontSize: 12, color: TONE.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} data-tip={tt}>
                    {tt}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* 生命周期：新增 → 复用 → 沉睡 → 回收站 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatCard label={T("pl.stats.lcAdded")} value={stats.addedIn7Days} />
        <StatCard label={T("pl.stats.lcActive")} value={stats.usedIn7Days} sub={T("pl.stats.lcActive30", { n: stats.usedIn30Days })} />
        <StatCard label={T("pl.stats.lcDormant")} value={stats.unusedCount} />
        <StatCard label={T("pl.stats.lcTrash")} value={stats.trashCount} />
      </div>

      {/* 每周趋势 */}
      <Section title={T("pl.stats.trend")}>
        <TrendChart snapshots={snapshots} T={T} />
      </Section>

      {/* 成长曲线 */}
      <Section title={T("pl.stats.growthTitle")}>
        <GrowthChart snapshots={snapshots} T={T} />
      </Section>
    </>
  );

  // 右栏：深度洞察（使用高峰 / 热力图 / 热榜 / 最常使用 / 最近使用 / 沉睡提示词）
  const right = (
    <>
      {/* 使用高峰洞察 */}
      <Section title={T("pl.stats.peakTitle")}>
        <PeakInsight heatmap={heatmap} T={T} />
      </Section>

      {/* 使用热力图 */}
      <Section title={T("pl.stats.tabHeatmap")}>
        <HeatmapChart heatmap={heatmap} T={T} />
      </Section>

      {/* 词库热榜 */}
      <HotRank stats={stats} T={T} />

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
              <div key={p.title} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 10px", background: TONE.row, border: `1px solid ${TONE.border}`, borderRadius: 7, alignItems: "baseline", minWidth: 0 }}>
                <span style={{ fontSize: 12, color: TONE.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }} data-tip={p.title}>{p.title}</span>
                <span style={{ fontSize: 11, color: TONE.muted, flexShrink: 0, whiteSpace: "nowrap" }}>{formatAgo(p.lastUsedAt, T)}</span>
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
              <div key={p.title} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 10px", background: TONE.row, border: `1px solid ${TONE.border}`, borderRadius: 7, alignItems: "baseline", minWidth: 0 }}>
                <span style={{ fontSize: 12, color: TONE.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }} data-tip={p.title}>{p.title}</span>
                <span style={{ fontSize: 11, color: TONE.quiet, flexShrink: 0, whiteSpace: "nowrap" }}>{T("pl.stats.days", { days: p.days })}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );

  return (
    /* 内容区：与人格管理一致的两栏布局，左右两栏各自独立滚动 */
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        gap: 2,
      }}
    >
      {/* 左栏：总览核心（独立滚动） */}
      <div
        style={{
          flex: "1 1 0",
          minWidth: 0,
          minHeight: 0,
          height: "100%",
          boxSizing: "border-box",
          background: TONE.row,
          border: `1px solid ${TONE.border}`,
          borderRadius: 10,
          overflowY: "auto",
        }}
      >
        {/* 顶部标题：内容向上滚动时悬浮固定（与人格管理一致） */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 3,
            padding: "10px 10px 8px",
            background: TONE.row,
            borderBottom: `1px solid ${TONE.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 3, height: 13, borderRadius: 2, background: TONE.accent, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TONE.text }}>
              {T("pl.stats.tabOverview")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "10px 10px 14px" }}>
          {left}
        </div>
      </div>

      {/* 右栏：深度洞察（独立滚动） */}
      <div
        style={{
          flex: "1 1 0",
          minWidth: 0,
          minHeight: 0,
          height: "100%",
          boxSizing: "border-box",
          background: TONE.row,
          border: `1px solid ${TONE.border}`,
          borderRadius: 10,
          overflowY: "auto",
        }}
      >
        {/* 顶部标题：内容向上滚动时悬浮固定（与人格管理一致） */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 3,
            padding: "10px 10px 8px",
            background: TONE.row,
            borderBottom: `1px solid ${TONE.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 3, height: 13, borderRadius: 2, background: TONE.accent, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TONE.text }}>
              {T("pl.stats.tabInsight")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "10px 10px 14px" }}>
          {right}
        </div>
      </div>
    </div>
  );
}

/** 统计可视化面板（供看板弹窗渲染，单页纵览全部指标）。 */
export function StatsPanel({ t }: { t?: PLT }): ReactNode {
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();
  const T = t ?? fallbackT;
  const [data, setData] = useState<PromptStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      {error && (
        <div
          style={{
            flexShrink: 0,
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
        <StatsDashboard stats={data.stats} snapshots={data.snapshots} heatmap={data.heatmap ?? []} T={T} />
      )}
    </div>
  );
}