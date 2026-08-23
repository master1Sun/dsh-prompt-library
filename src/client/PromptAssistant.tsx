/**
 * 词库助手（独立组件）。
 *
 * 以一个小人形象常驻屏幕，可独立拖动；悬停时展示功能简介气泡，未悬停时也会
 * 按设置的频率自动冒气泡提示。与右侧面板解耦：本组件自管理位置/冒泡/简介，
 * 不再内嵌于面板状态。需要与面板联动时，父级通过 onTogglePanel 回调接收「点击小人」事件。
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import type { PluginSettings } from "../types.js";
import { DEFAULT_SETTINGS } from "../types.js";
import { genIntro } from "./api.js";
import { type PLTranslate, usePLT } from "./i18n.js";

const TONE = {
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  quiet: "var(--dsw-alias-label-tertiary, #9ca3af)",
  panel: "var(--dsw-specific-sidebar-fill, #f5f6f7)",
  border: "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))",
  accent: "var(--dsw-alias-brand-primary, #2563eb)",
} as const;

/** 小人尺寸。 */
const PERSON_SIZE = 72;
/** 屏幕四周最小边距（含顶部落差给宿主 header）。 */
const FLOAT_MARGIN = 8;
/** 词库助手位置在 localStorage 中的存储键。 */
const POS_KEY = "pl:assistant-pos";

interface Props {
  t?: PLTranslate;
  /** 冒泡频率/时长设置；缺省时用默认值。 */
  settings?: PluginSettings;
  /** 点击小人时的回调（由父级决定是否联动右侧面板开合）；缺省则点击仅聚焦气泡。 */
  onTogglePanel?: () => void;
}

/** 把 v 夹取到 [lo, hi]（hi 至少为 lo，避免视口过小）。 */
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(lo, v), Math.max(lo, hi));
}

interface Pos {
  px: number;
  py: number;
}

/** 读入上次的小人位置；首次进入默认落屏幕右下角。 */
function loadPos(): Pos {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const def: Pos = {
    px: Math.max(FLOAT_MARGIN, w - PERSON_SIZE - FLOAT_MARGIN),
    py: Math.max(FLOAT_MARGIN, h - PERSON_SIZE - FLOAT_MARGIN),
  };
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) return { ...def, ...(JSON.parse(raw) as Partial<Pos>) };
  } catch {
    /* 读取失败用默认 */
  }
  return def;
}

export function PromptAssistant(props: Props): ReactNode {
  const { t, settings, onTogglePanel } = props;
  const T = usePLT(t);

  // 小人位置：独立持久化，与右侧面板互不影响
  const [pos, setPos] = useState<Pos>(loadPos);
  const updatePos = useCallback((patch: Partial<Pos>) => {
    setPos((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(next));
      } catch {
        /* 忽略存储失败 */
      }
      return next;
    });
  }, []);

  // 视口变化时把小人 clamp 回可视区
  useEffect(() => {
    const onViewport = () => {
      setPos((prev) => {
        const px = clamp(prev.px, FLOAT_MARGIN, window.innerWidth - PERSON_SIZE - FLOAT_MARGIN);
        const py = clamp(prev.py, FLOAT_MARGIN, window.innerHeight - PERSON_SIZE - FLOAT_MARGIN);
        if (px === prev.px && py === prev.py) return prev;
        return { px, py };
      });
    };
    window.addEventListener("resize", onViewport);
    return () => window.removeEventListener("resize", onViewport);
  }, []);

  // 气泡显隐
  const [bubble, setBubble] = useState(false);
  // 气泡实际渲染宽度：宽高随内容动态伸缩（max-content），实时测量用于居中与尖角定位
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [bubbleW, setBubbleW] = useState(176);

  // 气泡显示时测量实际宽度；内容变化（简介轮播）时同步更新
  useEffect(() => {
    if (!bubble || !bubbleRef.current) return;
    const el = bubbleRef.current;
    const update = () => setBubbleW(el.offsetWidth || 176);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bubble]);
  // 鼠标是否悬停在小人上（供「自动冒泡」判断是否打扰用户）
  const hoverRef = useRef(false);
  // 气泡展示的功能简介：优先用首次加载时 AI 生成并缓存的词，否则用 i18n 内置词
  const [intros, setIntros] = useState<string[]>(() => [
    T("pl.intro.0"),
    T("pl.intro.1"),
    T("pl.intro.2"),
    T("pl.intro.3"),
    T("pl.intro.4"),
  ]);

  // 拖动小人：仅移动小人独立坐标；松手时若未明显移动视为「点击 → 通知父级」
  const personDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number; moved: boolean } | null>(null);
  const startPersonDrag = (e: ReactMouseEvent<HTMLElement>) => {
    e.preventDefault();
    personDragRef.current = { startX: e.clientX, startY: e.clientY, ox: pos.px, oy: pos.py, moved: false };
    const onMove = (ev: MouseEvent) => {
      const d = personDragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const px = clamp(d.ox + dx, FLOAT_MARGIN, vw - PERSON_SIZE - FLOAT_MARGIN);
      const py = clamp(d.oy + dy, FLOAT_MARGIN, vh - PERSON_SIZE - FLOAT_MARGIN);
      updatePos({ px, py });
    };
    const onUp = () => {
      const d = personDragRef.current;
      const clicked = d ? !d.moved : false;
      personDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // 点击小人：交给父级（右侧面板）决定是否切换开合
      if (clicked) onTogglePanel?.();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // 悬停气泡：功能简介轮播展示（固定较快节奏切换，移开即重置）
  const [introIdx, setIntroIdx] = useState(0);
  const rotMs = 2500;
  useEffect(() => {
    if (!bubble) {
      setIntroIdx(0);
      return;
    }
    const timer = setInterval(() => setIntroIdx((i) => i + 1), rotMs);
    return () => clearInterval(timer);
  }, [bubble]);

  // 气泡固定定位：相对视口计算并 clamp，避免小人拖到屏幕边缘时气泡被遮挡。
  // 默认显示在小人上方居中；上方放不下则显示下方，水平方向贴着小人中心并限制在视口内。
  const bubblePos = useMemo(() => {
    if (!bubble) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const W = bubbleW;
    const H = 118;
    const cx = pos.px + PERSON_SIZE / 2;
    // 锚点取「小人盒子顶部往下的可视头部高度」，让尖角指向头部而非盒子顶部的空区，
    // 避免气泡虽然贴住盒子顶边、视觉上却离头部很远。
    const ANCHOR = 18;
    const above = pos.py + ANCHOR - H >= FLOAT_MARGIN;
    const left = Math.min(Math.max(FLOAT_MARGIN, cx - W / 2), vw - W - FLOAT_MARGIN);
    // 上方：气泡底边留出 5px 悬出量，尖角恰好触到头部位置；下方：尖角朝上触到小人身下。
    const top = Math.min(
      Math.max(FLOAT_MARGIN, above ? pos.py + ANCHOR - 5 - H : pos.py + PERSON_SIZE - ANCHOR + 5),
      vh - H - FLOAT_MARGIN,
    );
    const tailLeft = cx - left - 5;
    return { left, top, above, tailLeft };
  }, [bubble, bubbleW, pos.px, pos.py]);

  // 首次加载：请求 AI 生成词库功能简介；AI 不可用或失败时保持 i18n 内置词。
  // 按「语言 + 当天日期」缓存到 localStorage：每天换新键重新请求一次，让 AI 每天出新的文案。
  useEffect(() => {
    const lang: "zh" | "en" =
      (document.documentElement.lang || "zh").toLowerCase().startsWith("en") ? "en" : "zh";
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const cacheKey = `pl:intro:${lang}:${day}`;
    let cancelled = false;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { lines?: string[] };
        if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          setIntros(parsed.lines.slice(0, 6));
          return;
        }
      }
    } catch {
      /* 缓存解析失败忽略 */
    }
    genIntro(lang)
      .then((r) => {
        if (cancelled) return;
        if (Array.isArray(r.lines) && r.lines.length > 0) {
          const lines = r.lines.slice(0, 6);
          setIntros(lines);
          try {
            // 只保留当天的简介缓存，移除同语言的历史缓存键，避免 localStorage 无限累积
            const allKeys = localStorage.keys?.() ?? [];
            for (const k of allKeys) {
              if (k.startsWith(`pl:intro:${lang}:`) && k !== cacheKey) localStorage.removeItem(k);
            }
            localStorage.setItem(cacheKey, JSON.stringify({ lines }));
          } catch {
            /* 忽略存储失败 */
          }
        }
      })
      .catch(() => {
        /* AI 不可用：保持内置简介 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 未悬停时不定时自动冒气泡展示功能简介；无论面板折叠与否都会触发（小人在场即冒泡）。
  // 悬停中或显示中则跳过本轮，间隔取自设置。
  useEffect(() => {
    const intervalMs =
      Math.max(3, settings?.personTipInterval ?? DEFAULT_SETTINGS.personTipInterval) * 1000;
    const hideDuration =
      Math.max(1, settings?.personTipDuration ?? DEFAULT_SETTINGS.personTipDuration) * 1000;
    let showT: ReturnType<typeof setTimeout> | undefined;
    let hideT: ReturnType<typeof setTimeout> | undefined;
    const loop = () => {
      showT = setTimeout(() => {
        if (hoverRef.current) {
          loop();
          return;
        }
        setIntroIdx((i) => i + 1);
        setBubble(true);
        hideT = setTimeout(() => {
          if (!hoverRef.current) setBubble(false);
          loop();
        }, hideDuration);
      }, intervalMs + Math.random() * intervalMs);
    };
    loop();
    return () => {
      if (showT) clearTimeout(showT);
      if (hideT) clearTimeout(hideT);
    };
  }, [settings?.personTipInterval, settings?.personTipDuration]);

  return (
    <>
      <style>{`
@keyframes pl-pop-in { from { opacity: 0; transform: translateY(6px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes pl-person-bob { 0%,100% { transform: translateY(0) scale(1,1); } 50% { transform: translateY(-5px) scale(1.03,.97); } }
@keyframes pl-person-shadow { 0%,100% { transform: scaleX(1); opacity: .22; } 50% { transform: scaleX(.82); opacity: .14; } }
@keyframes pl-person-blink { 0%,88%,100% { transform: scaleY(1); } 94% { transform: scaleY(.08); } }
@keyframes pl-bubble-in { from { opacity: 0; transform: translateY(6px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes pl-bubble-intro { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.pl-grab { cursor: grab; user-select: none; }
.pl-grab:active { cursor: grabbing; }
.pl-person-arm { transform-origin: 6px 8px; animation: pl-person-wave 2.4s ease-in-out infinite; }
@keyframes pl-person-wave { 0%,60%,100% { transform: rotate(0deg); } 70% { transform: rotate(-14deg); } 80% { transform: rotate(0deg); } }
`}</style>
      {/* 小人：始终显示，可独立拖动，悬停显示气泡；点击回调由父级决定是否联动面板 */}
      <div
        aria-label={T("pl.title")}
        onMouseDown={startPersonDrag}
        onMouseEnter={() => { hoverRef.current = true; setBubble(true); }}
        onMouseLeave={() => { hoverRef.current = false; setBubble(false); }}
        style={{
          position: "fixed",
          left: pos.px,
          top: pos.py,
          zIndex: 2147483647,
          width: PERSON_SIZE,
          height: PERSON_SIZE,
          cursor: "grab",
          animation: "pl-pop-in .3s cubic-bezier(.22,1,.36,1)",
          userSelect: "none",
        }}
      >
        {/* 气泡：悬停 / 自动冒泡时显示，固定定位随小人位置避让屏幕边缘 */}
        {bubble && bubblePos && (
          <div
            ref={bubbleRef}
            style={{
              position: "fixed",
              left: bubblePos.left,
              top: bubblePos.top,
              zIndex: 2147483646, // 建立层叠上下文，使尾巴 zIndex:-1 相对本气泡生效（否则会逃逸层级）
              width: "max-content", // 宽随内容动态伸缩
              minWidth: 200,
              maxWidth: 320,
              padding: "9px 14px",
              background: TONE.panel,
              color: TONE.text,
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              fontSize: 12,
              lineHeight: 1.55,
              textAlign: "center",
              boxShadow: "none",
              animation: "pl-bubble-in .2s cubic-bezier(.22,1,.36,1)",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontWeight: 600, letterSpacing: 2, marginBottom: 4 }}>{T("pl.floating.title")}</div>
            <div
              key={introIdx}
              style={{
                color: TONE.muted,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                animation: "pl-bubble-intro .45s ease",
              }}
            >
              {intros[introIdx % intros.length]}
            </div>
            {/* 轮询指示点 */}
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 7 }}>
              {intros.map((_, i) => {
                const active = i === introIdx % intros.length;
                return (
                  <span
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: active ? TONE.accent : TONE.quiet,
                      transition: "background .2s, transform .2s",
                      transform: active ? "scale(1.35)" : "scale(1)",
                    }}
                  />
                );
              })}
            </div>
            {/* 气泡小尾巴：始终指向小人中心（上方→朝下，下方→朝上）。
                方块边长 10，旋转 45° 后三角底线（两平角连线）位于方块中心。
                悬出量取半宽 5，使底线恰好落在卡片边界上，与卡片顶/底边无缝连接，
                消除「三角飘在卡片外、中间留空隙」的问题。 */}
            <span
              style={{
                position: "absolute",
                left: bubblePos.tailLeft,
                top: bubblePos.above ? "auto" : -5,
                bottom: bubblePos.above ? -5 : "auto",
                width: 10,
                height: 10,
                background: "inherit",
                zIndex: -1, // 让伸入气泡内的部分沉到背景之下，避免压盖内容
                borderRight: bubblePos.above ? `1px solid ${TONE.border}` : "none",
                borderBottom: bubblePos.above ? `1px solid ${TONE.border}` : "none",
                borderLeft: bubblePos.above ? "none" : `1px solid ${TONE.border}`,
                borderTop: bubblePos.above ? "none" : `1px solid ${TONE.border}`,
                // 两种朝向均旋 45°：上方→right+bottom 边框朝下，下方→left+top 边框朝上
                transform: "rotate(45deg)",
              }}
            />
          </div>
        )}
        {/* 小人本体：SVG 角色 + 待机动画 */}
        <div style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "none" }}>
          <svg width={PERSON_SIZE} height={PERSON_SIZE} viewBox="0 0 72 72" fill="none" style={{ position: "absolute", inset: 0, animation: "pl-person-bob 2.6s ease-in-out infinite", pointerEvents: "none", filter: "drop-shadow(0 2px 7px color-mix(in srgb, var(--dsw-alias-brand-primary, #2563eb) 45%, transparent))" }}>
            <title>{T("pl.title")}</title>
            {/* 身体 */}
            <path d="M22 47 C18 47 14 42 13 34 C12 26 18 21 25 20 C22 15 26 11 33 12 C40 11 44 15 41 20 C48 21 54 26 53 34 C52 42 48 47 44 47 Z" fill="var(--dsw-alias-brand-primary, #2563eb)" opacity=".16" />
            {/* 小手 */}
            <g className="pl-person-arm">
              <ellipse cx="36" cy="52" rx="12" ry="9" fill="var(--dsw-alias-brand-primary, #2563eb)" opacity="0.85" />
              <ellipse cx="26" cy="50" rx="5" ry="4" fill="var(--dsw-alias-interactive-bg-hover, rgba(100,116,139,.4))" />
            </g>
            {/* 脸 */}
            <circle cx="36" cy="34" r="15" fill="var(--dsw-alias-brand-primary, #2563eb)" />
            {/* 腮红 */}
            <circle cx="29" cy="37" r="2.4" fill="#fff" opacity=".55" />
            <circle cx="43" cy="37" r="2.4" fill="#fff" opacity=".55" />
            {/* 眼睛（含眨动） */}
            <g style={{ animation: "pl-person-blink 4s ease-in-out infinite", transformOrigin: "32px 34px" }}>
              <circle cx="31" cy="33" r="2.6" fill="#fff" />
              <circle cx="41" cy="33" r="2.6" fill="#fff" />
              <circle cx="32" cy="33.6" r="1.2" fill="#10141c" />
              <circle cx="42" cy="33.6" r="1.2" fill="#10141c" />
            </g>
            {/* 微笑 */}
            <path d="M30 39.5 Q36 43.5 42 39.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {/* 地面影子 */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 2,
              width: 34,
              height: 8,
              borderRadius: "50%",
              background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #2563eb) 45%, rgba(2, 6, 23, .55))",
              opacity: 0.34,
              transform: "translateX(-50%)",
              filter: "blur(1px)",
              boxShadow: "0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary, #2563eb) 30%, transparent)",
              animation: "pl-person-shadow 2.6s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </>
  );
}