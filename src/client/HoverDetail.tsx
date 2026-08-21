/**
 * 提示词悬停详情浮层。
 *
 * 在聊天面板 / 侧边栏中，鼠标移入提示词正文时，在光标附近显示一个详情卡片，
 * 仅展示正文内容（标题、标签、摘要等不展示）。卡片可交互：内容过长时可滚动查看。
 *
 * 为避免移出正文后卡片立刻消失（无法滚到卡片上），采用 160ms 延迟隐藏：
 * 鼠标从正文移入卡片期间会取消隐藏，移出卡片后再延迟隐藏。
 */
import { useRef, useState, type ReactNode } from "react";
import type { Prompt } from "../types.js";
import { clampTitle } from "../types.js";

const MONO =
  '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "黑体", sans-serif';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 20%, transparent)",
} as const;

/** 详情卡片宽度与正文最大高度（用于定位钳制与滚动）。 */
const CARD_W = 300;
const BODY_H = 200;
const MARGIN = 10;
/** 鼠标移出正文/卡片后，延迟隐藏的时间（毫秒），用于留出移入卡片滚动的时间。 */
const HIDE_DELAY_MS = 320;

interface DetailState {
  prompt: Prompt;
  x: number;
  y: number;
}

/**
 * 悬停详情钩子：返回 show / leave / hide 与要渲染的浮层节点。
 * - show：以光标位置为基准显示并定位卡片（自动翻转/钳制到视口内）；
 * - leave：鼠标离开触发区时延迟隐藏（给移入卡片留时间）；
 * - hide：立即隐藏（点击、操作等场景）。
 */
export function useHoverDetail(): {
  show: (prompt: Prompt, clientX: number, clientY: number) => void;
  leave: () => void;
  hide: () => void;
  overlay: ReactNode;
} {
  const [detail, setDetail] = useState<DetailState | null>(null);
  // 记录最近一次定位，避免鼠标微动时频繁触发重渲染
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  // 延迟隐藏计时器：允许鼠标从正文预览移入卡片后滚动查看
  const hideTimer = useRef<number | null>(null);

  const cancelHide = () => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null;
      lastPos.current = null;
      setDetail(null);
    }, HIDE_DELAY_MS);
  };

  const show = (prompt: Prompt, clientX: number, clientY: number) => {
    cancelHide();
    const last = lastPos.current;
    if (
      last &&
      Math.abs(last.x - clientX) < 6 &&
      Math.abs(last.y - clientY) < 6
    ) {
      return;
    }
    lastPos.current = { x: clientX, y: clientY };

    // 卡片总高估算（标题/标签头部 + 正文上限）
    const cardTotal = BODY_H + 78;
    // 默认显示在鼠标右下；空间不足时翻转到鼠标左侧，并钳制在视口内
    let x = clientX + 14;
    let y = clientY + 14;
    if (x + CARD_W > window.innerWidth - MARGIN) x = clientX - CARD_W - 14;
    if (y + cardTotal > window.innerHeight - MARGIN)
      y = Math.max(MARGIN, window.innerHeight - cardTotal - MARGIN);
    x = Math.max(MARGIN, x);
    setDetail({ prompt, x, y });
  };

  const leave = scheduleHide;

  const hide = () => {
    cancelHide();
    lastPos.current = null;
    setDetail(null);
  };

  const overlay = detail ? (
    <>
      <style>{`@keyframes pl-hover-pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}.pl-hover-card::-webkit-scrollbar{width:6px}.pl-hover-card::-webkit-scrollbar-thumb{background:rgba(196,211,232,0.25);border-radius:3px}.pl-hover-card::-webkit-scrollbar-thumb:hover{background:rgba(196,211,232,0.4)}`}</style>
      <div
        role="tooltip"
        className="pl-hover-card"
        onMouseEnter={cancelHide}
        onMouseLeave={scheduleHide}
        style={{
          position: "fixed",
          left: detail.x,
          top: detail.y,
          zIndex: 2147483646,
          width: CARD_W,
          boxSizing: "border-box",
          padding: "10px 12px",
          color: TONE.text,
          background: TONE.panel,
          border: `1px solid ${TONE.borderStrong}`,
          borderRadius: 10,
          fontFamily: MONO,
          fontSize: 12,
          lineHeight: 1.6,
          pointerEvents: "auto",
          animation: "pl-hover-pop 0.24s cubic-bezier(.22,1,.36,1)",
        }}
      >
        {/* 标题行 */}
        {detail.prompt.title ? (
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              lineHeight: 1.4,
              color: TONE.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: 6,
            }}
          >
            {clampTitle(detail.prompt.title)}
          </div>
        ) : null}

        {/* 标签行 */}
        {detail.prompt.tags && detail.prompt.tags.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 5,
              marginBottom: 8,
            }}
          >
            {detail.prompt.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "1px 7px",
                  borderRadius: 6,
                  fontSize: 10.5,
                  lineHeight: 1.7,
                  background: TONE.accentSoft,
                  color: TONE.accent,
                  whiteSpace: "nowrap",
                }}
              >
                {tag}
              </span>
            ))}
            {detail.prompt.tags.length > 4 ? (
              <span style={{ fontSize: 10.5, color: TONE.quiet, padding: "1px 0" }}>
                +{detail.prompt.tags.length - 4}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 分隔线 */}
        {(detail.prompt.title || (detail.prompt.tags && detail.prompt.tags.length > 0)) ? (
          <div style={{ height: 1, background: TONE.border, margin: "0 0 8px" }} />
        ) : null}

        {/* 正文（过长可滚动） */}
        <div
          style={{
            maxHeight: BODY_H,
            overflowY: "auto",
            color: TONE.muted,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {detail.prompt.body}
        </div>
      </div>
    </>
  ) : null;

  return { show, leave, hide, overlay };
}
