/**
 * 会话监控面板。
 *
 * 注册到 `conversation.view` 插槽，作为「会话轨迹」旁的独立监控视图标签。
 * 通过宿主注入的标准运行时套件直接读取实时数据，无需额外的 SSE/后端改动：
 * - `useSession`：读取会话快照（开关状态/打开状态、chat 节点里的消息）。
 * - `useProjection`：读取 token-meter 与会话投影（tokenUsage / contextPressure /
 *   contextBreakdown / sessionStats），得到精确的 token 用量、上下文占用与性能指标。
 *
 * 面板分块展示（自顶向下）：
 * - 实时状态条：会话是否正在生成、是否已打开；
 * - Token 用量：输入（未命中缓存 / 缓存读 / 缓存写）、输出、总计与缓存命中率；
 * - 上下文占用：已用 / 窗口上限的进度百分比；
 * - 上下文构成：系统提示 / 工具 / 对话三条彩带占比；
 * - 性能统计：回合数、步骤数、生成耗时、工具耗时、平均首 token、解码速度；
 * - 会话动态：最近若干条用户/助手消息的实时文本回放（即当前 prompt 上下文）。
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import type {
  AssistantMessageNode,
  ContextMessageNode,
  ConversationNode,
  ConversationSnapshot,
  ModelRetryNode,
  ToolResultNode,
  TurnErrorNode,
  TurnMaxTokensNode,
  UserMessageNode,
} from "@deepseek-ai/dsh-client-runtime/client";
import type { PLTranslate } from "../utils/i18n.js";
import { diagSession, listPersonas, listSessionPrompts, type ScopeDiag } from "../utils/api.js";
import { useDataChanged } from "../utils/data-sync.js";

/** `conversation.view` 的宿主标准运行时套件（会话轨迹亦依赖同一套注入）。 */
interface MonitorProps {
  /** 会话快照选择器钩子（宿主必定注入）。 */
  useSession?: <T>(selector: (s: ConversationSnapshot) => T) => T;
  /** 会话投影选择器钩子：按 key 读取 token-meter / sessionStats 投影的当前值。 */
  useProjection?: <T>(key: string) => T | undefined;
  /** 翻译座位（宿主注入，已绑定 prompt-library 命名空间）。 */
  t?: PLTranslate;
}

/** tokenUsage 投影的值：供应商上报的累计 token 用量。 */
interface TokenUsage {
  uncachedInputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/** contextPressure 投影的值：请求侧上下文占用（prompt 侧）。 */
interface ContextPressure {
  pressureTokens?: number;
  projectedTokens?: number;
  contextWindow?: number;
}

/** contextBreakdown 投影的值：上下文构成（系统/工具/对话）。 */
interface ContextBreakdown {
  systemTokens: number;
  toolsTokens: number;
  messageTokens: number;
}

/** sessionStats 投影的值：会话累计统计。 */
interface SessionStats {
  turns: number;
  steps: number;
  llmMs: number;
  toolMs: number;
  ttftMs: number;
  ttftSteps: number;
  decodeMs: number;
  decodeTokens: number;
}

/**
 * trajectory 投影（快照 `s.views.get("trajectory")`）的无侵入子集：
 * 仅取本面板需要读的请求级 prompt（系统提示文本 + 工具 schema 列表）。
 * trajectory 插件可能未加载，此时 `views.get` 返回 undefined，需优雅降级。
 */
interface TrajectoryToolView {
  name?: string;
}
interface TrajectoryPromptView {
  system?: string;
  tools?: TrajectoryToolView[];
}
interface TrajectoryRequestView {
  prompt?: TrajectoryPromptView;
}
interface TrajectorySnapshotView {
  requests?: TrajectoryRequestView[];
}

/** 右侧「详细信息」抽屉的内容。 */
interface DetailEntry {
  /** 抽屉标题（如工具名 / 区块标题 / 角色+来源）。 */
  title: string;
  /** 次要信息行（如 schema › parameters）。 */
  subtitle?: string;
  /** 正文是纯文本还是 JSON。 */
  lang: "text" | "json";
  /** 正文全文。 */
  content: string;
  /** file_path + content 类型的写入调用：抽屉内用 tab 展示内容预览（渲染 markdown）与参数 JSON。 */
  file?: { path: string; content: string };
  /** 需要「参数 / 对象」双 tab 的详情（如工具 schema），默认定位到「参数」。 */
  dualTabs?: boolean;
}

/** 样式作用域前缀，避免与宿主类名冲突。 */
const S = "pl-mtr";

const ACCENT_MESSAGES = "var(--dsw-static-blue-450)";
const ACCENT_TOOLS = "#a78bfa";
const ACCENT_SYSTEM = "var(--dsw-static-neutral-bluish-400)";
// 图表配色：直接使用具体色值，避免宿主 CSS 变量在 SVG/svgpath 上解析失败导致无色
const ACCENT_UNCACHED = "#f59e0b"; // 琥珀：未命中缓存
const ACCENT_CACHED = "#a78bfa"; // 紫：缓存读
const ACCENT_CACHEWRITE = "#22d3ee"; // 青：缓存写
const ACCENT_OUTPUT = "#5b8cff"; // 蓝：输出
// 上下文占用圆环：已用段绿色，未用段灰色（显式两段）
const OCC_COLOR_LOW = "#34d399";
const OCC_TRACK = "#9aa1ab";

/** SVG 环形图：多段圆环占比展示，中心可叠加标题/数值（无需 echarts）。 */
function Donut({
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

/** 提取 ContentBlock 数组中的纯文本（用户消息正文）。 */
function textOf(content: readonly { type: string; text?: string }[]): string {
  let out = "";
  for (const b of content) {
    if (b.type === "text" && typeof b.text === "string") out += `${b.text}\n`;
  }
  return out.trim();
}

/** 紧凑数字：517 / 12.2K / 517K / 1.2M。 */
function formatToken(n: number): string {
  const scaled = (v: number) => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
  if (n < 1e3) return String(n);
  if (n < 1e6) return `${scaled(n / 1e3)}K`;
  return `${scaled(n / 1e6)}M`;
}

/** 紧凑时长：45.2s / 2m42s。 */
function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0s";
  const s = ms / 1e3;
  if (s < 60) return `${Math.round(s * 10) / 10}s`;
  const whole = Math.round(s);
  return `${Math.floor(whole / 60)}m${whole % 60}s`;
}

/** 时间轴时间：YYYY-MM-DD HH:mm:ss（本地时区）。 */
function formatTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** usage 字段取值（容错读取多种常见结构）。 */
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

/** 从 assistant timing 推导生成耗时（毫秒）；缺边界时返回 null。 */
function assistantDuration(t: { stepStartTime?: number | null; firstTokenTime?: number | null; completedTime?: number } | undefined): number | null {
  if (!t) return null;
  const start = t.stepStartTime ?? t.firstTokenTime;
  const end = t.completedTime;
  if (typeof start !== "number" || typeof end !== "number" || end < start) return null;
  return end - start;
}

/** 解码吞吐：整 token，小于 10 保留一位小数。 */
function formatTps(tps: number): string {
  const clamped = Math.max(0, tps);
  return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10);
}

/** 把任意对象格式化成缩进的 JSON（异常时回退字符串）。 */
function toJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * 把系统提示文本按 Markdown 标题（`# …` 至 `#### …`）切分成区块，
 * 返回每个区块的标题、正文字符数与正文全文——让系统提示里注入的技能/人格等块可见可分。
 * 无任何标题时返回空数组，由调用方回退为「系统提示」整体概览。
 */
function sectionizeSystem(system: string): Array<{ title: string; chars: number; body: string }> {
  if (!system) return [];
  const blocks: Array<{ title: string; lines: string[] }> = [];
  let title = "";
  let cur: string[] = [];
  const push = () => {
    if (cur.length > 0) blocks.push({ title, lines: cur });
  };
  for (const raw of system.split(/\r?\n/)) {
    const h = /^#{1,6}\s+(.+)$/.exec(raw.trim());
    if (h) {
      push();
      title = h[1]?.trim() ?? "";
      cur = [];
    } else {
      cur.push(raw);
    }
  }
  push();
  return blocks
    .filter((b) => b.title.length > 0 && b.lines.join("\n").trim().length > 0)
    .map((b) => ({ title: b.title, chars: b.lines.join("\n").length, body: b.lines.join("\n").trim() }));
}

/** 上下文形式（form）的可读标签（跟随面板语言，缺翻译回退中文）。 */
function contextFormLabel(T: PLTranslate | undefined, form: string | null | undefined): string {
  const key =
    form === "instructions"
      ? "pl.monitor.form.instructions"
      : form === "catalog"
        ? "pl.monitor.form.catalog"
        : form === "snapshot"
          ? "pl.monitor.form.snapshot"
          : form === "notice"
            ? "pl.monitor.form.notice"
            : form === "relay"
              ? "pl.monitor.form.relay"
              : form === "recall"
                ? "pl.monitor.form.recall"
                : "pl.monitor.context";
  const fallback: Record<string, string> = {
    "pl.monitor.form.instructions": "指令",
    "pl.monitor.form.catalog": "目录索引",
    "pl.monitor.form.snapshot": "快照",
    "pl.monitor.form.notice": "通知",
    "pl.monitor.form.relay": "中继",
    "pl.monitor.form.recall": "回刷",
    "pl.monitor.context": "上下文",
  };
  return T?.(key) ?? fallback[key] ?? "上下文";
}

/** 单条指标行：`[标签]      [值 + 单位]`。 */
function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className={`${S}-metric`}>
      <span className={`${S}-metricLabel`}>{label}</span>
      <span className={`${S}-metricValue`}>
        {value}
        {unit ? <span className={`${S}-metricUnit`}>{unit}</span> : null}
      </span>
    </div>
  );
}

export function TokenMonitorView(props: MonitorProps): null | ReactNode {
  const T = props?.t;
  // 宿主注入的钩子必须在顶层调用；缺失时（会话未就绪）整个组件不渲染
  const useSession = props.useSession;
  const useProjection = props.useProjection;
  if (!useSession || !useProjection) return null;

  const running = useSession((s) => s.running) ?? false;
  const openState = useSession((s) => s.openState);

  // 右侧详情抽屉：点击列表条目时打开，展示该条目的全文 / 工具 schema
  const [detail, setDetail] = useState<DetailEntry | null>(null);
  // 文件写入调用详情内的 tab：内容预览 / 参数 JSON / 对象视图
  const [detailTab, setDetailTab] = useState<"content" | "params" | "object">("content");
  // 统一打开详情：重置 tab（双 tab 定位「参数」，文件写入定位「内容」）
  const openDetail = (d: DetailEntry) => {
    setDetailTab(d.dualTabs ? "params" : "content");
    setDetail(d);
  };
  // 抽屉宽度（可拖拽调整，双击重置）；null 表示使用默认 clamp 宽度
  const [detailWidth, setDetailWidth] = useState<number | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);
  const resizeDrag = useRef<{ startX: number; startW: number } | null>(null);
  const startResize = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = detailRef.current;
    if (!el) return;
    resizeDrag.current = { startX: e.clientX, startW: el.getBoundingClientRect().width };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const moveResize = (e: RPointerEvent<HTMLDivElement>) => {
    const d = resizeDrag.current;
    if (!d) return;
    setDetailWidth(Math.max(280, Math.min(720, d.startW + d.startX - e.clientX)));
  };
  const endResize = () => {
    resizeDrag.current = null;
  };

  const nodes = useSession((s) => s.chat.legacy.nodes) as readonly ConversationNode[] | undefined;

  // 会话注入信息：读取 trajectory 投影里的最近一次请求（系统提示 + 工具 schema）。
  // trajectory 插件未加载时 `views.get` 返回 undefined，相应子块自动隐藏。
  const trajectory = useSession(
    (s) => (s.views as unknown as Map<string, TrajectorySnapshotView | undefined>).get("trajectory"),
  ) as TrajectorySnapshotView | undefined;
  const latestRequest = useMemo(() => {
    if (!trajectory?.requests) return undefined;
    let last: TrajectoryRequestView | undefined;
    for (const r of trajectory.requests) if (r.prompt) last = r;
    return last;
  }, [trajectory]);
  const injectedTools = useMemo(() => {
    const tools = latestRequest?.prompt?.tools ?? [];
    const seen = new Set<string>();
    const out: Array<{ name: string; schema: TrajectoryToolView }> = [];
    for (const t of tools) {
      const name = t.name;
      if (name && !seen.has(name)) {
        seen.add(name);
        out.push({ name, schema: t });
      }
    }
    return out;
  }, [latestRequest]);
  const systemPrompt = latestRequest?.prompt?.system ?? "";

  // 实时注入解析：轮询后端诊断端点（与注入同一会话口径），直接展示当前会话实际命中的
  // 人格与技能。trajectory 快照在未发新消息前可能是旧的，本块保证「系统提示区块」始终
  // 反映插件真实注入内容，不依赖可能过期的请求快照。
  const [injectDiag, setInjectDiag] = useState<ScopeDiag | null>(null);
  const refreshInjectDiag = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true;
    const load = () =>
      diagSession()
        .then((d) => {
          if (alive) setInjectDiag(d);
        })
        .catch(() => { /* 后端未就绪时静默，下次轮询再试 */ });
    refreshInjectDiag.current = load;
    load();
    const id = window.setInterval(load, 4000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);
  // 人格/技能被修改（保存/删除/启用切换/绑定变更）后，立即重新拉取注入解析，
  // 无需等待下一轮轮询，保证「实时注入解析」始终与插件真实注入内容同步。
  useDataChanged(() => refreshInjectDiag.current());

  // 打开人格/技能详情：点击「实时注入解析」中的条目，在右侧抽屉展示具体信息。
  const openPersonaDetail = () => {
    if (!injectDiag?.personaName) return;
    void listPersonas()
      .then((list) => {
        // 默认人格：实时解析的 personaName 是「默认人格（default）」，
        // 与人格管理列表中的默认人格名「默认人格」不一致，改用 isDefault 匹配。
        const p =
          injectDiag.personaSource === "default"
            ? (list.find((it) => it.isDefault) ?? list.find((it) => it.name === injectDiag.personaName))
            : list.find((it) => it.name === injectDiag.personaName);
        openDetail({
          title: p?.name ?? injectDiag.personaName ?? (T?.("pl.monitor.persona") ?? "人格"),
          subtitle: `${T?.("pl.monitor.persona") ?? "人格"} · ${personaSourceLabel(injectDiag.personaSource)}`,
          lang: "text",
          content: p?.content?.trim() ? p.content : (T?.("pl.monitor.none") ?? "无"),
        });
      })
      .catch(() => {
        openDetail({
          title: injectDiag.personaName ?? (T?.("pl.monitor.persona") ?? "人格"),
          lang: "text",
          content: (T?.("pl.monitor.none") ?? "无"),
        });
      });
  };
  const openSkillDetail = () => {
    const titles = injectDiag?.promptTitles ?? [];
    if (titles.length === 0) return;
    void listSessionPrompts()
      .then((list) => {
        const matched = list.filter((sp) => sp.enabled !== false && titles.includes(sp.title));
        const body = matched.length
          ? matched.map((sp) => `### ${sp.title}\n\n${sp.body ?? ""}`.trim()).join("\n\n---\n\n")
          : (T?.("pl.monitor.none") ?? "无");
        openDetail({
          title: `${T?.("pl.monitor.skills") ?? "技能"} · ${titles.join("、")}`,
          lang: "text",
          content: body,
        });
      })
      .catch(() => {
        openDetail({
          title: `${T?.("pl.monitor.skills") ?? "技能"} · ${titles.join("、")}`,
          lang: "text",
          content: (T?.("pl.monitor.none") ?? "无"),
        });
      });
  };

  // 人格来源标签（单会话 / 工作区 / 默认）
  const personaSourceLabel = (src: ScopeDiag["personaSource"]): string =>
    src === "session"
      ? (T?.("pl.monitor.srcSession") ?? "单会话")
      : src === "path"
        ? (T?.("pl.monitor.srcPath") ?? "工作区")
        : (T?.("pl.monitor.srcDefault") ?? "默认");

  const usage = useProjection<TokenUsage>("tokenUsage");
  const pressure = useProjection<ContextPressure>("contextPressure");
  const breakdown = useProjection<ContextBreakdown>("contextBreakdown");
  const stats = useProjection<SessionStats>("sessionStats");

  // 会话注入的上下文节点（context 类型消息：producer 注入到对话流的内容）
  const contextInjections = useMemo(() => {
    if (!nodes) return [];
    return nodes
      .filter((n): n is ContextMessageNode => n.kind === "context")
      .map((n) => ({
        label: n.provenance?.label ?? "",
        role: (n.provenance?.role ?? "inject") as "inject" | "recall",
        form: n.form ?? null,
        text: textOf(n.content),
      }))
      .filter((c) => c.text.length > 0)
      .slice(-10);
  }, [nodes]);

  // 系统提示区块（注入的技能/人格等有标题的段落）
  const sysSections = useMemo(() => {
    if (!systemPrompt) return [];
    return sectionizeSystem(systemPrompt).slice(0, 12);
  }, [systemPrompt]);
  // 若无 Markdown 标题块，则当作整体单块展示
  const sysSummary =
    systemPrompt && sysSections.length === 0
      ? { chars: systemPrompt.length, lines: systemPrompt.split(/\r?\n/).length }
      : null;

  // 会话动态：按时间轴回放全部用户/助手消息、工具调用与会话事件（失败/重试/截断/中断），
  // 每条消息附带 token 与耗时标注；AI 思考（reasoning 块）单独成行；
  // 工具调用（tool-result）以「工具」对话形式插入，写文件类调用解析出 file_path + content。
  const activity = useMemo(() => {
    if (!nodes) return [];
    const tok = T?.("pl.monitor.tokShort") ?? "tok";
    const sep = T?.("pl.monitor.spacer") ?? " · ";
    type ActivityItem = {
      kind: "user" | "assistant" | "thinking" | "tool" | "error" | "retry" | "max-tokens" | "interrupted";
      time: number;
      text: string;
      meta: string;
      file?: { path: string; content: string } | null;
      /** 事件详情（点击查看完整内容） */
      detail?: string;
    };
    return nodes
      .filter(
        (n): n is UserMessageNode | AssistantMessageNode | ToolResultNode | TurnErrorNode | ModelRetryNode | TurnMaxTokensNode =>
          n.kind === "user" ||
          n.kind === "assistant" ||
          n.kind === "tool-result" ||
          n.kind === "turn-error" ||
          n.kind === "model-retry" ||
          n.kind === "turn-max-tokens",
      )
      .flatMap((n): ActivityItem[] => {
        if (n.kind === "user") {
          const text = textOf(n.content);
          // 用户消息无真实 usage 数据，按 4 字符 ≈ 1 token 估计算号
          const est = Math.max(0, Math.ceil(text.length / 4));
          return text.length > 0
            ? [{ kind: "user" as const, time: n.time, text, meta: `~${formatToken(est)} ${tok}` }]
            : [];
        }
        // 工具调用：以「工具」对话形式插入时间轴，展示工具名与文件/结果摘要
        if (n.kind === "tool-result") {
          const name = n.call?.name ?? n.callId;
          const argsRaw = n.call?.argsRaw ?? "";
          const file = toolFileOf(argsRaw);
          const result = textOf(n.content);
          const failed = n.isError ? (n.error?.name ?? n.error?.code ?? "error") : null;
          const short = file ? file.path.split(/[\\/]/).pop() || file.path : result.slice(0, 40);
          return [
            {
              kind: "tool" as const,
              time: n.time,
              text: `${name}${short ? ` · ${short}` : ""}`,
              meta: failed ? (T?.("pl.monitor.failed") ?? "失败") : "",
              file,
            },
          ];
        }
        // 会话事件：回合失败 / 等待重试（带失败原因）/ 输出截断 直接排进时间轴
        if (n.kind === "turn-error") {
          const msg = n.message || "";
          const label = T?.("pl.monitor.evtError") ?? "回合失败";
          const text = msg ? `${label} · ${msg.slice(0, 60)}${msg.length > 60 ? "…" : ""}` : label;
          return [{ kind: "error" as const, time: n.time, text, meta: "", detail: msg || label }];
        }
        if (n.kind === "model-retry") {
          // 已取消的重试不展示，也不影响后续节点类型收窄
          if (n.retryState === "cancelled") return [];
          const msg = n.failure?.message ?? "";
          const label = T?.("pl.monitor.evtRetry") ?? "等待重试";
          const text = msg ? `${label} · ${msg.slice(0, 60)}${msg.length > 60 ? "…" : ""}` : label;
          return [{ kind: "retry" as const, time: n.time, text, meta: "", detail: msg || label }];
        }
        if (n.kind === "turn-max-tokens") {
          return [
            {
              kind: "max-tokens" as const,
              time: n.time,
              text: T?.("pl.monitor.evtMaxTokens") ?? "输出达到上限",
              meta: "",
              detail: "",
            },
          ];
        }
        // 助手消息：先把思考（reasoning）块单独成行，再列出正文
        const thinkText = n.blocks
          .filter((b) => b.kind === "reasoning")
          .map((b) => (b.kind === "reasoning" ? b.text : ""))
          .join("\n")
          .trim();
        const textBlock = n.blocks.find((b) => b.kind === "text");
        const text = (textBlock?.text ?? "").trim();
        const model = n.provenance?.model ?? n.requestConfig?.model;
        const parts: string[] = [];
        if (model) parts.push(model);
        const out = usageOutputTokens(n.usage);
        if (out !== null) parts.push(`${formatToken(out)} ${tok}`);
        const dur = assistantDuration(n.timing);
        if (dur !== null) parts.push(formatDuration(dur));
        const meta = parts.join(sep);
        const items: ActivityItem[] = [];
        if (thinkText.length > 0) items.push({ kind: "thinking", time: n.time, text: thinkText, meta });
        if (text.length > 0) items.push({ kind: "assistant", time: n.time, text, meta });
        if (n.interrupted) {
          items.push({
            kind: "interrupted",
            time: n.time,
            text: T?.("pl.monitor.evtInterrupted") ?? "回复被中断",
            meta: "",
            detail: "",
          });
        }
        return items;
      });
  }, [nodes, T]);

  // 最近一次 LLM 调用的模型（用于成本估算）
  const lastModel = useMemo(() => {
    if (!nodes) return undefined;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.kind === "assistant" && (n.provenance?.model || n.requestConfig?.model)) {
        return n.provenance?.model ?? n.requestConfig?.model;
      }
    }
    return undefined;
  }, [nodes]);

  // 成本估算：按最近一次模型的官方单价（DeepSeek ¥/1M token），未知模型返回 null
  const estimatedCost = useMemo(() => {
    if (!usage || !lastModel) return null;
    const m = lastModel.toLowerCase();
    let inP: number;
    let outP: number;
    let cacheP: number;
    if (m.includes("reasoner")) {
      inP = 4;
      outP = 16;
      cacheP = 1;
    } else if (m.includes("deepseek") || m.includes("chat") || m.includes("gpt-4o-mini") || m.includes("moonshot") || m.includes("kimi")) {
      inP = 2;
      outP = 8;
      cacheP = 0.5;
    } else {
      return null; // 未知模型不估算
    }
    const input = (usage.uncachedInputTokens ?? 0) + (usage.cacheWriteTokens ?? 0);
    const cache = usage.cacheReadTokens ?? 0;
    const output = usage.outputTokens ?? 0;
    return (input * inP + cache * cacheP + output * outP) / 1e6;
  }, [usage, lastModel]);

  // 派生统计
  const billedInput = usage ? usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens : 0;
  const totalTokens = usage ? billedInput + usage.outputTokens : 0;
  const cacheHit =
    usage && billedInput > 0
      ? Math.round(((usage.cacheReadTokens + usage.cacheWriteTokens) / billedInput) * 100)
      : null;

  // 上下文占用：优先预计占用（含 surface 增量），回退到压力采样
  const occNum = pressure?.projectedTokens ?? pressure?.pressureTokens ?? 0;
  const occDen = pressure?.contextWindow;
  const occupiedPercent = occDen && occDen > 0 ? Math.min(100, (occNum / occDen) * 100) : null;

  // 上下文构成彩带
  const breakdownTotal = breakdown ? breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens : 0;
  const segments = breakdown && breakdownTotal > 0
    ? [
        { key: "system", label: T?.("pl.monitor.system") ?? "系统提示", color: ACCENT_SYSTEM, tokens: breakdown.systemTokens },
        { key: "tools", label: T?.("pl.monitor.tools") ?? "工具", color: ACCENT_TOOLS, tokens: breakdown.toolsTokens },
        { key: "messages", label: T?.("pl.monitor.messages") ?? "对话", color: ACCENT_MESSAGES, tokens: breakdown.messageTokens },
      ]
    : null;

  const toolMs = stats?.toolMs ?? 0;
  const ttftAvg = stats && stats.ttftSteps > 0 ? stats.ttftMs / stats.ttftSteps : null;
  const decodeSpeed = stats && stats.decodeMs > 0 ? stats.decodeTokens / (stats.decodeMs / 1e3) : null;

  const showPressure = occupiedPercent !== null;
  const shownActivity = activity;

  // 数据总览图表的图例 / 中心数值数据
  const tokenChartSegs = [
    { key: "uncached", label: T?.("pl.monitor.uncached") ?? "未命中缓存", value: usage?.uncachedInputTokens ?? 0, color: ACCENT_UNCACHED },
    { key: "cacheRead", label: T?.("pl.monitor.cacheRead") ?? "缓存读", value: usage?.cacheReadTokens ?? 0, color: ACCENT_CACHED },
    { key: "cacheWrite", label: T?.("pl.monitor.cacheWrite") ?? "缓存写", value: usage?.cacheWriteTokens ?? 0, color: ACCENT_CACHEWRITE },
    { key: "output", label: T?.("pl.monitor.output") ?? "输出", value: usage?.outputTokens ?? 0, color: ACCENT_OUTPUT },
  ];
  // 上下文占用圆环：已用段固定绿色，未用段灰色（显式两段，Donut 按相对比例画弧）
  const occColor = showPressure && occDen && occDen > 0 ? OCC_COLOR_LOW : null;

  // 本面板激活（data-phase="active"）时隐藏底部聊天框，切走时恢复显示；
  // 同时把本面板所在视图容器（.wSkVaW_viewArea）高度设为 100%，使面板铺满可视区域。
  // 用 MutationObserver 监听本面板所在 root 的 data-phase，避免污染其它视图标签。
  useEffect(() => {
    // 挂载时缓存 viewArea 引用：卸载后 DOM 中的 .pl-mtr-wrap 已被移除，
    // 无法再 querySelector 定位，因此用缓存引用在清理阶段还原高度。
    const panel = document.querySelector(`.${S}-wrap`);
    const area = panel instanceof HTMLElement ? panel.closest(".wSkVaW_viewArea") : null;
    let lastSeat: HTMLElement | null = null;
    const sync = () => {
      const root = panel instanceof HTMLElement ? panel.closest(".wSkVaW_root") : null;
      const active = root instanceof HTMLElement && root.getAttribute("data-phase") === "active";
      const seat = document.querySelector(".wSkVaW_composerSeat");
      if (seat instanceof HTMLElement) {
        lastSeat = seat;
        if (active) seat.style.display = "none";
        else seat.style.display = "";
      }
      if (area instanceof HTMLElement) {
        // 切进本面板时铺满 100%，切出时还原
        if (active) area.style.height = "100%";
        else area.style.height = "auto";
      }
    };
    let mo: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      const effRoot = panel instanceof HTMLElement ? panel.closest(".wSkVaW_root") : null;
      if (effRoot instanceof HTMLElement) {
        mo = new MutationObserver(sync);
        mo.observe(effRoot, { attributes: true, attributeFilter: ["data-phase"] });
      }
    }
    sync();
    return () => {
      mo?.disconnect();
      if (lastSeat) lastSeat.style.display = "";
      // 用缓存的引用还原 viewArea 高度，避免残留 100% 影响其它视图
      if (area instanceof HTMLElement) area.style.height = "auto";
    };
  }, []);

  return (
    <div className={`${S}-wrap`}>
      <div className={`${S}-root`}>
      <style>{`
        .${S}-wrap{position:relative;display:flex;flex-direction:row;flex-wrap:nowrap;align-items:stretch;flex:1;height:100%;width:100%;min-height:0;box-sizing:border-box;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
        .${S}-root{box-sizing:border-box;flex:1;min-width:0;min-height:0;overflow-y:auto;padding:12px 16px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px;font-size:12.5px;line-height:20px;background:var(--dsw-alias-bg-layer-1)}
        .${S}-statusbar{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--dsw-alias-bg-container);border:1px solid var(--dsw-alias-border-l2);border-radius:10px}
        .${S}-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-label-tertiary);transition:background-color .24s ease}
        .${S}-dot.running{background:var(--dsw-alias-state-busy-primary,var(--dsw-alias-state-error-primary));box-shadow:0 0 0 3px var(--dsw-alias-interactive-bg-hover)}
        .${S}-dot.idle{background:var(--dsw-alias-state-success-primary)}
        .${S}-statustext{font-weight:500}
        .${S}-statusmeta{margin-left:auto;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
        .${S}-card{background:var(--dsw-alias-bg-container);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:12px}
        .${S}-cardTitle{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);margin:0 0 10px;display:flex;align-items:center;gap:6px}
        .${S}-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px}
        .${S}-metric{background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:7px 10px;display:flex;flex-direction:column;gap:2px}
        .${S}-metricLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;white-space:nowrap}
        .${S}-metricValue{font-variant-numeric:tabular-nums;font-weight:600;font-size:16px;line-height:22px}
        .${S}-metricUnit{margin-left:3px;font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary)}
        .${S}-subgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
        .${S}-pill{background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 8px}
        .${S}-pillTitle{font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:15px}
        .${S}-pillValue{font-variant-numeric:tabular-nums;font-weight:500;line-height:18px}
        .${S}-pressureRow{margin-top:10px}
        .${S}-pressureHead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
        .${S}-pressureFigure{font-variant-numeric:tabular-nums;font-weight:500}
        .${S}-pressurePercent{color:var(--dsw-alias-label-primary);font-weight:600}
        .${S}-track{height:6px;background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;overflow:hidden}
        .${S}-fill{height:100%;border-radius:999px;background:var(--dsw-alias-label-tertiary);transition:width .24s ease}
        .${S}-fill.low{background:var(--dsw-alias-state-success-primary)}
        .${S}-fill.mid{background:var(--dsw-alias-state-warning-primary)}
        .${S}-fill.high{background:var(--dsw-alias-state-error-primary)}
        .${S}-bar{height:8px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);display:flex;overflow:hidden;margin-top:8px}
        .${S}-segment{height:100%;transition:width .24s ease}
        .${S}-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px}
        .${S}-legendItem{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:11.5px}
        .${S}-swatch{width:8px;height:8px;border-radius:2px;flex:none}
        .${S}-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;align-items:stretch}
        .${S}-chartBlock{box-sizing:border-box;min-height:216px;display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px 10px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:10px}
        .${S}-chartBlockTitle{font-size:11.5px;font-weight:600;line-height:16px;color:var(--dsw-alias-label-secondary)}
        .${S}-donut{position:relative;flex:none}
        .${S}-donutCenter{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
        .${S}-donutValue{font-variant-numeric:tabular-nums;font-weight:650;font-size:17px;line-height:20px;color:var(--dsw-alias-label-primary)}
        .${S}-donutLabel{font-size:10.5px;line-height:14px;color:var(--dsw-alias-label-tertiary)}
        .${S}-chartLegend{display:flex;flex-direction:column;justify-content:flex-end;gap:4px;width:100%;flex:1;min-height:0}
        .${S}-chartLegendItem{display:flex;align-items:center;gap:6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
        .${S}-chartLegendName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .${S}-chartLegendVal{margin-left:auto;flex:none;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}
        .${S}-list{display:flex;flex-direction:column;gap:6px}
        .${S}-row{display:flex;gap:8px;padding:8px 10px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:8px}
        .${S}-role{flex:none;font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;height:fit-content}
        .${S}-role.user{color:#fff;background:#22c55e}
        .${S}-role.assistant{color:#fff;background:var(--dsw-static-blue-450)}
        .${S}-role.thinking{color:#fff;background:#8b5cf6}
        .${S}-role.tool{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-role.tool.failed{color:#fff;background:var(--dsw-alias-state-error-primary)}
        .${S}-role.error,.${S}-role.interrupted{color:#fff;background:var(--dsw-alias-state-error-primary)}
        .${S}-role.retry,.${S}-role.max-tokens{color:#fff;background:var(--dsw-alias-state-warning-primary)}
        .${S}-body{flex:1;min-width:0;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;-webkit-line-clamp:3;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;line-height:20px}
        .${S}-rowMeta{flex:none;align-self:flex-start;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:20px;white-space:nowrap;font-variant-numeric:tabular-nums}
        .${S}-timeline{display:flex;flex-direction:column;gap:6px}
        .${S}-trow{display:flex;gap:8px;padding:2px 4px;border-radius:10px}
        .${S}-taxis{flex:none;width:12px;display:flex;flex-direction:column;align-items:center;position:relative}
        .${S}-taxis::before{content:"";position:absolute;top:11px;bottom:-15px;left:50%;width:1px;transform:translateX(-50%);background:var(--dsw-alias-border-l2)}
        .${S}-trow:last-child .${S}-taxis::before{display:none}
        .${S}-tnode{flex:none;width:8px;height:8px;border-radius:50%;margin-top:6px;background:var(--dsw-alias-label-tertiary)}
        .${S}-tnode.user{background:#22c55e}
        .${S}-tnode.assistant{background:var(--dsw-static-blue-450)}
        .${S}-tnode.thinking{background:#8b5cf6}
        .${S}-tnode.tool{background:#9ca3af}
        .${S}-tnode.error,.${S}-tnode.interrupted{background:var(--dsw-alias-state-error-primary)}
        .${S}-tnode.retry,.${S}-tnode.max-tokens{background:var(--dsw-alias-state-warning-primary)}
        .${S}-tmain{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
        .${S}-ttime{flex:none;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px;font-variant-numeric:tabular-nums;white-space:nowrap}
        .${S}-bubble{min-width:0;box-sizing:border-box;max-width:100%;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:6px 10px;transition:border-color .24s ease,background-color .24s ease}
        .${S}-trow.clickable:hover{background:transparent}
        .${S}-trow.clickable:hover .${S}-bubble{border-color:var(--dsw-alias-border-strong);background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-trow.user .${S}-bubble{background:color-mix(in srgb,#22c55e 10%,var(--dsw-alias-bg-base));border-color:color-mix(in srgb,#22c55e 30%,transparent)}
        .${S}-trow.assistant .${S}-bubble{background:color-mix(in srgb,var(--dsw-static-blue-450) 8%,var(--dsw-alias-bg-base));border-color:color-mix(in srgb,var(--dsw-static-blue-450) 28%,transparent)}
        .${S}-trow.thinking .${S}-bubble{background:color-mix(in srgb,#8b5cf6 7%,var(--dsw-alias-bg-base));border-color:color-mix(in srgb,#8b5cf6 26%,transparent)}
        .${S}-trow.tool .${S}-bubble{background:color-mix(in srgb,#9ca3af 10%,var(--dsw-alias-bg-base));border-color:color-mix(in srgb,#9ca3af 30%,transparent)}
        .${S}-trow.error .${S}-bubble,.${S}-trow.interrupted .${S}-bubble{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,var(--dsw-alias-bg-base));border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent)}
        .${S}-trow.retry .${S}-bubble,.${S}-trow.max-tokens .${S}-bubble{background:color-mix(in srgb,var(--dsw-alias-state-warning-primary) 8%,var(--dsw-alias-bg-base));border-color:color-mix(in srgb,var(--dsw-alias-state-warning-primary) 30%,transparent)}
        .${S}-thead{display:flex;align-items:baseline;gap:8px;margin-bottom:2px}
        .${S}-tmeta{margin-left:auto;flex:none;color:var(--dsw-alias-label-tertiary);font-size:10.5px;line-height:16px;white-space:nowrap;font-variant-numeric:tabular-nums}
        .${S}-empty{color:var(--dsw-alias-label-tertiary);padding:10px;text-align:center}
        .${S}-block{margin-top:10px}
        .${S}-block:first-of-type{margin-top:0}
        .${S}-blockTitle{display:flex;align-items:baseline;gap:8px;font-size:11.5px;color:var(--dsw-alias-label-tertiary);line-height:16px;margin-bottom:6px}
        .${S}-hint{margin-left:auto;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:11px}
        .${S}-chips{display:flex;flex-wrap:wrap;gap:6px}
        .${S}-chip{font-size:11.5px;line-height:20px;padding:1px 9px;border-radius:999px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary)}
        .${S}-chip.tool{border-color:color-mix(in srgb,#a78bfa 45%,transparent);color:#a78bfa}
        .${S}-sections{display:flex;flex-direction:column;gap:4px}
        .${S}-sectionRow{display:flex;align-items:baseline;gap:8px;padding:6px 10px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:8px}
        .${S}-sectionTitle{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;display:flex;align-items:baseline;gap:4px}
        .${S}-chevron{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1}
        .${S}-sectionSize{flex:none;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:11px}
        .${S}-role.context{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-role.context.recall{color:#fff;background:#6366f1}
        .${S}-role.persona{color:#a78bfa;background:color-mix(in srgb,#a78bfa 18%,transparent)}
        .${S}-role.skill{color:#60a5fa;background:color-mix(in srgb,#60a5fa 16%,transparent)}
        .${S}-role.updated{color:#fbbf24;background:color-mix(in srgb,#fbbf24 16%,transparent)}
        .${S}-contextBody{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
        .${S}-contextHead{display:flex;align-items:center;gap:6px;font-weight:500;color:var(--dsw-alias-label-primary)} 
        .${S}-formBadge{font-style:normal;font-size:10.5px;line-height:16px;padding:0 6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);font-weight:500}
        .${S}-manage{flex:none;align-self:center;cursor:pointer;border:0;background:transparent;padding:0;font-size:10.5px;line-height:16px;color:#a78bfa;font-weight:600;text-decoration:none;transition:opacity .24s ease}
        .${S}-manage.skill{color:#60a5fa}
        .${S}-manage:hover{opacity:.72}
        .${S}-manage:focus-visible{outline:none}
        .${S}-clickable{cursor:pointer;transition:background-color .24s ease}
        .${S}-clickable:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-chip.clickable:hover{border-color:var(--dsw-alias-border-strong)} 
        .${S}-details{position:relative;flex:none;min-width:0;min-height:0;box-sizing:border-box;width:clamp(320px,38%,440px);max-width:calc(100% - 280px);border-left:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;overflow:hidden;animation:${S}-detail-in .18s var(--ds-ease-in-out)}
        @keyframes ${S}-detail-in{from{transform:translateX(22px);opacity:0}to{transform:translateX(0);opacity:1}}
        .${S}-resizeHandle{z-index:6;cursor:col-resize;touch-action:none;user-select:none;background:transparent;border:0;width:8px;padding:0;position:absolute;top:0;bottom:0;left:-4px}
        .${S}-resizeHandle:focus-visible{outline:none}
        .${S}-detailsHeader{box-sizing:border-box;flex:none;display:flex;justify-content:space-between;align-items:center;height:42px;padding:0 8px 0 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}
        .${S}-detailsTitle{min-width:0;display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-primary)}
        .${S}-dotMarker{background:var(--dsw-alias-label-secondary);border-radius:50%;flex:none;width:5px;height:5px}
        .${S}-detailsName{flex:none;font-weight:500;font-size:12.5px;line-height:16px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .${S}-detailsLocation{min-width:0;color:var(--dsw-alias-label-tertiary);font:11px/16px var(--ds-font-family-code,ui-monospace,Consolas,monospace);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}
        .${S}-close{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:transparent;border:0;border-radius:6px;flex:none;display:inline-flex;justify-content:center;align-items:center;padding:0;font-size:18px;line-height:18px}
        .${S}-close:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-detailBody{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden}
        .${S}-detailBody::-webkit-scrollbar,.${S}-root::-webkit-scrollbar,.${S}-tree::-webkit-scrollbar{width:10px;height:10px}
.${S}-detailBody::-webkit-scrollbar-thumb,.${S}-root::-webkit-scrollbar-thumb,.${S}-tree::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:5px;border:2px solid transparent;background-clip:content-box}
.${S}-detailBody::-webkit-scrollbar-thumb:hover,.${S}-root::-webkit-scrollbar-thumb:hover,.${S}-tree::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-border-l3);border:2px solid transparent;background-clip:content-box}
.${S}-detailBody::-webkit-scrollbar-track,.${S}-root::-webkit-scrollbar-track,.${S}-tree::-webkit-scrollbar-track{background:transparent}
        .${S}-detailPre{margin:0;padding:12px 14px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;line-height:20px;font-size:11.5px;color:var(--dsw-alias-label-primary)}
        .${S}-json{font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:11px;color:var(--dsw-alias-label-secondary)}
        .${S}-md{padding:12px 14px;font-size:12px;line-height:1.75;color:var(--dsw-alias-label-primary)}
        .${S}-md h1,.${S}-md h2,.${S}-md h3,.${S}-md h4,.${S}-md h5,.${S}-md h6{margin:10px 0 6px;font-weight:650;line-height:1.4;color:var(--dsw-alias-label-primary)}
        .${S}-md h1{font-size:15px}
        .${S}-md h2{font-size:13.5px}
        .${S}-md h3{font-size:12.5px}
        .${S}-md h4{font-size:12px}
        .${S}-md h5,.${S}-md h6{font-size:11.5px}
        .${S}-md del{color:var(--dsw-alias-label-tertiary)}
        .${S}-mdImg{max-width:100%;height:auto;border-radius:6px;margin:4px 0}
        .${S}-taskBox{width:13px;height:13px;margin:0 5px 0 0;vertical-align:-2px;accent-color:#34d399;pointer-events:none}
        .${S}-done{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}
        .${S}-md p{margin:6px 0}
        .${S}-md ul,.${S}-md ol{margin:6px 0;padding-left:20px}
        .${S}-md li{margin:2px 0}
        .${S}-md blockquote{margin:8px 0;padding:4px 10px;border-left:3px solid var(--dsw-alias-border-strong);color:var(--dsw-alias-label-secondary)}
        .${S}-md hr{border:none;border-top:1px solid var(--dsw-alias-border-l2);margin:10px 0}
        .${S}-md a{color:var(--dsw-static-blue-500)}
        .${S}-md strong{font-weight:650}
        .${S}-md em{font-style:italic}
        .${S}-md code{font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:.9em;padding:0 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
        .${S}-mdPre{margin:8px 0;padding:10px 12px;overflow-x:auto;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);white-space:pre-wrap}
        .${S}-mdPre code{background:none;padding:0}
        .${S}-hl{background:rgba(250,204,21,.22);color:var(--dsw-alias-label-primary);padding:0 2px;border-radius:3px}
        .${S}-mdTable{width:100%;border-collapse:collapse;margin:8px 0;font-size:11.5px;line-height:1.6}
        .${S}-mdTable th,.${S}-mdTable td{border:1px solid var(--dsw-alias-border-l2);padding:4px 8px;text-align:left;vertical-align:top}
        .${S}-mdTable th{background:var(--dsw-alias-bg-layer-2);font-weight:600;color:var(--dsw-alias-label-secondary);white-space:nowrap}
        .${S}-mdTable td{color:var(--dsw-alias-label-primary)}
        .${S}-jkey{color:var(--dsw-alias-label-secondary)}
        .${S}-jstr,.${S}-jnum,.${S}-jbool,.${S}-jnull{color:var(--dsw-alias-label-primary)}
        .${S}-fileTabs{display:flex;width:100%;border-bottom:1px solid var(--dsw-alias-border-l1);margin-bottom:8px}
        .${S}-fileTab{appearance:none;flex:1 1 0%;min-width:0;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6;padding:6px 10px;cursor:pointer;position:relative;transition:color .24s}
        .${S}-fileTab::after{content:"";position:absolute;left:20%;right:20%;bottom:-1px;height:2px;border-radius:2px;background:transparent;transition:background .24s}
        .${S}-fileTab:hover{color:var(--dsw-alias-label-primary)}
        .${S}-fileTab.active{color:var(--dsw-alias-label-primary);font-weight:600}
        .${S}-fileTab.active::after{background:var(--dsw-static-blue-450,var(--dsw-static-blue-500))}
        .${S}-fileTabBody{max-height:calc(100% - 40px);overflow-y:auto}
        .${S}-tree{max-width:100%;overflow-x:auto;font-size:11.5px;line-height:1.9}
        .${S}-tn{white-space:normal;overflow-wrap:anywhere;word-break:break-word}
        .${S}-tbranch{display:inline-flex;align-items:center;gap:5px;cursor:pointer;padding:1px 8px 1px 0;border-radius:4px}
        .${S}-tbranch:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-carat{flex:none;font-size:9px;color:var(--dsw-alias-label-tertiary);width:14px;text-align:center}
        .${S}-tk{color:var(--dsw-alias-label-secondary);font-weight:500;margin-right:2px}
        .${S}-jidx{color:var(--dsw-alias-label-tertiary);font-weight:400;margin-right:5px}
        .${S}-hint{color:var(--dsw-alias-label-tertiary);font-size:10.5px}
        @media (width<=760px){.${S}-details{z-index:5;position:absolute;top:0;bottom:0;right:0;width:min(92%,420px);max-width:92%;border-left-color:var(--dsw-alias-border-l3);box-shadow:-12px 0 32px #00000024}}
      `}</style>

      {/* 实时状态条 */}
      <div className={`${S}-statusbar`}>
        <span className={`${S}-dot ${running ? "running" : "idle"}`} />
        {running ? (
          <span className={`${S}-statustext`}>{T?.("pl.monitor.running") ?? "生成中"}</span>
        ) : (
          <span className={`${S}-statustext`}>{T?.("pl.monitor.idle") ?? "空闲"}</span>
        )}
        {openState === "loading" ? (
          <span className={`${S}-statusmeta`}>{T?.("pl.monitor.loading") ?? "加载中"}</span>
        ) : (
          <span className={`${S}-statusmeta`}>{T?.("pl.monitor.open") ?? "会话运行"}</span>
        )}
      </div>

      {/* 数据总览（SVG 图表，原生绘制无需 echarts） */}
      <div className={`${S}-card`}>
        <h4 className={`${S}-cardTitle`}>{T?.("pl.monitor.sectionChart") ?? "数据总览"}</h4>
        <div className={`${S}-charts`}>
          <div className={`${S}-chartBlock`}>
            <span className={`${S}-chartBlockTitle`}>{T?.("pl.monitor.sectionTokens") ?? "Token 用量"}</span>
            <Donut
              size={132}
              stroke={15}
              segments={tokenChartSegs.map((s) => ({ value: s.value, color: s.color }))}
              center={
                <>
                  <span className={`${S}-donutValue`}>{formatToken(totalTokens)}</span>
                  <span className={`${S}-donutLabel`}>{T?.("pl.monitor.total") ?? "总计"}</span>
                </>
              }
            />
            <div className={`${S}-chartLegend`}>
              {tokenChartSegs
                .filter((s) => s.value > 0)
                .map((s) => (
                  <span key={s.key} className={`${S}-chartLegendItem`}>
                    <span className={`${S}-swatch`} style={{ background: s.color }} />
                    <span className={`${S}-chartLegendName`}>{s.label}</span>
                    <span className={`${S}-chartLegendVal`}>{formatToken(s.value)}</span>
                  </span>
                ))}
            </div>
          </div>
          {occColor && (
            <div className={`${S}-chartBlock`}>
              <span className={`${S}-chartBlockTitle`}>{T?.("pl.monitor.sectionPressure") ?? "上下文占用"}</span>
              <Donut
                size={132}
                stroke={15}
                segments={[
                  { value: occupiedPercent!, color: OCC_COLOR_LOW },
                  { value: 100 - occupiedPercent!, color: OCC_TRACK },
                ]}
                center={
                  <>
                    <span className={`${S}-donutValue`}>{Math.round(occupiedPercent!)}%</span>
                    <span className={`${S}-donutLabel`}>{T?.("pl.monitor.used") ?? "已用"}</span>
                  </>
                }
              />
              <div className={`${S}-chartLegend`}>
                <span className={`${S}-chartLegendItem`}>
                  <span className={`${S}-swatch`} style={{ background: occColor }} />
                  <span className={`${S}-chartLegendName`}>{T?.("pl.monitor.sectionPressure") ?? "上下文占用"}</span>
                  <span className={`${S}-chartLegendVal`}>{formatToken(occNum)} / {formatToken(occDen ?? 0)}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Token 用量 */}
      <div className={`${S}-card`}>
        <h4 className={`${S}-cardTitle`}>{T?.("pl.monitor.sectionTokens") ?? "Token 用量"}</h4>
        <div className={`${S}-grid`}>
          <div className={`${S}-metric`}>
            <span className={`${S}-metricLabel`}>{T?.("pl.monitor.input") ?? "输入"}</span>
            <span className={`${S}-metricValue`}>{formatToken(billedInput)}</span>
          </div>
          <div className={`${S}-metric`}>
            <span className={`${S}-metricLabel`}>{T?.("pl.monitor.output") ?? "输出"}</span>
            <span className={`${S}-metricValue`}>{formatToken(usage?.outputTokens ?? 0)}</span>
          </div>
          <div className={`${S}-metric`}>
            <span className={`${S}-metricLabel`}>{T?.("pl.monitor.total") ?? "总计"}</span>
            <span className={`${S}-metricValue`}>{formatToken(totalTokens)}</span>
          </div>
        </div>
        <div className={`${S}-subgrid`} style={{ gridTemplateColumns: "repeat(auto-fit,minmax(96px,1fr))" }}>
          <div className={`${S}-pill`}>
            <div className={`${S}-pillTitle`}>{T?.("pl.monitor.uncached") ?? "未命中缓存"}</div>
            <div className={`${S}-pillValue`}>{formatToken(usage?.uncachedInputTokens ?? 0)}</div>
          </div>
          <div className={`${S}-pill`}>
            <div className={`${S}-pillTitle`}>{T?.("pl.monitor.cacheRead") ?? "缓存读"}</div>
            <div className={`${S}-pillValue`}>{formatToken(usage?.cacheReadTokens ?? 0)}</div>
          </div>
          <div className={`${S}-pill`}>
            <div className={`${S}-pillTitle`}>{T?.("pl.monitor.cacheHit") ?? "缓存命中率"}</div>
            <div className={`${S}-pillValue`}>{cacheHit === null ? "—" : `${cacheHit}%`}</div>
          </div>
          <div className={`${S}-pill`}>
            <div className={`${S}-pillTitle`}>{T?.("pl.monitor.cost") ?? "预估花费"}</div>
            <div className={`${S}-pillValue`}>
              {estimatedCost === null ? "—" : `¥${estimatedCost < 0.01 ? estimatedCost.toFixed(4) : estimatedCost.toFixed(3)}`}
            </div>
          </div>
        </div>
      </div>

      {/* 性能统计 */}
      {stats && stats.steps > 0 && (
        <div className={`${S}-card`}>
          <h4 className={`${S}-cardTitle`}>{T?.("pl.monitor.sectionPerformance") ?? "性能统计"}</h4>
          <div className={`${S}-grid`}>
            <Metric label={T?.("pl.monitor.turns") ?? "回合"} value={String(stats.turns)} />
            <Metric label={T?.("pl.monitor.steps") ?? "步骤"} value={String(stats.steps)} />
            <Metric label={T?.("pl.monitor.llmDuration") ?? "生成耗时"} value={formatDuration(stats.llmMs)} />
          </div>
          <div className={`${S}-subgrid`}>
            <div className={`${S}-pill`}>
              <div className={`${S}-pillTitle`}>{T?.("pl.monitor.toolDuration") ?? "工具耗时"}</div>
              <div className={`${S}-pillValue`}>{toolMs > 0 ? formatDuration(toolMs) : "—"}</div>
            </div>
            <div className={`${S}-pill`}>
              <div className={`${S}-pillTitle`}>{T?.("pl.monitor.ttftAvg") ?? "平均首 token"}</div>
              <div className={`${S}-pillValue`}>{ttftAvg !== null ? formatDuration(ttftAvg) : "—"}</div>
            </div>
            <div className={`${S}-pill`}>
              <div className={`${S}-pillTitle`}>{T?.("pl.monitor.decodeSpeed") ?? "解码速度"}</div>
              <div className={`${S}-pillValue`}>{decodeSpeed !== null ? `${formatTps(decodeSpeed)} tok/s` : "—"}</div>
            </div>
          </div>
        </div>
      )}

      {/* 上下文占用 */}
      {showPressure && (
        <div className={`${S}-card`}>
          <h4 className={`${S}-cardTitle`}>{T?.("pl.monitor.sectionPressure") ?? "上下文占用"}</h4>
          <div className={`${S}-pressureRow`}>
            <div className={`${S}-pressureHead`}>
              <span className={`${S}-pressureFigure`}>
                {T?.("pl.monitor.usedOfWindow", { used: formatToken(occNum), window: formatToken(occDen ?? 0) }) ?? `${formatToken(occNum)} / ${formatToken(occDen ?? 0)}`}
              </span>
              <span className={`${S}-pressurePercent`}>{Math.round(occupiedPercent!)}%</span>
            </div>
            <div className={`${S}-track`}>
              <div
                className={`${S}-fill ${occupiedPercent! >= 80 ? "high" : occupiedPercent! >= 60 ? "mid" : "low"}`}
                style={{ width: `${occupiedPercent!}%` }}
              />
            </div>
          </div>
          {pressure?.projectedTokens !== undefined && (
            <div className={`${S}-pressureHead`} style={{ marginTop: 8 }}>
              <span className={`${S}-pressureFigure`}>{T?.("pl.monitor.projected") ?? "预计占用"}</span>
              <span className={`${S}-pressureFigure`}>{formatToken(occNum)}</span>
            </div>
          )}
        </div>
      )}

      {/* 上下文构成 */}
      {segments && (
        <div className={`${S}-card`}>
          <h4 className={`${S}-cardTitle`}>{T?.("pl.monitor.sectionBreakdown") ?? "上下文构成"}</h4>
          <div className={`${S}-bar`}>
            {segments.map((seg) =>
              seg.tokens > 0 ? (
                <div
                  key={seg.key}
                  className={`${S}-segment`}
                  style={{ width: `${(seg.tokens / breakdownTotal) * 100}%`, background: seg.color }}
                />
              ) : null,
            )}
          </div>
          <div className={`${S}-legend`}>
            {segments.map((seg) => (
              <span key={seg.key} className={`${S}-legendItem`}>
                <span className={`${S}-swatch`} style={{ background: seg.color }} />
                {seg.label} · {formatToken(seg.tokens)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 注入信息 */}
      {(contextInjections.length > 0 ||
        injectedTools.length > 0 ||
        systemPrompt ||
        (injectDiag && (injectDiag.personaName || injectDiag.promptTitles.length > 0))) && (
        <div className={`${S}-card`}>
          <h4 className={`${S}-cardTitle`}>
            {T?.("pl.monitor.sectionInjection") ?? "会话注入"}
          </h4>

          {/* 实时注入解析：当前会话命中的 人格 + 技能（独立于 trajectory 快照） */}
          {injectDiag && (injectDiag.personaName || injectDiag.promptTitles.length > 0) && (
            <div className={`${S}-block`}>
              <div className={`${S}-blockTitle`}>
                {T?.("pl.monitor.injectLive") ?? "实时注入解析"}
              </div>
              <div className={`${S}-list`}>
                <div className={`${S}-row clickable`} onClick={openPersonaDetail}>
                  <span className={`${S}-role persona`}>{T?.("pl.monitor.persona") ?? "人格"}</span>
                  <span className={`${S}-contextBody`}>
                    <span className={`${S}-contextHead`}>
                      {injectDiag.personaName || (T?.("pl.monitor.none") ?? "无")}
                      <em className={`${S}-formBadge`}>{personaSourceLabel(injectDiag.personaSource)}</em>
                    </span>
                  </span>
                  {/* 点击打开「人格管理」弹窗（PromptAssistant 监听事件后打开）；阻止冒泡避免误触详情 */}
                  <button
                    type="button"
                    className={`${S}-manage`}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent("pl:open-persona-manager"));
                    }}
                  >
                    {T?.("pl.monitor.manage") ?? "管理"}
                  </button>
                </div>
                {injectDiag.promptTitles.length > 0 && (
                  <div className={`${S}-row clickable`} onClick={openSkillDetail}>
                    <span className={`${S}-role skill`}>{T?.("pl.monitor.skills") ?? "技能"}</span>
                    <span className={`${S}-contextBody`}>
                      <span className={`${S}-contextHead`}>{injectDiag.promptTitles.join("、")}</span>
                    </span>
                    {/* 点击打开「技能管理」弹窗（PromptAssistant 监听事件后打开）；阻止冒泡避免误触详情 */}
                    <button
                      type="button"
                      className={`${S}-manage skill`}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent("pl:open-skill-manager"));
                      }}
                    >
                      {T?.("pl.monitor.manage") ?? "管理"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 注入的工具 */}
          {injectedTools.length > 0 && (
            <div className={`${S}-block`}>
              <div className={`${S}-blockTitle`}>
                {T?.("pl.monitor.injectTools") ?? "注入的工具"}
                <span className={`${S}-hint`}>
                  {`${injectedTools.length}${T?.("pl.monitor.spacer") ?? " · "}${formatToken(breakdown?.toolsTokens ?? 0)}${T?.("pl.monitor.tokenAbbr") ?? " tokens"}`}
                </span>
              </div>
              <div className={`${S}-chips`}>
                {injectedTools.map((tool) =>
                  tool.schema && tool.schema.name ? (
                    <span
                      key={tool.name}
                      className={`${S}-chip tool clickable`}
                      title={tool.name}
                      onClick={() =>
                        openDetail({ title: tool.name, lang: "json", content: toJson(tool.schema), dualTabs: true })
                      }
                    >
                      {tool.name}
                    </span>
                  ) : null,
                )}
              </div>
            </div>
          )}

          {/* 技能与人格（系统提示内的有标题区块） */}
          {sysSections.length > 0 && (
            <div className={`${S}-block`}>
              <div className={`${S}-blockTitle`}>
                {T?.("pl.monitor.injectSystem") ?? "系统提示区块"}
                <span className={`${S}-hint`}>{formatToken(breakdown?.systemTokens ?? 0)}{T?.("pl.monitor.tokenAbbr") ?? " tokens"}</span>
              </div>
              <div className={`${S}-sections`}>
                {sysSections.map((seg, i) => (
                  <div
                    key={i}
                    className={`${S}-sectionRow clickable`}
                    onClick={() =>
                      openDetail({
                        title: seg.title,
                        subtitle: `${formatToken(seg.chars)}${T?.("pl.monitor.charAbbr") ?? " 字符"}`,
                        lang: "text",
                        content: seg.body,
                      })
                    }
                  >
                    <span className={`${S}-sectionTitle`}>{seg.title}</span>
                    <span className={`${S}-sectionSize`}>{formatToken(seg.chars)}{T?.("pl.monitor.charAbbr") ?? " 字符"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 系统提示无标题时的整体概览 */}
          {sysSummary && (
            <div className={`${S}-block`}>
              <div className={`${S}-blockTitle`}>
                {T?.("pl.monitor.injectSystem") ?? "系统提示区块"}
                <span className={`${S}-hint`}>{formatToken(breakdown?.systemTokens ?? 0)}{T?.("pl.monitor.tokenAbbr") ?? " tokens"}</span>
              </div>
              <div className={`${S}-sections`}>
                <div
                  className={`${S}-sectionRow clickable`}
                  onClick={() =>
                    openDetail({
                      title: T?.("pl.monitor.system") ?? "系统提示",
                      subtitle: `${sysSummary.lines}${T?.("pl.monitor.lineAbbr") ?? " 行"} · ${formatToken(sysSummary.chars)}${T?.("pl.monitor.charAbbr") ?? " 字符"}`,
                      lang: "text",
                      content: systemPrompt,
                    })
                  }
                >
                  <span className={`${S}-sectionTitle`}>
                    <span className={`${S}-chevron`} aria-hidden="true">›</span>
                    {T?.("pl.monitor.system") ?? "系统提示"}
                  </span>
                  <span className={`${S}-sectionSize`}>
                    {sysSummary.lines}{T?.("pl.monitor.lineAbbr") ?? " 行"} · {formatToken(sysSummary.chars)}{T?.("pl.monitor.charAbbr") ?? " 字符"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 注入的上下文节点 */}
          {contextInjections.length > 0 && (
            <div className={`${S}-block`}>
              <div className={`${S}-blockTitle`}>{T?.("pl.monitor.injectContext") ?? "注入的上下文"}</div>
              <div className={`${S}-list`}>
                {contextInjections.map((c, i) => (
                  <div
                    key={i}
                    className={`${S}-row clickable`}
                    onClick={() =>
                      openDetail({
                        title: c.label || (T?.("pl.monitor.context") ?? "上下文"),
                        subtitle: contextFormLabel(T, c.form),
                        lang: "text",
                        content: c.text,
                      })
                    }
                  >
                    <span className={`${S}-role context ${c.role}`}>
                      {c.role === "recall"
                        ? (T?.("pl.monitor.roleRecall") ?? "回刷")
                        : (T?.("pl.monitor.roleInject") ?? "注入")}
                    </span>
                    <span className={`${S}-contextBody`}>
                      <span className={`${S}-contextHead`}>
                        {c.label || (T?.("pl.monitor.context") ?? "上下文")}
                        <em className={`${S}-formBadge`}>{contextFormLabel(T, c.form)}</em>
                      </span>
                      <span className={`${S}-body`}>{c.text}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 会话动态 */}
      <div className={`${S}-card`}>
        <h4 className={`${S}-cardTitle`}>{T?.("pl.monitor.sectionActivity") ?? "会话动态"}</h4>
        {activity.length === 0 ? (
          <div className={`${S}-empty`}>{T?.("pl.monitor.noActivity") ?? "暂无对话消息"}</div>
        ) : (
          <div className={`${S}-timeline`}>
            {shownActivity.map((a, i) => {
              const label =
                a.kind === "user"
                  ? (T?.("pl.monitor.you") ?? "用户")
                  : a.kind === "thinking"
                    ? (T?.("pl.monitor.thinking") ?? "思考")
                    : a.kind === "tool"
                      ? "⚙"
                      : a.kind === "error"
                        ? (T?.("pl.monitor.kindError") ?? "失败")
                        : a.kind === "retry"
                          ? (T?.("pl.monitor.kindRetry") ?? "重试")
                          : a.kind === "max-tokens"
                            ? (T?.("pl.monitor.kindMaxTokens") ?? "截断")
                            : a.kind === "interrupted"
                              ? (T?.("pl.monitor.kindInterrupted") ?? "中断")
                              : (T?.("pl.monitor.assistant") ?? "助手");
              return (
                <div
                  key={i}
                  className={`${S}-trow clickable ${a.kind}`}
                  onClick={() =>
                    a.kind === "tool"
                      ? openDetail({
                          title: a.text,
                          subtitle: a.file ? a.file.path : undefined,
                          lang: a.file ? "json" : "text",
                          content: a.file
                            ? `{\n  "file_path": ${JSON.stringify(a.file.path)},\n  "content": ${JSON.stringify(a.file.content)}\n}`
                            : a.text,
                          file: a.file ?? undefined,
                        })
                      : openDetail({
                          title: label,
                          lang: "text",
                          content: a.detail || a.text,
                        })
                  }
                >
                  <div className={`${S}-taxis`} aria-hidden="true">
                    <span className={`${S}-tnode ${a.kind}`} />
                  </div>
                  <div className={`${S}-tmain`}>
                    <div className={`${S}-ttime`}>{formatTime(a.time)}</div>
                    <div className={`${S}-bubble`}>
                      <div className={`${S}-thead`}>
                        <span className={`${S}-role ${a.kind}`}>{label}</span>
                        {a.meta ? <span className={`${S}-tmeta`}>{a.meta}</span> : null}
                      </div>
                      <div className={`${S}-body`}>{a.text || "…"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* 右侧详细信息抽屉：位于 .root 之外、.wrap 之内，作为 flex 行布局的右分栏兄弟 */}
      {detail && (
        <aside
          ref={(el) => {
            detailRef.current = el;
          }}
          className={`${S}-details`}
          style={detailWidth ? { width: detailWidth } : undefined}
          aria-label={T?.("pl.monitor.close") ?? "关闭"}
        >
          <div
            className={`${S}-resizeHandle`}
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            title="Drag to resize. Double-click to reset."
            onPointerDown={startResize}
            onPointerMove={moveResize}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            onDoubleClick={() => setDetailWidth(null)}
          />
          <div className={`${S}-detailsHeader`}>
            <div className={`${S}-detailsTitle`}>
              <span className={`${S}-dotMarker`} aria-hidden="true" />
              <span className={`${S}-detailsName`}>{detail.title}</span>
              {detail.subtitle ? <span className={`${S}-detailsLocation`}>{detail.subtitle}</span> : null}
            </div>
            <button
              type="button"
              className={`${S}-close`}
              onClick={() => setDetail(null)}
              aria-label={T?.("pl.monitor.close") ?? "关闭"}
              title={T?.("pl.monitor.close") ?? "关闭"}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className={`${S}-detailBody`}>
            {detail.file ? (
              <>
                <div className={`${S}-fileTabs`} role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={detailTab === "content"}
                    className={`${S}-fileTab ${detailTab === "content" ? "active" : ""}`}
                    onClick={() => setDetailTab("content")}
                  >
                    {T?.("pl.monitor.tabContent") ?? "内容"}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={detailTab === "params"}
                    className={`${S}-fileTab ${detailTab === "params" ? "active" : ""}`}
                    onClick={() => setDetailTab("params")}
                  >
                    {T?.("pl.monitor.tabParams") ?? "参数"}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={detailTab === "object"}
                    className={`${S}-fileTab ${detailTab === "object" ? "active" : ""}`}
                    onClick={() => setDetailTab("object")}
                  >
                    {T?.("pl.monitor.tabObject") ?? "对象"}
                  </button>
                </div>
                <div className={`${S}-fileTabBody`}>
                  {detailTab === "content" ? (
                    <RichText lang="text" content={detail.file.content} />
                  ) : detailTab === "params" ? (
                    <RichText lang="json" content={detail.content} />
                  ) : (
                    <JsonTree value={parseJsonSafe(detail.content)} />
                  )}
                </div>
              </>
            ) : detail.dualTabs ? (
              <>
                <div className={`${S}-fileTabs`} role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={detailTab === "params"}
                    className={`${S}-fileTab ${detailTab === "params" ? "active" : ""}`}
                    onClick={() => setDetailTab("params")}
                  >
                    {T?.("pl.monitor.tabParams") ?? "参数"}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={detailTab === "object"}
                    className={`${S}-fileTab ${detailTab === "object" ? "active" : ""}`}
                    onClick={() => setDetailTab("object")}
                  >
                    {T?.("pl.monitor.tabObject") ?? "对象"}
                  </button>
                </div>
                <div className={`${S}-fileTabBody`}>
                  {detailTab === "params" ? (
                    <RichText lang="json" content={detail.content} />
                  ) : (
                    <JsonTree value={parseJsonSafe(detail.content)} />
                  )}
                </div>
              </>
            ) : (
              <RichText lang={detail.lang} content={detail.content} />
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

/* ------------------------------- 详情富文本渲染 ------------------------------- */

/**
 * 尝试从工具调用参数中解析 file_path + content 结构（写文件类调用）。
 * 命中时返回文件路径与写入内容，供详情抽屉用 tab 展示内容预览。
 */
function toolFileOf(argsRaw: string): { path: string; content: string } | null {
  if (!argsRaw) return null;
  try {
    const obj = JSON.parse(argsRaw);
    if (
      obj &&
      typeof obj === "object" &&
      typeof (obj as { file_path?: unknown }).file_path === "string" &&
      typeof (obj as { content?: unknown }).content === "string"
    ) {
      return {
        path: (obj as { file_path: string }).file_path,
        content: (obj as { content: string }).content,
      };
    }
  } catch {
    // 非合法 JSON 参数，非写文件调用
  }
  return null;
}

/** 安全解析 JSON 字符串，失败返回原始字符串（供对象视图兜底）。 */
function parseJsonSafe(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** 生成 JSON 字符串字面量：转义内部引号/反斜杠/控制字符，避免复杂 JSON 结构被破坏；
 *  真实换行（\n / \r）保留原样，由调用方用 pre-wrap 保持多行可读性。 */
function escapeJsonString(value: string): string {
  let out = '"';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n" || ch === "\r") out += ch; // 保留真实换行
    else if (ch === "\t") out += "\\t";
    else if (ch === "\b") out += "\\b";
    else if (ch === "\f") out += "\\f";
    else if (ch.charCodeAt(0) < 0x20)
      out += `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`;
    else out += ch;
  }
  return out + '"';
}

/** 高亮 JSON 字符串：格式化缩进 + 按 key/string/number/boolean/null 上色。 */
function highlightJsonText(raw: string) {
  let pretty = raw;
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    // 非合法 JSON，原样展示
  }
  const re =
    /("(?:\\[^]|[^"\\])*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],:]|\s+)/g;
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  let last = 0;
  let keySeq = 0;
  while ((m = re.exec(pretty))) {
    if (m.index > last) out.push(pretty.slice(last, m.index));
    let cls = "jplain";
    if (m[1] !== undefined) cls = m[2] !== undefined ? "jkey" : "jstr";
    else if (m[3] !== undefined) cls = "jnum";
    else if (m[4] !== undefined) cls = m[4] === "null" ? "jnull" : "jbool";
    else cls = "jplain";
    if (cls !== "jplain" && m[0]) {
      out.push(
        <span key={keySeq++} className={`${S}-${cls}`}>
          {m[0]}
        </span>,
      );
    } else {
      out.push(m[0]);
    }
    last = re.lastIndex;
    i += 1;
  }
  if (last < pretty.length) out.push(pretty.slice(last));
  return out.length ? out : pretty;
}

/** 内联标记解析：`code`、**粗体**、*斜体*、~~删除线~~、==高亮==、[链接](url)、![图片](url)、自动 URL。 */
function inlineMd(text: string, keySeq: { n: number }) {
  const re =
    /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(\*[^*\n]+?\*)|(~~[^~\n]+?~~)|(==[^=\n]+?==)|(!\[[^\]]*\]\([^)\s]+\))|(\[[^\]]+\]\([^)\s]+\))|(<(?:https?:\/\/|\/|#)[^\s>]+>)|((?:https?:\/\/|www\.)[^\s<]+)/g;
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = () => `${keySeq.n++}`;
    if (m[1]) out.push(<code key={k()}>{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k()}>{m[2].slice(2, -2)}</strong>);
    else if (m[3]) out.push(<em key={k()}>{m[3].slice(1, -1)}</em>);
    else if (m[4]) out.push(<del key={k()}>{m[4].slice(2, -2)}</del>);
    else if (m[5]) out.push(<mark key={k()} className={`${S}-hl`}>{m[5].slice(2, -2)}</mark>);
    else if (m[6]) {
      const im = m[6].match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (im)
        out.push(<img key={k()} className={`${S}-mdImg`} src={im[2]} alt={im[1]} loading="lazy" />);
    } else if (m[7]) {
      const linkMatch = m[7].match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (linkMatch) {
        out.push(
          <a key={k()} href={linkMatch[2]} target="_blank" rel="noreferrer">
            {linkMatch[1]}
          </a>,
        );
      }
    } else if (m[8]) {
      out.push(
        <a key={k()} href={m[8].slice(1, -1)} target="_blank" rel="noreferrer">
          {m[8].slice(1, -1)}
        </a>,
      );
    } else if (m[9]) {
      const url = m[9];
      out.push(
        <a key={k()} href={url.startsWith("www.") ? `https://${url}` : url} target="_blank" rel="noreferrer">
          {url}
        </a>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** 解析一行表格：`| a | b |` → 单元格数组；非表格行返回 null。 */
function tableCells(ln: string): string[] | null {
  const t = ln.trim();
  if (!(t.startsWith("|") && t.endsWith("|"))) return null;
  return t
    .slice(1, -1)
    .split("|")
    .map((s) => s.trim());
}

/** 判断是否为表头分隔行（如 `|---|---|`、`|:---|:---:|`）。 */
function isTableSep(cells: string[] | null): cells is string[] {
  return !!cells && cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

/** 判断是否为列表行（无序 `-`/有序 `1.`/任务 `- [x]`）。 */
function isListLine(s: string): boolean {
  return /^\s*(?:[-*+]|(?:\d+[.)]))\s+/.test(s);
}

/** 解析连续列表行（含缩进）为嵌套列表，支持任务清单 checkbox。 */
function renderListTree(raw: string[], keySeq: { n: number }): ReactNode {
  interface Item {
    depth: number;
    ordered: boolean;
    task: boolean;
    checked: boolean;
    text: string;
  }
  interface Node {
    item: Item;
    children: Node[];
  }
  const indent = (s: string) => Math.floor(s.replace(/\t/g, "    ").length / 2);
  const parsed: Item[] = [];
  for (const ln of raw) {
    const task = ln.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (task) parsed.push({ depth: indent(task[1]), ordered: false, task: true, checked: task[2].toLowerCase() === "x", text: task[3] });
    else {
      const ol = ln.match(/^(\s*)(\d+[.)])\s+(.*)$/);
      const ul = ln.match(/^(\s*)[-*+]\s+(.*)$/);
      if (ul) parsed.push({ depth: indent(ul[1]), ordered: false, task: false, checked: false, text: ul[2] });
      else if (ol) parsed.push({ depth: indent(ol[1]), ordered: true, task: false, checked: false, text: ol[3] });
    }
  }
  if (parsed.length === 0) return null;
  const root: Node = { item: { depth: -1, ordered: false, task: false, checked: false, text: "" }, children: [] };
  const stack: Node[] = [root];
  for (const p of parsed) {
    const node: Node = { item: p, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].item.depth >= p.depth) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  const renderLevel = (items: Node[]): ReactNode =>
    items.some((n) => n.item.ordered)
      ? (
          <ol key={keySeq.n++}>
            {items.map((n) => (
              <li key={keySeq.n++}>
                {n.item.task ? <input className={`${S}-taskBox`} type="checkbox" defaultChecked={n.item.checked} disabled readOnly /> : null}
                <span className={n.item.task && n.item.checked ? `${S}-done` : undefined}>{inlineMd(n.item.text, keySeq)}</span>
                {n.children.length ? renderLevel(n.children) : null}
              </li>
            ))}
          </ol>
        )
      : (
          <ul key={keySeq.n++}>
            {items.map((n) => (
              <li key={keySeq.n++}>
                {n.item.task ? <input className={`${S}-taskBox`} type="checkbox" defaultChecked={n.item.checked} disabled readOnly /> : null}
                <span className={n.item.task && n.item.checked ? `${S}-done` : undefined}>{inlineMd(n.item.text, keySeq)}</span>
                {n.children.length ? renderLevel(n.children) : null}
              </li>
            ))}
          </ul>
        );
  return renderLevel(root.children);
}

/** 块级 Markdown 轻渲染（覆盖 txt 的重点高亮需求）。 */
function mdBlocks(text: string) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  const keySeq = { n: 0 };
  let i = 0;
  const heading = (lv: number, children: ReactNode[]) => {
    if (lv === 1) return <h1 key={keySeq.n++}>{children}</h1>;
    if (lv === 2) return <h2 key={keySeq.n++}>{children}</h2>;
    if (lv === 3) return <h3 key={keySeq.n++}>{children}</h3>;
    if (lv === 4) return <h4 key={keySeq.n++}>{children}</h4>;
    if (lv === 5) return <h5 key={keySeq.n++}>{children}</h5>;
    return <h6 key={keySeq.n++}>{children}</h6>;
  };
  const renderTable = (header: string[], rows: string[][]) => (
    <table key={keySeq.n++} className={`${S}-mdTable`}>
      <thead>
        <tr>
          {header.map((c, ci) => (
            <th key={ci}>{inlineMd(c, keySeq)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri}>
            {r.map((c, ci) => (
              <td key={ci}>{inlineMd(c, keySeq)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
  while (i < lines.length) {
    const ln = lines[i];
    // 表格：表头行 + 分隔行 + 数据行
    const headerCells = tableCells(ln);
    if (headerCells && !isTableSep(headerCells)) {
      const sepLine = tableCells(lines[i + 1]);
      if (isTableSep(sepLine)) {
        const rows: string[][] = [];
        let j = i + 2;
        while (j < lines.length) {
          const r = tableCells(lines[j]);
          if (!r || isTableSep(r)) break;
          rows.push(r);
          j += 1;
        }
        out.push(renderTable(headerCells, rows));
        i = j;
        continue;
      }
    }
    if (/^\s*```/.test(ln)) {
      const buf: string[] = [];
      let j = i + 1;
      while (j < lines.length && !/^\s*```/.test(lines[j])) buf.push(lines[j++]);
      out.push(
        <pre key={keySeq.n++} className={`${S}-mdPre`}>
          <code>{buf.join("\n")}</code>
        </pre>,
      );
      i = j + 1;
      continue;
    }
    // setext 式标题：下一行为 `===` 或 `---`；标号越深使用越小的标题字号
    const setext = /^(=+|-+)\s*$/.exec(lines[i + 1] ?? "");
    if (setext && ln.trim() !== "" && !tableCells(ln) && !isListLine(ln)) {
      const lv = setext[1][0] === "=" ? 1 : 2;
      out.push(heading(lv, inlineMd(ln.trim(), keySeq)));
      i += 2;
      continue;
    }
    if (/^\s*(#+)\s+/.test(ln)) {
      const mm = ln.match(/^\s*(#+)\s+(.*)$/)!;
      const lv = Math.min(mm[1].length, 6);
      out.push(heading(lv, inlineMd(mm[2], keySeq)));
      i += 1;
      continue;
    }
    if (isListLine(ln)) {
      const raw: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && isListLine(lines[i])) {
        raw.push(lines[i]);
        i += 1;
      }
      const tree = renderListTree(raw, keySeq);
      if (tree) out.push(tree);
      continue;
    }
    if (/^\s*>/.test(ln)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      out.push(<blockquote key={keySeq.n++}>{inlineMd(buf.join(" "), keySeq)}</blockquote>);
      continue;
    }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(ln)) {
      out.push(<hr key={keySeq.n++} />);
      i += 1;
      continue;
    }
    if (ln.trim() === "") {
      i += 1;
      continue;
    }
    const para: string[] = [];
    const blockStart = /^\s*(#+|\s*([-*+]|\d+[.)])\s+|>|```|(---+|\*\*\*+)\s*$)/;
    while (i < lines.length && lines[i].trim() !== "" && !blockStart.test(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    out.push(<p key={keySeq.n++}>{inlineMd(para.join(" "), keySeq)}</p>);
  }
  return out;
}

/** 可折叠 JSON 节点：对象/数组可展开折叠，标量直接着色显示（统一主题配色）。 */
function JsonTreeNode({
  name,
  value,
  depth,
  isArrayIndex,
}: {
  name?: string;
  value: unknown;
  depth: number;
  isArrayIndex?: boolean;
}): ReactNode {
  const [open, setOpen] = useState(true);
  const pad = depth * 14;
  const isObj = value !== null && typeof value === "object";
  // 字符串内嵌 JSON（对象/数组）：展开为可折叠子树而非纯字符串
  if (typeof value === "string" && value.length <= 200000) {
    let nested: unknown;
    let nestedOk = false;
    try {
      const parsed = JSON.parse(value);
      if (parsed !== null && typeof parsed === "object") {
        nested = parsed;
        nestedOk = true;
      }
    } catch {
      nestedOk = false;
    }
    if (nestedOk) {
      return (
        <JsonTreeNode name={name} value={nested} depth={depth} isArrayIndex={isArrayIndex} />
      );
    }
  }
  // 标量节点：无折叠，直接展示键与着色值
  if (!isObj) {
    let cls = `${S}-jstr`;
    let text: string;
    if (value === null) {
      cls = `${S}-jnull`;
      text = "null";
    } else if (typeof value === "string") {
      // 字符串值统一带引号（保持 JSON 语义），转义内部引号/反斜杠等避免破坏复杂 JSON 结构；
      // 真实换行保留原样，由下方 span 用 pre-wrap 展示多行可读性
      text = escapeJsonString(value);
    } else if (typeof value === "number") {
      cls = `${S}-jnum`;
      text = String(value);
    } else if (typeof value === "boolean") {
      cls = `${S}-jbool`;
      text = String(value);
    } else {
      text = String(value);
    }
    return (
      <div className={`${S}-tn`} style={{ paddingLeft: pad }}>
        {name !== undefined && (
          <span className={isArrayIndex ? `${S}-jidx` : `${S}-tk`}>{name}</span>
        )}
        <span
          className={cls}
          style={typeof value === "string" && /[\r\n]/.test(value) ? { whiteSpace: "pre-wrap" } : undefined}
        >
          {text}
        </span>
      </div>
    );
  }
  const isArr = Array.isArray(value);
  const entries: Array<[string, unknown]> = isArr
    ? value.map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);
  const empty = entries.length === 0;
  return (
    <div className={`${S}-tn`}>
      <div
        className={`${S}-tbranch`}
        style={{ paddingLeft: pad }}
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
      >
        <span className={`${S}-carat`}>{empty ? "" : open ? "▾" : "▸"}</span>
        {name !== undefined && (
          <span className={isArrayIndex ? `${S}-jidx` : `${S}-tk`}>{name}</span>
        )}
        <span className={`${S}-hint`}>{isArr ? `Array(${entries.length})` : "Object"}</span>
      </div>
      {open &&
        entries.map(([k, v], i) => (
          <JsonTreeNode key={i} name={k} isArrayIndex={isArr} value={v} depth={depth + 1} />
        ))}
    </div>
  );
}

/** 可折叠 JSON 树入口（替代原多层级表格视图）。 */
function JsonTree({ value }: { value: unknown }) {
  return (
    <div className={`${S}-tree`}>
      <JsonTreeNode value={value} depth={0} />
    </div>
  );
}

/** 详情正文富文本渲染：json 直接渲染高亮原生 JSON；text 按 markdown（含 ==重点== 高亮）渲染。 */
function RichText({
  lang,
  content,
}: {
  lang: "text" | "json";
  content: string;
}) {
  if (lang !== "json") {
    return <div className={`${S}-md`}>{mdBlocks(content)}</div>;
  }
  return <pre className={`${S}-detailPre ${S}-json`}>{highlightJsonText(content)}</pre>;
}