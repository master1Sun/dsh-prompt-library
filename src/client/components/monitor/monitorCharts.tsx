/**
 * 会话监控面板的 SVG 图表组件。
 * 从 TokenMonitorView 拆出：环形图 Donut 与折线图 Sparkline（无需 echarts）。
 */
import type { ReactNode } from "react";
import { S } from "./monitorShared.js";

/** SVG 环形图：多段圆环占比展示，中心可叠加标题/数值（无需 echarts）。 */
export function Donut({
  segments,
  size = 132,
  stroke = 15,
  center,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  stroke?: number;
  center?: ReactNode;
}) {
  const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className={`${S}-donut`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--dsw-alias-interactive-bg-hover)"
          strokeWidth={stroke}
        />
        {total > 0 &&
          segments.map((s, i) => {
            const pct = Math.max(0, s.value) / total;
            if (pct <= 0) return null;
            const dash = pct * c;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-acc * c}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap="butt"
                style={{ transition: "stroke-dasharray .24s ease, stroke-dashoffset .24s ease" }}
              />
            );
            acc += pct;
            return el;
          })}
      </svg>
      {center && <div className={`${S}-donutCenter`}>{center}</div>}
    </div>
  );
}

/** SVG 折线图：展示时间序列数据（如 token 流速），带填充区域。 */
export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
}

export function Sparkline({ data, width = 300, height = 60, color = "#60a5fa", fillColor = "rgba(96, 165, 250, 0.1)" }: SparklineProps) {
  if (data.length < 2) return <div style={{ height }} />;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  // 生成路径点
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  // 填充区域路径（闭合到基线）
  const fillPath = `M 0,${height} L ${points.replace(/ /g, " L ")} L ${width},${height} Z`;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={fillPath} fill={fillColor} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
