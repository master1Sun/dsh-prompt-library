/**
 * 模板变量占位符支持。
 *
 * 提示词正文可包含 `{{变量名}}` 形式的占位符。插入到输入框前弹出填充窗口，
 * 让用户为每个变量输入值，确认后用填充后的正文替换占位符。
 * 由侧边栏 / 聊天面板两个插入入口共享使用。
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../utils/button-style.js";
import { type PLT } from "../../i18n/i18n.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
} as const;

/** 提取正文中的唯一变量名（`{{变量名}}`，去空白、去重、保持顺序）。 */
export function extractVariables(body: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const re = /\{\{\s*([^{}]+?)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const name = m[1]!.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

/** 用填充值替换正文中的所有 `{{变量名}}` 占位符（未提供的变量保留原样）。 */
export function applyVariables(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (full, name: string) => {
    const key = name.trim();
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : full;
  });
}

/** 判断正文是否包含模板变量占位符。 */
export function hasVariables(body: string): boolean {
  return /\{\{\s*[^{}]+\s*\}\}/.test(body);
}

/** 每个变量名分配一个独立颜色的色板（深色面板上可辨识的明亮色）。 */
const VAR_PALETTE = [
  "#f2a73b", // 橙
  "#6bb7f0", // 蓝
  "#b58eff", // 紫
  "#5ee0a8", // 绿
  "#ff7a8a", // 玫红
  "#f5d76e", // 黄
  "#8fd0ff", // 浅蓝
  "#ff9e6f", // 浅橙
  "#a8e063", // 黄绿
  "#ff6fb5", // 粉
  "#4fd8f0", // 青
  "#ffd34d", // 亮黄
  "#7af5a0", // 薄荷
  "#ff8fa7", // 浅玫
  "#58c9ff", // 天蓝
  "#e8b0ff", // 淡紫
  "#6bf0d0", // 青绿
  "#ffcb6b", // 香槟
] as const;

/** 按变量在列表中的序号取对应颜色（循环使用色板）。
 * 变量数超过色板数量时，用黄金角在色相环上均匀取样生成新色，
 * 保证变量再多时相邻颜色依然可辨识、不重复。 */
function varColor(index: number): string {
  if (index < VAR_PALETTE.length) return VAR_PALETTE[index]!;
  // 黄金角 ≈ 137.508°：相邻取样的色相间隔最大，随序号递增稳定错开
  const hue = (index * 137.508) % 360;
  return `hsl(${hue.toFixed(0)}, 72%, 66%)`;
}

/** 已填入值的强高亮样式：以该变量色弱底标出，文字保持明亮可读。
 * active 为 true（该变量输入框当前被聚焦）时底更深并加投光，突出对应文字。 */
function hlStrong(color: string, active: boolean): CSSProperties {
  return {
    background: `color-mix(in srgb, ${color} ${active ? 32 : 22}%, transparent)`,
    color: "var(--dsw-alias-label-primary, #f2f6fc)",
    borderRadius: 4,
    padding: "0 2px",
    fontWeight: 550,
    boxShadow: active ? `0 0 0 1px ${color}, 0 0 0 3px color-mix(in srgb, ${color} 30%, transparent)` : "none",
  };
}

/** 未填入值的占位符高亮样式：用该变量色直接标出文字。
 * active 时描边加厚、底色加深，突出该占位符。 */
function hlPlaceholder(color: string, active: boolean): CSSProperties {
  return {
    background: `color-mix(in srgb, ${color} ${active ? 20 : 12}%, transparent)`,
    color,
    border: `1px solid color-mix(in srgb, ${color} ${active ? 78 : 45}%, transparent)`,
    borderRadius: 4,
    padding: "0 2px",
    boxShadow: active ? `0 0 0 2px color-mix(in srgb, ${color} 26%, transparent)` : "none",
  };
}

/**
 * 实时预览正文：每个变量按其序号对应一种颜色。
 * 已填写的变量 → 填入值以该变量色弱底高亮；未填写的 → 占位符以同一变量色标出，
 * 让用户一眼看出「这个颜色对应哪个变量」。
 * focusName 指向当前聚焦的变量输入框：该变量在预览中的文字会更强高亮（加深+投光）。
 */
function renderPreview(
  body: string,
  values: Record<string, string>,
  colorOf: (name: string) => string,
  focusName: string | null,
): ReactNode[] {
  const re = /\{\{\s*([^{}]+?)\s*\}\}/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) nodes.push(body.slice(last, m.index));
    const name = m[1]!.trim();
    const color = colorOf(name);
    const active = name === focusName; // 该变量的输入框当前被聚焦 → 更强高亮
    const val = Object.prototype.hasOwnProperty.call(values, name) ? values[name] ?? "" : "";
    if (val && val.trim()) {
      nodes.push(
        <span key={`f${key++}`} data-var={name} style={hlStrong(color, active)} data-tip={`{{${name}}}`}>
          {val}
        </span>,
      );
    } else {
      // 占位符原样保留，但用该变量对应的颜色突显，提示此处可被替换
      nodes.push(
        <span key={`p${key++}`} data-var={name} style={hlPlaceholder(color, active)}>
          {`{{${name}}}`}
        </span>,
      );
    }
    last = m.index + m[0]!.length;
  }
  if (last < body.length) nodes.push(body.slice(last));
  return nodes;
}

/** 变量填充记忆的本地存储键。 */
const VAR_MEMORY_KEY = "pl:template-var-memory";

/** 读取历史变量填充记忆（按变量名存值，失败时返回空对象）。 */
function loadVarMemory(): Record<string, string> {
  try {
    const raw = localStorage.getItem(VAR_MEMORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<string, string>;
  } catch {
    return {};
  }
}

/** 只取当前弹窗变量列表对应的历史记忆（未记住的变量缺省为空）。 */
function pickVarMemory(variables: string[]): Record<string, string> {
  const mem = loadVarMemory();
  const out: Record<string, string> = {};
  for (const name of variables) {
    if (Object.prototype.hasOwnProperty.call(mem, name)) out[name] = mem[name];
  }
  return out;
}

/** 记录本次填充的变量值，供下次同名变量预填（忽略空值，单值超长不保留）。 */
function rememberVarValues(values: Record<string, string>): void {
  try {
    const prior = loadVarMemory();
    for (const [k, v] of Object.entries(values)) {
      if (v && v.trim()) prior[k] = v;
    }
    for (const k of Object.keys(prior)) {
      if (prior[k].length > 2000) delete prior[k];
    }
    localStorage.setItem(VAR_MEMORY_KEY, JSON.stringify(prior));
  } catch {
    /* 忽略，记忆失败不影响填充 */
  }
}

/** 在正文输入框光标处插入 `{{变量名}}` 标签（新建/编辑提示词时使用）。
 * - 有选中文本时，以选中内容作为变量名，光标移到标签末尾；
 * - 无选区时插入 `{{默认名}}`（defaultName 为已本地化的默认占位名），光标停在名称末尾便于改名。
 */
export function insertVariableAt(
  el: HTMLTextAreaElement | null | undefined,
  value: string,
  setValue: (next: string) => void,
  defaultName?: string,
): void {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const selected = value.slice(start, end).trim();
  const inject = selected ? `{{${selected}}}` : `{{${defaultName ?? ""}}}`;
  setValue(value.slice(0, start) + inject + value.slice(end));
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    // 有选区时光标停在标签末尾；无选区时光标停在默认名之后（仍在括号内），便于直接改名/续写
    const pos = selected ? end + inject.length : start + 2 + (defaultName?.length ?? 0);
    el.setSelectionRange(pos, pos);
  });
}

interface Props {
  /** 是否显示。 */
  open: boolean;
  /** 待填充的变量名列表。 */
  variables: string[];
  /** 提示词正文（含 {{变量}}），用于实时预览。 */
  body: string;
  /** 取消填充（不插入）。 */
  onCancel: () => void;
  /** 确认填充：以 { 变量名: 值 } 提交。 */
  onConfirm: (values: Record<string, string>) => void;
  /** 插入并发送按钮（填写变量后直接发送）。仅当输入框草稿为空时可用。 */
  onInsertAndSend?: (values: Record<string, string>) => void;
  /** 是否允许插入并发送：需调用方确认输入框草稿为空。 */
  draftEmpty?: boolean;
  /** 确认按钮文字（如「插入」/「覆盖」），默认「插入」。 */
  confirmLabel?: string;
  /** 是否显示「插入并发送」按钮，默认 true。覆盖场景通常无需发送，可设为 false。 */
  showInsertAndSend?: boolean;
  /** 预填的变量值（叠加在历史记忆之上），如「选中文本直接套模板」场景：调用方传入的引用需稳定，避免打开期间被重复重置。 */
  initialValues?: Record<string, string>;
  /** 翻译函数。 */
  t: PLT;
}

/** 居中遮罩填充窗口：为每个变量提供输入框，确认后返回填充值。 */
export function TemplateFillModal({
  open,
  variables,
  body,
  onCancel,
  onConfirm,
  onInsertAndSend,
  draftEmpty,
  confirmLabel,
  showInsertAndSend = true,
  initialValues,
  t,
}: Props): ReactNode {
  const [values, setValues] = useState<Record<string, string>>({});
  // 当前获得焦点的变量名（用于输入框聚焦时以该变量色描边）
  const [focusName, setFocusName] = useState<string | null>(null);
  // 每次打开时重置表单：先按历史记忆预填同名变量，再叠加调用方传入的预填值（如选中文本）
  useEffect(() => {
    if (open) {
      setValues({ ...pickVarMemory(variables), ...(initialValues ?? {}) });
      setWarnMsg(null); // 重新打开时清除上次的未填提示
    }
  }, [open, variables, initialValues]);
  // 按变量在列表中的位置分配颜色：输入行标签、输入框描边、预览高亮使用同一变量色
  const colorOf = useCallback(
    (name: string) => varColor(Math.max(0, variables.indexOf(name))),
    [variables],
  );
  // 预览区容器引用：聚焦某个变量时，预览区滚动到该变量的高亮片段位置
  const previewRef = useRef<HTMLDivElement | null>(null);
  // 聚焦变量变化时，把预览区滚到对应变量的片段（已在可视区则不滚）
  useEffect(() => {
    if (!focusName) return;
    const el = previewRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-var="${CSS.escape(focusName)}"]`);
    target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusName]);
  // 未填变量提示：点击插入/插入并发送时若有变量未填则拦截并提示
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  // 变量输入区容器引用：拦截时聚焦第一个未填变量
  const inputListRef = useRef<HTMLDivElement | null>(null);
  // 校验是否还有未填写的变量；有则提示并聚焦首个未填项，返回 false
  const guardFill = (): boolean => {
    const left = variables.filter((name) => !(values[name] ?? "").trim());
    if (left.length === 0) return true;
    setWarnMsg(t("pl.template.unfilled", { count: left.length }));
    const first = inputListRef.current?.querySelector<HTMLInputElement>(
      `[data-var-input="${CSS.escape(left[0]!)}"]`,
    );
    first?.focus();
    return false;
  };

  if (!open) return null;

  const submit = () => {
    if (!guardFill()) return;
    rememberVarValues(values); // 记住本次填充值，下次同名变量自动预填
    onConfirm(values);
  };
  // 插入并发送：仅显示且回调存在且草稿为空时可用；否则置灰并提示
  const canSend = Boolean(onInsertAndSend) && showInsertAndSend && draftEmpty === true;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pl.template.title")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          maxWidth: "calc(100vw - 40px)",
          maxHeight: "min(520px, calc(100vh - 40px))",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: TONE.panel,
          border: `1px solid ${TONE.borderStrong}`,
          borderRadius: 12,
          boxShadow: "none",
          padding: "18px 20px",
          color: TONE.text,
          fontFamily: MONO,
        }}
      >
        <strong style={{ fontSize: 15, fontWeight: 520, paddingBottom: 4, flexShrink: 0 }}>
          {t("pl.template.title")}
        </strong>
        <div style={{ fontSize: 12, color: TONE.muted, lineHeight: 1.6, flexShrink: 0 }}>
          {t("pl.template.desc")}
        </div>
        {/* 变量输入区：超出最大高度时独立滚动，按钮区固定在弹窗底部 */}
        <div
          ref={inputListRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {variables.map((name) => {
            const color = colorOf(name); // 每个变量只取一次颜色
            const focused = focusName === name;
            return (
              <label
                key={name}
                style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted, flexShrink: 0 }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color,
                      background: `color-mix(in srgb, ${color} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
                      borderRadius: 5,
                      padding: "0 6px",
                      lineHeight: "18px",
                    }}
                  >
                    {`{{${name}}}`}
                  </span>
                </span>
                <input
                  autoFocus
                  data-var-input={name}
                  value={values[name] ?? ""}
                  onChange={(e) => {
                    setWarnMsg(null); // 开始填写即清除未填提示
                    setValues((prev) => ({ ...prev, [name]: e.target.value }));
                  }}
                  onFocus={() => setFocusName(name)}
                  onBlur={() => setFocusName((cur) => (cur === name ? null : cur))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                    if (e.key === "Escape") onCancel();
                  }}
                  placeholder={name}
                  style={{
                    ...inputStyle,
                    // 左侧用变量色做点缀条，聚焦时整框以该变量色描边 + 淡色投光，强化当前操作对象
                    borderLeft: `3px solid ${color}`,
                    borderColor: focused ? color : TONE.border,
                    boxShadow: focused ? `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)` : "none",
                    background: focused ? `color-mix(in srgb, ${color} 6%, ${TONE.row})` : TONE.row,
                    transition: "border-color .18s, box-shadow .18s, background .18s",
                  }}
                />
              </label>
            );
          })}
        </div>
        {/* 实时预览：随输入即时替换 {{变量}}，高亮已填入内容 */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 11, color: TONE.muted }}>{t("pl.template.preview")}</span>
          <div
            ref={previewRef}
            style={{
              maxHeight: 160,
              overflowY: "auto",
              boxSizing: "border-box",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              padding: "8px 10px",
              fontSize: 13,
              lineHeight: 1.7,
              color: TONE.text,
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              borderRadius: 7,
              fontFamily: MONO,
            }}
          >
            {renderPreview(body, values, colorOf, focusName)}
          </div>
        </div>
        {/* 未填变量提示 */}
        {warnMsg && (
          <div
            role="alert"
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              color: "var(--dsw-alias-state-danger-primary, #ff6b6b)",
              lineHeight: 1.5,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" style={{ flexShrink: 0 }} aria-hidden="true">
              <path
                d="M8 4v5M8 11.5v.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span>{warnMsg}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 6, flexShrink: 0 }}>
          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={onCancel}>
            {t("pl.cancel")}
          </Button>
          {showInsertAndSend && onInsertAndSend && (
            <Button
              type="button"
              size="sm"
              className={plBtn(canSend ? "primary" : "ghost", "sm")}
              onClick={() => {
                if (!guardFill()) return;
                rememberVarValues(values);
                onInsertAndSend(values);
              }}
              disabled={!canSend}
              data-tip={canSend ? t("pl.insertSend") : t("pl.insertSendDisabled")}
            >
              {t("pl.insertSend")}
            </Button>
          )}
          <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={submit}>
            {confirmLabel ?? t("pl.insert")}
          </Button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: TONE.text,
  background: TONE.row,
  border: `1px solid ${TONE.border}`,
  borderRadius: 7,
  fontFamily: MONO,
  fontSize: 13,
  outline: "none",
};

