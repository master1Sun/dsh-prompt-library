// 聊天内容选中文字后的「添加提示词」独立入口。
// 不依赖右侧面板：开启开关后，在聊天区高亮选中文本会浮出「+ 添加提示词」按钮，
// 点击弹出独立居中弹窗，选中文本预填到正文，保存即入库。
import { useEffect, useCallback, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import type { Prompt } from "../../types.js";
import { clampTitle } from "../../types.js";
import { createPrompt as apiCreate, listPrompts as apiList, listTags as apiListTags, usePrompt as apiUse } from "../utils/api.js";
import { markRecent } from "../utils/recent-created.js";
import { notifyDataChanged, useDataChanged } from "../utils/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../utils/button-style.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../utils/dialog-style.js";
import { TagInput } from "./TagInput.js";
import {
  applyVariables,
  extractVariables,
  hasVariables,
  insertVariableAt,
  TemplateFillModal,
} from "./TemplateVariables.js";
import { type PLTranslate, usePLT } from "../utils/i18n.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

/** 通过临时 textarea + execCommand 复制（兼容非安全上下文/无剪贴板权限的环境）。 */
function execCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** 复制文本到剪贴板：优先异步 Clipboard API，失败自动回退到 execCommand。 */
function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => Promise.resolve(execCopy(text)));
  }
  return Promise.resolve(execCopy(text));
}

const TONE = {
  text: "var(--dsw-alias-label-primary, #1f2937)",
  muted: "var(--dsw-alias-label-secondary, #6b7280)",
  panel: "var(--dsw-alias-bg-layer-1, #ffffff)",
  border: "var(--dsw-alias-border-l2, rgba(17, 24, 39, 0.12))",
  red: "var(--dsw-alias-state-error-primary, #dc2626)",
} as const;

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: TONE.text,
  background: "var(--dsw-alias-bg-layer-2, #ffffff)",
  border: `1px solid ${TONE.border}`,
  borderRadius: 7,
  fontFamily: MONO,
  fontSize: 13,
  outline: "none",
};

/** 模板标签分类筛选项（chip）：选中时用品牌色强调。 */
function tplTagChipStyle(active: boolean): CSSProperties {
  return {
    padding: "3px 9px",
    borderRadius: 11,
    border: `1px solid ${active ? "var(--dsw-alias-brand-primary, #4f9df5)" : TONE.border}`,
    background: active
      ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #4f9df5) 16%, transparent)"
      : "var(--dsw-alias-bg-layer-2, #ffffff)",
    color: active ? "var(--dsw-alias-brand-primary, #4f9df5)" : TONE.muted,
    fontSize: 11,
    lineHeight: 1,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 0.15s, color 0.15s, border-color 0.15s",
  };
}

/** 浮层工具栏按钮：贴合宿主主题（实色背景、轻投影、14px 圆角）。 */
const floatingBtnStyle: CSSProperties = {
  height: 30,
  padding: "0 12px",
  border: 0,
  borderRadius: 14,
  boxShadow: "0 1px 3px rgba(17, 24, 39, 0.14)",
  color: TONE.text,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
  gap: 6,
  transition: "background 0.15s",
};

interface Props {
  t?: PLTranslate;
  /** 是否启用该功能（由设置面板开关控制）。 */
  enabled: boolean;
  /** 聊天框输入动作：套模板结果插入到输入框。 */
  inputActions?: { setDraft: (text: string) => void };
  /** 当前输入框草稿：非空时套模板结果追加在草稿之后。 */
  draft?: string;
}

/** 选中文本 → 模板变量预填：优先命中语义为「内容/正文」的变量，否则预填第一个变量。 */
function prefillWithSelection(variables: string[], text: string): Record<string, string> {
  if (variables.length === 0) return {};
  const contentRe = /内容|正文|原文|材料|素材|content|text|body|article|material|input/i;
  const hit = variables.find((v) => contentRe.test(v));
  return { [hit ?? variables[0]!]: text };
}

/** 仅在启用时挂载选区监听与浮层。 */
export function SelectionAddPrompt(props: Props): ReactNode {
  const T = usePLT(props?.t);
  const enabled = props.enabled;
  const inputActions = props.inputActions;
  const draft = props.draft ?? "";

  // 当前选区：{ 文本, 选区矩形 }，用于浮出按钮定位
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  // 独立弹窗是否打开
  const [open, setOpen] = useState(false);
  // 复制反馈：最近一次复制后短暂显示「已复制」
  const [copied, setCopied] = useState(false);
  // 复制反馈期间锁定浮层：点击复制会清空选区，需保留浮层以展示「已复制」
  const copyingRef = useRef(false);
  // 是否正在拖选/键盘选字：选择动作进行中不弹出浮层按钮，松开鼠标/按键后再弹出
  const selectingRef = useRef(false);
  // 浮层按钮容器引用：用于区分「点按浮层按钮」与「普通选择动作」，避免点按钮被误判为拖选
  const floatingRef = useRef<HTMLDivElement>(null);
  // 弹窗表单
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  // 正文输入框引用：供「插入变量 {{}}」定位光标
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // 已有标签候选（下拉提示用）
  const [allTags, setAllTags] = useState<string[]>([]);
  // 套模板：词库列表 / 模板选择弹窗 / 被选中文本 / 变量预填 / 待套用的模板
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [tplPickerOpen, setTplPickerOpen] = useState(false);
  const [tplText, setTplText] = useState("");
  const [tplPrefill, setTplPrefill] = useState<Record<string, string>>({});
  const [tplPick, setTplPick] = useState<Prompt | null>(null);
  // 模板选择弹窗内的搜索词
  const [tplQuery, setTplQuery] = useState("");
  // 模板选择弹窗内的标签分类过滤（空 = 全部）
  const [tplTag, setTplTag] = useState("");

  // 加载已有标签作为下拉候选；功能启用时拉取一次，并在词库/标签数据变化时刷新
  //（保证「设置里新增的标签」能立即出现在候选里）。
  const loadTags = useCallback(() => {
    if (!enabled) return;
    apiListTags()
      .then((list) => setAllTags(list.map((t) => t.name).sort()))
      .catch(() => {});
  }, [enabled]);
  useDataChanged(loadTags);
  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // 加载词库列表：供「套模板」选择含 {{变量}} 的提示词（模板）。
  const loadPrompts = useCallback(() => {
    if (!enabled) return;
    apiList()
      .then(setPrompts)
      .catch(() => {});
  }, [enabled]);
  useDataChanged(loadPrompts);
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // 套模板：打开模板选择弹窗（暂存选中文本，关闭浮层避免干扰）
  const openTplPicker = (text: string) => {
    setSelection(null);
    setTplText(text);
    setTplQuery("");
    setTplTag("");
    setTplPickerOpen(true);
  };

  // 套模板：选中模板后关闭选择弹窗，以选中文本预填变量并弹出填充窗口
  const pickTemplate = (p: Prompt) => {
    setTplPickerOpen(false);
    setTplPrefill(prefillWithSelection(extractVariables(p.body), tplText));
    setTplPick(p);
  };

  // 套模板：确认填充后把生成结果插入到聊天输入框（有草稿则追加）
  const applyTpl = useCallback(
    (values: Record<string, string>) => {
      if (!tplPick) return;
      const filled = applyVariables(tplPick.body, values);
      apiUse(tplPick.id).catch(() => {});
      inputActions?.setDraft(draft && draft.trim() ? `${draft}\n\n${filled}` : filled);
      setTplPick(null);
      setTplPrefill({});
    },
    [tplPick, draft, inputActions],
  );

  // 模板标签分类：从含 {{变量}} 的提示词中聚合标签（去重、按中文排序），供分类筛选。
  const templateTags = useMemo(
    () =>
      Array.from(
        new Set(
          prompts.filter((p) => hasVariables(p.body)).flatMap((p) => p.tags ?? []),
        ),
      ).sort((a, b) => a.localeCompare(b, "zh")),
    [prompts],
  );

  // 模板选择弹窗候选：仅含 {{变量}} 的提示词，支持先按标签分类（tplTag）过滤，
  // 再按标题/正文/标签实时搜索
  const templates = prompts.filter(
    (p) =>
      hasVariables(p.body) &&
      (!tplTag || p.tags?.includes(tplTag)) &&
      (!tplQuery.trim() ||
        `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`
          .toLowerCase()
          .includes(tplQuery.trim().toLowerCase())),
  );

  // 监听聊天区选区：仅在功能开启时生效。
  // 拖选/键盘选字过程中（鼠标按住或按住 Shift/方向键等）不弹出浮层按钮，
  // 待选择动作结束（松开鼠标/松开按键）后再计算选区并弹出按钮。
  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      if (open) {
        setSelection(null);
        return;
      }
      // 复制反馈期间不清理浮层，保留「已复制」展示
      if (copyingRef.current) return;
      // 正在拖选/选字中：先隐藏，待选择结束后由 mouseup/keyup 触发重新计算
      if (selectingRef.current) {
        setSelection(null);
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelection(null);
        return;
      }
      const text = sel.toString();
      if (!text.trim() || text.length > 2000) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      // 仅在聊天内容区选中时生效：
      // 1. 选区须位于对话滚动区（[data-conversation-scroll]）内；
      // 2. 排除输入框（[data-composer-seat]）与本插件自身面板（[data-prompt-library-root]）的选中。
      const container = range.commonAncestorContainer as Node;
      const rootEl: HTMLElement | null =
        container.nodeType === Node.ELEMENT_NODE
          ? (container as HTMLElement)
          : container.parentElement;
      if (
        !rootEl ||
        !rootEl.closest("[data-conversation-scroll]") ||
        rootEl.closest("[data-composer-seat]") ||
        rootEl.closest("[data-prompt-library-root]")
      ) {
        setSelection(null);
        return;
      }
      setSelection({ text, rect: range.getBoundingClientRect() });
    };
    // 选择动作开始：按下鼠标（非浮层按钮）进入「正在选择」状态
    const onMouseDown = (e: MouseEvent) => {
      if (floatingRef.current?.contains(e.target as Node)) return;
      selectingRef.current = true;
    };
    // 选择动作结束：松开鼠标后计算最终选区并弹出按钮
    const onMouseUp = (e: MouseEvent) => {
      if (floatingRef.current?.contains(e.target as Node)) return;
      selectingRef.current = false;
      update();
    };
    // 键盘选字（Shift/方向键/Home/End/PageUp/PageDown）：按住期间同样不弹出
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Shift" ||
        e.key.startsWith("Arrow") ||
        e.key === "Home" ||
        e.key === "End" ||
        e.key === "PageUp" ||
        e.key === "PageDown"
      ) {
        selectingRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === "Shift" ||
        e.key.startsWith("Arrow") ||
        e.key === "Home" ||
        e.key === "End" ||
        e.key === "PageUp" ||
        e.key === "PageDown"
      ) {
        selectingRef.current = false;
        update();
      }
    };
    document.addEventListener("selectionchange", update);
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("scroll", update, true);
    // 选区消失或点按他处后自动清理
    const timer = window.setInterval(() => {
      if (copyingRef.current) return;
      if (selectingRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) setSelection(null);
    }, 300);
    return () => {
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(timer);
    };
  }, [enabled, open]);

  const openModal = (text: string) => {
    setSelection(null);
    setCopied(false);
    setTitle("");
    setBody(text);
    setTags("");
    setError(null);
    setOpen(true);
  };

  // 复制选中文字到剪贴板，短暂显示「已复制」
  const copySelected = (text: string) => {
    // 复制反馈期间锁定浮层，避免点击后选区被清空、看不到「已复制」
    copyingRef.current = true;
    copyText(text).then((ok) => {
      if (!ok) {
        copyingRef.current = false;
        return;
      }
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        copyingRef.current = false;
      }, 1500);
    });
  };

  const closeModal = () => {
    setOpen(false);
    setTitle("");
    setBody("");
    setTags("");
    setError(null);
  };

  const save = () => {
    const tTitle = title.trim();
    const tBody = body;
    if (!tTitle || !tBody) {
      setError(T("pl.requireTitleBody"));
      return;
    }
    const tTags = tags.split("#").map((x) => x.trim()).filter(Boolean);
    setSaving(true);
    apiCreate({ title: tTitle, body: tBody, tags: tTags }).then(
      (p) => {
        markRecent(p.id);
        notifyDataChanged();
        setSaving(false);
        closeModal();
      },
      (e: unknown) => {
        setSaving(false);
        setError(e instanceof Error ? e.message : String(e));
      },
    );
  };

  return (
    <>
      {/* 按钮悬停/按压反馈：与宿主主题 token 一致，无阴影 */}
      <style>{`
.pl-selection-btn{background:var(--dsw-alias-bg-layer-2, #ffffff)}
.pl-selection-btn:hover{background:var(--dsw-alias-bg-layer-3, #eef1f5)}
.pl-selection-btn:active{background:var(--dsw-alias-bg-layer-3, #e0e4ea)}
.pl-selection-btn:disabled{opacity:.6;cursor:default}
`}</style>
      {/* 高亮选中 → 浮层工具栏：优先居选区上方居中；上方空间不足时翻转到选区下方。含「复制」与「添加提示词」 */}
      {enabled && selection && (
        <div
          ref={floatingRef}
          style={{
            position: "fixed",
            // 水平固定对准选区水平中心，远离两侧视口边缘（左右各留 140px）
            left: Math.min(
              Math.max(selection.rect.left + selection.rect.width / 2, 140),
              window.innerWidth - 140,
            ),
            // 顶部余量不足以容纳浮层时翻转到选区下方，避免被裁出屏幕
            top: selection.rect.top - 8 < 46 ? selection.rect.bottom + 8 : selection.rect.top - 8,
            transform:
              selection.rect.top - 8 < 46 ? "translate(-50%, 0)" : "translate(-50%, -100%)",
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <button
            type="button"
            className="pl-selection-btn"
            onClick={() => copySelected(selection.text)}
            data-tip={T("pl.copySelected")}
            style={floatingBtnStyle}
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 15V6a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
            {copied ? T("pl.copiedSelected") : T("pl.copySelected")}
          </button>
          <button
            type="button"
            className="pl-selection-btn"
            onClick={() => openModal(selection.text)}
            data-tip={T("pl.addToLibrary")}
            style={floatingBtnStyle}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {T("pl.addToLibrary")}
          </button>
          {/* 选中文本直接套模板：选择含 {{变量}} 的模板，选中文本自动预填变量后插入输入框 */}
          <button
            type="button"
            className="pl-selection-btn"
            onClick={() => openTplPicker(selection.text)}
            data-tip={T("pl.applyTemplateTitle")}
            style={floatingBtnStyle}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h9v4H4V6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M4 14h9v4H4v-4ZM17 6h3M17 12h3M17 18h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {T("pl.applyTemplate")}
          </button>
        </div>
      )}

      {/* 独立添加弹窗：固定居中，遮罩背景 */}
      {enabled && open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={T("pl.addToLibrary")}
          className={PL_DIALOG_OVERLAY}
        >
          <style>{PL_DIALOG_CSS}</style>
          <div
            onClick={(e) => e.stopPropagation()}
            className={PL_DIALOG}
            style={{
              width: 520,
              maxWidth: "calc(100vw - 40px)",
              maxHeight: "min(600px, calc(100vh - 40px))",
              gap: 9,
            }}
          >
            <strong style={{ fontSize: 15, fontWeight: 520, paddingBottom: 6, flexShrink: 0 }}>{T("pl.addToLibrary")}</strong>
            {/* 表单内容区：超出最大高度时独立滚动，按钮区固定在弹窗底部 */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 10, display: "flex", flexDirection: "column", gap: 9 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted, flexShrink: 0 }}>
                {T("pl.titleField")}
                <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted, flexShrink: 0 }}>
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
                      insertVariableAt(bodyRef.current, body, setBody, T("pl.insertVariableDefault"));
                    }}
                    data-tip={T("pl.insertVariableTitle")}
                  >
                    {`{{${T("pl.insertVariableDefault")}}}`}
                  </Button>
                </span>
                <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={8} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted, flexShrink: 0 }}>
                {T("pl.tagsField")}
                <TagInput value={tags} onChange={setTags} suggestions={allTags} inputStyle={inputStyle} t={props?.t} />
              </label>
              {error && <div style={{ color: TONE.red, fontSize: 12, flexShrink: 0 }}>{error}</div>}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4, flexShrink: 0 }}>
              <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={closeModal} disabled={saving}>
                {T("pl.cancel")}
              </Button>
              <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={save} disabled={saving}>
                {saving ? T("pl.saving") : T("pl.save")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 套模板：模板选择弹窗（仅列出含 {{变量}} 的提示词，点击后弹出变量填充窗口） */}
      {enabled && tplPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={T("pl.applyTemplate")}
          className={PL_DIALOG_OVERLAY}
        >
          <style>{PL_DIALOG_CSS}</style>
          <div
            onClick={(e) => e.stopPropagation()}
            className={PL_DIALOG}
            style={{
              width: 480,
              maxWidth: "calc(100vw - 40px)",
              // 固定宽高（480 × 560）：仅当页面窗口小于固定尺寸时才自适应收缩，
              // 内容多时列表在内部滚动，不随内容撑高
              height: "min(560px, calc(100vh - 40px))",
              gap: 10,
            }}
          >
            <strong style={{ fontSize: 15, fontWeight: 520, paddingBottom: 2, flexShrink: 0 }}>{T("pl.applyTemplate")}</strong>
            <div style={{ fontSize: 12, color: TONE.muted, lineHeight: 1.6, flexShrink: 0 }}>
              {T("pl.applyTemplateDesc", { length: tplText.length })}
            </div>
            {/* 选中内容预览：顶部展示将套用的选中文本（超出时内部滚动） */}
            <div
              style={{
                boxSizing: "border-box",
                maxHeight: 84,
                overflow: "auto",
                padding: "8px 10px",
                fontSize: 12,
                lineHeight: 1.6,
                color: TONE.muted,
                background: "var(--dsw-alias-bg-layer-2, #ffffff)",
                border: `1px solid ${TONE.border}`,
                borderRadius: 7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                flexShrink: 0,
              }}
            >
              {tplText || " "}
            </div>
            <input
              autoFocus
              value={tplQuery}
              onChange={(e) => setTplQuery(e.target.value)}
              placeholder={T("pl.search")}
              style={inputStyle}
            />
            {/* 标签分类：搜索框下方按 tag 过滤（点击切换，选中高亮；与搜索词叠加生效） */}
            {templateTags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flexShrink: 0 }}>
                <button type="button" onClick={() => setTplTag("")} style={tplTagChipStyle(tplTag === "")}>
                  {T("pl.tagFilterAll")}
                </button>
                {templateTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTplTag(tplTag === tag ? "" : tag)}
                    style={tplTagChipStyle(tplTag === tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
            {/* 模板列表：超出最大高度时独立滚动 */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {templates.length === 0 && (
                <div style={{ padding: "18px 12px", color: TONE.muted, fontSize: 13, textAlign: "center" }}>
                  {T("pl.applyTemplateEmpty")}
                </div>
              )}
              {templates.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickTemplate(p)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    alignItems: "flex-start",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${TONE.border}`,
                    background: "var(--dsw-alias-bg-layer-2, #ffffff)",
                    color: TONE.text,
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(17,24,39,0.06))"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--dsw-alias-bg-layer-2, #ffffff)"; }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                    {clampTitle(p.title)}
                  </span>
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {extractVariables(p.body).slice(0, 4).map((v) => (
                      <span
                        key={v}
                        style={{
                          fontSize: 10,
                          lineHeight: 1,
                          padding: "3px 6px",
                          borderRadius: 6,
                          color: TONE.muted,
                          border: `1px solid ${TONE.border}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4, flexShrink: 0 }}>
              <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => setTplPickerOpen(false)}>
                {T("pl.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 套模板：变量填充弹窗（选中文本已自动预填到首个/「内容」变量，其余可改或补填） */}
      <TemplateFillModal
        open={tplPick !== null}
        variables={tplPick ? extractVariables(tplPick.body) : []}
        body={tplPick ? tplPick.body : ""}
        initialValues={tplPrefill}
        onCancel={() => {
          // 取消变量填充时回到套模板选择页（保留搜索词/标签分类状态）
          setTplPick(null);
          setTplPrefill({});
          setTplPickerOpen(true);
        }}
        onConfirm={applyTpl}
        confirmLabel={T("pl.insert")}
        draftEmpty={!draft.trim()}
        t={T}
      />
    </>
  );
}