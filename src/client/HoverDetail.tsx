/**
 * 提示词悬停详情浮层。
 *
 * 在聊天面板 / 侧边栏中，鼠标移入提示词行时，在光标附近显示一个详情卡片：
 * 标题、使用次数、标签与完整正文。卡片 pointer-events: none，
 * 避免遮挡行本身的悬停交互。
 */
import { useRef, useState, type ReactNode } from "react";
import type { Prompt } from "../types.js";

const MONO =
  '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "黑体", sans-serif';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
} as const;

/** 详情卡片宽度与最大高度（用于定位钳制）。 */
const CARD_W = 320;
const CARD_H = 240;
const MARGIN = 10;

interface DetailState {
  prompt: Prompt;
  x: number;
  y: number;
}

/**
 * 悬停详情钩子：返回 show / hide 与要渲染的浮层节点。
 * show 会以光标位置为基准定位卡片，并自动翻转/钳制到视口内。
 */
export function useHoverDetail(): {
  show: (prompt: Prompt, clientX: number, clientY: number) => void;
  hide: () => void;
  overlay: ReactNode;
} {
  const [detail, setDetail] = useState<DetailState | null>(null);
  // 记录最近一次定位，避免鼠标微动时频繁触发重渲染
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const show = (prompt: Prompt, clientX: number, clientY: number) => {
    const last = lastPos.current;
    if (
      last &&
      Math.abs(last.x - clientX) < 6 &&
      Math.abs(last.y - clientY) < 6
    ) {
      return;
    }
    lastPos.current = { x: clientX, y: clientY };

    // 默认显示在鼠标右下；空间不足时翻转到鼠标左侧，并钳制在视口内
    let x = clientX + 14;
    let y = clientY + 14;
    if (x + CARD_W > window.innerWidth - MARGIN) x = clientX - CARD_W - 14;
    if (y + CARD_H > window.innerHeight - MARGIN)
      y = Math.max(MARGIN, window.innerHeight - CARD_H - MARGIN);
    x = Math.max(MARGIN, x);
    setDetail({ prompt, x, y });
  };

  const hide = () => {
    lastPos.current = null;
    setDetail(null);
  };

  const overlay = detail ? (
    <div
      role="tooltip"
      style={{
        position: "fixed",
        left: detail.x,
        top: detail.y,
        zIndex: 2147483646,
        width: CARD_W,
        maxHeight: CARD_H,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 14px",
        color: TONE.text,
        background: TONE.panel,
        border: `1px solid ${TONE.borderStrong}`,
        borderRadius: 10,
        boxShadow: "0 10px 32px rgba(3, 8, 18, 0.42)",
        fontFamily: MONO,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "baseline",
        }}
      >
        <strong
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: TONE.text,
            wordBreak: "break-word",
          }}
        >
          {detail.prompt.title}
        </strong>
        {detail.prompt.usageCount > 0 && (
          <span style={{ color: TONE.quiet, fontSize: 10, flexShrink: 0 }}>
            {detail.prompt.usageCount}次
          </span>
        )}
      </div>
      {detail.prompt.tags && detail.prompt.tags.length > 0 && (
        <div style={{ color: TONE.quiet, fontSize: 11 }}>
          {detail.prompt.tags.map((t) => `#${t}`).join(" ")}
        </div>
      )}
      {detail.prompt.summary && (
        <div
          style={{
            color: TONE.accent,
            fontSize: 11,
            lineHeight: 1.5,
            borderLeft: `2px solid ${TONE.accent}`,
            paddingLeft: 8,
          }}
        >
          {detail.prompt.summary}
        </div>
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          color: TONE.muted,
          fontSize: 12,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {detail.prompt.body}
      </div>
    </div>
  ) : null;

  return { show, hide, overlay };
}
