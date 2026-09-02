/**
 * 会话活动热力图组件（GitHub 风格）。
 *
 * 显示最近 52 周的会话活跃度，按天聚合 token 消耗和成本数据。
 * 支持悬停提示和点击交互。
 */
import { useMemo, useState } from "react";
import type { ConversationNode } from "@deepseek-ai/dsh-client-runtime/client";

interface DailyActivity {
  date: string; // ISO 日期字符串 "2026-08-31"
  sessionCount: number;
  totalTokens: number;
  estimatedCost: number;
}

interface SessionHeatmapProps {
  nodes: readonly ConversationNode[] | null | undefined;
  onDayClick?: (date: string) => void;
}

/** 格式化日期为 YYYY-MM-DD */
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 容错读取 usage 输出 token 数（兼容多种常见结构）。 */
function usageOutputTokens(usage: unknown): number | null {
  if (!usage || typeof usage !== "object") return null;
  const u = usage as Record<string, unknown>;
  const pick = (obj: Record<string, unknown> | null): number | null => {
    if (!obj) return null;
    for (const k of ["outputTokens", "output_tokens", "completionTokens", "completion_tokens", "output"]) {
      const v = obj[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
    }
    return null;
  };
  const direct = pick(u);
  if (direct !== null) return direct;
  const nested =
    typeof u.tokenUsage === "object"
      ? (u.tokenUsage as Record<string, unknown>)
      : typeof u.usage === "object"
        ? (u.usage as Record<string, unknown>)
        : null;
  return pick(nested);
}

/** 从节点中提取每日活动数据 */
function extractDailyActivity(nodes: readonly ConversationNode[]): DailyActivity[] {
  const map = new Map<string, DailyActivity>();

  for (const node of nodes) {
    if (node.kind !== "assistant" || typeof node.time !== "number") continue;

    const date = new Date(node.time);
    const dateStr = formatDate(date);

    // 提取 token 统计
    const outTokens = usageOutputTokens(node.usage) ?? 0;
    const tokens = outTokens;

    // 简单成本估算（DeepSeek 默认价格）
    const cost = (outTokens * 8) / 1e6;

    const existing = map.get(dateStr);
    if (existing) {
      existing.sessionCount += 1;
      existing.totalTokens += tokens;
      existing.estimatedCost += cost;
    } else {
      map.set(dateStr, {
        date: dateStr,
        sessionCount: 1,
        totalTokens: tokens,
        estimatedCost: cost,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** 生成最近 52 周的日期矩阵 */
function generateWeekMatrix(endDate: Date): Date[][] {
  const weeks: Date[][] = [];
  const startOffset = 52 * 7; // 52 周前的天数

  for (let week = 0; week < 52; week++) {
    const weekDates: Date[] = [];
    for (let day = 0; day < 7; day++) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - startOffset + week * 7 + day);
      weekDates.push(d);
    }
    weeks.push(weekDates);
  }

  return weeks;
}

/** 根据活动强度返回颜色等级 (0-4) */
function getActivityLevel(value: number, max: number): number {
  if (value === 0) return 0;
  const ratio = value / max;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

/** 获取颜色 */
function getCellColor(level: number): string {
  const colors = [
    "var(--dsw-alias-bg-subtle)",   // 0: 无活动
    "#c6e48b",                       // 1: 低
    "#7bc96f",                       // 2: 中
    "#239a3b",                       // 3: 高
    "#196127",                       // 4: 极高
  ];
  return colors[level] || colors[0];
}

export function SessionHeatmap({ nodes, onDayClick }: SessionHeatmapProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // 提取每日活动数据
  const dailyData = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];
    return extractDailyActivity(nodes);
  }, [nodes]);

  // 构建日期到活动数据的映射
  const dataByDate = useMemo(() => {
    const map = new Map<string, DailyActivity>();
    for (const d of dailyData) {
      map.set(d.date, d);
    }
    return map;
  }, [dailyData]);

  // 找到最大值用于颜色分级
  const maxValue = useMemo(() => {
    if (dailyData.length === 0) return 0;
    return Math.max(...dailyData.map((d) => d.sessionCount));
  }, [dailyData]);

  // 生成 52 周的日期矩阵
  const weeks = useMemo(() => {
    const endDate = new Date();
    return generateWeekMatrix(endDate);
  }, []);

  // 月份标签
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 52; i += 4) {
      const d = new Date(now);
      d.setDate(d.getDate() - (52 - i) * 7);
      labels.push({
        month: d.toLocaleDateString("zh-CN", { month: "short" }),
        weekIndex: i,
      });
    }
    return labels;
  }, []);

  const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

  if (!nodes || nodes.length === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "var(--dsw-alias-label-tertiary)" }}>
        暂无会话数据
      </div>
    );
  }

  return (
    <div className="heatmap-wrapper">
      {/* 月份标签 */}
      <div className="heatmap-months">
        {monthLabels.map((label, i) => (
          <span
            key={i}
            className="heatmap-month-label"
            style={{ marginLeft: label.weekIndex * 14 }}
          >
            {label.month}
          </span>
        ))}
      </div>

      <div className="heatmap-grid">
        {/* 星期标签 */}
        <div className="heatmap-weekdays">
          {weekDays.map((day, i) => (
            <div key={i} className="heatmap-weekday-label">
              {day}
            </div>
          ))}
        </div>

        {/* 热力图网格 */}
        <div className="heatmap-cells">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="heatmap-week">
              {week.map((date, dayIdx) => {
                const dateStr = formatDate(date);
                const activity = dataByDate.get(dateStr);
                const level = activity
                  ? getActivityLevel(activity.sessionCount, maxValue)
                  : 0;

                return (
                  <div
                    key={`${weekIdx}-${dayIdx}`}
                    className="heatmap-cell"
                    style={{ backgroundColor: getCellColor(level) }}
                    onMouseEnter={() => setHoveredDate(dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                    onClick={() => onDayClick?.(dateStr)}
                    title={dateStr}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 悬停提示 */}
      {hoveredDate && dataByDate.has(hoveredDate) && (
        <div className="heatmap-tooltip">
          <div className="heatmap-tooltip-date">{hoveredDate}</div>
          {(() => {
            const data = dataByDate.get(hoveredDate)!;
            return (
              <>
                <div>会话数: {data.sessionCount}</div>
                <div>Token: {data.totalTokens.toLocaleString()}</div>
                <div>预估成本: ¥{data.estimatedCost.toFixed(4)}</div>
              </>
            );
          })()}
        </div>
      )}

      {/* 图例 */}
      <div className="heatmap-legend">
        <span>少</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="heatmap-legend-cell"
            style={{ backgroundColor: getCellColor(level) }}
          />
        ))}
        <span>多</span>
      </div>

      <style>{`
        .heatmap-wrapper {
          position: relative;
          padding: 8px 0;
        }

        .heatmap-months {
          display: flex;
          margin-bottom: 4px;
          font-size: 10px;
          color: var(--dsw-alias-label-secondary);
          height: 16px;
          overflow: hidden;
        }

        .heatmap-month-label {
          position: absolute;
          font-size: 10px;
          color: var(--dsw-alias-label-secondary);
        }

        .heatmap-grid {
          display: flex;
          gap: 4px;
        }

        .heatmap-weekdays {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 9px;
          color: var(--dsw-alias-label-tertiary);
          line-height: 12px;
        }

        .heatmap-weekday-label {
          height: 12px;
          display: flex;
          align-items: center;
        }

        .heatmap-cells {
          display: flex;
          gap: 2px;
        }

        .heatmap-week {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .heatmap-cell {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .heatmap-cell:hover {
          stroke: var(--dsw-alias-border-strong);
          stroke-width: 2px;
          transform: scale(1.2);
        }

        .heatmap-tooltip {
          position: absolute;
          top: 50%;
          right: 12px;
          background: var(--dsw-alias-bg-layer-2);
          border: 1px solid var(--dsw-alias-border-l2);
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 11px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          z-index: 100;
          pointer-events: none;
        }

        .heatmap-tooltip-date {
          font-weight: 600;
          margin-bottom: 4px;
          color: var(--dsw-alias-label-primary);
        }

        .heatmap-legend {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          font-size: 10px;
          color: var(--dsw-alias-label-secondary);
        }

        .heatmap-legend-cell {
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
