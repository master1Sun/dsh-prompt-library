/**
 * 词库助手（独立组件）。
 *
 * 以一个助手形象常驻屏幕，可独立拖动；悬停时展示气泡（情绪/时间信息）。
 * 与右侧面板解耦：本组件自管理位置/气泡/情绪与时间展示，不再内嵌于面板状态。
 * 左键不联动面板，右键菜单「打开词库管理」直接打开独立的词库管理弹窗。
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { PluginSettings } from "../../types.js";
import { DEFAULT_SETTINGS } from "../../types.js";
import {
  getActivity,
  getAssistantStatus,
  getDeepSeekBalance,
  type ActivityPhase,
  type ActivitySnapshot,
  type AssistantStatus,
  type DeepSeekBalance,
} from "../utils/api.js";
import { type PLTranslate, usePLT } from "../utils/i18n.js";
import { useThemeSync } from "../utils/theme.js";

import { AnnouncementModal } from "./AnnouncementModal.js";
import { AchievementModal } from "./AchievementModal.js";
import { PersonaManagerModal } from "./PersonaManagerModal.js";
import { PromptInjectPanel } from "./PromptInjectPanel.js";
import { WhaleStage } from "./WhaleStage.js";
import { DashboardModal } from "./DashboardModal.js";
import { ImportExportModal } from "./ImportExportModal.js";
import { LexiconManagerModal } from "./LexiconManagerModal.js";
import {
  HOVER_SEQUENCE,
  SEQUENCES,
  getWhaleSpriteSheet,
  sequenceFrame,
  type PetCharacter,
  type SpriteMood,
  type SpriteSheet,
  type SpriteTrack,
} from "../utils/sprite.js";

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

/** AI 活动阶段 → 状态指示灯颜色（右上角圆点）。 */
const PHASE_COLOR: Record<ActivityPhase, string> = {
  idle: "rgba(148, 163, 184, .55)",
  waiting: "#f59e0b",
  thinking: "var(--dsw-alias-brand-primary, #2563eb)",
  tool: "#8b5cf6",
  review: "#8b5cf6",
  done: "#22c55e",
  failed: "var(--dsw-alias-state-error-primary, #dc2626)",
};

/** 右键菜单项图标：统一 15x15 描边风格，底色/颜色由调用方传入。 */
function CtxIcon({
  bg,
  color,
  children,
}: {
  bg: string;
  color: string;
  children: ReactNode;
}): ReactNode {
  return (
    <span
      className="pl-ctx-ic"
      style={{ background: bg, color }}
      aria-hidden="true"
    >
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

/** 助手尺寸。 */
const PERSON_SIZE = 72;
// DeepSeek 余额轮询刷新间隔（5 分钟）：仅在检测到使用 DeepSeek 时展示角标并刷新
const DEEPSEEK_REFRESH_MS = 5 * 60 * 1000;
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
      if (k.startsWith(MOOD_KEY_PREFIX) && k !== key)
        localStorage.removeItem(k);
    }
  } catch {
    /* 忽略存储失败 */
  }
}

interface Props {
  t?: PLTranslate;
  /** 冒泡频率/时长设置；加载完成前为占位默认值，配合 settingsReady 区分真实值是否已就绪。 */
  settings?: PluginSettings;
  /** 设置是否已从 host 拉取完成。未就绪前不渲染助手形象，避免初始化时闪默认款。 */
  settingsReady?: boolean;
  /** 打开/收起右侧面板的回调（保留以兼容父级传参；词库管理现改由独立弹窗承载）。 */
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

/** 计算贴边位置：依据给定位置（目标坐标）与传入视口，把助手缩到离它最近的屏幕边。 */
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

/** 读入上次的助手位置；首次进入默认落屏幕右下角。 */
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

/** 成就解锁彩带配置：左偏移 / 下落距离 / 旋转 / 延迟 / 颜色（模块级固定，避免重渲染抖动）。 */
const CONFETTI_COLORS = ["#f59e0b", "#8b5cf6", "#3b82f6", "#22c55e", "#f43f5e", "#06b6d4", "#facc15"];
const CONFETTI_PIECES: Array<{ left: string; fall: number; spin: number; delay: number; color: string }> =
  Array.from({ length: 12 }, (_, i) => ({
    left: `${8 + i * 8.5}%`,
    fall: 60 + ((i * 13) % 50),
    spin: (i % 2 === 0 ? 1 : -1) * (240 + ((i * 47) % 320)),
    delay: 0 + ((i * 90) % 320) / 1000,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));

export function PromptAssistant(props: Props): ReactNode {
  const { t, settings, settingsReady } = props;
  const T = usePLT(t);
  // 当前是否黑夜模式：等级徽章等硬编码高对比色需随主题切换
  const dark = useThemeSync();

  // 助手位置：独立持久化，与右侧面板互不影响
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

  // 气泡实际渲染宽高：随内容动态伸缩（max-content），实时测量用于居中、贴头与尖角定位
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [bubbleW, setBubbleW] = useState(176);
  const [bubbleH, setBubbleH] = useState(56);

  // 鼠标是否悬停在助手上（供「自动冒泡」判断是否打扰用户）
  const hoverRef = useRef(false);

  // ── 空闲自动贴边：鼠标/键盘超过 30s 无操作，助手自动缩到最近的屏幕边 ──
  const lastActiveRef = useRef(Date.now());
  const [docked, setDocked] = useState(false);
  const dockedRef = useRef(false);
  const preDockRef = useRef<Pos | null>(null);
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
      if (
        prev &&
        Math.abs(e.clientX - prev.x) < 2 &&
        Math.abs(e.clientY - prev.y) < 2
      )
        return;
      markActive();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", markActive);
    window.addEventListener("keydown", markActive);
    // 每 2s 检查一次空闲；贴边期间暂停自动冒泡，避免打扰；
    // 会话弹窗（阶段气泡）或简介气泡显示中不贴边，避免提示被打断
    const iv = window.setInterval(() => {
      if (
        !dockedRef.current &&
        !phaseActiveRef.current &&
        !hoverRef.current &&
        Date.now() - lastActiveRef.current >= IDLE_MS
      ) {
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
    // 贴边瞬间清除悬停标记，避免悬停状态残留
    hoverRef.current = false;
  }, [docked]);

  // 展示位置：把 home 位置按当前视口/贴边状态夹取后得到实际渲染坐标。
  // home（pos）保持不变，只有窗口扩大 return 到原始位置，也就不会丢失「放大后应回到的位置」。
  const view = useMemo<Pos>(() => {
    const vw = viewportRef.current.w;
    const vh = viewportRef.current.h;
    const hiX = Math.max(FLOAT_MARGIN, vw - PERSON_SIZE - FLOAT_MARGIN);
    const hiY = Math.max(FLOAT_MARGIN, vh - PERSON_SIZE - FLOAT_MARGIN);
    // 空闲触发的贴边：无条件把助手缩到离它最近的屏幕边（与当前是否出界无关）。
    // 恢复靠 markActive 里还原 preDock 的 home 位置实现。
    if (docked) return edgePos(pos, vw, vh);
    // 未贴边：按当前视口夹取 home 位置，窗口缩小夹进可视区、拉大回到原位置（home 保持不变）。
    return {
      px: clamp(pos.px, FLOAT_MARGIN, hiX),
      py: clamp(pos.py, FLOAT_MARGIN, hiY),
    };
  }, [pos, docked, viewVersion]);

  // 活动状态机：轮询 host 投影的 phase，驱动助手动作动画与阶段气泡。
  // 会话 turn/step/工具/结束事件 → idle/waiting/thinking/tool/review/done/failed；
  // 每个阶段驱动不同的助手动作与头顶状态气泡。
  const [activity, setActivity] = useState<ActivitySnapshot>({
    phase: "idle",
    sessionActive: false,
  });
  // DeepSeek 余额：轮询 host；检测到在用 DeepSeek 时显示常驻小数字角标（本轮未接真实查询，余额为占位）
  const [deepseek, setDeepseek] = useState<DeepSeekBalance | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      getDeepSeekBalance()
        .then((d) => {
          if (!cancelled) setDeepseek(d);
        })
        .catch(() => {
          /* 轮询失败忽略，保持上次状态 */
        });
    };
    tick();
    const iv = window.setInterval(tick, DEEPSEEK_REFRESH_MS);
    // 设置在配置/修改 DeepSeek API Key 后会派发该事件：立即刷新余额，无需等待轮询周期
    const onRefresh = () => tick();
    window.addEventListener("pl:deepseek-balance-refresh", onRefresh);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
      window.removeEventListener("pl:deepseek-balance-refresh", onRefresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // 按当前系统语言请求，host 端返回匹配主题+阶段的文案
    const lang: "zh" | "en" = (
      document.documentElement.lang ||
      navigator.language ||
      "zh"
    )
      .toLowerCase()
      .startsWith("en")
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

  // ── 心情系统：按天记录会话成功/失败，驱动助手表情、动作与气泡 ──
  // 每次轮询到的阶段从其他阶段跳转到 done/failed 时计一次成功/失败（首次挂载不计）。
  const [moodCounts, setMoodCounts] = useState<{ happy: number; sad: number }>(
    loadMood,
  );
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
    moodCounts.happy > moodCounts.sad
      ? "happy"
      : moodCounts.sad > moodCounts.happy
        ? "sad"
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

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimerRef.current !== undefined)
      window.clearTimeout(toastTimerRef.current);
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
      if (toastTimerRef.current !== undefined)
        window.clearTimeout(toastTimerRef.current);
    },
    [],
  );

  // 轮询游戏化快照：等级 + 成就 + 彩蛋；间隔较长，避免频繁统计查询
  useEffect(() => {
    let cancelled = false;
    const lang: "zh" | "en" = (
      document.documentElement.lang ||
      navigator.language ||
      "zh"
    )
      .toLowerCase()
      .startsWith("en")
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
            for (const a of s.achievements)
              if (a.achieved) announcedRef.current.add(a.id);
            try {
              localStorage.setItem(
                "pl:achievements-announced",
                JSON.stringify([...announcedRef.current]),
              );
            } catch {
              /* 忽略存储失败 */
            }
            return;
          }
          // 新解锁的成就：只播报第一条，避免多条连发；
          // 无论「我的等级公告」是否开启都标记已播报，避免日后开启时补发历史播报
          const fresh = s.achievements.find(
            (a) => a.achieved && !announcedRef.current.has(a.id),
          );
          if (fresh) {
            announcedRef.current.add(fresh.id);
            try {
              localStorage.setItem(
                "pl:achievements-announced",
                JSON.stringify([...announcedRef.current]),
              );
            } catch {
              /* 忽略存储失败 */
            }
            const levelAnnouncement =
              settingsRef.current?.levelAnnouncementEnabled ??
              DEFAULT_SETTINGS.levelAnnouncementEnabled;
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

  // ── 雪碧图助手：把鲸鱼款助手渲染成雪碧图，用 background-position 帧播放 ──
  // 轨道 = 行、帧 = 列，配合每轨道时长与阶段序列实现帧播放；鼠标移入播放打招呼小动画。
  // 动效鲸鱼（dshpet）走 WhaleStage 的 dsh-pet webm 双缓冲 video；素材失败时回退静态鲸鱼雪碧图。
  const [sheet, setSheet] = useState<SpriteSheet | null>(null);
  const [whaleBroken, setWhaleBroken] = useState(false); // 鲸鱼 webm 加载失败时回退静态鲸鱼
  const spriteRef = useRef<HTMLDivElement | null>(null);
  // 已加载雪碧图对应的形象；形象切换时据此清空旧图，避免残留旧款
  const spriteCharRef = useRef<PetCharacter | null>(null);
  // 鼠标是否悬停在助手上：悬停时播放打招呼序列（小动画）
  const [hovering, setHovering] = useState(false);
  // 等级助手关闭时不展示任何等级差异化（身体回到底色、无星章、无 Lv 徽章）
  const levelEnabled = settings?.levelEnabled ?? DEFAULT_SETTINGS.levelEnabled;
  // 助手款型：鲸鱼款·静态（whale）/ 鲸鱼款·动效（dsh-pet webm）；兼容旧设置里的 classic 视为静态鲸鱼。
  const character: PetCharacter =
    settings?.assistantCharacter === "dshpet" ? "dshpet" : "whale";
  useEffect(() => {
    let alive = true;
    // 形象切换时清空旧雪碧图并复位失败标记，避免残留旧款或误判失败；
    // 仅切换形象才重置，普通雪碧图换装（等级/主题/心情变化）保留当前帧不闪断
    if (spriteCharRef.current !== null && spriteCharRef.current !== character) {
      setSheet(null);
    }
    spriteCharRef.current = character;
    // 静态鲸鱼是鲸鱼款与动效鲸鱼（webm 失败时）的统一回退底
    getWhaleSpriteSheet()
      .then((s) => {
        if (!alive) return;
        if (s === null) return;
        if (spriteCharRef.current !== character) return; // 已切换其他形象，丢弃过期结果
        setSheet(s);
      })
      // 素材加载失败时保持空白（不做米兔回退）
      .catch(() => {
        if (!alive) return;
        if (spriteCharRef.current !== character) return;
        setSheet(null);
      });
    return () => {
      alive = false;
    };
  }, [character]);
  // 帧循环：按活动阶段（或悬停打招呼）序列，在每个动画帧上切换 background-position。
  // 生成失败（sheet 为 null）时保持空白，不打断现有助手展示。
  useEffect(() => {
    if (!sheet) return;
    const el = spriteRef.current;
    if (!el) return;
    // 按每帧几何把背景缩放到助手显示框内：鲸鱼款 192×208 等比缩放到 PERSON_SIZE，保持比例不改形。
    const scale = PERSON_SIZE / Math.max(sheet.cellW, sheet.cellH);
    const stepX = sheet.cellW * scale;
    const stepY = sheet.cellH * scale;
    const trackRow = sheet.trackRow;
    const tracks = sheet.tracks;
    const paint = (f: { track: SpriteTrack; col: number }) => {
      const row = trackRow[f.track];
      el.style.backgroundPosition = `${-f.col * stepX}px ${-row * stepY}px`;
    };
    const seqFor = (): SpriteTrack[] =>
      hovering ? HOVER_SEQUENCE : (SEQUENCES[activity.phase] ?? SEQUENCES.idle);
    paint(sequenceFrame(seqFor(), 0, tracks));
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    if (reduce) return;
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (ts: number) => {
      elapsed += ts - last;
      last = ts;
      paint(sequenceFrame(seqFor(), elapsed, tracks));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sheet, hovering, activity.phase]);

  // 活动阶段 → i18n 键（为避免动态模板键破坏类型推导，用显式映射表）
  type ZhKey = keyof typeof import("../utils/i18n.js").zh;
  const PHASE_KEY: Record<ActivityPhase, ZhKey> = {
    idle: "pl.phase.idle",
    waiting: "pl.phase.waiting",
    thinking: "pl.phase.thinking",
    tool: "pl.phase.tool",
    review: "pl.phase.review",
    done: "pl.phase.done",
    failed: "pl.phase.failed",
  };

  // 活动阶段 → 助手待机/动作动画（空闲/等待保持轻缓呼吸，活跃时切换动作）
  // 心情融入空闲动画：今天开心时蹦跳更有弹性，低落时慢速微垂
  const personAnim = useMemo(() => {
    switch (activity.phase) {
      case "thinking":
        return "pl-person-fastbob .9s ease-in-out infinite";
      case "tool":
        return "pl-person-tilt 1.6s ease-in-out infinite";
      case "done":
        return "pl-person-jump .7s cubic-bezier(.3,1.4,.4,1) 2";
      case "failed":
        return "pl-person-shake .5s ease-in-out 2";
      case "waiting":
        return "pl-person-bob 2s ease-in-out infinite";
      default:
        if (mood === "happy")
          return "pl-person-happybob 1.8s ease-in-out infinite";
        if (mood === "sad") return "pl-person-sadbob 2.8s ease-in-out infinite";
        return "pl-person-bob 2.6s ease-in-out infinite";
    }
  }, [activity.phase, mood]);

  // 是否展示阶段气泡：会话进行中（思考/调工具/整理/回话/完成/失败）都展示思考气泡框；空闲不打扰
  const phaseActive = activity.sessionActive && activity.phase !== "idle";
  // 会话运行状态气泡：会话进行中时在助手头部展示当前运行状态文案；
  // 仅当没有更高优先级的 toast（成就解锁/点击互动）临时气泡时展示。
  const showBubble = Boolean(toast) || phaseActive;
  // 阶段气泡激活标记：供自动冒泡循环判断优先级（阶段气泡 > 悬停/自动冒泡简介）
  const phaseActiveRef = useRef(phaseActive);
  useEffect(() => {
    phaseActiveRef.current = phaseActive;
    // 会话弹窗出现时若已处于贴边状态，取消贴边恢复原位，确保提示完整展示
    if (phaseActive && dockedRef.current) {
      dockedRef.current = false;
      setDocked(false);
      if (preDockRef.current) setPos(preDockRef.current);
      preDockRef.current = null;
    }
  }, [phaseActive]);

  // 气泡显示时测量实际宽高；内容变化（简介轮播 / 阶段内容 / toast）时同步更新
  useEffect(() => {
    if (!showBubble || !bubbleRef.current) return;
    const el = bubbleRef.current;
    const update = () => {
      setBubbleW(el.offsetWidth || 176);
      setBubbleH(el.offsetHeight || 56);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showBubble, toast, activity.text]);

  // 公告弹窗：右键菜单入口打开（使用手册 + 通告 / 看板）
  const [announceOpen, setAnnounceOpen] = useState(false);
  // 成就弹窗：右键菜单入口打开（等级 + 成就列表）
  const [achievementOpen, setAchievementOpen] = useState(false);
  // 人格管理弹窗：右键菜单入口打开（多人格 CRUD + 会话绑定说明）
  const [personaOpen, setPersonaOpen] = useState(false);
  // 技能注入弹窗：右键菜单「技能注入」入口打开（当前会话临时注入 / 工作区项目持久绑定）
  const [injectOpen, setInjectOpen] = useState(false);
  // 看板弹窗：右键菜单「看板」入口打开（统计可视化）
  const [dashboardOpen, setDashboardOpen] = useState(false);
  // 导入导出弹窗：右键菜单与「数据管理」平级的独立入口
  const [importExportOpen, setImportExportOpen] = useState(false);

  // 词库管理弹窗：右键菜单「数据管理」入口打开
  const [lexiconOpen, setLexiconOpen] = useState(false);
  // 右键迷你菜单：记录弹出位置（clientX/Y）；点击外部或菜单项后关闭
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  // 右键菜单 DOM 引用，用于测量真实高度后补偿位置，避免底部溢出
  const ctxMenuRef = useRef<HTMLDivElement | null>(null);
  // 校正后的菜单位置（渲染后据真实宽高计算，保证完整落在视口内）
  const [ctxPos, setCtxPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const openMenuAnnounce = () => {
    setCtxMenu(null);
    setAnnounceOpen(true);
  };
  const openMenuAchievements = () => {
    setCtxMenu(null);
    setAchievementOpen(true);
  };
  const openMenuDashboard = () => {
    setCtxMenu(null);
    setDashboardOpen(true);
  };

  // 监听会话监控面板「实时注入解析」发出的打开事件：人格 → 人格管理，技能 → 技能管理
  useEffect(() => {
    const openPersona = () => setPersonaOpen(true);
    const openSkill = () => setInjectOpen(true);
    window.addEventListener("pl:open-persona-manager", openPersona);
    window.addEventListener("pl:open-skill-manager", openSkill);
    return () => {
      window.removeEventListener("pl:open-persona-manager", openPersona);
      window.removeEventListener("pl:open-skill-manager", openSkill);
    };
  }, []);

  // 右键菜单显隐规则：词库助手自常驻以来始终启用；「技能注入」为常驻入口（无开关），
  // 因此右键菜单始终显示（其余词库管理 / 公告 / 成就 / 人格管理 / 看板 / 数据管理均可单独关闭）。
  const ctxMenuEnabled = true;

  // 右键菜单弹出后，测量真实宽高并把菜单完整限制在视口内（防止内容变长后底部溢出）。
  useLayoutEffect(() => {
    if (!ctxMenu || !ctxMenuEnabled) return;
    const el = ctxMenuRef.current;
    if (!el) return;
    const mw = el.offsetWidth;
    const mh = el.offsetHeight;
    const M = 8; // 距屏幕边缘的留白
    const left =
      ctxMenu.x + mw > window.innerWidth - M
        ? Math.max(M, ctxMenu.x - mw)
        : ctxMenu.x;
    const top =
      ctxMenu.y + mh > window.innerHeight - M
        ? Math.max(M, ctxMenu.y - mh)
        : ctxMenu.y;
    setCtxPos({ left, top });
  }, [ctxMenu]);

  // 拖动助手：仅移动助手独立坐标；松手时若未明显移动视为「点击 → 通知父级」
  const personDragRef = useRef<{
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  const startPersonDrag = (e: ReactMouseEvent<HTMLElement>) => {
    // 仅左键支持拖动与单击开合；右键/中键不启动拖拽，交由 onContextMenu 打开公告
    if (e.button !== 0) return;
    // 左键开始拖动时关闭右键菜单，避免菜单残留遮挡
    setCtxMenu(null);
    e.preventDefault();
    setDragging(true); // 拖拽中禁用位移动画，保证实时跟手
    personDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      ox: pos.px,
      oy: pos.py,
      moved: false,
    };
    const onMove = (ev: MouseEvent) => {
      const d = personDragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const px = clamp(
        d.ox + dx,
        FLOAT_MARGIN,
        vw - PERSON_SIZE - FLOAT_MARGIN,
      );
      const py = clamp(
        d.oy + dy,
        FLOAT_MARGIN,
        vh - PERSON_SIZE - FLOAT_MARGIN,
      );
      updatePos({ px, py });
    };
    const onUp = () => {
      personDragRef.current = null;
      setDragging(false); // 恢复位移动画
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // 左键单击（未移动）不触发任何互动（面板开合统一走右键菜单「打开词库管理」）
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // 气泡固定定位：根据助手所在位置，在上/下/左/右四个方向中选择一个能完整容纳的方向展示，
  // 并保证气泡整体落在视口内，避免助手拖到屏幕边缘时气泡被遮挡「显示没了」。
  // 优先级：上方 → 下方 → 左侧 → 右侧。
  const bubblePos = useMemo(() => {
    if (!showBubble) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const W = bubbleW;
    const H = bubbleH;
    const cx = view.px + PERSON_SIZE / 2; // 助手水平中心
    const cy = view.py + PERSON_SIZE / 2; // 助手垂直中心
    // 锚点取「助手盒子顶部往下的可视头部高度」，让尖角指向头部而非盒子空区。
    const ANCHOR = 18;
    const gap = 5;

    let dir: "above" | "below" | "left" | "right";
    let left: number;
    let top: number;

    if (view.py + ANCHOR - gap - H >= FLOAT_MARGIN) {
      // 上方放得下：气泡悬于助手头顶上方，与头部保持一点可见空隙，尖角指向头部
      dir = "above";
      top = view.py + ANCHOR - 8 - H;
      left = Math.min(
        Math.max(FLOAT_MARGIN, cx - W / 2),
        vw - W - FLOAT_MARGIN,
      );
    } else if (view.py + PERSON_SIZE + gap + H <= vh - FLOAT_MARGIN) {
      // 下方放得下
      dir = "below";
      top = view.py + PERSON_SIZE - ANCHOR + gap;
      left = Math.min(
        Math.max(FLOAT_MARGIN, cx - W / 2),
        vw - W - FLOAT_MARGIN,
      );
    } else if (view.px - gap - W >= FLOAT_MARGIN) {
      // 左侧放得下：垂直贴着助手中心并限制在视口内
      dir = "left";
      left = view.px - gap - W;
      top = Math.min(Math.max(FLOAT_MARGIN, cy - H / 2), vh - H - FLOAT_MARGIN);
    } else {
      // 右侧兜底：贴着助手右侧，垂直居中
      dir = "right";
      left = Math.min(view.px + PERSON_SIZE + gap, vw - W - FLOAT_MARGIN);
      top = Math.min(Math.max(FLOAT_MARGIN, cy - H / 2), vh - H - FLOAT_MARGIN);
    }

    // 尖角锚点：上/下方 → 用水平偏移让尖角指助手中心；左/右方 → 用垂直偏移
    const tailX = cx - left - 5; // 尖角在气泡水平方向上的偏移（above/below）
    const tailY = cy - top - 5; // 尖角在气泡垂直方向上的偏移（left/right）

    // 系统消息会话气泡与鼠标移入简介气泡整体上移（会话状态气泡调高一点，远离人物头顶）；
    // toast 成就/互动气泡不偏移，紧贴助手本体展示
    if (!toast) top -= 24;

    return { left, top, dir, tailX, tailY };
  }, [
    showBubble,
    toast,
    bubbleW,
    bubbleH,
    view.px,
    view.py,
    viewVersion,
  ]);

  // 满级成就（最高等级）解锁「词库助手」开关：满级且用户关闭时才隐藏目前助手与其气泡；
  // 未满级强制常驻，忽略 assistantEnabled 的历史值，保证旧用户升级后也能恢复显示
  const assistantMaxed = (status?.level?.next ?? 1) === 0;
  if (assistantMaxed && !(settings?.assistantEnabled ?? DEFAULT_SETTINGS.assistantEnabled))
    return null;

  return (
    <>
      <style>{`
@keyframes pl-pop-in { from { opacity: 0; transform: translateY(6px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes pl-person-bob { 0%,100% { transform: translateY(0) scale(1,1); } 50% { transform: translateY(-5px) scale(1.03,.97); } }
@keyframes pl-person-shadow { 0%,100% { transform: scaleX(1); opacity: .22; } 50% { transform: scaleX(.82); opacity: .14; } }
@keyframes pl-bubble-in { from { opacity: 0; transform: translateY(6px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes pl-bubble-intro { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

.pl-grab { cursor: grab; user-select: none; }
.pl-grab:active { cursor: grabbing; }
@keyframes pl-person-fastbob { 0%,100% { transform: translateY(0) scale(1,1); } 50% { transform: translateY(-7px) scale(1.05,.95); } }
@keyframes pl-person-tilt { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
@keyframes pl-person-jump { 0% { transform: translateY(0); } 30% { transform: translateY(-14px); } 50% { transform: translateY(0); } 70% { transform: translateY(-7px); } 100% { transform: translateY(0); } }
@keyframes pl-person-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

@keyframes pl-person-happybob { 0%,100% { transform: translateY(0) scale(1,1); } 40% { transform: translateY(-8px) scale(1.06,.94); } 70% { transform: translateY(-3px); } }
@keyframes pl-person-sadbob { 0%,100% { transform: translateY(0) rotate(0deg) scale(1,1); } 50% { transform: translateY(2px) rotate(-3deg) scale(.99,1.02); } }
@keyframes pl-ctx-in { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
@keyframes pl-think-ripple { 0% { transform: scale(.4); opacity: 0; } 18% { opacity: .9; } 100% { transform: scale(4.2); opacity: 0; } }
.pl-ctx-menu { padding: 6px; border-radius: 13px; background: var(--dsw-specific-sidebar-fill, #f5f6f7); border: 1px solid var(--dsw-alias-border-l2, rgba(17, 24, 39, .14)); box-shadow: 0 10px 32px rgba(2, 6, 23, .2), 0 2px 8px rgba(2, 6, 23, .1), inset 0 1px 0 rgba(255, 255, 255, .55); animation: pl-ctx-in .16s cubic-bezier(.22, 1, .36, 1); transform-origin: top left; }
.pl-ctx-head { display: flex; align-items: center; gap: 6px; padding: 6px 10px 8px; font-size: 12px; font-weight: 600; letter-spacing: .2px; color: var(--dsw-alias-label-secondary, #6b7280); border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(17, 24, 39, .08)); margin-bottom: 4px; }
.pl-ctx-item { display: flex; align-items: center; gap: 9px; padding: 6px 9px; font-size: 12.5px; border-radius: 9px; cursor: pointer; user-select: none; color: var(--dsw-alias-label-primary, #1f2937); transition: background .16s ease, transform .12s ease; }
.pl-ctx-item:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, .12)); }
.pl-ctx-item:active { background: var(--dsw-alias-interactive-bg-active, rgba(127, 127, 127, .2)); transform: scale(.97); }
.pl-ctx-sub { display: flex; align-items: center; gap: 9px; padding: 6px 9px 6px 20px; font-size: 12.5px; border-radius: 9px; cursor: pointer; user-select: none; color: var(--dsw-alias-label-primary, #1f2937); transition: background .16s ease, transform .12s ease; }
.pl-ctx-sub:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, .12)); }
.pl-ctx-sub:active { background: var(--dsw-alias-interactive-bg-active, rgba(127, 127, 127, .2)); transform: scale(.97); }
.pl-ctx-ic { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 7px; flex-shrink: 0; }
/* 成就解锁彩带：细条从气泡顶部两侧飘落，配合摆动与淡出 */
@keyframes pl-confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(var(--fall, 84px)) rotate(var(--spin, 300deg)); opacity: 0; } }
.pl-confetti { position: absolute; top: -6px; width: 6px; height: 11px; border-radius: 2px; pointer-events: none; animation: pl-confetti-fall 1.1s cubic-bezier(.2,.6,.4,1) forwards; }
@keyframes pl-shine-pop { 0%,30% { opacity: 0; transform: rotate(var(--tilt, -20deg)) scale(.5); } 45% { opacity: 1; transform: rotate(var(--tilt, -20deg)) scale(1.15); } 60%,100% { opacity: 0; transform: rotate(var(--tilt, -20deg)) scale(1); } }
.pl-shine { position: absolute; width: 34px; height: 34px; left: 50%; top: 2px; margin-left: -17px; pointer-events: none; color: #fde68a; filter: drop-shadow(0 0 6px rgba(245,158,11,.7)); animation: pl-shine-pop 1s ease forwards; }
`}</style>
      {/* 助手：始终显示，可独立拖动，悬停显示气泡；点击回调由父级决定是否联动面板 */}
      {/* 用 React Portal 渲染到 document.body：既突破祖先层叠/transform 容器显示在最上层，
          又因元素仍在 React 组件树中而保留全部合成事件（拖动、点击）。 */}
      {createPortal(
        <div
          aria-label={T("pl.title")}
          onMouseDown={startPersonDrag}
          onContextMenu={(e) => {
            // 右键：弹出迷你菜单（词库管理 / 成就 / 公告）；与左键拖动/单击互不干扰。
            // 词库助手未启用，或工具/公告/成就入口全部关闭时不弹菜单。
            e.preventDefault();
            if (!ctxMenuEnabled) return;
            setCtxMenu({ x: e.clientX, y: e.clientY });
          }}
          onMouseEnter={() => {
            hoverRef.current = true;
            setHovering(true);
            // 悬停改为不弹出气泡，仅切换形象动画
          }}
          onMouseLeave={() => {
            hoverRef.current = false;
            setHovering(false);
          }}
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
            transition: dragging
              ? "none"
              : "left .35s cubic-bezier(.22,1,.36,1), top .35s cubic-bezier(.22,1,.36,1)",
            userSelect: "none",
          }}
        >
          {/* 统一气泡框：toast（成就解锁 / 点击互动）临时气泡或会话运行状态气泡（会话进行中的阶段状态文案）共用同一气泡 */}
          {showBubble && bubblePos && (
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
                gap: 3,
                width: "max-content", // 宽随文字尺寸自适应（短文案贴合、长文案展开）
                maxWidth: 220, // 仅保留最大宽度，避免超长文案撑出屏幕
                padding: "6px 13px",
                background: `linear-gradient(180deg, ${TONE.panel} 0%, rgba(17,24,39,0.06) 140%)`,
                color: TONE.text,
                border: `1px solid ${TONE.border}`,
                borderTopColor: "rgba(255,255,255,.08)", // 顶部轻微高光边，增加精致感
                borderRadius: 12, // 四角 12 弧度的圆角胶囊框：柔和而不失精致
                fontSize: 10.5,
                lineHeight: 1.45,
                textAlign: "center",
                boxShadow:
                  "0 4px 16px rgba(17,24,39,.14), 0 1px 2px rgba(17,24,39,.05), inset 0 1px 0 rgba(255,255,255,.05)",
                animation: "pl-bubble-in .2s cubic-bezier(.22,1,.36,1)",
                pointerEvents: "none", // 气泡仅展示，穿透不挡页面点击
              }}
            >
              {toast ? (
                <>
                  {/* 成就解锁彩带特效：顶部闪光星 + 两侧飘落彩带（仅成就解锁时） */}
                  {toast.kind === "achievement" && (
                    <>
                      {CONFETTI_PIECES.map((c, i) => (
                        <span
                          key={i}
                          className="pl-confetti"
                          style={
                            {
                              left: c.left,
                              background: c.color,
                              boxShadow: `0 0 4px ${c.color}`,
                              animationDelay: `${c.delay}s`,
                              "--fall": `${c.fall}px`,
                              "--spin": `${c.spin}deg`,
                            } as CSSProperties
                          }
                        />
                      ))}
                      <div className="pl-shine" aria-hidden="true">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 1l2.6 6.5L21 9l-5 4.3 1.5 6.7L12 16.9 6.5 20l1.5-6.7L3 9l6.4-1.5z" />
                        </svg>
                      </div>
                    </>
                  )}
                  {/* 临时提示：成就解锁 / 点击互动 */}
                  {toast.title && (
                    <div
                      style={{
                        fontWeight: 600,
                        letterSpacing: 1,
                        color: TONE.accent,
                      }}
                    >
                      {toast.title}
                    </div>
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
              ) : (
                /* 会话运行状态气泡：仅展示阶段文案，状态色由右上角提示灯表达 */
                <span
                  style={{
                    color: TONE.text,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    textAlign: "center",
                  }}
                >
                  {activity.text}
                </span>
              )}
              {/* 气泡小尾巴：始终指向助手中心（上→朝下、下→朝上、左→朝右、右→朝左）。
                方块边长 10，旋转 45° 后三角底线（两平角连线）位于方块中心，悬出量取半宽 5，
                使底线恰好落在卡片边界上，与卡片边无缝连接，消除「三角飘在卡片外、中间留空隙」。 */}
              <span
                style={{
                  position: "absolute",
                  // 上/下方向：尖角在气泡水平居中（相对助手中心）；左/右方向：垂直居中
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
          {/* 思考想象波纹：处于任意会话运行状态时，三个波纹圈从右上角 AI 状态指示灯圆点向外依次扩散，营造思考想象效果 */}
          {phaseActive && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 1,
                right: 1,
                width: 9,
                height: 9,
                pointerEvents: "none",
              }}
            >
              {[0, 0.6, 1.2].map((delay) => (
                <span
                  key={delay}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    // 水波纹质感：青蓝半透明描边 + 内层高光 + 柔和光晕，模拟水面扩散的涟漪
                    border: "1.5px solid rgba(56, 189, 248, 0.75)",
                    boxShadow:
                      "0 0 6px rgba(14, 165, 233, .5), inset 0 0 5px rgba(186, 230, 253, .7)",
                    background:
                      "radial-gradient(circle, rgba(14,165,233,.3) 0%, rgba(56,189,248,.14) 55%, transparent 78%)",
                    opacity: 0,
                    animation:
                      "pl-think-ripple 1.8s cubic-bezier(.22,1,.36,1) " +
                      delay +
                      "s infinite",
                  }}
                />
              ))}
            </div>
          )}
          {/* 助手本体：雪碧图就绪时用 background-position 帧播放；加载中/失败时保持空白 */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            {settingsReady &&
            (character === "dshpet" && !whaleBroken ? (
              /* 鲸鱼款·动效：dsh-pet webm 双缓冲 video 动效；加载失败回退下方静态鲸鱼雪碧图 */
              <WhaleStage
                phase={activity.phase}
                hovering={hovering}
                size={PERSON_SIZE}
                onFail={() => setWhaleBroken(true)}
              />
            ) : sheet ? (
              <div
                ref={spriteRef}
                style={{
                  position: "absolute",
                  // 按每帧几何等比缩放到 PERSON_SIZE 内居中：鲸鱼款 192×208 等比缩放保留比例，避免纵向压扁。
                  left: (PERSON_SIZE - sheet.cellW * Math.min(1, PERSON_SIZE / sheet.cellW, PERSON_SIZE / sheet.cellH)) / 2,
                  top: (PERSON_SIZE - sheet.cellH * Math.min(1, PERSON_SIZE / sheet.cellW, PERSON_SIZE / sheet.cellH)) / 2,
                  width: sheet.cellW * Math.min(1, PERSON_SIZE / sheet.cellW, PERSON_SIZE / sheet.cellH),
                  height: sheet.cellH * Math.min(1, PERSON_SIZE / sheet.cellW, PERSON_SIZE / sheet.cellH),
                  backgroundImage: `url(${sheet.url})`,
                  backgroundSize: `${sheet.cellW * sheet.columns * Math.min(1, PERSON_SIZE / sheet.cellW, PERSON_SIZE / sheet.cellH)}px ${sheet.cellH * sheet.rows * Math.min(1, PERSON_SIZE / sheet.cellW, PERSON_SIZE / sheet.cellH)}px`,
                  backgroundRepeat: "no-repeat",
                  // 阶段动作动画（背景帧播放与 transform 互不冲突）
                  animation: personAnim,
                  filter:
                    "drop-shadow(0 2px 7px color-mix(in srgb, var(--dsw-alias-label-primary, #1f2937) 45%, transparent))",
                }}
              />
            ) : (
              /* 静态鲸鱼素材加载中（或加载失败）：保持空白，不做任何形象回退 */
              null
            ))}
            {/* 地面影子 */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: 2,
                width: 34,
                height: 8,
                borderRadius: "50%",
                background:
                  "color-mix(in srgb, var(--dsw-alias-brand-primary, #2563eb) 45%, rgba(2, 6, 23, .55))",
                opacity: 0.34,
                transform: "translateX(-50%)",
                filter: "blur(1px)",
                boxShadow:
                  "0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary, #2563eb) 30%, transparent)",
                animation: "pl-person-shadow 2.6s ease-in-out infinite",
              }}
            />
            {/* DeepSeek 余额角标：仅当有余额数据时显示，与等级徽章共用左下角位置且背景同步、互斥显示（显示余额时隐藏等级）。 */}
            {deepseek && !!deepseek.balance && (
              <div
                title={
                  deepseek.balance
                    ? `${T("pl.deepseek.balance")} ${deepseek.balance.currency} ${deepseek.balance.total}`
                    : T("pl.deepseek.balancePlaceholder")
                }
                style={{
                  position: "absolute",
                  // 高于气泡(zIndex:2147483646)，确保余额角标不被气泡框遮挡
                  zIndex: 2147483647,
                  right: -4,
                  bottom: -2,
                  minWidth: 22,
                  height: 16,
                  padding: "0 4px",
                  borderRadius: 8,
                  background: TONE.accent,
                  // 夜间品牌色偏浅（浅蓝）文字用深色；白天品牌色偏深（深蓝）文字用白色，与等级徽章同步
                  color: dark ? "#10141c" : "#fff",
                  fontSize: 9,
                  fontWeight: 600,
                  lineHeight: "16px",
                  textAlign: "center",
                  boxShadow: "0 1px 4px rgba(2, 6, 23, .25)",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                ¥ {deepseek.balance ? String(deepseek.balance.total) : "--"}
              </div>
            )}
            {/* 等级徽章：显示当前 Lv 与称号；悬停 title 提示升级进度（满级不显示进度）。
              受「显示等级助手」设置控制，关闭后不显示等级；有余额数据时改由余额角标展示（互斥）。 */}
            {status && levelEnabled && !deepseek?.balance && (
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
            {/* AI 状态指示灯：右上角小圆点，颜色随当前活动阶段变化；悬停 title 显示阶段文案。
              仅会话活跃且非空闲时显示：对话结束后（阶段回落 idle）即隐藏 */}
            {activity.sessionActive && activity.phase !== "idle" && (
            <div
              title={activity.text || T(PHASE_KEY[activity.phase])}
              style={{
                position: "absolute",
                top: 1,
                right: 1,
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: PHASE_COLOR[activity.phase],
                boxShadow: "0 0 6px rgba(2, 6, 23, .3)",
                zIndex: 2147483647,
                pointerEvents: "none",
              }}
            />
            )}
          </div>
        </div>,
        document.body,
      )}
      {/* 右键迷你菜单：点击外部区域或菜单项后关闭；「打开词库管理 / 成就 / 公告」共用此入口 */}
      {ctxMenu && ctxMenuEnabled && (
        <>
          {createPortal(
            // 透明遮罩：与菜单同为最高层级且渲染在助手 portal 之后（DOM 靠后），
            // 因此能盖住助手/等级徽章，点击任意位置即关闭菜单（也阻止误拖助手）
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
              ref={ctxMenuRef}
              className="pl-ctx-menu"
              style={{
                position: "fixed",
                left: ctxPos.left,
                top: ctxPos.top,
                zIndex: 2147483647,
                minWidth: 150,
                maxHeight: "calc(100vh - 24px)",
                overflowY: "auto",
                overscrollBehavior: "contain",
                boxSizing: "border-box",
                fontFamily: MONO,
              }}
            >
              <div className="pl-ctx-head">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="var(--dsw-alias-brand-primary, #2563eb)"
                  aria-hidden="true"
                >
                  <path d="M8 2.2l1.1 3.7 3.7 1.1-3.7 1.1L8 11.8 6.9 8.1 3.2 7l3.7-1.1L8 2.2z" />
                </svg>
                {T("pl.floating.title")}
              </div>
              {/* 数据管理（词库管理改名）：提示词库管理；仅当「显示词库管理」开关开启时显示 */}
              {(settings?.rightPanelEnabled ??
                DEFAULT_SETTINGS.rightPanelEnabled) && (
                <div
                  className="pl-ctx-item"
                  onClick={() => {
                    setCtxMenu(null);
                    setLexiconOpen(true);
                  }}
                >
                  <CtxIcon
                    bg="rgba(37, 99, 235, .12)"
                    color="var(--dsw-alias-brand-primary, #2563eb)"
                  >
                    <rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1.1" />
                    <rect x="8.9" y="2.5" width="4.6" height="4.6" rx="1.1" />
                    <rect x="2.5" y="8.9" width="4.6" height="4.6" rx="1.1" />
                    <rect x="8.9" y="8.9" width="4.6" height="4.6" rx="1.1" />
                  </CtxIcon>
                  {T("pl.ctx.dataManagement")}
                </div>
              )}
              {/* 导入导出（数据管理平级）：数据备份与恢复；仅当「数据管理」开关开启时显示 */}
              {(settings?.dataManagementEnabled ??
                DEFAULT_SETTINGS.dataManagementEnabled) && (
                <div
                  className="pl-ctx-item"
                  onClick={() => {
                    setCtxMenu(null);
                    setImportExportOpen(true);
                  }}
                >
                  <CtxIcon
                    bg="rgba(37, 99, 235, .12)"
                    color="var(--dsw-alias-brand-primary, #2563eb)"
                  >
                    <path d="M8 12V4M8 4L5 7M8 4l3 3M8 12l-3-3M8 12l3-3" />
                  </CtxIcon>
                  {T("pl.moduleImportExport")}
                </div>
              )}
              {/* 人格管理入口：多人格 CRUD + 按会话切换；仅当「人格管理」开关开启时显示 */}
              {(settings?.personaEnabled ??
                DEFAULT_SETTINGS.personaEnabled) && (
                <div
                  className="pl-ctx-item"
                  onClick={() => {
                    setCtxMenu(null);
                    setPersonaOpen(true);
                  }}
                >
                  <CtxIcon bg="rgba(139, 92, 246, .12)" color="#8b5cf6">
                    <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12Z" />
                    <path d="M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12Z" />
                  </CtxIcon>
                  {T("pl.ctx.personas")}
                </div>
              )}
              {/* 技能管理入口：管理会话级技能 + 工作区/项目绑定；仅当「技能管理」开关开启时显示 */}
              {(settings?.injectEnabled ??
                DEFAULT_SETTINGS.injectEnabled) && (
                <div
                  className="pl-ctx-item"
                  onClick={() => {
                    setCtxMenu(null);
                    setInjectOpen(true);
                  }}
                >
                  <CtxIcon bg="rgba(139, 92, 246, .12)" color="#8b5cf6">
                    <path d="M4 5.5h9M4 8.5h5.5M4 11.5h9" />
                  </CtxIcon>
                  {T("pl.ctx.inject")}
                </div>
              )}
              {/* 看板入口：统计可视化；仅当「看板」开关开启时显示 */}
              {(settings?.dashboardEnabled ??
                DEFAULT_SETTINGS.dashboardEnabled) && (
                <div className="pl-ctx-item" onClick={openMenuDashboard}>
                  <CtxIcon
                    bg="rgba(37, 99, 235, .12)"
                    color="var(--dsw-alias-brand-primary, #2563eb)"
                  >
                    <path d="M7 13V7M11 13V9M15 13V4M4 13h15" />
                  </CtxIcon>
                  {T("pl.ctx.dashboard")}
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
              {(settings?.announcementEnabled ??
                DEFAULT_SETTINGS.announcementEnabled) && (
                <div className="pl-ctx-item" onClick={openMenuAnnounce}>
                  <CtxIcon
                    bg="rgba(220, 38, 38, .1)"
                    color="var(--dsw-alias-state-error-primary, #dc2626)"
                  >
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
      <AnnouncementModal
        open={announceOpen}
        onClose={() => setAnnounceOpen(false)}
        t={T}
      />
      {/* 成就弹窗：右键菜单「成就」打开（等级 + 成就列表） */}
      <AchievementModal
        open={achievementOpen}
        onClose={() => setAchievementOpen(false)}
        t={T}
      />
      {/* 人格管理弹窗：右键菜单「人格管理」打开（多人格 CRUD + 会话绑定说明） */}
      <PersonaManagerModal
        open={personaOpen}
        onClose={() => setPersonaOpen(false)}
        t={T}
      />
      {/* 技能注入弹窗：右键菜单「技能注入」打开（当前会话临时注入 / 工作区项目持久绑定） */}
      <PromptInjectPanel
        open={injectOpen}
        onClose={() => setInjectOpen(false)}
        t={T}
      />
      {/* 看板弹窗：右键菜单「看板」打开（统计可视化） */}
      <DashboardModal
        open={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        t={T}
      />
      {/* 导入导出：右键菜单与「数据管理」平级的独立弹窗 */}
      <ImportExportModal
        open={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        t={T}
      />
      {/* 词库管理弹窗：右键菜单「数据管理」打开（左侧列表 / 右侧详情·标签·回收站） */}
      <LexiconManagerModal
        open={lexiconOpen}
        onClose={() => setLexiconOpen(false)}
        t={T}
      />
    </>
  );
}
