/**
 * 会话监控面板的工具函数。
 * 从 TokenMonitorView 拆出：文本提取、紧凑格式化、JSON 容错解析与系统提示分区。
 */
import type { PLTranslate } from "../../utils/i18n.js";

/** 提取 ContentBlock 数组中的纯文本（用户消息正文）。 */
export function textOf(content: readonly { type: string; text?: string }[]): string {
  let out = "";
  for (const b of content) {
    if (b.type === "text" && typeof b.text === "string") out += `${b.text}\n`;
  }
  return out.trim();
}

/** 紧凑数字：517 / 12.2K / 517K / 1.2M。 */
export function formatToken(n: number): string {
  const scaled = (v: number) => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
  if (n < 1e3) return String(n);
  if (n < 1e6) return `${scaled(n / 1e3)}K`;
  return `${scaled(n / 1e6)}M`;
}

/** 紧凑时长：45.2s / 2m42s。 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0s";
  const s = ms / 1e3;
  if (s < 60) return `${Math.round(s * 10) / 10}s`;
  const whole = Math.round(s);
  return `${Math.floor(whole / 60)}m${whole % 60}s`;
}

/** 时间轴时间：YYYY-MM-DD HH:mm:ss（本地时区）。 */
export function formatTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** usage 字段取值（容错读取多种常见结构）。 */
export function usageOutputTokens(usage: unknown): number | null {
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
export function assistantDuration(t: { stepStartTime?: number | null; firstTokenTime?: number | null; completedTime?: number } | undefined): number | null {
  if (!t) return null;
  const start = t.stepStartTime ?? t.firstTokenTime;
  const end = t.completedTime;
  if (typeof start !== "number" || typeof end !== "number" || end < start) return null;
  return end - start;
}

/** 解码吞吐：整 token，小于 10 保留一位小数。 */
export function formatTps(tps: number): string {
  const clamped = Math.max(0, tps);
  return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10);
}

/** 把任意对象格式化成缩进的 JSON（异常时回退字符串）。 */
export function toJson(value: unknown): string {
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
export function sectionizeSystem(system: string): Array<{ title: string; chars: number; body: string }> {
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
export function contextFormLabel(T: PLTranslate | undefined, form: string | null | undefined): string {
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

/**
 * 尝试从工具调用参数中解析 file_path + content 结构（写文件类调用）。
 * 命中时返回文件路径与写入内容，供详情抽屉用 tab 展示内容预览。
 */
export function toolFileOf(argsRaw: string): { path: string; content: string } | null {
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
export function parseJsonSafe(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
