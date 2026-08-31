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
import { plBtn } from "../utils/button-style.js";
import { type PLTranslate, usePLT } from "../utils/i18n.js";
import { importPrompts as apiImport, listTags as apiListTags } from "../utils/api.js";
import { notifyDataChanged } from "../utils/data-sync.js";
import { insertVariableAt } from "./TemplateVariables.js";
import { DialogCloseButton } from "./DialogCloseButton.js";
import { BookIcon } from "./BookIcon.js";
import type { TransferPrompt } from "../utils/data-formats.js";

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
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 18%, transparent)",
  success: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)",
} as const;

/** 让 textarea 高度随内容自适应增长：先重置为 auto 再按 scrollHeight 撑高，超高后由 maxHeight 限制内部滚动。 */
function autoGrowTextarea(el: HTMLTextAreaElement | null): void {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/** 弹窗内单条可编辑条目。 */
interface EditableEntry {
  key: string;
  title: string;
  body: string;
  /** 逗号分隔的标签串（编辑用）。 */
  tags: string;
  /** 摘要（导入文件回读，入库时一并保存；不提供编辑入口）。 */
  summary?: string;
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
  /** 导入成功后回调（刷新数据）。 */
  onImported?: (result: { imported: number; updated: number; skipped: number }) => void;
  /** 导入成功后的汇总文案回调（由一级弹窗在左下角气泡展示，展示后关闭本弹窗）。 */
  onSaved?: (summary: string) => void;
}): ReactNode {
  const { open, onClose, t, initialEntries, onImported, onSaved } = props;
  const T = usePLT(t);
  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [fixLog, setFixLog] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind?: "success" | "info" | "error" } | null>(null);
  const bodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const seqRef = useRef(0);
  // 右栏编辑窗口当前选中的条目 key
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // 浮动反馈气泡开关与定时器（如聊天气泡，一段时间后自动消失）
  const [toastOpen, setToastOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);
  // 下拉可选标签（既有标签名列表），打开时拉取
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  // 打开时拉取既有标签，用于下拉选择；同时合并本次导入解析出的标签，
  // 保证文件里的标签即使不在既有标签库中也能在下拉中回显
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const parsedTags = Array.from(
      new Set((initialEntries ?? []).flatMap((e) => e.tags ?? [])),
    );
    apiListTags()
      .then((tags) => {
        if (alive) {
          setTagOptions(Array.from(new Set([...tags.map((x) => x.name), ...parsedTags])));
        }
      })
      .catch(() => {
        if (alive) setTagOptions(parsedTags);
      });
    return () => {
      alive = false;
    };
  }, [open, initialEntries]);

  // 打开弹窗时用所选文件的条目初始化（默认全部勾选、展开）
  useEffect(() => {
    if (!open) return;
    const seed: EditableEntry[] = (initialEntries ?? []).map((e) => ({
      // 序号保证每条 key 唯一，同名标题也可独立编辑
      key: `imp:${++seqRef.current}`,
      title: e.title,
      body: e.body,
      tags: (e.tags ?? [])[0] ?? "",
      ...(e.summary?.trim() ? { summary: e.summary.trim() } : {}),
      source: e.source ?? "txt",
      checked: true,
    }));
    setEntries(seed);
    setValidation(null);
    setFixLog([]);
    setMsg(null);
    setSelectedKey(null);
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
    setSelectedKey((cur) => (cur === key ? null : cur));
    setValidation(null);
    setFixLog([]);
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
      setMsg({ text: T("pl.skillModal.emptyChecked"), kind: "error" });
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
      setMsg({ text: T("pl.skillModal.emptyChecked"), kind: "error" });
      return;
    }
    setSaving(true);
    const payload = checked.map((e) => ({
      title: e.title.trim(),
      body: e.body,
      // 有摘要即视为已 AI 完善：入库时标记 aiRefined，使词库内的 AI 状态与导入页一致
      ...(e.summary?.trim()
        ? { summary: e.summary.trim(), aiRefined: true }
        : {}),
      // 导入的数据若未指定标签，默认打上「import」标签（标识来源为导入）；
      // 入库时 ensureTags 会自动创建该标签（标签库中不存在时）。
      tags: e.tags.trim()
        ? e.tags
            .split(/[,，;；]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : ["import"],
    }));
    apiImport(payload).then(
      (res) => {
        setSaving(false);
        notifyDataChanged();
        onImported?.(res);
        // 导入成功后由一级弹窗在左下角气泡展示汇总，并关闭本弹窗
        onSaved?.(
          T("pl.imported", {
            imported: res.imported,
            updated: res.updated,
            skipped: res.skipped,
          }),
        );
      },
      (err: unknown) => {
        setSaving(false);
        setMsg({ text: err instanceof Error ? err.message : String(err), kind: "error" });
      },
    );
  }, [validation, saving, entries, onImported, onSaved, T]);

  const checkedCount = entries.filter((e) => e.checked).length;
  const allChecked = entries.length > 0 && checkedCount === entries.length;
  // 右栏编辑窗口当前选中的条目（被删除或不存在时为 null）
  const selected = entries.find((e) => e.key === selectedKey) ?? null;
  // 是否存在需要浮动提示的反馈内容（校验结果 / 修复记录 / 操作信息）
  const hasFeedback = msg != null || validation != null || fixLog.length > 0;

  // 反馈内容变化时浮出气泡；气泡常开则启动自动消失定时
  // 依赖反馈内容本身（而非仅 hasFeedback 布尔值）：手动关闭气泡后 validation 等仍非空，
  // 布尔值不变，导致再次点击校验等操作时不重新浮出气泡；内容引用变化即可重新弹出。
  // 注意：这两个 useEffect 必须放在条件 return 之前，保证弹窗开/关切换时 hooks 数量一致，
  // 否则会触发 React #310「rendered fewer hooks than expected」崩溃。
  useEffect(() => {
    setToastOpen(hasFeedback);
  }, [hasFeedback, msg, validation, fixLog]);

  useEffect(() => {
    if (!toastOpen) return;
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOpen(false), 30000);
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [toastOpen]);

  if (!open) return null;

  /** 鼠标移入气泡：暂停自动消失；移出：重新开始计时。 */
  const pauseToast = () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  };
  const resumeToast = () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOpen(false), 30000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T("pl.importEdit.title")}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        background: TONE.panel,
        borderRadius: 24,
        padding: "18px 7px 18px 10px",
        boxSizing: "border-box",
        // 覆盖 .pl-dialog * 的 scrollbar-gutter:stable：根节点无滚动条，避免右侧预留滚动条位置出现缺口
        scrollbarGutter: "auto",
      }}
    >
        {/* 标题 + 关闭按钮（弹窗仅通过按钮手动关闭） */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <BookIcon color={TONE.accent} />
          <strong style={{ fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0, color: TONE.text }}>
            {T("pl.importEdit.title")}
          </strong>
          <DialogCloseButton onClick={onClose} label={T("pl.close")} />
        </div>
        {/* 模块说明（与人格管理 / 技能管理说明框一致） */}
        <div
          style={{
            marginTop: 10,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: TONE.quiet,
            background: TONE.accentSoft,
            border: `1px solid ${TONE.border}`,
            borderRadius: 7,
            padding: "7px 10px",
            flexShrink: 0,
          }}
        >
          {T("pl.importEdit.subtitle")}
        </div>

        {/* 左右分栏主体：左栏列表 / 右栏编辑窗口 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            marginTop: 10,
            display: "flex",
            gap: 12,
            alignItems: "stretch",
            position: "relative",
          }}
        >
          {/* 左栏：工具栏 + 紧凑条目列表 */}
          <div
            style={{
              flex: "1 1 0",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              boxSizing: "border-box",
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              padding: 10,
            }}
          >
            {/* 左栏 sticky 工具栏：全选 + 勾选计数 */}
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 12,
                paddingBottom: 8,
                borderBottom: `1px solid ${TONE.border}`,
                background: TONE.row,
                position: "sticky",
                top: -10,
                zIndex: 1,
              }}
            >
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
              <span style={{ marginLeft: "auto", fontSize: 11, color: TONE.quiet }}>
                {T("pl.skillModal.selectHint")} · {checkedCount}/{entries.length}
              </span>
            </div>
            {/* 紧凑条目列表 */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                paddingTop: 6,
                display: "flex",
                flexDirection: "column",
                gap: 5,
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
                    onClick={() => setSelectedKey((cur) => (cur === entry.key ? null : entry.key))}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 8,
                      padding: "8px 10px",
                      background:
                        selectedKey === entry.key
                          ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 16%, transparent)"
                          : TONE.row,
                      border: `1px solid ${
                        selectedKey === entry.key
                          ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 45%, transparent)"
                          : TONE.border
                      }`,
                      borderRadius: 8,
                      cursor: "pointer",
                      opacity: entry.checked ? 1 : 0.55,
                      transition:
                        "border-color .24s cubic-bezier(.22,1,.36,1), background-color .24s cubic-bezier(.22,1,.36,1), opacity .18s",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedKey !== entry.key) {
                        e.currentTarget.style.borderColor = TONE.borderStrong;
                        e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedKey !== entry.key) {
                        e.currentTarget.style.borderColor = TONE.border;
                        e.currentTarget.style.backgroundColor = TONE.row;
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={entry.checked}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleChecked(entry.key);
                      }}
                      data-tip={T("pl.skillModal.selectHint")}
                      style={{ flexShrink: 0, accentColor: TONE.accent, margin: 0 }}
                    />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 12.5,
                        color: TONE.text,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {entry.title.trim() || T("pl.importEdit.untitledPrompt")}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 10,
                        lineHeight: 1,
                        borderRadius: 4,
                        padding: "2px 5px",
                        color: entry.summary?.trim() ? TONE.success : TONE.quiet,
                        background: entry.summary?.trim()
                          ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 14%, transparent)"
                          : "transparent",
                        border: `1px solid ${
                          entry.summary?.trim()
                            ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 45%, transparent)"
                            : TONE.border
                        }`,
                      }}
                    >
                      {entry.summary?.trim() ? T("pl.aiStateDone") : T("pl.aiStatePending")}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 10,
                        lineHeight: 1,
                        color: TONE.accent,
                        border: "1px solid var(--dsw-alias-brand-primary, #8ec5ff)",
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
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEntry(entry.key);
                      }}
                      data-tip={T("pl.skillModal.remove")}
                      style={{
                        flexShrink: 0,
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        color: TONE.quiet,
                        cursor: "pointer",
                        fontSize: 13,
                        lineHeight: 1,
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
                      ×
                    </button>
                    {entry.body.trim() && (
                      <div
                        style={{
                          width: "100%",
                          flexShrink: 0,
                          marginTop: 2,
                          fontSize: 11,
                          lineHeight: 1.5,
                          color: TONE.quiet,
                          minWidth: 0,
                          wordBreak: "break-word",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {entry.body}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右栏：当前选中条目的编辑窗口 */}
          <div
            style={{
              flex: "1.1 1 0",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              boxSizing: "border-box",
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              padding: 10,
            }}
          >
            {!selected ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: TONE.quiet,
                }}
              >
                {T("pl.previewEmpty")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7, minHeight: 0, flex: 1, overflow: "hidden" }}>
                <span style={{ fontSize: 12, color: TONE.muted }}>{T("pl.skillModal.titleLabel")}</span>
                <input
                  type="text"
                  value={selected.title}
                  onChange={(e) => updateEntry(selected.key, { title: e.target.value })}
                  placeholder={T("pl.skillModal.titleLabel")}
                  disabled={!selected.checked}
                  style={{ ...inputStyle }}
                />
                <span style={{ fontSize: 12, color: TONE.muted, marginTop: 3 }}>{T("pl.skillModal.tagLabel")}</span>
                <select
                  value={selected.tags}
                  onChange={(e) => updateEntry(selected.key, { tags: e.target.value })}
                  disabled={!selected.checked}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">{T("pl.importEdit.tagsLabel")}</option>
                  {tagOptions.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: TONE.muted, marginTop: 3 }}>{T("pl.skillModal.summaryLabel")}</span>
                {/* 摘要列：只读展示（不可编辑），来源文件的 AI 摘要原样回显，用于确认是否已 AI 完善 */}
                <div
                  style={{
                    ...inputStyle,
                    minHeight: 34,
                    maxHeight: 60,
                    overflow: "auto",
                    color: selected.summary?.trim() ? TONE.muted : TONE.quiet,
                    background: "transparent",
                    cursor: "default",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {selected.summary?.trim() || T("pl.lexicon.noSummary")}
                </div>
                <span style={{ fontSize: 12, color: TONE.muted, marginTop: 3 }}>{T("pl.skillModal.bodyLabel")}</span>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minHeight: 0 }}>
                  <textarea
                    ref={(el) => {
                      bodyRefs.current[selected.key] = el;
                      autoGrowTextarea(el);
                    }}
                    value={selected.body}
                    onChange={(e) => {
                      updateEntry(selected.key, { body: e.target.value });
                      autoGrowTextarea(e.target);
                    }}
                    placeholder={T("pl.skillModal.bodyLabel")}
                    disabled={!selected.checked}
                    spellCheck={false}
                    style={{
                      ...inputStyle,
                      flex: "0 0 auto",
                      // 正文自适应高度：随内容自动增高，超高后内部滚动（下限保留合理高度）
                      minHeight: 120,
                      maxHeight: 288,
                      height: "auto",
                      overflowY: "auto",
                      resize: "none",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      alignSelf: "stretch",
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={plBtn("ghost", "sm")}
                    onClick={() => insertVar(selected.key)}
                    disabled={!selected.checked}
                    data-tip={T("pl.insertVariableTitle")}
                    style={{ flexShrink: 0 }}
                  >
                    {T("pl.skillModal.insertVar")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 操作反馈：预留固定行高，避免显示/隐藏时改变布局引起窗口抖动；按类型区分颜色 */}
        <div
          style={{
            flexShrink: 0,
            height: 18,
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            lineHeight: 1.5,
            color: msg
              ? msg.kind === "error"
                ? TONE.red
                : msg.kind === "info"
                ? TONE.accent
                : TONE.success
              : "transparent",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {msg && (
            <span
              style={{
                flexShrink: 0,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: msg.kind === "error" ? TONE.red : msg.kind === "info" ? TONE.accent : TONE.success,
              }}
            />
          )}
          {msg?.text ?? ""}
        </div>

        {/* 底部操作：校验 + 导入（仅校验通过后可用） */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            alignItems: "center",
            flexShrink: 0,
              position: "relative",
            }}
          >
            {/* 浮动反馈层：校验/修复信息（嵌于底部按钮条上方悬浮，一段时间后自动消失） */}
            {toastOpen && hasFeedback && (
              <div
                role={validation ? "alert" : undefined}
                onMouseEnter={pauseToast}
                onMouseLeave={resumeToast}
                style={{
                  position: "absolute",
                  bottom: 2,
                  left: 0,
                  maxWidth: 360,
                  maxHeight: 230,
                  overflow: "auto",
                  zIndex: 20,
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "9px 11px",
                  borderRadius: 12,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: TONE.text,
                  background: "color-mix(in srgb, var(--dsw-alias-bg-layer-1, #171f2b) 78%, transparent)",
                  WebkitBackdropFilter: "blur(12px)",
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${TONE.borderStrong}`,
                  boxShadow: "0 8px 24px rgba(0, 0, 0, .22)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 560, fontSize: 12, flex: 1, minWidth: 0 }}>
                    {T("pl.skillModal.notice")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setToastOpen(false)}
                    data-tip={T("pl.close")}
                    style={{
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: TONE.quiet,
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                      fontFamily: MONO,
                      padding: "0 2px",
                    }}
                  >
                    ×
                  </button>
                </div>

                {msg && (
                  <div style={{ color: msg.kind === "error" ? TONE.red : msg.kind === "info" ? TONE.accent : TONE.text }}>
                    {msg.text}
                  </div>
                )}

                {validation &&
                  (validation.ok ? (
                    <div style={{ color: TONE.success }}>{T("pl.importEdit.validatePass")}</div>
                  ) : (
                    <>
                      <div style={{ color: TONE.red }}>{T("pl.skillModal.issueCount", { count: validation.issues.length })}</div>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 18,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          color: TONE.red,
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
                  ))}

                {fixLog.length > 0 && (
                  <div style={{ color: TONE.success }}>
                    <div>{T("pl.skillModal.fixDone", { count: fixLog.length })}</div>
                    <ul
                      style={{
                        margin: "2px 0 0",
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
              </div>
            )}
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
            >
              {saving ? T("pl.importEdit.importing") : T("pl.importEdit.import")}
            </Button>
          </div>
    </div>
  );
}
