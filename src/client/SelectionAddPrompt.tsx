// 聊天内容选中文字后的「添加提示词」独立入口。
// 不依赖右侧面板：开启开关后，在聊天区高亮选中文本会浮出「+ 添加提示词」按钮，
// 点击弹出独立居中弹窗，选中文本预填到正文，保存即入库。
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPrompt as apiCreate } from "./api.js";
import { markRecent } from "./recent-created.js";
import { notifyDataChanged } from "./data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "./button-style.js";
import { type PLTranslate, usePLT } from "./i18n.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

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
  // 弹窗表单
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 监听聊天区选区：仅在功能开启时生效
  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      if (open) {
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
      // 排除本插件左侧/右侧面板自身的选中，避免误触发
      const container = range.commonAncestorContainer as Node;
      if (container && container.nodeType === Node.ELEMENT_NODE) {
        const el = container as HTMLElement;
        if (el.closest("section[aria-label], [data-prompt-library-root]")) {
          setSelection(null);
          return;
        }
      }
      setSelection({ text, rect: range.getBoundingClientRect() });
    };
    document.addEventListener("selectionchange", update);
    document.addEventListener("mouseup", update);
    document.addEventListener("keyup", update);
    window.addEventListener("scroll", update, true);
    // 选区消失或点按他处后自动清理
    const timer = window.setInterval(() => {
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
    setTitle("");
    setBody(text);
    setTags("");
    setError(null);
    setOpen(true);
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
    const tTags = tags.split(",").map((x) => x.trim()).filter(Boolean);
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
      {/* 高亮选中 → 添加提示词浮层按钮：定位在选区上方居中 */}
      {enabled && selection && (
        <button
          type="button"
          onClick={() => openModal(selection.text)}
          title={T("pl.addToLibrary")}
          style={{
            position: "fixed",
            left: selection.rect.left + selection.rect.width / 2,
            top: selection.rect.top - 8,
            transform: "translate(-50%, -100%)",
            zIndex: 2147483647,
            height: 30,
            padding: "0 12px",
            border: 0,
            borderRadius: 14,
            background: "var(--dsw-alias-interactive-bg-hover, rgba(17,24,39,0.06))",
            color: TONE.text,
            fontSize: 12,
            cursor: "pointer",
            whiteSpace: "nowrap",
            boxShadow: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "background 0.15s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {T("pl.addToLibrary")}
        </button>
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
              maxHeight: "calc(100vh - 40px)",
              overflow: "auto",
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
            <strong style={{ fontSize: 15, fontWeight: 520, paddingBottom: 6 }}>{T("pl.addToLibrary")}</strong>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
              {T("pl.titleField")}
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
              {T("pl.bodyField")}
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} style={{ ...inputStyle, resize: "vertical" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
              {T("pl.tagsField")}
              <input value={tags} onChange={(e) => setTags(e.target.value)} style={inputStyle} />
            </label>
            {error && <div style={{ color: TONE.red, fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
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