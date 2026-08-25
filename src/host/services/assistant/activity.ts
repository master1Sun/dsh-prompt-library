/**
 * 词库助手「活动状态机」— 把官方 DSH 会话活动投影成可驱动小人动画的 phase。
 *
 * 监听 `session/event` 官方事件，投影为 thinking / waiting / tool / review /
 * done / failed / idle 七个阶段，客户端轮询 `GET /api/prompt-library/activity`
 * 拿到当前 phase 后驱动蓝脸小人动画。
 *
 * 本模块是纯函数 + 单例内存状态；模块级单例由宿主 apply 时注册监听更新。
 */
import type { Context } from "@deepseek-ai/cordis";

/** 词库助手认识的七个活动阶段。 */
export type ActivityPhase =
  | "idle"
  | "waiting"
  | "thinking"
  | "tool"
  | "review"
  | "done"
  | "failed";

/** 暴露给客户端的活动快照。 */
export interface ActivitySnapshot {
  phase: ActivityPhase;
  /** 是否有正在进行的会话；无会话时小人应回到 idle。 */
  sessionActive: boolean;
}

/** 会话活动事件映射所需的若干输入字段。 */
interface ActivityInput {
  phase: ActivityPhase;
}

// ── 纯状态机：只持有最近一次输入阶段与终点计时 ─────────────────────

/** 机器配置。 */
interface ActivityMachineConfig {
  /** done 后的庆祝窗口，ms 内保持 jumping，随后回落 idle。 */
  celebrateMs: number;
  /** failed 后的低落窗口，ms 内保持失败表现，随后回落 idle。 */
  failureMs: number;
}

const defaultConfig: ActivityMachineConfig = { celebrateMs: 2400, failureMs: 2400 };

/**
 * 活动状态机 — 只持有最近一次输入阶段与终点计时；re-inject 墙钟便于测试。
 */
class ActivityMachine {
  private phase: ActivityPhase = "idle";
  private sessionActive = false;
  private doneAt: number | undefined;
  private failedAt: number | undefined;

  constructor(
    private readonly config: ActivityMachineConfig = defaultConfig,
    private readonly now: () => number = Date.now,
  ) {}

  /** 消费一次投影出的阶段更新。 */
  onInput(input: ActivityInput): void {
    this.phase = input.phase;
    this.doneAt = input.phase === "done" ? this.now() : undefined;
    this.failedAt = input.phase === "failed" ? this.now() : undefined;
  }

  /** 会话变得活跃（或新建会话）。 */
  onSessionActive(): void {
    this.sessionActive = true;
  }

  /** 活跃会话被销毁（或无会话）。 */
  onSessionDisposed(): void {
    this.sessionActive = false;
    this.phase = "idle";
    this.doneAt = undefined;
    this.failedAt = undefined;
  }

  /** 渲染当前决策：done/failed 的展示窗口到期后回落 idle。 */
  render(): ActivitySnapshot {
    const nowMs = this.now();
    const doneSettled =
      this.phase === "done" &&
      this.doneAt !== undefined &&
      nowMs - this.doneAt >= this.config.celebrateMs;
    const failedSettled =
      this.phase === "failed" &&
      this.failedAt !== undefined &&
      nowMs - this.failedAt >= this.config.failureMs;
    return {
      phase: doneSettled || failedSettled ? "idle" : this.phase,
      sessionActive: this.sessionActive,
    };
  }
}

// ── 官方会话事件 → phase 投影 ──────────────────────────────────────

/** 每个会话的事件投影上下文（记录工具/失败等会话内状态）。 */
interface ProjectionContext {
  activeTools: Set<string>;
  stepHadFailure: boolean;
}

function freshContext(): ProjectionContext {
  return { activeTools: new Set(), stepHadFailure: false };
}

/**
 * 把官方 DSH 会话事件投影为 phase。未知或纯日志事件不改变当前阶段。
 * 返回 undefined 表示该事件不改变此会话的活动状态。
 */
function projectEvent(
  event: SessionEventLike,
  ctx: ProjectionContext,
): ActivityInput | undefined {
  switch (event.type) {
    case "turn/start":
    case "step/start":
      ctx.activeTools.clear();
      ctx.stepHadFailure = false;
      return { phase: "waiting" };
    case "assistant/chunk": {
      const chunk = event.data?.chunk as { type?: string; text?: string } | undefined;
      const text = typeof chunk?.text === "string" ? chunk.text : "";
      if (chunk?.type === "reasoning-delta" && text.length > 0) {
        return { phase: "thinking" };
      }
      if (chunk?.type === "text-delta" && text.length > 0) {
        return { phase: "review" };
      }
      return undefined;
    }
    case "assistant/message":
      return { phase: "review" };
    case "tool/call":
      ctx.activeTools.add(String(event.data?.callId));
      return { phase: "tool" };
    case "tool/result": {
      const msg = event.data?.message as
        | { source?: { callId?: unknown }; content?: Array<{ isError?: boolean }> }
        | undefined;
      ctx.activeTools.delete(String(msg?.source?.callId));
      const content = msg?.content;
      ctx.stepHadFailure ||=
        event.data?.error !== undefined || content?.[0]?.isError === true;
      if (ctx.activeTools.size > 0) return { phase: "tool" };
      return ctx.stepHadFailure ? { phase: "failed" } : { phase: "thinking" };
    }
    case "turn/end": {
      ctx.activeTools.clear();
      const reason = (event.data?.reason as { kind?: string } | undefined)?.kind;
      switch (reason) {
        case "completed":
          return { phase: "done" };
        case "error":
        case "max-tokens":
        case "interrupted":
          return { phase: "failed" };
        case "blocked":
          return { phase: "waiting" };
        default:
          // aborted 或未知结束：安静回落 idle，不冒气泡
          return { phase: "idle" };
      }
    }
    default:
      return undefined;
  }
}

// ── 会话事件的结构类型（宿主未导出，故本地声明待用到的最小字段）─────────

/** `session/event` 回调里 SessionEvent 的最小可读形状。 */
export type SessionEventLike = { type: string; data?: Record<string, unknown> };

// ── 模块级单例状态机与监听注册 ─────────────────────────────────────────

/** 全局唯一显示机器：跟随「最近一次有意义事件」驱动的 phase。 */
let displayMachine: ActivityMachine | undefined;
/** 是否仍有活跃会话。 */
let displayActive = false;

/** 读取当前活动快照（供路由返回给客户端）。 */
export function getActivity(): ActivitySnapshot {
  if (displayMachine === undefined) {
    return { phase: "idle", sessionActive: displayActive };
  }
  // 无活跃会话时强制 idle；有会话则按机器决策返回。
  return displayActive ? displayMachine.render() : { phase: "idle", sessionActive: false };
}

/**
 * 在当前 ctx 上注册会话活动监听，把官方事件投影进显示机器。
 * 返回 disposer，随插件卸载时移除监听并清空状态。
 */
export function registerActivity(ctx: Context): () => void {
  displayMachine = displayMachine ?? new ActivityMachine();
  const perSession = new Map<string, ProjectionContext>();

  // cordis Context 的 on/off 事件名是强类型联合，官方 `session/event` 等不在类型表里，
  // 故按最小事件总线形状转换（运行时仍是同一份 ctx），满足类型检查。
  const bus = ctx as unknown as {
    on(event: string, listener: (session: { id: string }, event: SessionEventLike) => void): unknown;
    off(event: string, listener: (session: { id: string }, event: SessionEventLike) => void): unknown;
  };

  const onEvent = (session: { id: string }, event: SessionEventLike): void => {
    const key = String(session.id);
    let proj = perSession.get(key);
    if (proj === undefined) {
      proj = freshContext();
      perSession.set(key, proj);
    }
    const next = projectEvent(event, proj);
    if (next === undefined) return;
    displayActive = true;
    displayMachine?.onInput(next);
    displayMachine?.onSessionActive();
  };

  const onDisposed = (session: { id: string }): void => {
    perSession.delete(String(session.id));
    if (perSession.size === 0) {
      displayActive = false;
      displayMachine?.onSessionDisposed();
    }
  };

  bus.on("session/event", onEvent);
  bus.on("session/disposed", onDisposed);

  return () => {
    bus.off("session/event", onEvent);
    bus.off("session/disposed", onDisposed);
    perSession.clear();
    displayActive = false;
    displayMachine = undefined;
  };
}