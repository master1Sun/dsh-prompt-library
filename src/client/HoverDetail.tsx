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

const MONO =
  '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "黑体", sans-serif';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
} as const;

/** 详情卡片宽度与最大高度（用于定位钳制与滚动）。 */
const CARD_W = 280;
const CARD_H = 220;
const MARGIN = 10;
/** 鼠标移出正文/卡片后，延迟隐藏的时间（毫秒），用于留出移入卡片滚动的时间。 */
const HIDE_DELAY_MS = 160;

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

    // 默认显示在鼠标右下；空间不足时翻转到鼠标左侧，并钳制在视口内
    let x = clientX + 14;
    let y = clientY + 14;
    if (x + CARD_W > window.innerWidth - MARGIN) x = clientX - CARD_W - 14;
    if (y + CARD_H > window.innerHeight - MARGIN)
      y = Math.max(MARGIN, window.innerHeight - CARD_H - MARGIN);
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
      <style>{`@keyframes pl-hover-pop{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}.pl-hover-card::-webkit-scrollbar{width:6px}.pl-hover-card::-webkit-scrollbar-thumb{background:rgba(196,211,232,0.25);border-radius:3px}.pl-hover-card::-webkit-scrollbar-thumb:hover{background:rgba(196,211,232,0.4)}`}</style>
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
          maxHeight: CARD_H,
          boxSizing: "border-box",
          overflowY: "auto",
          padding: "10px 12px",
          color: TONE.muted,
          background: TONE.panel,
          border: `1px solid ${TONE.borderStrong}`,
          borderRadius: 9,
          boxShadow: "0 8px 24px rgba(3, 8, 18, 0.4)",
          fontFamily: MONO,
          fontSize: 11.5,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          pointerEvents: "auto",
          animation: "pl-hover-pop 0.12s ease-out",
        }}
      >
        {detail.prompt.body}
      </div>
    </>
  ) : null;

  return { show, leave, hide, overlay };
}
