// 聊天内容选中文字后的「添加提示词」独立入口。
// 不依赖右侧面板：开启开关后，在聊天区高亮选中文本会浮出「+ 添加提示词」按钮，
// 点击弹出独立居中弹窗，选中文本预填到正文，保存即入库。
import { useEffect, useCallback, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { createPrompt as apiCreate, listTags as apiListTags } from "../services/api.js";
import { markRecent } from "../utils/recent-created.js";
import { notifyDataChanged, useDataChanged } from "../services/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../utils/button-style.js";
import { TagInput } from "./TagInput.js";
import { insertVariableAt } from "./TemplateVariables.js";
import { type PLTranslate, usePLT } from "../i18n/i18n.js";

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

/** 浮层工具栏按钮：贴合宿主主题（无阴影、状态背景色、14px 圆角）。 */
const floatingBtnStyle: CSSProperties = {
  height: 30,
  padding: "0 12px",
  border: 0,
  borderRadius: 14,
  boxShadow: "none",
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
}

/** 仅在启用时挂载选区监听与浮层。 */
export function SelectionAddPrompt(props: Props): ReactNode {
  const T = usePLT(props?.t);
  const enabled = props.enabled;

  // 当前选区：{ 文本, 选区矩形 }，用于浮出按钮定位
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  // 独立弹窗是否打开
  const [open, setOpen] = useState(false);
  // 复制反馈：最近一次复制后短暂显示「已复制」
  const [copied, setCopied] = useState(false);
  // 复制反馈期间锁定浮层：点击复制会清空选区，需保留浮层以展示「已复制」
  const copyingRef = useRef(false);
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

  // 监听聊天区选区：仅在功能开启时生效
  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      if (open) {
        setSelection(null);
        return;
      }
      // 复制反馈期间不清理浮层，保留「已复制」展示
      if (copyingRef.current) return;
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
    document.addEventListener("selectionchange", update);
    document.addEventListener("mouseup", update);
    document.addEventListener("keyup", update);
    window.addEventListener("scroll", update, true);
    // 选区消失或点按他处后自动清理
    const timer = window.setInterval(() => {
      if (copyingRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) setSelection(null);
    }, 300);
    return () => {
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("mouseup", update);
      document.removeEventListener("keyup", update);
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
.pl-selection-btn{background:var(--dsw-alias-interactive-bg-hover, rgba(17,24,39,0.06))}
.pl-selection-btn:hover{background:var(--dsw-alias-interactive-bg-active, rgba(17,24,39,0.12))}
.pl-selection-btn:active{background:var(--dsw-alias-interactive-bg-active, rgba(17,24,39,0.18))}
.pl-selection-btn:disabled{opacity:.6;cursor:default}
`}</style>
      {/* 高亮选中 → 浮层工具栏：定位在选区上方居中，含「复制」与「添加提示词」 */}
      {enabled && selection && (
        <div
          style={{
            position: "fixed",
            left: selection.rect.left + selection.rect.width / 2,
            top: selection.rect.top - 8,
            transform: "translate(-50%, -100%)",
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
            title={T("pl.copySelected")}
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
            title={T("pl.addToLibrary")}
            style={floatingBtnStyle}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {T("pl.addToLibrary")}
          </button>
        </div>
      )}

      {/* 独立添加弹窗：固定居中，遮罩背景 */}
      {enabled && open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={T("pl.addToLibrary")}
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
              width: 520,
              maxWidth: "calc(100vw - 40px)",
              maxHeight: "min(600px, calc(100vh - 40px))",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 9,
              background: TONE.panel,
              border: `1px solid ${TONE.border}`,
              borderRadius: 12,
              boxShadow: "none",
              padding: "18px 20px",
              color: TONE.text,
              fontFamily: MONO,
            }}
          >
            <strong style={{ fontSize: 15, fontWeight: 520, paddingBottom: 6, flexShrink: 0 }}>{T("pl.addToLibrary")}</strong>
            {/* 表单内容区：超出最大高度时独立滚动，按钮区固定在弹窗底部 */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
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
                    title={T("pl.insertVariableTitle")}
                  >
                    {"{{}}"}
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
    </>
  );
}