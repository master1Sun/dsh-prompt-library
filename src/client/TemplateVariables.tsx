/**
 * 模板变量占位符支持。
 *
 * 提示词正文可包含 `{{变量名}}` 形式的占位符。插入到输入框前弹出填充窗口，
 * 让用户为每个变量输入值，确认后用填充后的正文替换占位符。
 * 由侧边栏 / 聊天面板两个插入入口共享使用。
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "./button-style.js";
import { type PLT } from "./i18n.js";

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

/** 高亮样式：把已填入的变量值用主题品牌色弱底标出，未填的占位符用弱色保留。 */
const HL_STRONG = {
  background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 22%, transparent)",
  color: "var(--dsw-alias-label-primary, #f2f6fc)",
  borderRadius: 4,
  padding: "0 2px",
  fontWeight: 550,
} as const;

const HL_PLACEHOLDER = {
  background: "transparent",
  color: TONE.accent,
  borderRadius: 4,
  padding: "0 2px",
} as const;

/**
 * 实时预览正文：把 `{{变量}}` 替换为已填值，并将填入内容高亮标出；
 * 未填写的变量保留原占位符（用品牌色提示）。
 */
function renderPreview(body: string, values: Record<string, string>): ReactNode[] {
  const re = /\{\{\s*([^{}]+?)\s*\}\}/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) nodes.push(body.slice(last, m.index));
    const name = m[1]!.trim();
    const val = Object.prototype.hasOwnProperty.call(values, name) ? values[name] ?? "" : "";
    if (val && val.trim()) {
      nodes.push(
        <span key={`f${key++}`} style={HL_STRONG} title={`{{${name}}}`}>
          {val}
        </span>,
      );
    } else {
      // 占位符原样保留，但用品牌色突显，提示此处可被替换
      nodes.push(
        <span key={`p${key++}`} style={HL_PLACEHOLDER}>
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
  t,
}: Props): ReactNode {
  const [values, setValues] = useState<Record<string, string>>({});
  // 每次打开时重置表单，并预填同名变量的历史记忆（变量填充记忆能力）
  useEffect(() => {
    if (open) setValues(pickVarMemory(variables));
  }, [open, variables]);

  if (!open) return null;

  const submit = () => {
    rememberVarValues(values); // 记住本次填充值，下次同名变量自动预填
    onConfirm(values);
  };

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
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {variables.map((name) => (
            <label
              key={name}
              style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted, flexShrink: 0 }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: TONE.accent,
                    background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 14%, transparent)",
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
                value={values[name] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") onCancel();
                }}
                placeholder={name}
                style={inputStyle}
              />
            </label>
          ))}
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
            {renderPreview(body, values)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 6, flexShrink: 0 }}>
          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={onCancel}>
            {t("pl.cancel")}
          </Button>
          <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={submit}>
            {t("pl.insert")}
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
