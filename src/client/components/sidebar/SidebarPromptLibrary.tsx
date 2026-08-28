/**
 * 词库侧边栏面板。
 *
 * 以浮动面板形式展示在右侧（position: fixed），使用本地状态控制展开/折叠，
 * 默认折叠时在右侧边缘显示展开标签。
 *
 * 特性：
 * - 默认显示搜索框，搜索所有提示词
 * - 展开时自动聚焦搜索框
 * - 支持分组折叠（状态持久化到 localStorage）
 * - 使用次数排序，最常用的在前面
 * - 刷新按钮位于头部（带刷新图标与刷新状态）
 * - 新建/自动学习的提示词高亮显示「新增」标记
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { PluginSettings, Prompt } from "../../../types.js";
import { clampTitle, DEFAULT_SETTINGS } from "../../../types.js";
import {
  createPrompt as apiCreate,
  deletePrompt as apiDelete,
  getSettings as apiGetSettings,
  listPrompts as apiList,
  listTags as apiListTags,
  updatePrompt as apiUpdate,
  usePrompt as apiUse,
  polishPrompt,
} from "../../services/api.js";
import { isRecent, markRecent } from "../../utils/recent-created.js";
import { useHoverDetail } from "../common/HoverDetail.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { Pagination } from "../common/Pagination.js";
import { notifyDataChanged, useDataChanged } from "../../services/data-sync.js";
import { PL_BUTTON_CSS, plBtn } from "../../utils/button-style.js";
import { rowBackground } from "../../utils/theme.js";
import { PromptAssistant } from "../assistant/PromptAssistant.js";
import { type PLTranslate, usePLT } from "../../i18n/i18n.js";
import { Highlight, SearchBox, TagFilterBar } from "../common/SearchBox.js";
import { TagInput } from "../common/TagInput.js";
import { ConfirmDialog } from "../common/ConfirmDialog.js";
import {
  applyVariables,
  extractVariables,
  hasVariables,
  insertVariableAt,
  TemplateFillModal,
} from "../common/TemplateVariables.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

const TONE = {
  // 与宿主左侧栏（ui-sidebar .root）保持一致，随宿主主题自动深浅。
  // 背景/文字用宿主侧栏专属 token，不使用渲染器近似色。
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  quiet: "var(--dsw-alias-label-tertiary, #9ca3af)",
  panel: "var(--dsw-specific-sidebar-fill, #f5f6f7)",
  row: "var(--dsw-alias-input-fill, #ffffff)",
  border: "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))",
  accent: "var(--dsw-alias-brand-primary, #2563eb)",
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #2563eb) 20%, transparent)",
  mint: "var(--dsw-alias-state-success-primary, #16a34a)",
  red: "var(--dsw-alias-state-error-primary, #dc2626)",
} as const;

/** 视图切换分段按钮的基础样式 */
const segBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  padding: 0,
  border: "none",
  cursor: "pointer",
  borderRadius: 6,
  color: TONE.quiet,
  fontFamily: MONO,
  transition: "background .18s ease, box-shadow .18s ease, color .18s ease",
};

type Editor =
  | { mode: "none"; title: string; body: string; tags: string }
  | { mode: "create"; title: string; body: string; tags: string }
  | { mode: "edit"; id: string; title: string; body: string; tags: string };

const NO_EDITOR: Editor = { mode: "none", title: "", body: "", tags: "" };

/** 分组折叠状态在 localStorage 中的存储键。 */
const EXPANDED_GROUPS_KEY = "pl:expanded-groups";

/** 悬停详情卡片宽度（需与 HoverDetail.tsx 的 CARD_W 保持一致）与左侧间隙。 */
const HOVER_W = 300;
const HOVER_GAP = 12;

/** 右侧边栏固定宽度：不随共享的 panelWidth 设置变化。 */
const SIDEBAR_WIDTH = 380;

// ── 浮动面板（可拖动 / 缩放 / 折叠）相关常量 ────────────────────────────────
/** 浮动面板位置/尺寸/折叠状态在 localStorage 中的存储键。 */
const FLOAT_KEY = "pl:float-state";
/** 面板顶部最小留白（给宿主 header）与四周最小边距。 */
const FLOAT_MARGIN = 8;
/** 面板最小宽高。 */
const FLOAT_MIN_W = 300;
const FLOAT_MIN_H = 340;

interface FloatState {
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
}

/** 读入上次的浮动状态；首次进入面板落右下角。 */
function loadFloatState(): FloatState {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const def: FloatState = {
    x: Math.max(FLOAT_MARGIN, w - SIDEBAR_WIDTH - FLOAT_MARGIN),
    y: Math.max(FLOAT_MARGIN, h - 520 - FLOAT_MARGIN),
    width: SIDEBAR_WIDTH,
    height: 520,
    collapsed: true,
  };
  try {
    const raw = localStorage.getItem(FLOAT_KEY);
    if (raw) return { ...def, ...(JSON.parse(raw) as Partial<FloatState>) };
  } catch {
    /* 读取失败用默认 */
  }
  return def;
}

/** 把位置 clamp 到会话窗口矩形内（含四周最小边距）。坐标均为视口坐标。 */
function clampPos(
  x: number,
  y: number,
  width: number,
  height: number,
  r: { left: number; top: number; right: number; bottom: number },
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(r.left + FLOAT_MARGIN, x), Math.max(r.left + FLOAT_MARGIN, r.right - width - FLOAT_MARGIN)),
    y: Math.min(Math.max(r.top + FLOAT_MARGIN, y), Math.max(r.top + FLOAT_MARGIN, r.bottom - height - FLOAT_MARGIN)),
  };
}

/**
 * 找到最接近面板的「会话窗口」容器：优先自面板向上取带 data-phase 的会话根节点。
 *
 * 宿主会话根节点带 data-phase 标记（hero/active/settling），用它作为锚点最准确：
 * 新建会话（hero 模式）下输入框很大，纯尺寸启发式会误命中输入卡片
 * （data-composer-card），把面板活动范围夹取在输入框内。未找到 data-phase 时，
 * 尺寸回退需跳过输入卡片，避免同样的误判。
 */
function findChatWindow(panel: HTMLElement | null): Element | null {
  // 主路径：向上找第一个带 data-phase 的会话根节点（文本框的 data-phase 与工具栏行
  // 不同分支，向上遍历不会命中）
  let el = panel?.parentElement ?? null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.hasAttribute("data-phase")) return el;
    el = el.parentElement;
  }
  // 回退：跳过输入卡片（data-composer-card），取第一个足够大的稳定祖先
  el = panel?.parentElement ?? null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (!el.hasAttribute("data-composer-card")) {
      const r = el.getBoundingClientRect();
      if (r.width >= 360 && r.height >= 240) return el;
    }
    el = el.parentElement;
  }
  return null;
}

/** 把锚点元素矩形转为视口矩形；未找到时回退到整个视口。 */
function anchorRect(anchor: Element | null): { left: number; top: number; right: number; bottom: number } {
  if (!anchor) return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  const r = anchor.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

/**
 * 会话窗口可用区域：首次挂载时锁定锚点元素，此后只重新测量同一个元素的矩形。
 *
 * 若每次重算都重跑 findChatWindow，插入内容使聊天输入框变高后会误认输入框为新锚点，
 * 导致工具窗口「跟着跳到聊天框」。锁定锚点后，仅跟随该会话容器的尺寸/位置变化。
 */
function useChatWindow(panelRef: { current: HTMLElement | null }): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  const anchorRef = useRef<Element | null>(null);
  const [rect, setRect] = useState(() => anchorRect(findChatWindow(panelRef.current)));
  useEffect(() => {
    // 首次锁定锚点：在挂载时聊天输入框通常较矮，可正确命中会话容器
    anchorRef.current = findChatWindow(panelRef.current);
    const measure = () =>
      setRect(anchorRect(anchorRef.current ?? findChatWindow(panelRef.current)));
    measure();
    // 观察面板与 body：会话容器布局变化（含窗口被挤压、内部面板展开/收拢）都会触发重算
    const targets: (Element | null)[] = [panelRef.current, document.body];
    const ro = new ResizeObserver(measure);
    for (const t of targets) if (t) ro.observe(t);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    // 部分内部拖拽分隔布局不发 resize/ResizeObserver，做低频轮询兜底
    const iv = window.setInterval(measure, 400);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearInterval(iv);
    };
  }, []);
  return rect;
}

function useSettings(): { settings: PluginSettings; ready: boolean } {
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  const load = useCallback(() => {
    apiGetSettings().then((s) => {
      setSettings(s);
      setReady(true);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // 监听设置变更事件，立即生效
  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as PluginSettings | undefined;
      if (detail) {
        setSettings(detail);
        setReady(true);
      } else load();
    };
    window.addEventListener("pl:settings-changed", onChanged);
    return () => window.removeEventListener("pl:settings-changed", onChanged);
  }, [load]);

  return { settings, ready };
}

export function SidebarPromptLibrary(props?: {
  inputActions?: { setDraft: (text: string) => void; submit?: () => void };
  draft?: string;
  t?: PLTranslate;
}): ReactNode {
  const { inputActions, draft, t } = props ?? {};
  const T = usePLT(t);
  const { settings, ready: settingsReady } = useSettings();
  // 浮动面板状态：位置/尺寸/折叠持久化到 localStorage；默认折叠，显示助手
  const [float, setFloat] = useState<FloatState>(loadFloatState);
  const collapsed = float.collapsed;
  const setCollapsed = useCallback(
    (v: boolean) => updateFloat({ collapsed: v }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  // 合并更新浮动状态并持久化
  function updateFloat(patch: Partial<FloatState>): void {
    setFloat((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(FLOAT_KEY, JSON.stringify(next));
      } catch {
        /* 忽略存储失败 */
      }
      return next;
    });
  }
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  // 词库标签表标签名（与提示词标签合并，保证新建标签能同步到下拉候选）
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  // 实时搜索：输入变化立即可用于过滤
  const clearSearch = useCallback(() => setQuery(""), []);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(NO_EDITOR);
  // 复制反馈：最近复制的提示词 id（用于按钮显示「已复制」）
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // AI 润色状态：idle | loading（某条润色中） | done（展示可编辑的润色结果）
  const [polish, setPolish] = useState<
    | { status: "idle" }
    | { status: "loading"; id: string }
    | { status: "done"; id: string }
  >({ status: "idle" });
  // AI 润色结果（可编辑）
  const [polishResult, setPolishResult] = useState("");
  // 润色失败提示（独立于编辑器 error，展示在列表区顶部）
  const [polishError, setPolishError] = useState<string | null>(null);
  // 润色结果插入时待填充的变量（润色结果没有对应 Prompt 对象，独立记录待插入文本）
  const [polishInsert, setPolishInsert] = useState<string | null>(null);
  // 模板变量填充弹窗：插入前填写 {{变量}} 占位符
  const [template, setTemplate] = useState<{ prompt: Prompt; mode: "insert" | "overwrite" } | null>(null);
  // 待确认删除的提示词（自定义确认弹窗，替代系统 confirm）
  const [deleteConfirm, setDeleteConfirm] = useState<Prompt | null>(null);
  // AI 优化重复确认：已 AI 完善的提示词再次点「AI 优化」时弹出确认，由用户决定是否继续优化
  const [polishConfirm, setPolishConfirm] = useState<Prompt | null>(null);
  // 待查看详情的提示词（查看弹层，覆盖整个面板展示完整标题/标签/正文，仅可通过关闭按钮关闭）
  const [viewing, setViewing] = useState<Prompt | null>(null);
  // 查看详情「AI 优化」：润色状态、结果与原稿/润色稿切换（在详情内联展示，不关闭详情）
  const [viewPolish, setViewPolish] = useState<{ status: "idle" | "loading" | "done"; id: string }>({ status: "idle", id: "" });
  const [viewPolishText, setViewPolishText] = useState("");
  const [viewShowOriginal, setViewShowOriginal] = useState(false);
  // 每个分组的展开状态（持久化到 localStorage，刷新后保持）。
  // 默认全部折叠：集合中只记录「已展开」的分组，空集合即全部折叠。
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(EXPANDED_GROUPS_KEY);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      // 读取失败时使用默认（全部折叠）
    }
    return new Set();
  });

  const toggleGroup = useCallback((tag: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      // 同步保存到 localStorage
      try {
        localStorage.setItem(EXPANDED_GROUPS_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // 忽略存储失败
      }
      return next;
    });
  }, []);

  // 最近使用分组展开状态（默认展开，可点击分组头收起）
  const [recentCollapsed, setRecentCollapsed] = useState(false);

  // ── 工具面板美化：视图模式 / 正文展开 / 更多菜单 / 键盘导航 ──────────────
  // 视图模式（列表/卡片），持久化到 localStorage
  const [viewMode, setViewMode] = useState<"list" | "card">(() => {
    try {
      return localStorage.getItem("pl:view-mode") === "list" ? "list" : "card";
    } catch {
      return "card";
    }
  });
  const changeViewMode = useCallback((m: "list" | "card") => {
    setViewMode(m);
    try {
      localStorage.setItem("pl:view-mode", m);
    } catch {
      /* 忽略存储失败 */
    }
  }, []);
  // 当前打开「更多操作」菜单的提示词 id（每卡片/行一个 ⋯ 溢出菜单）
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // 键盘导航当前选中项在可见列表中的下标
  const [activeIdx, setActiveIdx] = useState(0);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const refreshController = useRef<AbortController | null>(null);
  // 提示词行悬停详情（由设置控制，默认关闭）
  const hover = useHoverDetail();
  const hoverEnabled = settings.hoverDetailEnabled;
  // 面板根元素 ref：用于把悬停详情卡片固定在面板左侧
  const panelRef = useRef<HTMLElement>(null);
  // 面板锚点 ref：保持在原 DOM 树内（聊天工具栏行内）的不可见元素，
  // 供 useChatWindow 沿父链定位会话窗口（面板本体通过 Portal 渲染到 body）
  const chatAnchorRef = useRef<HTMLSpanElement>(null);
  // 编辑表单正文输入框引用：供「插入变量 {{}}」定位光标
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // ── 浮动面板：拖拽定位 / 缩放尺寸 / 折叠助手 ────────────────────────────
  // 以「会话窗口」为锚点：会话容器被其它窗口/内部面板挤压、或缩小返回原大小时，
  // 计算 chat 矩形并重算 view，面板跟随会话窗口收回与展开。world 位置（float.x/y）不变，
  // 大到会话窗口扩大后又能回到原本的位置与尺寸。
  const chat = useChatWindow(chatAnchorRef);
  // 展示用的位置与尺寸：把 home（float.x/y/width/height）按会话窗口矩形夹取得到实际渲染
  // 坐标与宽高；home 保持不变。聊天窗口被挤压变小时，面板也随之收回（宽高夹回会话窗口内），
  // 拉大窗口后又回到原来的位置与尺寸（展开）。
  const view = useMemo(() => {
    const availW = Math.max(0, chat.right - chat.left - FLOAT_MARGIN * 2);
    const availH = Math.max(0, chat.bottom - chat.top - FLOAT_MARGIN * 2);
    const width = Math.min(float.width, availW);
    const height = Math.min(float.height, availH);
    const pos = clampPos(float.x, float.y, width, height, chat);
    return { ...pos, width, height };
  }, [float.x, float.y, float.width, float.height, chat]);

  // 拖动面板（头部作为拖拽手柄；避开头部的交互按钮）
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const startPanelDrag = (e: ReactMouseEvent<HTMLElement>) => {
    // 命中头部内按钮时不触发拖动（按钮各自有点击行为）
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y };
    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      updateFloat({
        ...clampPos(d.ox + (ev.clientX - d.startX), d.oy + (ev.clientY - d.startY), float.width, float.height, chat),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // 拉伸面板（右下角手柄）
  const resizeRef = useRef<{ startX: number; startY: number; ow: number; oh: number } | null>(null);
  const startResize = (e: ReactMouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, ow: float.width, oh: float.height };
    const onMove = (ev: MouseEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const width = Math.min(Math.max(r.ow + (ev.clientX - r.startX), FLOAT_MIN_W), chat.right - view.x - FLOAT_MARGIN);
      const height = Math.min(Math.max(r.oh + (ev.clientY - r.startY), FLOAT_MIN_H), chat.bottom - view.y - FLOAT_MARGIN);
      updateFloat({ width, height });
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // 固定显示在面板左侧的详情卡片：x 取面板左缘左侧，y 对齐所悬停行的顶部（位置确定可预期）
  const showDetail = (p: Prompt, rowTop: number) => {
    const panel = panelRef.current;
    const leftEdge = panel
      ? panel.getBoundingClientRect().left
      : window.innerWidth - Math.min(SIDEBAR_WIDTH, window.innerWidth);
    hover.show(p, leftEdge - HOVER_W - HOVER_GAP, rowTop);
  };

  const refresh = useCallback(() => {
    refreshController.current?.abort();
    const ctrl = new AbortController();
    refreshController.current = ctrl;
    setPhase("loading");
    setError(null);
    apiList()
      .then((list) => {
        if (ctrl.signal.aborted) return;
        setPrompts(list);
        setPhase("ready");
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      });
    // 同步刷新标签表候选，保证新建标签能立刻出现在下拉框
    apiListTags()
      .then((tags) => {
        if (ctrl.signal.aborted) return;
        setTagNames(tags.map((x) => x.name));
      })
      .catch(() => {});
  }, []);

  // 订阅数据变化：聊天面板新增/修改/删除时同步刷新本面板
  useDataChanged(refresh);

  // 展开时加载数据并聚焦搜索框
  useEffect(() => {
    if (collapsed) return;
    if (phase === "idle") refresh();
    // 自动聚焦搜索框
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [collapsed, phase, refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prompts.filter((p) => {
      // 标签过滤：命中该项标签（与关键词过滤叠加，二者为“且”关系）
      if (tagFilter && !(p.tags ?? []).some((t) => t.trim() === tagFilter)) return false;
      if (!q) return true;
      const hay = `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [prompts, query, tagFilter]);

  // ── 搜索到内容自动展开分组；清空搜索恢复原状态 ───────────────
  // 记录搜索前的展开状态，清空搜索时还原，不与"新增自动展开"互相干扰
  const preSearchExpanded = useRef<Set<string> | null>(null);
  useEffect(() => {
    const hasQuery = query.trim().length > 0;
    if (hasQuery) {
      // 首次搜索时记录当前（搜索前）展开状态，便于清空后还原
      if (preSearchExpanded.current === null) {
        preSearchExpanded.current = new Set(expandedGroups);
      }
      // 搜索时展开最近使用分组，让搜索结果展示出来
      setRecentCollapsed(false);
      // 展开当前可见结果涉及的所有分组，让搜索结果展示出来
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        for (const p of filtered) {
          if (p.tags && p.tags.length > 0) p.tags.forEach((t) => next.add(t));
          else next.add(T("pl.sidebar.uncategorized"));
        }
        return next;
      });
    } else if (preSearchExpanded.current !== null) {
      // 清空搜索：恢复搜索前的展开状态
      setExpandedGroups(preSearchExpanded.current);
      preSearchExpanded.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filtered, T]);

  // ── 点选标签：只展示该标签分组并默认展开；切回「全部」时还原之前的展开状态 ──
  // 记录点选标签前（「全部」视图下）的展开状态，便于切回后还原
  const preTagExpanded = useRef<{ groups: Set<string>; recent: boolean } | null>(null);
  useEffect(() => {
    if (tagFilter) {
      // 第一次点选标签时记录「全部」视图下的展开状态
      if (preTagExpanded.current === null) {
        preTagExpanded.current = { groups: new Set(expandedGroups), recent: recentCollapsed };
      }
      // 只展开当前标签分组、收起最近使用，其余分组不再展示
      setExpandedGroups(new Set([tagFilter]));
      setRecentCollapsed(true);
    } else if (preTagExpanded.current !== null) {
      // 切回「全部」：恢复之前记录的标签展开状态
      setExpandedGroups(preTagExpanded.current.groups);
      setRecentCollapsed(preTagExpanded.current.recent);
      preTagExpanded.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagFilter]);

  // 已有标签候选（去重排序）：来自所有提示词 + 词库标签表，供标签输入下拉提示
  const allTags = useMemo(() => {
    const s = new Set<string>(tagNames);
    for (const p of prompts) for (const t of p.tags ?? []) s.add(t);
    return Array.from(s).sort();
  }, [prompts, tagNames]);

  // ── 新增数据自动展开/定位 ──────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    // 找出本次刷新相对上次新增、且处于「最近创建」的提示词
    const fresh = prompts.filter((p) => !seenIdsRef.current.has(p.id) && isRecent(p.id));
    // 更新已见集合：此后不再把它当新增处理
    seenIdsRef.current = new Set(prompts.map((p) => p.id));
    if (fresh.length === 0) return;
    // 展开新增提示词所在的标签分组（无标签归"未分类"）
    const tags = new Set<string>();
    for (const p of fresh) {
      if (p.tags && p.tags.length > 0) p.tags.forEach((t) => tags.add(t));
      else tags.add(T("pl.sidebar.uncategorized"));
    }
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      tags.forEach((t) => next.add(t));
      return next;
    });
    // 展开后滚动到新增项，使其可见
    const id = fresh[0].id;
    window.setTimeout(() => {
      scrollRef.current
        ?.querySelector(`[data-pl-id="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }, 60);
  }, [prompts, T]);

  // 把文本插入当前草稿；无草稿上下文时回退为复制到剪贴板
  const insertText = useCallback(
    (text: string) => {
      if (inputActions) {
        inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${text}` : text);
      } else {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    },
    [inputActions, draft],
  );

  const insert = useCallback(
    (prompt: Prompt) => {
      // 含模板变量占位符时先弹出填充窗口，确认后再插入
      if (hasVariables(prompt.body)) {
        setTemplate({ prompt, mode: "insert" });
        return;
      }
      apiUse(prompt.id).catch(() => {});
      insertText(prompt.body);
    },
    [insertText],
  );

  // 用提示词正文覆盖当前草稿；无草稿上下文时回退为复制到剪贴板
  const overwrite = useCallback(
    (prompt: Prompt) => {
      if (hasVariables(prompt.body)) {
        setTemplate({ prompt, mode: "overwrite" });
        return;
      }
      apiUse(prompt.id).catch(() => {});
      if (inputActions) inputActions.setDraft(prompt.body);
      else navigator.clipboard.writeText(prompt.body).catch(() => {});
    },
    [inputActions],
  );

  // 模板变量填充确认：用填充后的正文插入/覆盖，未提供的变量保留原占位符
  const applyTemplate = useCallback(
    (values: Record<string, string>) => {
      if (!template) return;
      const filled = applyVariables(template.prompt.body, values);
      apiUse(template.prompt.id).catch(() => {});
      if (template.mode === "insert") insertText(filled);
      else if (inputActions) inputActions.setDraft(filled);
      else navigator.clipboard.writeText(filled).catch(() => {});
      setTemplate(null);
    },
    [template, insertText, inputActions],
  );

  // 润色结果变量填充确认：用填充后的文本插入，未提供的变量保留原占位符
  const applyPolishInsert = useCallback(
    (values: Record<string, string>) => {
      if (polishInsert === null) return;
      insertText(applyVariables(polishInsert, values));
      setPolishInsert(null);
    },
    [polishInsert, insertText],
  );

  // 模板变量「插入并发送」：填写变量后 setDraft + submit 直接发送，仅在草稿为空时由弹窗开放。
  const insertAndSend = useCallback(
    (values: Record<string, string>) => {
      const source = polishInsert !== null ? polishInsert : template?.prompt.body;
      if (source == null) return;
      const filled = applyVariables(source, values);
      if (template) apiUse(template.prompt.id).catch(() => {});
      if (inputActions) {
        inputActions.setDraft(filled);
        inputActions.submit?.();
      } else {
        navigator.clipboard.writeText(filled).catch(() => {});
      }
      setTemplate(null);
      setPolishInsert(null);
    },
    [template, polishInsert, inputActions],
  );

  // 复制提示词正文到剪贴板，短暂显示「已复制」
  const copy = useCallback((p: Prompt) => {
    navigator.clipboard
      .writeText(p.body)
      .then(() => {
        setCopiedId(p.id);
        setTimeout(() => setCopiedId((cur) => (cur === p.id ? null : cur)), 1500);
      })
      .catch(() => {});
  }, []);

  // 调用 AI 润色提示词正文，成功后进入润色结果视图，用户自行选择复制/插入/保存；失败展示错误提示。
  const startPolish = useCallback((p: Prompt) => {
    setPolishError(null);
    setPolish({ status: "loading", id: p.id });
    polishPrompt(p.body).then(
      (res) => {
        setPolishResult(res.polished);
        setPolish({ status: "done", id: p.id });
      },
      (e: unknown) => {
        setPolishError(e instanceof Error ? e.message : String(e));
        setPolish({ status: "idle" });
      },
    );
  }, []);

  // 关闭润色结果视图
  const closePolish = useCallback(() => {
    setPolish({ status: "idle" });
    setError(null);
    setPolishInsert(null);
  }, []);

  // 点击「AI 优化」：内容已 AI 完善过则先弹确认，由用户决定是否继续优化；未完善直接优化
  const handlePolishClick = useCallback((p: Prompt) => {
    if (p.aiRefined) setPolishConfirm(p);
    else startPolish(p);
  }, [startPolish]);

  // AI 优化失败提示展示若干秒后自动关闭（无需手动点击）
  useEffect(() => {
    if (!polishError) return;
    const timer = setTimeout(() => setPolishError(null), 4000);
    return () => clearTimeout(timer);
  }, [polishError]);

  // 把润色结果保存回词库（更新正文，保留原标题）
  const savePolish = useCallback(() => {
    if (polish.status !== "done") return;
    const id = polish.id;
    const original = prompts.find((x) => x.id === id);
    apiUpdate(id, {
      body: polishResult,
      sourceBody: original && original.body !== polishResult ? original.body : undefined,
      aiRefined: true,
    }).then(() => {
      closePolish();
      notifyDataChanged();
    }, (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [polish, polishResult, prompts, closePolish]);

  // 关闭查看详情：清空查看状态与详情内联的 AI 优化结果
  const closeView = useCallback(() => {
    setViewing(null);
    setViewPolish({ status: "idle", id: "" });
    setViewPolishText("");
    setViewShowOriginal(false);
  }, []);

  // 查看详情「AI 优化」：对正文执行润色，成功后内联展示结果（不关闭详情）
  const startViewPolish = useCallback(async () => {
    if (!viewing || viewPolish.status === "loading") return;
    setViewPolish({ status: "loading", id: viewing.id });
    setViewShowOriginal(false);
    setPolishError(null);
    try {
      const res = await polishPrompt(viewing.body);
      setViewPolishText(res.polished);
      setViewPolish({ status: "done", id: viewing.id });
    } catch (e: unknown) {
      // 优化失败：回到空闲态并给出错误提示，按钮可再次点击重试
      setViewPolish({ status: "idle", id: "" });
      setPolishError(e instanceof Error ? e.message : String(e));
    }
  }, [viewing, viewPolish.status]);

  // 查看详情里把润色结果保存回词库（更新正文，保留原稿作对比，标记已 AI 完善）
  const saveViewPolish = useCallback(async () => {
    if (viewPolish.status !== "done" || !viewing) return;
    const body = viewPolishText.trim();
    if (!body) return;
    try {
      const updated = await apiUpdate(viewing.id, {
        body,
        sourceBody: viewing.body !== body ? viewing.body : undefined,
        aiRefined: true,
      });
      setViewing(updated);
      setPrompts((list) => list.map((p) => (p.id === updated.id ? updated : p)));
      setViewPolish({ status: "idle", id: "" });
      setViewPolishText("");
      setViewShowOriginal(false);
      notifyDataChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [viewPolish.status, viewPolishText, viewing]);

  // 分组渲染顺序：
  // 1. 最近使用分组（30 天内有使用记录，按使用次数降序取前 10 条）固定在列表最前，
  //    仅作置顶展示，不排除对应提示词进入标签分组；
  // 2. 其余按 tag 分组：多标签的提示词出现在每个对应标签分组，无标签归入「未分类」。
  const tagGrouped = useMemo(() => {
    const recentKey = T("pl.sidebar.recent");
    const uncategorized = T("pl.sidebar.uncategorized");
    const recentCut = Date.now() - 30 * 24 * 60 * 60 * 1000;
    // 最近使用只展示使用次数最多的 10 条（次数相同则最近使用的在前）。
    const recent = filtered
      .filter((p) => p.lastUsedAt > 0 && p.lastUsedAt >= recentCut)
      .sort((a, b) => b.usageCount - a.usageCount || b.lastUsedAt - a.lastUsedAt)
      .slice(0, 10);
    const groups = new Map<string, Prompt[]>();
    // 所有提示词按标签分组：多标签提示词出现在每个标签分组；无/空标签归入「未分类」。
    for (const p of filtered) {
      const validTags = (p.tags ?? []).map((x) => x.trim()).filter(Boolean);
      if (validTags.length > 0) {
        // 去重，避免同一提示词在同一个标签分组中重复出现
        for (const tag of new Set(validTags)) {
          if (!groups.has(tag)) groups.set(tag, []);
          groups.get(tag)!.push(p);
        }
      } else {
        if (!groups.has(uncategorized)) groups.set(uncategorized, []);
        groups.get(uncategorized)!.push(p);
      }
    }
    // 标签分组按名称排序，「未分类」排最后
    const rest = Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === uncategorized) return 1;
      if (b === uncategorized) return -1;
      return a.localeCompare(b);
    });
    const ordered: Array<[string, Prompt[]]> = [];
    // 点选标签时只展示该标签分组，隐藏「最近使用」；「全部」视图才展示最近使用
    if (tagFilter === "" && recent.length > 0) ordered.push([recentKey, recent]);
    ordered.push(...rest);
    return ordered;
  }, [filtered, T, tagFilter]);

  // 词库助手常驻屏幕（不受面板开关控制）；下面的浮动面板由 rightPanelEnabled 单独控制显示
  const editing = editor.mode !== "none";

  const startCreate = () =>
    setEditor({ mode: "create", title: "", body: "", tags: "" });

  const startEdit = (p: Prompt) =>
    setEditor({
      mode: "edit",
      id: p.id,
      title: p.title,
      body: p.body,
      tags: (p.tags ?? []).join("#"),
    });

  const saveEditor = () => {
    const title = editor.title.trim();
    const body = editor.body;
    if (!title || !body) {
      setError(T("pl.requireTitleBody"));
      return;
    }
    const tags = editor.tags.split("#").map((t) => t.trim()).filter(Boolean);
    const done = () => {
      setEditor(NO_EDITOR);
      notifyDataChanged();
    };
    if (editor.mode === "create") {
      apiCreate({ title, body, tags }).then((p) => {
        markRecent(p.id);
        done();
      }, (e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
    } else if (editor.mode === "edit") {
      apiUpdate(editor.id, { title, body, tags }).then(done, (e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
    }
  };

  const remove = (p: Prompt) => {
    setDeleteConfirm(p);
  };

  /** 确认删除：从词库删除并移入回收站。 */
  const confirmRemove = () => {
    if (!deleteConfirm) return;
    apiDelete(deleteConfirm.id).then(notifyDataChanged, (e: unknown) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  };

  // 当前可见的、按渲染顺序排列的提示词列表（用于键盘导航与高亮）：跳过已折叠分组
  const flatVisible = useMemo(() => {
    const arr: Prompt[] = [];
    for (const [tag, items] of tagGrouped) {
      const isRecentSection = tag === T("pl.sidebar.recent");
      const collapsed = isRecentSection ? recentCollapsed : !expandedGroups.has(tag);
      if (collapsed) continue;
      arr.push(...items);
    }
    return arr;
  }, [tagGrouped, T, recentCollapsed, expandedGroups]);

  // ── 卡片视图：不分组合并、平铺显示全部提示词，超过一页用分页 ─────────────
  const CARD_PAGE_SIZE = 10;
  const [cardPage, setCardPage] = useState(1);
  // 卡片模式平铺去重列表：按 tagGrouped 顺序（最近使用优先 + 标签组顺序），多标签只出现一次
  const cardItems = useMemo(() => {
    const seen = new Set<string>();
    const arr: Prompt[] = [];
    for (const [, items] of tagGrouped) {
      for (const p of items) {
        const k = String(p.id);
        if (seen.has(k)) continue;
        seen.add(k);
        arr.push(p);
      }
    }
    return arr;
  }, [tagGrouped]);
  const cardTotalPages = Math.max(1, Math.ceil(cardItems.length / CARD_PAGE_SIZE));
  // 搜索词/标签/数据变化时回到第 1 页；页数变小时夹取页码
  useEffect(() => {
    setCardPage(1);
  }, [query, tagFilter, filtered.length]);
  useEffect(() => {
    setCardPage((pg) => Math.min(pg, cardTotalPages));
  }, [cardTotalPages]);
  const cardPageItems = useMemo(
    () => cardItems.slice((cardPage - 1) * CARD_PAGE_SIZE, cardPage * CARD_PAGE_SIZE),
    [cardItems, cardPage],
  );

  // 点击「更多操作」菜单外部 / Esc 关闭该菜单
  useEffect(() => {
    if (!menuFor) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-pl-menu]")) setMenuFor(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuFor(null);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuFor]);

  // 可见项变化时把键盘选中下标夹到有效范围
  useEffect(() => {
    setActiveIdx((a) => Math.min(a, Math.max(0, flatVisible.length - 1)));
  }, [flatVisible.length]);

  // 键盘导航：↑↓选择、Home/End 首尾、Enter 插入、Esc 收起面板。
  // 仅在聊天输入框聚焦时也接管选择，避免干扰正文输入；非输入编辑态下由上层弹层接管。
  useEffect(() => {
    if (
      collapsed ||
      editing ||
      viewing ||
      template ||
      deleteConfirm ||
      polishConfirm ||
      polish.status === "done" ||
      polishInsert !== null
    )
      return;
    if (flatVisible.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const inSearch = searchRef.current === el;
      const isEditable =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement | null)?.isContentEditable === true;
      // 聚焦在正文输入框等编辑控件且在搜索框之外时不拦截按键
      if (isEditable && !inSearch) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((a) => Math.min(a + 1, flatVisible.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((a) => Math.max(a - 1, 0));
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIdx(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIdx(flatVisible.length - 1);
      } else if (e.key === "Enter") {
        const p = flatVisible[activeIdx];
        if (p) {
          e.preventDefault();
          insert(p);
        }
      } else if (e.key === "Escape") {
        setActiveIdx(0);
        setCollapsed(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    collapsed, editing, viewing, template, deleteConfirm, polishConfirm,
    polish.status, polishInsert, flatVisible, activeIdx, insert, setCollapsed, searchRef,
  ]);

  // 键盘选中项变化时滚动到可见位置。
  // 仅在选中下标真实切换时滚动，避免因渲染（T 每次返回新引用 → flatVisible 新数组）
  // 导致效果反复执行把滚动锚定到选中项、从而无法向下滚动。
  const lastActiveIdxRef = useRef(activeIdx);
  useEffect(() => {
    if (lastActiveIdxRef.current === activeIdx) return;
    lastActiveIdxRef.current = activeIdx;
    if (activeIdx < 0 || activeIdx >= flatVisible.length) return;
    const id = flatVisible[activeIdx]?.id;
    if (!id) return;
    scrollRef.current
      ?.querySelector(`[data-pl-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, flatVisible]);

  // 「更多操作」溢出菜单：
  // - 列表视图：仅悬浮显示插入按钮，其余操作都放菜单
  // - 卡片视图：插入、覆盖、复制、编辑直接放出，菜单仅保留查看、优化、删除
  const renderMoreMenu = (p: Prompt, isCardMode: boolean) => {
    let items: Array<{
      key: string;
      label: string;
      onClick: () => void;
      danger?: boolean;
      disabled?: boolean;
    }> = [];
    if (isCardMode) {
      // 卡片模式菜单只保留：查看、优化、删除
      items = [
        { key: "view", label: T("pl.view"), onClick: () => setViewing(p) },
        {
          key: "polish",
          label: polish.status === "loading" && polish.id === p.id ? T("pl.polishing") : T("pl.polish"),
          onClick: () => handlePolishClick(p),
          disabled: polish.status === "loading",
        },
        { key: "delete", label: T("pl.delete"), onClick: () => remove(p), danger: true },
      ];
    } else {
      // 列表模式所有非插入操作都在菜单
      items = [
        { key: "overwrite", label: T("pl.overwrite"), onClick: () => overwrite(p) },
        { key: "copy", label: copiedId === p.id ? T("pl.copied") : T("pl.copy"), onClick: () => copy(p) },
        { key: "view", label: T("pl.view"), onClick: () => setViewing(p) },
        { key: "edit", label: T("pl.edit"), onClick: () => startEdit(p) },
        {
          key: "polish",
          label: polish.status === "loading" && polish.id === p.id ? T("pl.polishing") : T("pl.polish"),
          onClick: () => handlePolishClick(p),
          disabled: polish.status === "loading",
        },
        { key: "delete", label: T("pl.delete"), onClick: () => remove(p), danger: true },
      ];
    }
    return (
      <div
        data-pl-menu
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", flexShrink: 0 }}
      >
        <button
          type="button"
          data-tip={T("pl.sidebar.more")}
          aria-label={T("pl.sidebar.more")}
          onClick={(e) => {
            e.stopPropagation();
            setMenuFor((cur) => (cur === p.id ? null : p.id));
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            padding: 0,
            border: "none",
            cursor: "pointer",
            borderRadius: 6,
            color: TONE.quiet,
            background: "transparent",
            fontFamily: MONO,
            opacity: menuFor === p.id ? 1 : 0.72,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </button>
        {menuFor === p.id && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 4px)",
              zIndex: 40,
              minWidth: 128,
              background: "var(--dsw-alias-bg-layer-3, #1d2735)",
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(15, 23, 42, .16)",
              padding: 4,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                disabled={it.disabled}
                onClick={() => {
                  setMenuFor(null);
                  it.onClick();
                }}
                style={{
                  textAlign: "left",
                  padding: "6px 10px",
                  fontSize: 12.5,
                  color: it.danger ? TONE.red : TONE.text,
                  background: "transparent",
                  border: "none",
                  borderRadius: 6,
                  cursor: it.disabled ? "not-allowed" : "pointer",
                  opacity: it.disabled ? 0.5 : 1,
                  fontFamily: MONO,
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget;
                  b.style.background = `color-mix(in srgb, var(--dsw-alias-label-primary, #1f2937) 8%, transparent)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {it.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 列表视图行：紧凑一行一条，节省大量纵向空间；仅悬浮显示的小插入按钮可插入
  const renderListRow = (p: Prompt) => {
    const isActive = activeIdx >= 0 && flatVisible[activeIdx]?.id === p.id;
    return (
      <div
        key={p.id}
        data-pl-id={p.id}
        className="pl-prompt-row"
        onMouseEnter={hoverEnabled ? (e) => showDetail(p, e.currentTarget.getBoundingClientRect().top) : undefined}
        onMouseLeave={hoverEnabled ? () => hover.leave() : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: isActive ? "7px 10px 7px 8px" : "7px 10px",
          borderRadius: 8,
          cursor: "pointer",
          border: "1px solid transparent",
          // 选中态柔和：左侧主题色竖条 + 浅强调背景，不做整圈描边；非选中不设内联背景，让 CSS :hover 生效
          borderLeft: isActive ? `3px solid ${TONE.accent}` : "3px solid transparent",
          background: isActive ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 10%, transparent)" : undefined,
          userSelect: "none",
        }}
      >
        <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: TONE.text, fontWeight: 470 }}>
          {query.trim() ? <Highlight text={clampTitle(p.title)} query={query} /> : clampTitle(p.title)}
        </span>
        {isRecent(p.id) && (
          <span data-tip={T("pl.recentNew")} style={{ width: 7, height: 7, borderRadius: "50%", background: TONE.mint, flexShrink: 0 }} />
        )}
        {p.usageCount > 0 && (
          <span style={{ color: TONE.quiet, fontSize: 10, whiteSpace: "nowrap", flexShrink: 0 }}>
            {T("pl.sidebar.usageCount", { count: p.usageCount })}
          </span>
        )}
        {/* 悬浮时才显示的小插入按钮，鼠标移入才可见可点；移开或非悬浮态为透明不可点 */}
        <button
          type="button"
          className="pl-row-insert"
          data-tip={T("pl.insert")}
          onClick={() => {
            hover.hide();
            insert(p);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: 22,
            padding: "0 9px",
            borderRadius: 11,
            border: "none",
            cursor: "pointer",
            background: "var(--dsw-alias-brand-primary, #2563eb)",
            color: "#fff",
            fontSize: 11.5,
            fontFamily: MONO,
            whiteSpace: "nowrap",
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          {T("pl.insert")}
        </button>
        {renderMoreMenu(p, false)}
      </div>
    );
  };

  // 卡片视图卡：正文两行省略，点击正文直接打开查看弹窗；插入、覆盖、复制、编辑直接放出，其余进 ⋯ 更多菜单
  const renderCard = (p: Prompt) => {
    const isActive = activeIdx >= 0 && flatVisible[activeIdx]?.id === p.id;
    return (
      <div
        key={p.id}
        data-pl-id={p.id}
        className="pl-prompt-card"
        onClick={hoverEnabled ? hover.hide : undefined}
        style={{
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          borderColor: isActive ? TONE.accent : undefined,
          boxShadow: isActive ? "0 0 0 1px var(--dsw-alias-brand-primary, #2563eb)" : undefined,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }}>
          <strong style={{
            fontSize: 13,
            fontWeight: 460,
            flex: "1 1 auto",
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }} data-tip={p.title}>{query.trim() ? <Highlight text={clampTitle(p.title)} query={query} /> : clampTitle(p.title)}</strong>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {isRecent(p.id) && (
              <span
                data-tip={T("pl.recentNew")}
                style={{ width: 8, height: 8, borderRadius: "50%", background: TONE.mint, display: "inline-block", flexShrink: 0 }}
              />
            )}
            {p.usageCount > 0 && (
              <span style={{ color: TONE.quiet, fontSize: 10, whiteSpace: "nowrap" }}>
                {T("pl.sidebar.usageCount", { count: p.usageCount })}
              </span>
            )}
            {renderMoreMenu(p, true)}
          </div>
        </div>
        {/* 正文预览：单行省略（不换行），点击直接打开查看弹窗 */}
        <pre
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(142, 197, 255, 0.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          onClick={() => { hover.hide(); setViewing(p); }}
          data-tip={T("pl.view")}
          style={{
            margin: 0,
            padding: "6px 9px",
            color: TONE.quiet,
            fontSize: 11,
            fontFamily: MONO,
            lineHeight: 1.6,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            borderRadius: 6,
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          {query.trim() ? <Highlight text={p.body} query={query} /> : p.body}
        </pre>
        {/* 主操作：插入、覆盖、复制、编辑直接放出，其余进 ⋯ 更多菜单 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={() => insert(p)}>{T("pl.insert")}</Button>
          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => overwrite(p)}>{T("pl.overwrite")}</Button>
          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => copy(p)}>{copiedId === p.id ? T("pl.copied") : T("pl.copy")}</Button>
          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => startEdit(p)}>{T("pl.edit")}</Button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 面板锚点：保持在原 DOM 树内（聊天工具栏行内），供 useChatWindow 沿父链定位会话窗口；
          面板/弹窗本体通过 Portal 渲染到 document.body，突破宿主 container-type 包含块对 fixed 的约束 */}
      <span ref={chatAnchorRef} aria-hidden="true" style={{ display: "contents" }} />
      {createPortal(
      <>
      <style>{`@keyframes pl-refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
/* 浮动面板展开时的浮入动画：轻微上移 + 缩放 + 淡入 */
@keyframes pl-pop-in { from { opacity: 0; transform: translateY(10px) scale(.975); } to { opacity: 1; transform: translateY(0) scale(1); } }
/* AI 优化进度条动画：不确定进度左右滑动 */
@keyframes pl-progress { 0% { transform: translateX(-100%); } 50% { transform: translateX(150%); } 100% { transform: translateX(350%); } }
.pl-grab { cursor: grab; user-select: none; }
.pl-grab:active { cursor: grabbing; }
/* 内容区细滚动条 */
.pl-scroll::-webkit-scrollbar { width: 8px; }
.pl-scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--dsw-alias-label-tertiary, #9ca3af) 30%, transparent); border-radius: 4px; }
.pl-scroll::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--dsw-alias-label-tertiary, #9ca3af) 50%, transparent); }
.pl-scroll::-webkit-scrollbar-track { background: transparent; }
.pl-scroll { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--dsw-alias-label-tertiary, #9ca3af) 30%, transparent) transparent; }
/* 提示词卡片：悬浮时轻微上浮 + 投影 + 描边高亮 */
.pl-prompt-card {
  background: var(--dsw-alias-bg-layer-3, #1d2735);
  border: 1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16));
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.pl-prompt-card:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(15, 23, 42, 0.1); border-color: var(--dsw-alias-brand-primary, #2563eb); }
/* 分组头悬浮背景 */
.pl-group-header { border-radius: 6px; transition: background .15s ease; }
.pl-group-header:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary, #1f2937) 6%, transparent); }
/* 紧凑列表行（视图切换）：悬浮轻底色反馈 */
.pl-prompt-row { transition: background .18s ease, border-color .18s ease, border-width .18s ease, padding .18s ease; }
.pl-prompt-row:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary, #1f2937) 6%, transparent); }
/* 列表面板悬浮显现的小插入按钮：默认透明不可点，鼠标移入行后可见可点 */
.pl-row-insert { opacity: 0; pointer-events: none; transform: translateX(3px); transition: opacity .15s ease, transform .15s ease; }
.pl-prompt-row:hover .pl-row-insert { opacity: 1; pointer-events: auto; transform: translateX(0); }
/* 搜索输入框聚焦光圈 */
.pl-search-input:focus { box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 16%, transparent); }
}`}</style>
      <style>{PL_BUTTON_CSS}</style>
      {/* 词库助手（助手+气泡）：独立组件，自管理位置/冒泡/简介；左键不联动面板，
          面板开合统一走右键菜单「打开工具面板」回调。
          词库助手已常驻，不再受「显示词库助手」开关控制。 */}
      <PromptAssistant
          t={T}
          settings={settings}
          settingsReady={settingsReady}
          onTogglePanel={() => updateFloat({ collapsed: !float.collapsed })}
        />
        <section
          ref={panelRef}
          role="dialog"
          aria-label={T("pl.title")}
          style={{
            position: "fixed",
            left: view.x,
            top: view.y,
            zIndex: 2147483646,
            width: view.width,
            height: view.height,
            display: !settings.rightPanelEnabled || collapsed ? "none" : "flex",
            flexDirection: "column",
            animation: collapsed ? "none" : "pl-pop-in .28s cubic-bezier(.22,1,.36,1)",
            overflow: "hidden",
            color: TONE.text,
            background: TONE.panel,
            border: `1px solid ${TONE.border}`,
            borderRadius: 14,
            boxShadow:
              "0 1px 2px rgba(15, 23, 42, .04), 0 8px 24px rgba(15, 23, 42, .1), 0 24px 64px rgba(15, 23, 42, .16)",
            fontFamily: MONO,
          }}
        >
          {/* 右下角缩放手柄：拖动调节面板大小 */}
          <div
            onMouseDown={startResize}
            data-tip={T("pl.floating.resize")}
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 18,
              height: 18,
              cursor: "nwse-resize",
              color: TONE.quiet,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              padding: 3,
              zIndex: 2,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 17L17 7M9 17h8V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* 头部 — 常规布局：左标题（书本图标 + 词库名），右侧依次为刷新/新建/关闭 */}
          <header
            onMouseDown={startPanelDrag}
            className="pl-grab"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 14px",
              borderBottom: `1px solid ${TONE.border}`,
              flexShrink: 0,
              height: 52,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1 }}>
              {/* 图标统一为聊天栏按钮同款书本图标 */}
              <svg
                width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <path d="M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z" strokeLinejoin="round" />
                <path d="M8 9h3M8 12h3" strokeLinecap="round" />
              </svg>
              <strong
                style={{
                  fontSize: 14,
                  fontWeight: 520,
                  color: TONE.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {T("pl.title")}
              </strong>
            </span>
            <div style={{ justifySelf: "end", display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={plBtn("ghost", "sm")}
                onClick={refresh}
                disabled={phase === "loading"}
                data-tip={phase === "loading" ? T("pl.refreshing") : T("pl.refreshTitle")}
                icon={
                  <svg
                    width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ animation: phase === "loading" ? "pl-refresh-spin 0.9s linear infinite" : "none" }}
                  >
                    <path d="M23 4v6h-6M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                }
              >
                {phase === "loading" ? T("pl.refreshing") : T("pl.refresh")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={plBtn("ghost", "sm")}
                onClick={startCreate}
                disabled={editing}
              >
                {T("pl.new")}
              </Button>
              {/* 关闭按钮：收进右侧操作区，采用常规的 X 图标按钮 */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${plBtn("ghost", "sm")} pl-btn--no-border`}
                onMouseDown={(e: ReactMouseEvent<HTMLButtonElement>) => e.stopPropagation()}
                onClick={() => setCollapsed(true)}
                data-tip={T("pl.close")}
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                }
              />
            </div>
          </header>

          {/* 搜索框：输入即时生效（实时过滤） */}
          {!editing && (
            <>
              <div style={{ padding: "12px 12px 4px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <SearchBox
                      inputRef={searchRef}
                      value={query}
                      onChange={setQuery}
                      onSearch={() => setQuery(query)}
                      onClear={clearSearch}
                      placeholder={T("pl.search")}
                    />
                  </div>
                  {/* 视图切换：紧凑列表 / 卡片视图 */}
                  <div
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      gap: 2,
                      padding: 2,
                      background: "color-mix(in srgb, var(--dsw-alias-label-primary, #1f2937) 6%, transparent)",
                      border: `1px solid ${TONE.border}`,
                      borderRadius: 8,
                    }}
                  >
                    <button
                      type="button"
                      data-tip={T("pl.sidebar.viewList")}
                      onClick={() => changeViewMode("list")}
                      aria-label={T("pl.sidebar.viewList")}
                      style={{
                        ...segBtn,
                        background: viewMode === "list" ? "var(--dsw-alias-bg-layer-3, #1d2735)" : "transparent",
                        boxShadow: viewMode === "list" ? "0 1px 3px rgba(15, 23, 42, .18)" : "none",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      data-tip={T("pl.sidebar.viewCard")}
                      onClick={() => changeViewMode("card")}
                      aria-label={T("pl.sidebar.viewCard")}
                      style={{
                        ...segBtn,
                        background: viewMode === "card" ? "var(--dsw-alias-bg-layer-3, #1d2735)" : "transparent",
                        boxShadow: viewMode === "card" ? "0 1px 3px rgba(15, 23, 42, .18)" : "none",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="3" y="3" width="7" height="9" rx="1.5" />
                        <rect x="14" y="3" width="7" height="6" rx="1.5" />
                        <rect x="14" y="13" width="7" height="8" rx="1.5" />
                        <rect x="3" y="15" width="7" height="6" rx="1.5" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* 标签过滤条（与搜索关键词叠加过滤） */}
                <TagFilterBar
                  tags={allTags}
                  active={tagFilter}
                  onChange={setTagFilter}
                  allLabel={T("pl.tagFilterAll")}
                />
              </div>
              {/* 内容区 */}
          <div ref={scrollRef} className="pl-scroll" style={{ flex: 1, overflow: "auto", marginRight: 2, paddingRight: 4 }}>
            {phase === "loading" && (
              <div style={{ padding: "20px 12px", color: TONE.muted, fontSize: 13, textAlign: "center" }}>
                {T("pl.loading")}
              </div>
            )}
            {phase === "error" && (
              <div style={{ padding: "12px 12px", color: TONE.red, fontSize: 13 }}>{error}</div>
            )}

            {polishError && (
              <div
                style={{
                  padding: "9px 12px",
                  margin: "6px 8px",
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
                {polishError}
              </div>
            )}

            {polish.status === "done" ? (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 13 }}>{T("pl.polishResult")}</strong>
                  <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={closePolish}>{T("pl.close")}</Button>
                </div>
                <textarea
                  value={polishResult}
                  onChange={(e) => setPolishResult(e.target.value)}
                  rows={8}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 220 }}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => { navigator.clipboard.writeText(polishResult).catch(() => {}); }}>
                    {T("pl.copy")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => { if (hasVariables(polishResult)) setPolishInsert(polishResult); else insertText(polishResult); }}>
                    {T("pl.insert")}
                  </Button>
                  <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={savePolish}>
                    {T("pl.saveToLibrary")}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {phase === "ready" && filtered.length === 0 && (
                  <div style={{ padding: "16px 12px", color: TONE.muted, fontSize: 13, textAlign: "center" }}>
                    {T("pl.empty")}
                  </div>
                )}
                {viewMode === "card" ? (
                  <div style={{ padding: "2px 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {cardPageItems.map((p) => renderCard(p))}
                  </div>
                ) :
                tagGrouped.map(([tag, items]) => {
                  const recentKey = T("pl.sidebar.recent");
                  // 最近使用分组可点击收起；其余按标签分组可点击折叠/展开
                  const isRecentSection = tag === recentKey;
                  const isCollapsed = isRecentSection
                    ? recentCollapsed
                    : !expandedGroups.has(tag);
                  return (
                  <div key={tag}>
                    {/* 分组头 — 可点击折叠/展开（最近使用分组同样可收起） */}
                    <div
                      className="pl-group-header"
                      onClick={() => {
                        hover.hide();
                        if (isRecentSection) setRecentCollapsed((v) => !v);
                        else toggleGroup(tag);
                      }}
                      style={{
                        padding: "7px 10px 5px",
                        margin: "4px 10px 2px",
                        fontSize: 11,
                        fontWeight: 470,
                        color: TONE.quiet,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                        userSelect: "none",
                        // 分组头吸顶：内容向上滚动时固定在最顶，带底色与细分隔线
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: TONE.panel,
                        borderBottom: `1px solid ${TONE.border}`,
                      }}
                    >
                      <span style={{ display: "inline-flex", width: 12, justifyContent: "center", flexShrink: 0 }}>
                        {isRecentSection ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                          </svg>
                        ) : (
                          <svg
                            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform .2s ease", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", flexShrink: 0 }}
                            aria-hidden="true"
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        )}
                      </span>
                      <span
                        style={{
                          flex: "1 1 auto",
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        data-tip={tag}
                      >
                        {tag}
                      </span>
                      <span style={{ fontSize: 10, opacity: 0.6, flexShrink: 0 }}>{T("pl.sidebar.groupCount", { count: items.length })}</span>
                    </div>
                    {!isCollapsed && (
                      <div style={{ padding: "2px 10px 10px", display: "flex", flexDirection: "column", gap: viewMode === "list" ? 2 : 8 }}>
                        {items.map((p) => renderListRow(p))}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </div>
            </>
          )}
          {/* 编辑/新建表单：editing 时独立展示（隐藏搜索与列表） */}
          {editing && (
            <div style={{ flex: 1, overflow: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                {T("pl.titleField")}
                <input
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {T("pl.bodyField")}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={plBtn("ghost", "sm")}
                    style={{ flex: "0 0 auto" }}
                    onMouseDown={(e: ReactMouseEvent<HTMLButtonElement>) => e.preventDefault()}
                    onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                      // 阻止 mousedown 默认行为以免抢夺正文框焦点，确保光标位置有效、不会回滚到顶部。
                      // 仅点击「{{}}」按钮本身才插入，阻止 label/行内其他点击误触发
                      e.preventDefault();
                      e.stopPropagation();
                      insertVariableAt(bodyRef.current, editor.body, (v) => setEditor({ ...editor, body: v }), t("pl.insertVariableDefault"));
                    }}
                    data-tip={T("pl.insertVariableTitle")}
                  >
                    {`{{${T("pl.insertVariableDefault")}}}`}
                  </Button>
                </span>
                <textarea
                  ref={bodyRef}
                  value={editor.body}
                  onChange={(e) => setEditor({ ...editor, body: e.target.value })}
                  rows={6}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 250 }}
                />
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                {T("pl.tagsField")}
                <TagInput value={editor.tags} onChange={(v) => setEditor({ ...editor, tags: v })} suggestions={allTags} inputStyle={inputStyle} t={t} />
              </label>
              {error && <div style={{ color: TONE.red, fontSize: 12 }}>{error}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => { setEditor(NO_EDITOR); setError(null); }}>
                  {T("pl.cancel")}
                </Button>
                <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={saveEditor}>
                  {T("pl.save")}
                </Button>
              </div>
            </div>
          )}
          {/* 卡片模式分页条：位于滚动区外、整体底部固定，宽度随父级布局自动 */}
          {viewMode === "card" && !editing && cardTotalPages > 1 && (
            <div style={{ flexShrink: 0 }}>
              <Pagination
                page={cardPage}
                totalPages={cardTotalPages}
                onChange={setCardPage}
                prevLabel={T("pl.sidebar.prev")}
                nextLabel={T("pl.sidebar.next")}
                textColor={TONE.text}
              />
            </div>
          )}
          {/* 底部 — 与宿主左侧栏 footArea 一致：细分隔线 + 底部内边距 */}
          <footer
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              padding: "8px 12px",
              borderTop: `1px solid ${TONE.border}`,
              color: TONE.muted,
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            <span>
              {T("pl.sidebar.tagTotal", {
                count: tagGrouped.filter(
                  ([k]) => k !== T("pl.sidebar.recent") && k !== T("pl.sidebar.uncategorized"),
                ).length,
              })}
            </span>
            <span>{T("pl.sidebar.total", { count: prompts.length })}</span>
          </footer>
          {/* 查看弹层：覆盖整个面板展示完整标题/标签/正文，仅可通过关闭按钮关闭 */}
          {viewing && (
            <div role="dialog" aria-label={T("pl.view")} style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              background: TONE.panel,
            }}>
              {/* 头部：标题 + 关闭按钮 */}
              <div style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderBottom: `1px solid ${TONE.border}`,
              }}>
                <strong style={{
                  flex: "1 1 auto",
                  minWidth: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }} data-tip={viewing.title}>{clampTitle(viewing.title)}</strong>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={plBtn("ghost", "sm")}
                  onClick={() => setViewing(null)}
                  data-tip={T("pl.close")}
                  style={{ flexShrink: 0 }}
                >
                  ✕
                </Button>
              </div>
              {/* 标签 */}
              {viewing.tags && viewing.tags.length > 0 && (
                <div style={{ flexShrink: 0, display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 14px 0" }}>
                  {viewing.tags.map((tag) => (
                    <span key={tag} style={{
                      maxWidth: 96,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      padding: "2px 8px",
                      borderRadius: 8,
                      fontSize: 11,
                      color: TONE.accent,
                      background: TONE.accentSoft,
                    }} data-tip={tag}>{tag}</span>
                  ))}
                </div>
              )}
              {/* AI 优化结果：原稿/润色稿切换 + 可编辑正文；未优化时展示原正文（可滚动） */}
              {viewPolish.status === "done" ? (
                <div style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "8px 14px 0",
                  boxSizing: "border-box",
                }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                    {([
                      { value: false, label: T("pl.polished") },
                      { value: true, label: T("pl.original") },
                    ] as const).map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setViewShowOriginal(opt.value)}
                        style={{
                          cursor: "pointer",
                          padding: "2px 10px",
                          fontSize: 11,
                          fontFamily: MONO,
                          color: viewShowOriginal === opt.value ? TONE.accent : TONE.muted,
                          background: viewShowOriginal === opt.value ? TONE.accentSoft : "transparent",
                          border: `1px solid ${viewShowOriginal === opt.value ? TONE.accent : TONE.border}`,
                          borderRadius: 999,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={viewShowOriginal ? viewing.body : viewPolishText}
                    readOnly={viewShowOriginal}
                    onChange={(e) => setViewPolishText(e.target.value)}
                    style={{
                      flex: 1,
                      minHeight: 0,
                      boxSizing: "border-box",
                      padding: "6px 8px",
                      fontSize: 12.5,
                      lineHeight: 1.7,
                      color: TONE.text,
                      background: viewShowOriginal ? TONE.panel : rowBackground(),
                      border: `1px solid ${TONE.border}`,
                      borderRadius: 6,
                      fontFamily: MONO,
                      outline: "none",
                      resize: "none",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      opacity: viewShowOriginal ? 0.75 : 1,
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  padding: "10px 14px 14px",
                  color: TONE.text,
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>{viewing.body}</div>
              )}
              {/* AI 优化失败提示：显示在底部操作栏上方，重试前保持展示 */}
              {polishError && (
                <div style={{
                  flexShrink: 0,
                  padding: "4px 14px 0",
                  color: TONE.red,
                  fontSize: 11,
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}>
                  {polishError}
                </div>
              )}
              {/* 底部：AI 完善状态 + AI 优化入口（优化中显示进度，完成后展示结果操作） */}
              <div style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "8px 14px 12px",
                borderTop: `1px solid ${TONE.border}`,
              }}>
                <span style={{ fontSize: 11, color: viewing.aiRefined ? TONE.mint : TONE.quiet, flexShrink: 0 }}>
                  {viewPolish.status === "loading"
                    ? T("pl.polishing")
                    : viewPolish.status === "done"
                      ? T("pl.polishResult")
                      : viewing.aiRefined
                        ? `${"✓"} ${T("pl.refinedDone")}`
                        : `${"…"} ${T("pl.refinePending")}`}
                </span>
                {viewPolish.status === "loading" ? (
                  // 优化中：不确定进度条动画
                  <div style={{ flex: 1, marginLeft: 8, height: 3, borderRadius: 2, overflow: "hidden", background: TONE.border }}>
                    <div style={{
                      height: "100%",
                      width: "40%",
                      borderRadius: 2,
                      background: TONE.accent,
                      animation: "pl-progress 1.2s ease-in-out infinite",
                    }} />
                  </div>
                ) : viewPolish.status === "done" ? (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => { navigator.clipboard.writeText(viewPolishText).catch(() => {}); }}>
                      {T("pl.copy")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => {
                      if (!viewPolishText) return;
                      if (inputActions) {
                        inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${viewPolishText}` : viewPolishText);
                      } else {
                        navigator.clipboard.writeText(viewPolishText).catch(() => {});
                      }
                      closeView();
                    }}>
                      {T("pl.insert")}
                    </Button>
                    <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={saveViewPolish}>
                      {T("pl.saveToLibrary")}
                    </Button>
                  </div>
                ) : (
                  !viewing.aiRefined && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={plBtn("ghost", "sm")}
                      onClick={startViewPolish}
                      data-tip={T("pl.polishBtnTitle")}
                      style={{ flexShrink: 0 }}
                    >
                      {T("pl.polish")}
                    </Button>
                  )
                )}
              </div>
            </div>
          )}
        </section>
        {/* 悬停详情卡片必须在面板 section 之外：面板带 transform 动画，会破坏内部 fixed 元素的定位 */}
        {hoverEnabled && hover.overlay}
      {/* 模板变量填充弹窗：插入含 {{变量}} 的提示词或润色结果前弹出 */}
      <TemplateFillModal
        open={template !== null || polishInsert !== null}
        variables={polishInsert !== null ? extractVariables(polishInsert) : template ? extractVariables(template.prompt.body) : []}
        body={polishInsert !== null ? polishInsert : template ? template.prompt.body : ""}
        onCancel={() => { setTemplate(null); setPolishInsert(null); }}
        onConfirm={polishInsert !== null ? applyPolishInsert : applyTemplate}
        onInsertAndSend={insertAndSend}
        showInsertAndSend={polishInsert !== null ? true : template?.mode !== "overwrite"}
        confirmLabel={polishInsert !== null ? T("pl.insert") : template?.mode === "overwrite" ? T("pl.overwrite") : T("pl.insert")}
        draftEmpty={!(draft?.trim())}
        t={T}
      />
      {/* 删除确认弹窗（自定义，替代系统 confirm） */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        message={T("pl.confirmDelete", { title: deleteConfirm?.title ?? "" })}
        danger
        confirmLabel={T("pl.confirm")}
        cancelLabel={T("pl.cancel")}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          setDeleteConfirm(null);
          confirmRemove();
        }}
      />
      {/* AI 优化重复确认：已 AI 完善的提示词再次优化前由用户决定 */}
      <ConfirmDialog
        open={polishConfirm !== null}
        message={T("pl.polishReconfirmMsg", { title: polishConfirm?.title ?? "" })}
        confirmLabel={T("pl.polishReconfirmOk")}
        cancelLabel={T("pl.cancel")}
        onCancel={() => setPolishConfirm(null)}
        onConfirm={() => {
          const p = polishConfirm;
          setPolishConfirm(null);
          if (p) startPolish(p);
        }}
      />
      </>,
      document.body,
      )}
    </>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: "var(--dsw-alias-label-primary, #f2f6fc)",
  background: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderRadius: 7,
  fontFamily: MONO,
  fontSize: 13,
  outline: "none",
};
