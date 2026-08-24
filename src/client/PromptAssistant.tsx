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
import { applyUpdate, genIntro, getUpdate, type UpdateInfo } from "./api.js";
import { type PLTranslate, usePLT } from "./i18n.js";

const TONE = {
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  quiet: "var(--dsw-alias-label-tertiary, #9ca3af)",
  panel: "var(--dsw-specific-sidebar-fill, #f5f6f7)",
  border: "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))",
  accent: "var(--dsw-alias-brand-primary, #2563eb)",
  red: "var(--dsw-alias-state-error-primary, #dc2626)",
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

/** 计算贴边位置：依据给定位置（目标坐标）与传入视口，把小人缩到离它最近的屏幕边。 */
function edgePos(p: Pos, vw: number, vh: number): Pos {
  const EDGE = 12; // 贴边后留出的可见宽度/高度（像素）
  const leftSpace = p.px;
  const rightSpace = vw - (p.px + PERSON_SIZE);
  const topSpace = p.py;
  const bottomSpace = vh - (p.py + PERSON_SIZE);
  const min = Math.min(leftSpace, rightSpace, topSpace, bottomSpace);
  let px = p.px;
  let py = p.py;
  if (min === leftSpace) px = -(PERSON_SIZE - EDGE);
  else if (min === rightSpace) px = vw - EDGE;
  else if (min === topSpace) py = -(PERSON_SIZE - EDGE);
  else py = vh - EDGE;
  return { px, py };
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

  // 记录最近一次视口尺寸；任何视口/缩放变化都只触发重新计算「展示位置」，
  // 不再直接改写持久化的 home 位置，避免窗口缩小后放大无法回到原位置。
  const viewportRef = useRef({ w: window.innerWidth, h: window.innerHeight });
  const [viewVersion, setViewVersion] = useState(0);
  useEffect(() => {
    const onViewport = () => {
      viewportRef.current = { w: window.innerWidth, h: window.innerHeight };
      setViewVersion((v) => v + 1);
    };
    // 桌面端缩放不一定触发 window.resize，常见伴随 visualViewport 或 devicePixelRatio 变化，
    // 因此一并监听，确保缩放后贴边位置仍贴在新边上。
    const vv = window.visualViewport;
    window.addEventListener("resize", onViewport);
    vv?.addEventListener("resize", onViewport);
    vv?.addEventListener("scroll", onViewport);
    let lastDpr = window.devicePixelRatio;
    const iv = window.setInterval(() => {
      if (window.devicePixelRatio !== lastDpr) {
        lastDpr = window.devicePixelRatio;
        onViewport();
      }
    }, 500);
    return () => {
      window.removeEventListener("resize", onViewport);
      vv?.removeEventListener("resize", onViewport);
      vv?.removeEventListener("scroll", onViewport);
      window.clearInterval(iv);
    };
  }, []);

  // 气泡显隐
  const [bubble, setBubble] = useState(false);
  // 气泡实际渲染宽高：随内容动态伸缩（max-content），实时测量用于居中、贴头与尖角定位
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [bubbleW, setBubbleW] = useState(176);
  const [bubbleH, setBubbleH] = useState(56);

  // 气泡显示时测量实际宽高；内容变化（简介轮播）时同步更新
  useEffect(() => {
    if (!bubble || !bubbleRef.current) return;
    const el = bubbleRef.current;
    const update = () => {
      setBubbleW(el.offsetWidth || 176);
      setBubbleH(el.offsetHeight || 56);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bubble]);
  // 鼠标是否悬停在小人上（供「自动冒泡」判断是否打扰用户）
  const hoverRef = useRef(false);

  // ── 空闲自动贴边：鼠标/键盘超过 30s 无操作，小人自动缩到最近的屏幕边 ──
  const lastActiveRef = useRef(Date.now());
  const [docked, setDocked] = useState(false);
  const dockedRef = useRef(false);
  const preDockRef = useRef<Pos | null>(null);
  const bubbleRefId = useRef(false);
  useEffect(() => {
    bubbleRefId.current = bubble;
  }, [bubble]);
  // 拖拽中标记：拖拽时禁用位移动画，保证实时跟手
  const [dragging, setDragging] = useState(false);

  // 监听全局活动：任何鼠标/键盘操作都刷新「最后活动时间」，并从贴边状态恢复。
  // 鼠标移动仅当指针真实位移（>2px）才视为活动，过滤宿主重复派发的同坐标/微颤事件，
  // 避免 30s 空闲计时被一直重置而永远不贴边。
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    lastActiveRef.current = Date.now();
    const IDLE_MS = 30_000;
    const markActive = () => {
      lastActiveRef.current = Date.now();
      if (dockedRef.current) {
        dockedRef.current = false;
        setDocked(false);
        if (preDockRef.current) setPos(preDockRef.current);
        preDockRef.current = null;
      }
    };
    const onMove = (e: MouseEvent) => {
      const prev = lastCursorRef.current;
      lastCursorRef.current = { x: e.clientX, y: e.clientY };
      if (prev && Math.abs(e.clientX - prev.x) < 2 && Math.abs(e.clientY - prev.y) < 2) return;
      markActive();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", markActive);
    window.addEventListener("keydown", markActive);
    // 每 2s 检查一次空闲；贴边期间暂停自动冒泡，避免打扰
    const iv = window.setInterval(() => {
      if (!dockedRef.current && !bubbleRefId.current && !hoverRef.current && Date.now() - lastActiveRef.current >= IDLE_MS) {
        dockedRef.current = true;
        setDocked(true);
      }
    }, 2000);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", markActive);
      window.removeEventListener("keydown", markActive);
      window.clearInterval(iv);
    };
  }, [setPos]);

  // 贴边：记录贴边前的 home 位置便于恢复；展示位置由下方 useMemo 按贴边计算，不写入 pos
  useEffect(() => {
    if (!docked) return;
    preDockRef.current = { px: pos.px, py: pos.py };
    // 贴边瞬间收起气泡、清除悬停标记，避免贴边后气泡仍悬在旁边
    setBubble(false);
    hoverRef.current = false;
  }, [docked]);

  // 展示位置：把 home 位置按当前视口/贴边状态夹取后得到实际渲染坐标。
  // home（pos）保持不变，只有窗口扩大 return 到原始位置，也就不会丢失「放大后应回到的位置」。
  const view = useMemo<Pos>(() => {
    const vw = viewportRef.current.w;
    const vh = viewportRef.current.h;
    const hiX = Math.max(FLOAT_MARGIN, vw - PERSON_SIZE - FLOAT_MARGIN);
    const hiY = Math.max(FLOAT_MARGIN, vh - PERSON_SIZE - FLOAT_MARGIN);
    // 空闲触发的贴边：无条件把小人缩到离它最近的屏幕边（与当前是否出界无关）。
    // 恢复靠 markActive 里还原 preDock 的 home 位置实现。
    if (docked) return edgePos(pos, vw, vh);
    // 未贴边：按当前视口夹取 home 位置，窗口缩小夹进可视区、拉大回到原位置（home 保持不变）。
    return { px: clamp(pos.px, FLOAT_MARGIN, hiX), py: clamp(pos.py, FLOAT_MARGIN, hiY) };
  }, [pos, docked, viewVersion]);
  // 气泡展示的功能简介：优先用首次加载时 AI 生成并缓存的词，否则用 i18n 内置词
  const [intros, setIntros] = useState<string[]>(() => [
    T("pl.intro.0"),
    T("pl.intro.1"),
    T("pl.intro.2"),
    T("pl.intro.3"),
    T("pl.intro.4"),
  ]);

  // 新版本检查结果；null 表示尚未查或查询失败（host 侧失败会返回 hasUpdate=false）。
  // 红点仅代表「有新的测试版」（GitHub 领先 npm）；正式版更新由 host 后台静默升级。
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  // 「红点点击更新」状态：执行中红点变灰、停止动画；结果不在气泡框展示
  const [updating, setUpdating] = useState(false);
  const handleUpdate = useCallback(() => {
    if (updating) return;
    setUpdating(true);
    applyUpdate()
      .then((r) => {
        // 更新成功：测试版已安装，红点提示失效，隐藏红点；失败则保留红点以便重试
        if (r?.ok) setUpdate((prev) => (prev ? { ...prev, hasBeta: false } : prev));
      })
      .catch(() => {
        /* 静默处理；红点仅作状态反馈，不在气泡框展示结果 */
      })
      .finally(() => setUpdating(false));
  }, [updating]);

  // 拖动小人：仅移动小人独立坐标；松手时若未明显移动视为「点击 → 通知父级」
  const personDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number; moved: boolean } | null>(null);
  const startPersonDrag = (e: ReactMouseEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(true); // 拖拽中禁用位移动画，保证实时跟手
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
      setDragging(false); // 恢复位移动画
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

  // 气泡固定定位：根据小人所在位置，在上/下/左/右四个方向中选择一个能完整容纳的方向展示，
  // 并保证气泡整体落在视口内，避免小人拖到屏幕边缘时气泡被遮挡「显示没了」。
  // 优先级：上方 → 下方 → 左侧 → 右侧。
  const bubblePos = useMemo(() => {
    if (!bubble) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const W = bubbleW;
    const H = bubbleH;
    const cx = view.px + PERSON_SIZE / 2; // 小人水平中心
    const cy = view.py + PERSON_SIZE / 2; // 小人垂直中心
    // 锚点取「小人盒子顶部往下的可视头部高度」，让尖角指向头部而非盒子空区。
    const ANCHOR = 18;
    const gap = 5;

    let dir: "above" | "below" | "left" | "right";
    let left: number;
    let top: number;

    if (view.py + ANCHOR - gap - H >= FLOAT_MARGIN) {
      // 上方放得下：气泡悬于小人头顶上方，与头部保持一点可见空隙，尖角指向头部
      dir = "above";
      top = view.py + ANCHOR - 8 - H;
      left = Math.min(Math.max(FLOAT_MARGIN, cx - W / 2), vw - W - FLOAT_MARGIN);
    } else if (view.py + PERSON_SIZE + gap + H <= vh - FLOAT_MARGIN) {
      // 下方放得下
      dir = "below";
      top = view.py + PERSON_SIZE - ANCHOR + gap;
      left = Math.min(Math.max(FLOAT_MARGIN, cx - W / 2), vw - W - FLOAT_MARGIN);
    } else if (view.px - gap - W >= FLOAT_MARGIN) {
      // 左侧放得下：垂直贴着小人中心并限制在视口内
      dir = "left";
      left = view.px - gap - W;
      top = Math.min(Math.max(FLOAT_MARGIN, cy - H / 2), vh - H - FLOAT_MARGIN);
    } else {
      // 右侧兜底：贴着小人右侧，垂直居中
      dir = "right";
      left = Math.min(view.px + PERSON_SIZE + gap, vw - W - FLOAT_MARGIN);
      top = Math.min(Math.max(FLOAT_MARGIN, cy - H / 2), vh - H - FLOAT_MARGIN);
    }

    // 尖角锚点：上/下方 → 用水平偏移让尖角指小人中心；左/右方 → 用垂直偏移
    const tailX = cx - left - 5; // 尖角在气泡水平方向上的偏移（above/below）
    const tailY = cy - top - 5; // 尖角在气泡垂直方向上的偏移（left/right）
    return { left, top, dir, tailX, tailY };
  }, [bubble, bubbleW, bubbleH, view.px, view.py, viewVersion]);

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

  // 检查是否有新版本：挂载时请求一次；host 侧带缓存，结果写入 update 状态。
  // 失败或不可用时保持 hasUpdate=false，只静默关闭提示，不打扰用户。
  useEffect(() => {
    let cancelled = false;
    getUpdate()
      .then((info) => {
        if (!cancelled) setUpdate(info);
      })
      .catch(() => {
        /* 静默失败 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 未悬停时不定时自动冒气泡展示功能简介；无论面板折叠与否都会触发（小人在场即冒泡）。
  // 悬停中或显示中则跳过本轮，间隔取自设置。
  useEffect(() => {
    const intervalMs =
      Math.max(5, settings?.personTipInterval ?? DEFAULT_SETTINGS.personTipInterval) * 1000;
    const hideDuration =
      Math.max(10, settings?.personTipDuration ?? DEFAULT_SETTINGS.personTipDuration) * 1000;
    let showT: ReturnType<typeof setTimeout> | undefined;
    let hideT: ReturnType<typeof setTimeout> | undefined;
    const loop = () => {
      showT = setTimeout(() => {
        // 到点要弹气泡：若当前处于贴边状态，先取消贴边回到原位再弹，保证提示正常展示
        if (dockedRef.current) {
          dockedRef.current = false;
          setDocked(false);
          if (preDockRef.current) setPos(preDockRef.current);
          preDockRef.current = null;
        }
        // 悬停中（气泡已由悬停展示）则跳过本轮，避免与悬停气泡叠加
        if (hoverRef.current) {
          loop();
          return;
        }
        setIntroIdx((i) => i + 1);
        setBubble(true);
        hideT = setTimeout(() => {
          if (!hoverRef.current && !dockedRef.current) setBubble(false);
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

  // 新版本提示文案：体验计划开启 → 「测试版本」；未开启 → 「有新的版本」。文案走 i18n 国际化。
  const updateText = update?.hasBeta
    ? (settings?.experienceProgramEnabled ?? DEFAULT_SETTINGS.experienceProgramEnabled)
      ? T("pl.update.detectedBeta")
      : T("pl.update.detected")
    : "";

  return (
    <>
      <style>{`
@keyframes pl-pop-in { from { opacity: 0; transform: translateY(6px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes pl-person-bob { 0%,100% { transform: translateY(0) scale(1,1); } 50% { transform: translateY(-5px) scale(1.03,.97); } }
@keyframes pl-person-shadow { 0%,100% { transform: scaleX(1); opacity: .22; } 50% { transform: scaleX(.82); opacity: .14; } }
@keyframes pl-person-blink { 0%,88%,100% { transform: scaleY(1); } 94% { transform: scaleY(.08); } }
@keyframes pl-bubble-in { from { opacity: 0; transform: translateY(6px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes pl-bubble-intro { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pl-update-pulse { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.35); opacity: .45; } }
@keyframes pl-update-ring { 0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220,38,38,.5); } 70% { box-shadow: 0 0 0 4px rgba(220,38,38,0); } }
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
          left: view.px,
          top: view.py,
          zIndex: 2147483647,
          width: PERSON_SIZE,
          height: PERSON_SIZE,
          cursor: "grab",
          animation: "pl-pop-in .3s cubic-bezier(.22,1,.36,1)",
          // 拖拽中跟手无动画，其余（贴边/恢复）平滑过渡
          transition: dragging ? "none" : "left .35s cubic-bezier(.22,1,.36,1), top .35s cubic-bezier(.22,1,.36,1)",
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
              minWidth: 160,
              maxWidth: 288,
              padding: "6px 10px",
              background: TONE.panel,
              color: TONE.text,
              border: `1px solid ${TONE.border}`,
              borderRadius: 8,
              fontSize: 10.5,
              lineHeight: 1.45,
              textAlign: "center",
              boxShadow: "none",
              animation: "pl-bubble-in .2s cubic-bezier(.22,1,.36,1)",
              pointerEvents: "none", // 气泡仅展示，穿透不挡页面点击
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
            {/* 气泡小尾巴：始终指向小人中心（上→朝下、下→朝上、左→朝右、右→朝左）。
                方块边长 10，旋转 45° 后三角底线（两平角连线）位于方块中心，悬出量取半宽 5，
                使底线恰好落在卡片边界上，与卡片边无缝连接，消除「三角飘在卡片外、中间留空隙」。 */}
            <span
              style={{
                position: "absolute",
                // 上/下方向：尖角在气泡水平居中（相对小人中心）；左/右方向：垂直居中
                ...(bubblePos.dir === "above"
                  ? { left: bubblePos.tailX, bottom: -5 }
                  : bubblePos.dir === "below"
                    ? { left: bubblePos.tailX, top: -5 }
                    : bubblePos.dir === "left"
                      ? { top: bubblePos.tailY, right: -5 }
                      : { top: bubblePos.tailY, left: -5 }),
                width: 10,
                height: 10,
                background: "inherit",
                zIndex: -1, // 让伸入气泡内的部分沉到背景之下，避免压盖内容
                // 朝向决定用哪对邻边；四种朝向均旋转 45°，尖角指各方向
                borderTop:
                  bubblePos.dir === "below" || bubblePos.dir === "left"
                    ? `1px solid ${TONE.border}`
                    : "none",
                borderRight:
                  bubblePos.dir === "above" || bubblePos.dir === "left"
                    ? `1px solid ${TONE.border}`
                    : "none",
                borderBottom:
                  bubblePos.dir === "above" || bubblePos.dir === "right"
                    ? `1px solid ${TONE.border}`
                    : "none",
                borderLeft:
                  bubblePos.dir === "below" || bubblePos.dir === "right"
                    ? `1px solid ${TONE.border}`
                    : "none",
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
        {/* 有新版本时：小人右上角挂一个红色呼吸徽标（「新版本」动画提示）。
            点击该红点即执行插件更新；阻断 mousedown 冒泡，避免误触小人的拖动/切面板。 */}
        {update?.hasBeta && (
          <span
            role="button"
            aria-label={updating ? T("pl.update.updating") : updateText}
            onClick={(e) => {
              e.stopPropagation();
              handleUpdate();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title={updating ? T("pl.update.updating") : updateText}
            style={{
              position: "absolute",
              right: 0,
              top: 14,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: TONE.red,
              border: "2px solid var(--dsw-specific-sidebar-fill, #f5f6f7)",
              animation: updating ? "none" : "pl-update-ring 1.4s ease-out infinite",
              pointerEvents: "auto",
              cursor: updating ? "default" : "pointer",
              opacity: updating ? 0.6 : 1,
              transition: "opacity .24s ease",
            }}
          />
        )}
        </div>
    </>
  );
}