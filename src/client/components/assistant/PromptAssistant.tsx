/**
 * 词库助手（独立组件）。
 *
 * 以一个小人形象常驻屏幕，可独立拖动；悬停时展示功能简介气泡，未悬停时也会
 * 按设置的频率自动冒气泡提示。与右侧面板解耦：本组件自管理位置/冒泡/简介，
 * 不再内嵌于面板状态。左键不联动面板，面板开合统一由右键菜单「打开工具面板」
 * 通过 onTogglePanel 回调通知父级。
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
import { createPortal } from "react-dom";
import type { PluginSettings } from "../../../types.js";
import { DEFAULT_SETTINGS } from "../../../types.js";
import {
  genIntro,
  getActivity,
  getAssistantStatus,
  type ActivityPhase,
  type ActivitySnapshot,
  type AssistantStatus,
} from "../../services/api.js";
import { type PLTranslate, usePLT } from "../../i18n/i18n.js";
import { useThemeSync } from "../../utils/theme.js";
import { AnnouncementModal } from "./AnnouncementModal.js";
import { AchievementModal } from "./AchievementModal.js";
import {
  HOVER_SEQUENCE,
  SEQUENCES,
  SPRITE_CELL,
  SPRITE_COLUMNS,
  SPRITE_ROWS,
  TRACK_ROW,
  getSpriteSheet,
  sequenceFrame,
  type SpriteMood,
  type SpriteOptions,
  type SpriteSheet,
  type SpriteTopic,
  type SpriteTrack,
} from "../../utils/sprite.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

const TONE = {
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  quiet: "var(--dsw-alias-label-tertiary, #9ca3af)",
  panel: "var(--dsw-specific-sidebar-fill, #f5f6f7)",
  border: "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))",
  accent: "var(--dsw-alias-brand-primary, #2563eb)",
  red: "var(--dsw-alias-state-error-primary, #dc2626)",
} as const;

/** 右键菜单项图标：统一 15x15 描边风格，底色/颜色由调用方传入。 */
function CtxIcon({ bg, color, children }: { bg: string; color: string; children: ReactNode }): ReactNode {
  return (
    <span className="pl-ctx-ic" style={{ background: bg, color }} aria-hidden="true">
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  );
}

/** 小人尺寸。 */
const PERSON_SIZE = 72;
/** 屏幕四周最小边距（含顶部落差给宿主 header）。 */
const FLOAT_MARGIN = 8;
/** 词库助手位置在 localStorage 中的存储键。 */
const POS_KEY = "pl:assistant-pos";

// ── 心情系统：按「本地日期」记录当天会话成功/失败次数 ─────────────────────
/** 当天心情记录的 localStorage 键前缀（后接 YYYY-MM-DD）。 */
const MOOD_KEY_PREFIX = "pl:mood:";

/** 当天日期键（本地时区，跨天自动换键归零）。 */
function moodDayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 读取当天心情记录；解析失败返回空记录。 */
function loadMood(): { happy: number; sad: number } {
  try {
    const raw = localStorage.getItem(MOOD_KEY_PREFIX + moodDayKey());
    if (!raw) return { happy: 0, sad: 0 };
    const p = JSON.parse(raw) as Partial<{ happy: number; sad: number }>;
    return { happy: Math.max(0, p.happy ?? 0), sad: Math.max(0, p.sad ?? 0) };
  } catch {
    return { happy: 0, sad: 0 };
  }
}

/** 写回当天心情记录，并顺手清理更早日期键，避免 localStorage 无限累积。 */
function saveMood(m: { happy: number; sad: number }): void {
  try {
    const key = MOOD_KEY_PREFIX + moodDayKey();
    localStorage.setItem(key, JSON.stringify(m));
    // 只保留当天记录，移除历史日期键
    const allKeys = localStorage.keys?.() ?? [];
    for (const k of allKeys) {
      if (k.startsWith(MOOD_KEY_PREFIX) && k !== key) localStorage.removeItem(k);
    }
  } catch {
    /* 忽略存储失败 */
  }
}

interface Props {
  t?: PLTranslate;
  /** 冒泡频率/时长设置；缺省时用默认值。 */
  settings?: PluginSettings;
  /** 打开/收起右侧面板的回调（仅右键菜单「打开工具面板」触发；左键不联动面板）。 */
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
  // 当前是否黑夜模式：等级徽章等硬编码高对比色需随主题切换
  const dark = useThemeSync();

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
    setEggMode(false);
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

  // 活动状态机：轮询 host 投影的 phase，驱动小人动作动画与阶段气泡。
  // 会话 turn/step/工具/结束事件 → idle/waiting/thinking/tool/review/done/failed；
  // 每个阶段驱动不同的小人动作与头顶状态气泡。
  const [activity, setActivity] = useState<ActivitySnapshot>({ phase: "idle", sessionActive: false });
  useEffect(() => {
    let cancelled = false;
    // 按当前系统语言请求，host 端返回匹配主题+阶段的文案
    const lang: "zh" | "en" =
      (document.documentElement.lang || navigator.language || "zh").toLowerCase().startsWith("en")
        ? "en"
        : "zh";
    const tick = () => {
      getActivity(lang)
        .then((snap) => {
          if (!cancelled) setActivity(snap);
        })
        .catch(() => {
          /* 轮询失败忽略，保持上次状态 */
        });
    };
    tick();
    const iv = window.setInterval(tick, 1200);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, []);

  // ── 心情系统：按天记录会话成功/失败，驱动小人表情、动作与气泡 ──
  // 每次轮询到的阶段从其他阶段跳转到 done/failed 时计一次成功/失败（首次挂载不计）。
  const [moodCounts, setMoodCounts] = useState<{ happy: number; sad: number }>(loadMood);
  const prevPhaseRef = useRef<ActivityPhase | null>(null);
  useEffect(() => {
    const phase = activity.phase;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    // 首次快照或无活跃会话时只记录基线，不计数
    if (prev === null || !activity.sessionActive) return;
    if (phase === "done" && prev !== "done") {
      setMoodCounts((m) => {
        const next = { ...m, happy: m.happy + 1 };
        saveMood(next);
        return next;
      });
    } else if (phase === "failed" && prev !== "failed") {
      setMoodCounts((m) => {
        const next = { ...m, sad: m.sad + 1 };
        saveMood(next);
        return next;
      });
    }
  }, [activity.phase, activity.sessionActive]);

  // 今日情绪：成功多于失败 → 开心；失败多于成功 → 低落；持平/无记录 → 平常
  const mood: SpriteMood =
    moodCounts.happy > moodCounts.sad ? "happy"
    : moodCounts.sad > moodCounts.happy ? "sad"
    : "neutral";

  // ── 游戏化：等级徽章 / 成就解锁播报 / 时间彩蛋 / 点击互动 ──
  // toast 为临时气泡（成就 / 互动），优先级高于阶段气泡与简介轮播
  interface Toast {
    kind: "achievement" | "tap";
    title?: string;
    text: string;
  }
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  // 彩蛋模式：自动冒泡时以较小概率展示 host 推送的应景彩蛋文案
  const [eggMode, setEggMode] = useState(false);
  // 已播报过的成就 id（localStorage 记忆，避免重复弹）
  const [announced] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("pl:achievements-announced");
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const announcedRef = useRef(announced);
  const statusRef = useRef<AssistantStatus | null>(null);
  // 设置引用：轮询 effect 等挂载期逻辑读取最新开关，避免因 settings 变化重跑 effect
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  // 首次进入标记：只播报「之后新增解锁」的成就，避免历史成就一次性轰炸
  const statusInitedRef = useRef(false);
  const toastTimerRef = useRef<number | undefined>(undefined);
  // 连续点击时间戳（2 秒内 5 次触发「晕」效果）
  const tapTimesRef = useRef<number[]>([]);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimerRef.current !== undefined) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(
      () => setToast(null),
      t.kind === "achievement" ? 4000 : 2200,
    );
  }, []);

  // T 引用每次 render 都会变化（usePLT 返回新函数），用 ref 固定，供挂载期 effect 使用，
  // 避免 effect 依赖 T 导致每次 render 重跑、误杀 toast 计时器
  const tRef = useRef(T);
  tRef.current = T;

  // toast 计时器仅在组件卸载时清理；运行期由 showToast 自行覆盖管理
  useEffect(
    () => () => {
      if (toastTimerRef.current !== undefined) window.clearTimeout(toastTimerRef.current);
    },
    [],
  );

  // 轮询游戏化快照：等级 + 成就 + 彩蛋；间隔较长，避免频繁统计查询
  useEffect(() => {
    let cancelled = false;
    const lang: "zh" | "en" =
      (document.documentElement.lang || navigator.language || "zh").toLowerCase().startsWith("en")
        ? "en"
        : "zh";
    const tick = () => {
      getAssistantStatus(lang)
        .then((s) => {
          if (cancelled) return;
          setStatus(s);
          statusRef.current = s;
          // 首次进入：把当前已解锁成就全部标记为已播报，避免历史成就一次性弹窗
          if (!statusInitedRef.current) {
            statusInitedRef.current = true;
            for (const a of s.achievements) if (a.achieved) announcedRef.current.add(a.id);
            try {
              localStorage.setItem("pl:achievements-announced", JSON.stringify([...announcedRef.current]));
            } catch {
              /* 忽略存储失败 */
            }
            return;
          }
          // 新解锁的成就：只播报第一条，避免多条连发；
          // 无论「我的等级公告」是否开启都标记已播报，避免日后开启时补发历史播报
          const fresh = s.achievements.find((a) => a.achieved && !announcedRef.current.has(a.id));
          if (fresh) {
            announcedRef.current.add(fresh.id);
            try {
              localStorage.setItem("pl:achievements-announced", JSON.stringify([...announcedRef.current]));
            } catch {
              /* 忽略存储失败 */
            }
            const levelAnnouncement =
              settingsRef.current?.levelAnnouncementEnabled ?? DEFAULT_SETTINGS.levelAnnouncementEnabled;
            if (levelAnnouncement) {
              showToast({
                kind: "achievement",
                title: tRef.current("pl.gamification.unlockTitle"),
                text: `${fresh.title}：${fresh.desc}`,
              });
            }
          }
        })
        .catch(() => {
          /* 轮询失败忽略，保持上次状态 */
        });
    };
    tick();
    const iv = window.setInterval(tick, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [showToast]);

  // 点击小人的互动反馈：随机俏皮话；2 秒内连点 5 次触发「晕」
  const triggerTap = useCallback(() => {
    const now = Date.now();
    const recent = tapTimesRef.current.filter((t) => now - t < 2000);
    recent.push(now);
    tapTimesRef.current = recent;
    if (recent.length >= 5) {
      tapTimesRef.current = [];
      showToast({ kind: "tap", text: tRef.current("pl.tap.dizzy") });
      return;
    }
    const msgs = [
      tRef.current("pl.tap.0"),
      tRef.current("pl.tap.1"),
      tRef.current("pl.tap.2"),
      tRef.current("pl.tap.3"),
    ];
    showToast({ kind: "tap", text: msgs[Math.floor(Math.random() * msgs.length)] });
  }, [showToast]);

  // ── 雪碧图小人：把蓝脸小人渲染成运行时生成的雪碧图，用 background-position 帧播放 ──
  // 轨道 = 行、帧 = 列，配合每轨道时长与阶段序列实现帧播放；鼠标移入播放打招呼小动画。
  // 差异化按「等级-主题-心情」组合生成，任一变化时重新取对应雪碧图（内部按组合缓存）。
  const [sheet, setSheet] = useState<SpriteSheet | null>(null);
  const spriteRef = useRef<HTMLDivElement | null>(null);
  // 鼠标是否悬停在小人上：悬停时播放打招呼序列（小动画）
  const [hovering, setHovering] = useState(false);
  const spriteTopic: SpriteTopic = (activity.topic as SpriteTopic | undefined) ?? "general";
  // 等级助手关闭时不展示任何等级差异化（身体回到底色、无星章、无 Lv 徽章）
  const levelEnabled = settings?.levelEnabled ?? DEFAULT_SETTINGS.levelEnabled;
  const spriteLevel = levelEnabled ? status?.level?.level : undefined;
  const spriteOpts = useMemo<SpriteOptions>(
    () => ({ level: spriteLevel, topic: spriteTopic, mood }),
    [spriteLevel, spriteTopic, mood],
  );
  useEffect(() => {
    let alive = true;
    getSpriteSheet(spriteOpts).then((s) => {
      if (alive) setSheet(s);
    });
    return () => {
      alive = false;
    };
  }, [spriteOpts]);
  // 帧循环：按活动阶段（或悬停打招呼）序列，在每个动画帧上切换 background-position。
  // 生成失败（sheet 为 null）时保持 SVG 回退，不打断现有小人展示。
  useEffect(() => {
    if (!sheet) return;
    const el = spriteRef.current;
    if (!el) return;
    const paint = (f: { track: SpriteTrack; col: number }) => {
      const row = TRACK_ROW[f.track];
      el.style.backgroundPosition = `${-f.col * SPRITE_CELL}px ${-row * SPRITE_CELL}px`;
    };
    const seqFor = (): SpriteTrack[] =>
      hovering ? HOVER_SEQUENCE : (SEQUENCES[activity.phase] ?? SEQUENCES.idle);
    paint(sequenceFrame(seqFor(), 0));
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    if (reduce) return;
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (ts: number) => {
      elapsed += ts - last;
      last = ts;
      paint(sequenceFrame(seqFor(), elapsed));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sheet, hovering, activity.phase]);

  // 活动阶段 → i18n 键（为避免动态模板键破坏类型推导，用显式映射表）
  type ZhKey = keyof typeof import("../../i18n/i18n.js").zh;
  const PHASE_KEY: Record<ActivityPhase, ZhKey> = {
    idle: "pl.phase.idle",
    waiting: "pl.phase.waiting",
    thinking: "pl.phase.thinking",
    tool: "pl.phase.tool",
    review: "pl.phase.review",
    done: "pl.phase.done",
    failed: "pl.phase.failed",
  };

  // 活动阶段 → 小人待机/动作动画（空闲/等待保持轻缓呼吸，活跃时切换动作）
  // 心情融入空闲动画：今天开心时蹦跳更有弹性，低落时慢速微垂
  const personAnim = useMemo(() => {
    switch (activity.phase) {
      case "thinking": return "pl-person-fastbob .9s ease-in-out infinite";
      case "tool": return "pl-person-tilt 1.6s ease-in-out infinite";
      case "done": return "pl-person-jump .7s cubic-bezier(.3,1.4,.4,1) 2";
      case "failed": return "pl-person-shake .5s ease-in-out 2";
      case "waiting": return "pl-person-bob 2s ease-in-out infinite";
      default:
        if (mood === "happy") return "pl-person-happybob 1.8s ease-in-out infinite";
        if (mood === "sad") return "pl-person-sadbob 2.8s ease-in-out infinite";
        return "pl-person-bob 2.6s ease-in-out infinite";
    }
  }, [activity.phase, mood]);

  // 是否展示阶段气泡：会话进行中（思考/调工具/整理/回话/完成/失败）都展示思考气泡框；空闲不打扰
  const phaseActive = activity.sessionActive && activity.phase !== "idle";
  // 阶段气泡激活标记：供自动冒泡循环判断优先级（阶段气泡 > 悬停/自动冒泡简介）
  const phaseActiveRef = useRef(phaseActive);
  useEffect(() => {
    phaseActiveRef.current = phaseActive;
  }, [phaseActive]);

  // 气泡显示时测量实际宽高；内容变化（简介轮播 / 阶段内容 / toast）时同步更新
  useEffect(() => {
    if ((!bubble && !phaseActive && !toast) || !bubbleRef.current) return;
    const el = bubbleRef.current;
    const update = () => {
      setBubbleW(el.offsetWidth || 176);
      setBubbleH(el.offsetHeight || 56);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bubble, phaseActive, toast]);

  // 公告弹窗：右键菜单入口打开（使用手册 + 通告 / 看板）
  const [announceOpen, setAnnounceOpen] = useState(false);
  // 成就弹窗：右键菜单入口打开（等级 + 成就列表）
  const [achievementOpen, setAchievementOpen] = useState(false);
  // 右键迷你菜单：记录弹出位置（clientX/Y）；点击外部或菜单项后关闭
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const openMenuAnnounce = () => {
    setCtxMenu(null);
    setAnnounceOpen(true);
  };
  const openMenuAchievements = () => {
    setCtxMenu(null);
    setAchievementOpen(true);
  };

  // 右键菜单显隐规则：词库助手未启用时不显示；工具面板 / 公告 / 成就三个入口
  // 全部关闭时同样不显示（菜单里没有任何可点项）。
  const ctxMenuEnabled =
    (settings?.assistantEnabled ?? DEFAULT_SETTINGS.assistantEnabled) &&
    ((settings?.rightPanelEnabled ?? DEFAULT_SETTINGS.rightPanelEnabled) ||
      (settings?.announcementEnabled ?? DEFAULT_SETTINGS.announcementEnabled) ||
      levelEnabled);

  // 拖动小人：仅移动小人独立坐标；松手时若未明显移动视为「点击 → 通知父级」
  const personDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number; moved: boolean } | null>(null);
  const startPersonDrag = (e: ReactMouseEvent<HTMLElement>) => {
    // 仅左键支持拖动与单击开合；右键/中键不启动拖拽，交由 onContextMenu 打开公告
    if (e.button !== 0) return;
    // 左键开始拖动时关闭右键菜单，避免菜单残留遮挡
    setCtxMenu(null);
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
      // 左键单击（未拖动）：不联动面板，只触发互动反馈（面板开合统一走右键菜单「打开工具面板」）
      if (clicked) {
        triggerTap();
      }
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
    if (!bubble && !phaseActive && !toast) return null;
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
  }, [bubble, phaseActive, toast, bubbleW, bubbleH, view.px, view.py, viewVersion]);

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
      Math.max(5, settings?.personTipInterval ?? DEFAULT_SETTINGS.personTipInterval) * 1000;
    const hideDuration =
      Math.max(10, settings?.personTipDuration ?? DEFAULT_SETTINGS.personTipDuration) * 1000;
    let showT: ReturnType<typeof setTimeout> | undefined;
    let hideT: ReturnType<typeof setTimeout> | undefined;
    const loop = () => {
      showT = setTimeout(() => {
        // 阶段气泡显示中优先级更高，跳过本轮自动冒泡，避免结束后残留简介气泡
        if (phaseActiveRef.current) {
          loop();
          return;
        }
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
        // 自动冒泡：以较小概率展示 host 推送的应景彩蛋，否则走简介轮播
        setEggMode(statusRef.current?.easterEgg != null && Math.random() < 0.3);
        setIntroIdx((i) => i + 1);
        setBubble(true);
        hideT = setTimeout(() => {
          if (!hoverRef.current && !dockedRef.current) {
            setBubble(false);
            setEggMode(false);
          }
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
@keyframes pl-person-fastbob { 0%,100% { transform: translateY(0) scale(1,1); } 50% { transform: translateY(-7px) scale(1.05,.95); } }
@keyframes pl-person-tilt { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
@keyframes pl-person-jump { 0% { transform: translateY(0); } 30% { transform: translateY(-14px); } 50% { transform: translateY(0); } 70% { transform: translateY(-7px); } 100% { transform: translateY(0); } }
@keyframes pl-person-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
@keyframes pl-person-happybob { 0%,100% { transform: translateY(0) scale(1,1); } 40% { transform: translateY(-8px) scale(1.06,.94); } 70% { transform: translateY(-3px); } }
@keyframes pl-person-sadbob { 0%,100% { transform: translateY(0) rotate(0deg) scale(1,1); } 50% { transform: translateY(2px) rotate(-3deg) scale(.99,1.02); } }
.pl-think-dot { display: inline-block; border-radius: 50%; animation: pl-think-bounce 1.2s ease-in-out infinite; }
@keyframes pl-think-bounce { 0%, 80%, 100% { transform: scale(.55); opacity: .45; } 40% { transform: scale(1); opacity: 1; } }
@keyframes pl-ctx-in { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
.pl-ctx-menu { padding: 6px; border-radius: 13px; background: var(--dsw-specific-sidebar-fill, #f5f6f7); border: 1px solid var(--dsw-alias-border-l2, rgba(17, 24, 39, .14)); box-shadow: 0 10px 32px rgba(2, 6, 23, .2), 0 2px 8px rgba(2, 6, 23, .1), inset 0 1px 0 rgba(255, 255, 255, .55); animation: pl-ctx-in .16s cubic-bezier(.22, 1, .36, 1); transform-origin: top left; }
.pl-ctx-head { display: flex; align-items: center; gap: 6px; padding: 6px 10px 8px; font-size: 12px; font-weight: 600; letter-spacing: .2px; color: var(--dsw-alias-label-secondary, #6b7280); border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(17, 24, 39, .08)); margin-bottom: 4px; }
.pl-ctx-item { display: flex; align-items: center; gap: 9px; padding: 6px 9px; font-size: 12.5px; border-radius: 9px; cursor: pointer; user-select: none; color: var(--dsw-alias-label-primary, #1f2937); transition: background .16s ease, transform .12s ease; }
.pl-ctx-item:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, .12)); }
.pl-ctx-item:active { background: var(--dsw-alias-interactive-bg-active, rgba(127, 127, 127, .2)); transform: scale(.97); }
.pl-ctx-ic { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 7px; flex-shrink: 0; }
`}</style>
      {/* 小人：始终显示，可独立拖动，悬停显示气泡；点击回调由父级决定是否联动面板 */}
      {/* 用 React Portal 渲染到 document.body：既突破祖先层叠/transform 容器显示在最上层，
          又因元素仍在 React 组件树中而保留全部合成事件（拖动、点击）。 */}
      {createPortal(
      <div
        aria-label={T("pl.title")}
        onMouseDown={startPersonDrag}
        onContextMenu={(e) => {
          // 右键：弹出迷你菜单（工具面板 / 成就 / 公告）；与左键拖动/单击互不干扰。
          // 词库助手未启用，或工具/公告/成就入口全部关闭时不弹菜单。
          e.preventDefault();
          if (!ctxMenuEnabled) return;
          setCtxMenu({ x: e.clientX, y: e.clientY });
        }}
        onMouseEnter={() => { hoverRef.current = true; setHovering(true); setBubble(true); }}
        onMouseLeave={() => { hoverRef.current = false; setHovering(false); setBubble(false); setEggMode(false); }}
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
        {/* 统一气泡框：toast（成就/互动，优先级最高）> 阶段气泡 > 简介轮播，共用同一圆弧气泡样式与定位 */}
        {(phaseActive || bubble || toast) && bubblePos && (
          <div
            ref={bubbleRef}
            style={{
              position: "fixed",
              left: bubblePos.left,
              top: bubblePos.top,
              zIndex: 2147483646, // 建立层叠上下文，使尾巴 zIndex:-1 相对本气泡生效（否则会逃逸层级）
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              width: "max-content", // 宽随文字尺寸自适应（短文案贴合、长文案展开）
              maxWidth: 288, // 仅保留最大宽度，避免超长文案撑出屏幕
              padding: "8px 14px",
              background: TONE.panel,
              color: TONE.text,
              border: `1px solid ${TONE.border}`,
              borderRadius: 16, // 圆弧气泡：大圆角圆润风格
              fontSize: 10.5,
              lineHeight: 1.45,
              textAlign: "center",
              boxShadow: "0 3px 12px rgba(17, 24, 39, .1)",
              animation: "pl-bubble-in .2s cubic-bezier(.22,1,.36,1)",
              pointerEvents: "none", // 气泡仅展示，穿透不挡页面点击
            }}
          >
            {toast ? (
              <>
                {/* 临时提示：成就解锁 / 点击互动 */}
                {toast.title && (
                  <div style={{ fontWeight: 600, letterSpacing: 1, color: TONE.accent }}>{toast.title}</div>
                )}
                <span
                  style={{
                    color: TONE.muted,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    textAlign: "center",
                  }}
                >
                  {toast.text}
                </span>
              </>
            ) : phaseActive ? (
              <>
                {/* 阶段内容：三个依次弹跳的思考小点 + 状态文字 */}
                <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center", height: 7 }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="pl-think-dot"
                      style={{
                        width: 5,
                        height: 5,
                        background: TONE.accent,
                        animationDelay: `${i * 0.18}s`,
                      }}
                    />
                  ))}
                </div>
                {/* 阶段内容：优先用 host 按聊天主题推送的文案，缺失时回退到 i18n 内置文案 */}
                <span style={{ color: TONE.muted, whiteSpace: "nowrap" }}>
                  {activity.text || T(PHASE_KEY[activity.phase])}
                </span>
              </>
            ) : (
              <>
                {/* 简介内容：心情气泡 + 标题 + 轮播正文 + 指示点（彩蛋模式展示应景文案、隐藏指示点） */}
                {/* 心情气泡：非平常情绪时在简介顶部展示当日情绪小结（气泡表情） */}
                {mood !== "neutral" && (
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 10.5,
                      letterSpacing: 0.5,
                      color: mood === "happy" ? "var(--dsw-alias-state-success-primary, #16a34a)" : TONE.red,
                    }}
                  >
                    {mood === "happy" ? T("pl.mood.happy") : T("pl.mood.sad")}
                  </div>
                )}
                <div style={{ fontWeight: 600, letterSpacing: 2 }}>{T("pl.floating.title")}</div>
                <div
                  key={introIdx}
                  style={{
                    color: TONE.muted,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    animation: "pl-bubble-intro .45s ease",
                  }}
                >
                  {eggMode && status?.easterEgg ? status.easterEgg.text : intros[introIdx % intros.length]}
                </div>
                {/* 轮询指示点（彩蛋模式单条展示，不轮播故隐藏） */}
                {!eggMode && (
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
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
                )}
              </>
            )}
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
        {/* 小人本体：雪碧图就绪时用 background-position 帧播放；生成失败回退到 SVG 角色 */}
        <div style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "none" }}>
          {sheet ? (
          <div
            ref={spriteRef}
            style={{
              position: "absolute",
              inset: 0,
              width: PERSON_SIZE,
              height: PERSON_SIZE,
              backgroundImage: `url(${sheet.url})`,
              backgroundSize: `${SPRITE_CELL * SPRITE_COLUMNS}px ${SPRITE_CELL * SPRITE_ROWS}px`,
              backgroundRepeat: "no-repeat",
              // 心情/阶段动作动画与 SVG 回退保持一致（背景帧播放与 transform 互不冲突）
              animation: personAnim,
              filter: "drop-shadow(0 2px 7px color-mix(in srgb, var(--dsw-alias-label-primary, #1f2937) 45%, transparent))",
            }}
          />
          ) : (
          <svg width={PERSON_SIZE} height={PERSON_SIZE} viewBox="0 0 72 72" fill="none" style={{ position: "absolute", inset: 0, animation: personAnim, pointerEvents: "none", filter: "drop-shadow(0 2px 7px color-mix(in srgb, var(--dsw-alias-label-primary, #1f2937) 45%, transparent))" }}>
            <title>{T("pl.title")}</title>
            {/* 身体 */}
            <path d="M22 47 C18 47 14 42 13 34 C12 26 18 21 25 20 C22 15 26 11 33 12 C40 11 44 15 41 20 C48 21 54 26 53 34 C52 42 48 47 44 47 Z" fill="var(--dsw-alias-label-primary, #1f2937)" opacity=".16" />
            {/* 小手 */}
            <g className="pl-person-arm">
              <ellipse cx="36" cy="52" rx="12" ry="9" fill="var(--dsw-alias-label-primary, #1f2937)" opacity="0.85" />
              <ellipse cx="26" cy="50" rx="5" ry="4" fill="var(--dsw-alias-interactive-bg-hover, rgba(100,116,139,.4))" />
            </g>
            {/* 脸 */}
            <circle cx="36" cy="34" r="15" fill="var(--dsw-alias-label-primary, #1f2937)" />
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
          )}
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
          {/* 等级徽章：显示当前 Lv 与称号；悬停 title 提示升级进度（满级不显示进度）。
              受「显示等级助手」设置控制，关闭后不显示等级。 */}
          {status && levelEnabled && (
            <div
              title={
                status.level.next > status.level.current
                  ? `${status.level.title} · ${T("pl.gamification.progress").replace("{n}", String(status.level.next - status.level.current))}`
                  : `${status.level.title} · ${T("pl.gamification.maxed")}`
              }
              style={{
                position: "absolute",
                right: -4,
                bottom: -2,
                minWidth: 22,
                height: 16,
                padding: "0 4px",
                borderRadius: 8,
                background: TONE.accent,
                // 黑夜模式下品牌色偏浅（浅蓝），文字需用深色；白天品牌色偏深（深蓝），文字用白色
                color: dark ? "#10141c" : "#fff",
                fontSize: 9,
                fontWeight: 600,
                lineHeight: "16px",
                textAlign: "center",
                boxShadow: "0 1px 4px rgba(2, 6, 23, .25)",
                pointerEvents: "none",
              }}
            >
              Lv.{status.level.level}
            </div>
          )}
        </div>
        </div>,
        document.body,
      )}
      {/* 右键迷你菜单：点击外部区域或菜单项后关闭；「打开工具面板 / 成就 / 公告」共用此入口 */}
      {ctxMenu && ctxMenuEnabled && (
        <>
          {createPortal(
            // 透明遮罩：与菜单同为最高层级且渲染在小人 portal 之后（DOM 靠后），
            // 因此能盖住小人/等级徽章，点击任意位置即关闭菜单（也阻止误拖小人）
            <div
              style={{ position: "fixed", inset: 0, zIndex: 2147483647 }}
              onMouseDown={() => setCtxMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setCtxMenu(null);
              }}
            />,
            document.body,
          )}
          {createPortal(
            <div
              className="pl-ctx-menu"
              style={{
                position: "fixed",
                // 贴近屏幕右/下边缘时翻转到指针另一侧，保证菜单完整可见
                left: ctxMenu.x + 156 > window.innerWidth ? Math.max(8, ctxMenu.x - 156) : ctxMenu.x,
                top: ctxMenu.y + 152 > window.innerHeight ? Math.max(8, ctxMenu.y - 152) : ctxMenu.y,
                zIndex: 2147483647,
                minWidth: 150,
                fontFamily: MONO,
              }}
            >
              <div className="pl-ctx-head">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="var(--dsw-alias-brand-primary, #2563eb)" aria-hidden="true">
                  <path d="M8 2.2l1.1 3.7 3.7 1.1-3.7 1.1L8 11.8 6.9 8.1 3.2 7l3.7-1.1L8 2.2z" />
                </svg>
                {T("pl.floating.title")}
              </div>
              {/* 打开工具面板：仅当「显示词库工具面板」开关开启时显示 */}
              {(settings?.rightPanelEnabled ?? DEFAULT_SETTINGS.rightPanelEnabled) && (
                <div
                  className="pl-ctx-item"
                  onClick={() => {
                    setCtxMenu(null);
                    onTogglePanel?.();
                  }}
                >
                  <CtxIcon bg="rgba(37, 99, 235, .12)" color="var(--dsw-alias-brand-primary, #2563eb)">
                    <rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1.1" />
                    <rect x="8.9" y="2.5" width="4.6" height="4.6" rx="1.1" />
                    <rect x="2.5" y="8.9" width="4.6" height="4.6" rx="1.1" />
                    <rect x="8.9" y="8.9" width="4.6" height="4.6" rx="1.1" />
                  </CtxIcon>
                  {T("pl.ctx.openPanel")}
                </div>
              )}
              {/* 成就入口：仅当「显示等级助手」开关开启时显示，保持等级助手关闭时菜单无「成就」 */}
              {levelEnabled && (
                <div className="pl-ctx-item" onClick={openMenuAchievements}>
                  <CtxIcon bg="rgba(217, 119, 6, .14)" color="#b45309">
                    <path d="M5.8 2.5h4.4v3a2.2 2.2 0 0 1-4.4 0v-3Z" />
                    <path d="M5.8 3.5H4.2A1.2 1.2 0 0 0 3 4.7v.1a2.6 2.6 0 0 0 2.8 2.6" />
                    <path d="M10.2 3.5h1.6A1.2 1.2 0 0 1 13 4.7v.1a2.6 2.6 0 0 1-2.8 2.6" />
                    <path d="M8 7.4v1.6M6.5 12.2h3M7.2 14h1.6" />
                  </CtxIcon>
                  {T("pl.ctx.achievements")}
                </div>
              )}
              {/* 公告入口：仅当「显示公告」开关开启时显示，保持原右键打开公告的开关语义 */}
              {(settings?.announcementEnabled ?? DEFAULT_SETTINGS.announcementEnabled) && (
                <div className="pl-ctx-item" onClick={openMenuAnnounce}>
                  <CtxIcon bg="rgba(220, 38, 38, .1)" color="var(--dsw-alias-state-error-primary, #dc2626)">
                    <path d="M3 8.5V7a1.5 1.5 0 0 1 1.5-1.5h1L10 3.5v9l-4.5-2H4.5A1.5 1.5 0 0 1 3 9v-.5Z" />
                    <path d="M11 6.5a2.6 2.6 0 0 1 0 3" />
                  </CtxIcon>
                  {T("pl.ctx.announce")}
                </div>
              )}
            </div>,
            document.body,
          )}
        </>
      )}
      {/* 公告弹窗：右键菜单「公告」打开（使用手册 + 通告） */}
      <AnnouncementModal open={announceOpen} onClose={() => setAnnounceOpen(false)} t={T} />
      {/* 成就弹窗：右键菜单「成就」打开（等级 + 成就列表） */}
      <AchievementModal open={achievementOpen} onClose={() => setAchievementOpen(false)} t={T} />
    </>
  );
}