/**
 * 导入编辑弹窗 — 选择导入数据（JSON / CSV / Markdown / 纯文本）后弹出，
 * 以卡片形式展示每条数据，支持：
 * - 自定义编辑标题 / 标签 / 正文，正文可插入 {{变量名}}；
 * - 全选 / 取消全选 / 自定义勾选，仅勾选条目参与校验与导入；
 * - 底部数据校验：列出全部校验错误，一键修复并展示修复结果；
 * - 校验通过后才能导入入库。
 *
 * 弹窗只能通过关闭按钮或导入/取消操作手动关闭，不响应遮罩点击。
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../../utils/button-style.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../../../utils/dialog-style.js";
import { type PLTranslate, usePLT } from "../../../i18n/i18n.js";
import { importPrompts as apiImport, listTags as apiListTags } from "../../../services/api.js";
import { notifyDataChanged } from "../../../services/data-sync.js";
import { insertVariableAt } from "../../common/TemplateVariables.js";
import type { TransferPrompt } from "../../../services/data-formats.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  success: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)",
} as const;

/** 弹窗内单条可编辑条目。 */
interface EditableEntry {
  key: string;
  title: string;
  body: string;
  /** 逗号分隔的标签串（编辑用）。 */
  tags: string;
  /** 来源格式徽标。 */
  source: "json" | "csv" | "md" | "txt";
  checked: boolean;
}

/** 单条校验问题。 */
interface EntryIssue {
  key: string;
  entryTitle: string;
  message: string;
  fixable: boolean;
}

/** 校验结果：是否通过 + 问题清单 + 是否可一键修复。 */
interface ValidateResult {
  ok: boolean;
  issues: EntryIssue[];
  fixable: boolean;
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 9px",
  color: TONE.text,
  background: TONE.row,
  border: `1px solid ${TONE.border}`,
  borderRadius: 7,
  fontFamily: MONO,
  fontSize: 13,
  outline: "none",
};

/** 校验正文中的模板变量括号是否配对、变量名是否合法。 */
function validateTemplateVars(body: string, T: PLTranslate): string[] {
  const errs: string[] = [];
  const opens: number[] = [];
  const re = /\{\{|\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m[0] === "{{") {
      opens.push(m.index);
    } else {
      if (opens.length === 0) {
        errs.push(T("pl.skillModal.varUnmatched"));
        continue;
      }
      const start = opens.pop()!;
      const inner = body.slice(start + 2, m.index).trim();
      if (!inner) errs.push(T("pl.skillModal.varEmpty"));
      else if (/[{}\n]/.test(inner)) errs.push(T("pl.skillModal.varInvalid", { name: inner }));
    }
  }
  if (opens.length > 0) errs.push(T("pl.skillModal.varUnclosed", { n: opens.length }));
  return errs;
}

/** 自动修复正文中的模板变量格式（未闭合补全、多余闭合移除、空变量填默认名、非法名清理）。 */
function fixTemplateVars(body: string, defaultVar: string): string {
  let out = "";
  let i = 0;
  const n = body.length;
  while (i < n) {
    if (body.startsWith("{{", i)) {
      const close = body.indexOf("}}", i + 2);
      if (close === -1) {
        out += `{{${defaultVar}}}`;
        i += 2;
        continue;
      }
      let inner = body.slice(i + 2, close).trim();
      if (!inner) inner = defaultVar;
      else {
        inner = inner.replace(/[{}\n]/g, "").trim();
        if (!inner) inner = defaultVar;
      }
      out += `{{${inner}}}`;
      i = close + 2;
      continue;
    }
    if (body.startsWith("}}", i)) {
      i += 2;
      continue;
    }
    out += body[i];
    i += 1;
  }
  return out;
}

/** 一键修复单条条目：补全空标题、修复正文模板变量；返回修复后的条目 + 修复记录。 */
function autoFixEntry(entry: EditableEntry, T: PLTranslate): { entry: EditableEntry; fixes: string[] } {
  const fixes: string[] = [];
  let title = entry.title.trim();
  if (!title) {
    title = T("pl.importEdit.untitledPrompt");
    fixes.push(T("pl.skillModal.fixTitle", { title }));
  }
  let body = entry.body;
  if (body.trim()) {
    const fixed = fixTemplateVars(body, T("pl.skillModal.varFixDefault"));
    if (fixed !== body) {
      body = fixed;
      fixes.push(T("pl.skillModal.fixBodyVars"));
    }
  }
  return { entry: { ...entry, title, body }, fixes };
}

/** 导入编辑弹窗组件。 */
export function ImportEditModal(props: {
  open: boolean;
  onClose: () => void;
  t?: PLTranslate;
  /** 从所选文件解析出的初始条目。 */
  initialEntries?: TransferPrompt[];
  /** 导入成功后回调（展示导入结果）。 */
  onImported?: (result: { imported: number; updated: number; skipped: number }) => void;
}): ReactNode {
  const { open, onClose, t, initialEntries, onImported } = props;
  const T = usePLT(t);
  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [fixLog, setFixLog] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const bodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const seqRef = useRef(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // 下拉可选标签（既有标签名列表），打开时拉取
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  // 打开时拉取既有标签，用于下拉选择
  useEffect(() => {
    if (!open) return;
    let alive = true;
    apiListTags()
      .then((tags) => {
        if (alive) setTagOptions(tags.map((x) => x.name));
      })
      .catch(() => {
        if (alive) setTagOptions([]);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  // 打开弹窗时用所选文件的条目初始化（默认全部勾选、展开）
  useEffect(() => {
    if (!open) return;
    const seed: EditableEntry[] = (initialEntries ?? []).map((e) => ({
      // 序号保证每条 key 唯一，同名标题也可独立编辑
      key: `imp:${++seqRef.current}`,
      title: e.title,
      body: e.body,
      tags: (e.tags ?? [])[0] ?? "",
      source: e.source ?? "txt",
      checked: true,
    }));
    setEntries(seed);
    setValidation(null);
    setFixLog([]);
    setMsg(null);
    setCollapsed({});
    setSaving(false);
  }, [open]);

  /** 更新某条目字段；编辑会使之前的校验与修复记录失效。 */
  const updateEntry = useCallback((key: string, patch: Partial<EditableEntry>) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
    setValidation(null);
    setFixLog([]);
  }, []);

  /** 勾选 / 取消勾选条目。 */
  const toggleChecked = useCallback((key: string) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, checked: !e.checked } : e)));
  }, []);

  /** 移除条目。 */
  const removeEntry = useCallback((key: string) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
    setValidation(null);
    setFixLog([]);
  }, []);

  /** 折叠 / 展开单条卡片。 */
  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /** 全选 / 取消全选。 */
  const toggleAll = useCallback(() => {
    setEntries((prev) => {
      const all = prev.every((e) => e.checked);
      return prev.map((e) => ({ ...e, checked: !all }));
    });
    setValidation(null);
    setFixLog([]);
  }, []);

  /** 在正文光标处插入 {{变量名}}（有选中文本时以选中内容作为变量名）。 */
  const insertVar = useCallback(
    (key: string) => {
      const entry = entries.find((e) => e.key === key);
      if (!entry) return;
      const textarea = bodyRefs.current[key] ?? null;
      const scrollTop = textarea?.scrollTop ?? 0;
      insertVariableAt(
        textarea,
        entry.body,
        (next) => {
          updateEntry(key, { body: next });
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (textarea) textarea.scrollTop = scrollTop;
            });
          });
        },
        T("pl.insertVariableDefault"),
      );
    },
    [entries, updateEntry, T],
  );

  /** 校验全部勾选条目：必填项 + 模板变量格式，问题以结构化清单展示。 */
  const validateEntries = useCallback(
    (list: EditableEntry[]): ValidateResult => {
      const checked = list.filter((e) => e.checked);
      const issues: EntryIssue[] = [];
      for (const e of checked) {
        const entryTitle = e.title.trim() || T("pl.importEdit.untitledPrompt");
        if (!e.title.trim()) {
          issues.push({
            key: e.key,
            entryTitle,
            message: T("pl.skillModal.titleRequired"),
            fixable: true,
          });
        }
        if (!e.body.trim()) {
          issues.push({
            key: e.key,
            entryTitle,
            message: T("pl.skillModal.bodyRequired"),
            fixable: false,
          });
        }
        for (const m of validateTemplateVars(e.body, T)) {
          issues.push({ key: e.key, entryTitle, message: m, fixable: true });
        }
      }
      return { ok: issues.length === 0, issues, fixable: issues.some((i) => i.fixable) };
    },
    [T],
  );

  /** 校验所有勾选条目并展示结果。 */
  const handleValidate = useCallback(() => {
    if (entries.filter((e) => e.checked).length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    setValidation(validateEntries(entries));
    setFixLog([]);
    setMsg(null);
  }, [entries, T, validateEntries]);

  /** 一键修复：自动修复可修复的问题（补全标题、修复模板变量），并展示修复内容后重新校验。 */
  const handleFix = useCallback(() => {
    if (!validation || validation.ok) return;
    const fixesLog: string[] = [];
    const next = entries.map((e) => {
      if (!validation.issues.some((i) => i.key === e.key && i.fixable)) return e;
      const res = autoFixEntry(e, T);
      for (const f of res.fixes) fixesLog.push(`「${res.entry.title}」${f}`);
      return res.entry;
    });
    setEntries(next);
    setFixLog(fixLog);
    setValidation(validateEntries(next));
  }, [entries, validation, T, validateEntries]);

  /** 导入勾选条目（仅在校验通过后可点），合并入库并返回结果。 */
  const handleSave = useCallback(() => {
    if (!validation?.ok || saving) return;
    const checked = entries.filter((e) => e.checked);
    if (checked.length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    setSaving(true);
    const payload = checked.map((e) => ({
      title: e.title.trim(),
      body: e.body,
      ...(e.tags.trim()
        ? {
            tags: e.tags
              .split(/[,，;；]/)
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : {}),
    }));
    apiImport(payload).then(
      (res) => {
        setSaving(false);
        notifyDataChanged();
        onImported?.(res);
        // 导入成功后关闭弹窗，回到词库管理面板
        onClose();
      },
      (err: unknown) => {
        setSaving(false);
        setMsg({ text: err instanceof Error ? err.message : String(err), error: true });
      },
    );
  }, [validation, saving, entries, onClose, onImported, T]);

  if (!open) return null;

  const checkedCount = entries.filter((e) => e.checked).length;
  const allChecked = entries.length > 0 && checkedCount === entries.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T("pl.importEdit.title")}
      className={PL_DIALOG_OVERLAY}
    >
      <style>{PL_DIALOG_CSS}</style>
      <div
        className={PL_DIALOG}
        style={{
          width: 1020,
          maxWidth: "90%",
          height: "min(720px, calc(100vh - 60px))",
          gap: 12,
        }}
      >
        {/* 标题 + 关闭按钮（弹窗仅通过按钮手动关闭） */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <strong style={{ fontSize: 15, fontWeight: 560, flex: 1, minWidth: 0 }}>
            {T("pl.importEdit.title")}
          </strong>
          <button
            type="button"
            onClick={onClose}
            aria-label={T("pl.close")}
            data-tip={T("pl.close")}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              border: "none",
              outline: "none",
              borderRadius: 6,
              background: "transparent",
              color: TONE.muted,
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
              transition:
                "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
              e.currentTarget.style.color = TONE.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = TONE.muted;
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: 12, color: TONE.quiet, lineHeight: 1.6, flexShrink: 0 }}>
          {T("pl.importEdit.subtitle")}
        </div>

        {/* 工具栏：全选 / 取消全选 + 勾选计数 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: TONE.muted,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input type="checkbox" checked={allChecked} onChange={toggleAll} disabled={entries.length === 0} />
            {allChecked ? T("pl.importEdit.deselectAll") : T("pl.exportSelectAll")}
          </label>
          <span style={{ fontSize: 11, color: TONE.quiet }}>
            {T("pl.skillModal.selectHint")} · {checkedCount}/{entries.length}
          </span>
        </div>

        {/* 条目卡片列表：可滚动 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            /* 内容与滚动条之间预留 10px 间距（与官方一致） */
            paddingRight: 10,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {entries.length === 0 ? (
            <div
              style={{
                padding: "22px 0",
                textAlign: "center",
                fontSize: 12,
                color: TONE.quiet,
                border: `1px dashed ${TONE.border}`,
                borderRadius: 8,
              }}
            >
              {T("pl.importEdit.noEntry")}
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "10px 12px",
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 8,
                  opacity: entry.checked ? 1 : 0.55,
                  transition: "opacity .18s",
                }}
              >
                {/* 首行：折叠 + 勾选 + 标题 + 来源徽标 + 移除 */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(entry.key)}
                    data-tip={collapsed[entry.key] ? T("pl.skillModal.expand") : T("pl.skillModal.collapse")}
                    aria-expanded={!collapsed[entry.key]}
                    style={{
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      border: "none",
                      outline: "none",
                      borderRadius: 6,
                      background: "transparent",
                      color: TONE.muted,
                      cursor: "pointer",
                      transition: "background-color .18s, color .18s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                      e.currentTarget.style.color = TONE.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = TONE.muted;
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      style={{
                        flexShrink: 0,
                        transform: collapsed[entry.key] ? "rotate(-90deg)" : "rotate(0deg)",
                        transition: "transform .2s ease",
                      }}
                    >
                      <path
                        d="M4 6l4 4 4-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <input
                    type="checkbox"
                    checked={entry.checked}
                    onChange={() => toggleChecked(entry.key)}
                    data-tip={T("pl.skillModal.selectHint")}
                    style={{ flexShrink: 0, accentColor: TONE.accent }}
                  />
                  <input
                    type="text"
                    value={entry.title}
                    onChange={(e) => updateEntry(entry.key, { title: e.target.value })}
                    placeholder={T("pl.skillModal.titleLabel")}
                    disabled={!entry.checked}
                    style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                  />
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 10,
                      lineHeight: 1,
                      color: TONE.accent,
                      border: `1px solid var(--dsw-alias-brand-primary, #8ec5ff)`,
                      borderRadius: 4,
                      padding: "2px 5px",
                    }}
                  >
                    {entry.source === "json"
                      ? "JSON"
                      : entry.source === "csv"
                        ? "CSV"
                        : entry.source === "md"
                          ? "Markdown"
                          : T("pl.importEdit.fromTxt")}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.key)}
                    data-tip={T("pl.skillModal.remove")}
                    style={{
                      flexShrink: 0,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: TONE.quiet,
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: MONO,
                      padding: "2px 4px",
                      borderRadius: 4,
                      transition: "color .18s, background-color .18s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = TONE.red;
                      e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = TONE.quiet;
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {T("pl.skillModal.remove")}
                  </button>
                </div>
                {/* 可折叠区域：grid 行动画实现平滑折叠/展开 */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: collapsed[entry.key] ? "0fr" : "1fr",
                    transition: "grid-template-rows .22s ease",
                    marginTop: collapsed[entry.key] ? 0 : 7,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                      minHeight: 0,
                      overflow: "hidden",
                    }}
                  >
                    {/* 标签（下拉选择既有标签 / 无标签） */}
                    <select
                      value={entry.tags}
                      onChange={(e) => updateEntry(entry.key, { tags: e.target.value })}
                      disabled={!entry.checked}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="">{T("pl.importEdit.tagsLabel")}</option>
                      {tagOptions.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                    {/* 正文 + 插入变量 */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <textarea
                        ref={(el) => {
                          bodyRefs.current[entry.key] = el;
                        }}
                        value={entry.body}
                        onChange={(e) => updateEntry(entry.key, { body: e.target.value })}
                        placeholder={T("pl.skillModal.bodyLabel")}
                        disabled={!entry.checked}
                        spellCheck={false}
                        style={{
                          ...inputStyle,
                          flex: 1,
                          minHeight: 200,
                          resize: "vertical",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={plBtn("ghost", "sm")}
                        onClick={() => insertVar(entry.key)}
                        disabled={!entry.checked}
                        data-tip={T("pl.insertVariableTitle")}
                        style={{ flexShrink: 0 }}
                      >
                        {T("pl.skillModal.insertVar")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 操作反馈 */}
        {msg && (
          <div
            style={{
              flexShrink: 0,
              fontSize: 12,
              lineHeight: 1.5,
              color: msg.error ? TONE.red : TONE.text,
            }}
          >
            {msg.text}
          </div>
        )}
        {/* 校验结果：错误清单 + 一键修复 */}
        {validation && (
          <div
            role="alert"
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "7px 10px",
              borderRadius: 7,
              fontSize: 12,
              lineHeight: 1.5,
              color: validation.ok ? TONE.success : TONE.red,
              background: validation.ok
                ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)"
                : "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 8%, transparent)",
              border: `1px solid ${
                validation.ok
                  ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)"
                  : "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 40%, transparent)"
              }`,
            }}
          >
            {validation.ok ? (
              <div>{T("pl.importEdit.validatePass")}</div>
            ) : (
              <>
                <div>{T("pl.skillModal.issueCount", { count: validation.issues.length })}</div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  {validation.issues.map((issue, idx) => (
                    <li key={idx}>
                      「{issue.entryTitle}」{issue.message}
                    </li>
                  ))}
                </ul>
                {validation.fixable && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className={plBtn("primary", "sm")}
                      onClick={handleFix}
                      data-tip={T("pl.skillModal.fixAll")}
                    >
                      {T("pl.skillModal.fixAll")}
                    </Button>
                    <span style={{ color: TONE.muted }}>
                      {T("pl.skillModal.fixHint", {
                        fixable: validation.issues.filter((i) => i.fixable).length,
                      })}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {/* 修复结果清单 */}
        {fixLog.length > 0 && (
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "7px 10px",
              borderRadius: 7,
              fontSize: 12,
              lineHeight: 1.5,
              color: TONE.success,
              background:
                "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)",
            }}
          >
            <div>{T("pl.skillModal.fixDone", { count: fixLog.length })}</div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {fixLog.map((f, idx) => (
                <li key={idx}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 底部操作：校验 + 导入（仅校验通过后可用） */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={handleValidate}
          >
            {T("pl.skillModal.validate")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={plBtn("primary", "sm")}
            onClick={handleSave}
            disabled={!validation?.ok || saving || checkedCount === 0}
            data-tip={validation?.ok ? "" : T("pl.skillModal.selectHint")}
          >
            {saving ? T("pl.importEdit.importing") : T("pl.importEdit.import")}
          </Button>
        </div>
      </div>
    </div>
  );
}
