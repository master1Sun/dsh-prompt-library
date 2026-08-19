/**
 * 提示词库 composer 按钮控件。
 *
 * 注册到 `conversation.input.left` 插槽：composer 工具栏中的一个小按钮。
 * 点击弹出面板，管理可复用的提示词片段。
 * 与右侧侧边栏独立显示，互不影响。
 * 点击提示词通过 `inputActions.setDraft` 将其正文插入当前草稿。
 */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { PluginSettings, Prompt } from "../types.js";
import { DEFAULT_SETTINGS } from "../types.js";
import {
  createPrompt as apiCreate,
  deletePrompt as apiDelete,
  getSettings as apiGetSettings,
  learnPrompt as apiLearn,
  listPrompts as apiList,
  updatePrompt as apiUpdate,
  usePrompt as apiUse,
} from "./api.js";
import { SidebarPromptLibrary } from "./SidebarPromptLibrary.js";


/**
 * `conversation.input.left` 的最小属性合约。
 */
interface ButtonProps {
  useInput: <T>(selector: (s: { draft: string }) => T) => T;
  inputActions: {
    setDraft: (text: string) => void;
  };
}

const MONO =
  '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "黑体", sans-serif';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  mint: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff8592)",
} as const;

// ── 自动学习 ────────────────────────────────────────────────────────────────

const AUTO_LEARN_DEBOUNCE_MS = 3000;
const AUTO_LEARN_TOAST_MS = 2500;

/**
 * 判断文本是否适合自动学习。
 * 使用设置中的最小长度和启发式规则。
 */
function isLearnWorthy(text: string, minLength: number): boolean {
  const t = text.trim();
  if (t.length < minLength) return false;
  const sentenceEnds = (t.match(/[.!?]\s/g) ?? []).length;
  const newlines = (t.match(/\n/g) ?? []).length;
  if (sentenceEnds < 1 && newlines < 1) return false;
  const hasPlaceholders = /\{[\w]+\}/.test(t) || /\[[\w]+\]/.test(t);
  return hasPlaceholders || newlines >= 1 || sentenceEnds >= 2;
}

function useAutoLearn(
  draft: string,
  existingPrompts: Prompt[],
  settings: PluginSettings,
  onLearned: () => void,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!settings.autoLearnEnabled) return;
    const text = draft.trim();
    if (!text) return;
    if (!isLearnWorthy(text, settings.autoLearnMinLength)) return;

    const normalized = text.toLowerCase();
    if (existingPrompts.some((p) => p.body.trim().toLowerCase() === normalized)) return;
    if (submittedRef.current.has(normalized)) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      submittedRef.current.add(normalized);
      try {
        await apiLearn(text, settings.autoLearnTag);
        onLearned();
      } catch {
        // 静默失败
      }
    }, AUTO_LEARN_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draft, existingPrompts, settings.autoLearnEnabled, settings.autoLearnMinLength, settings.autoLearnTag, onLearned]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}

// ── ~ 键触发 ────────────────────────────────────────────────────────────────

let lastPromptsForSelect: Prompt[] = [];

function useTildaTrigger(
  settings: PluginSettings,
  prompts: Prompt[],
  inputActions: { setDraft: (text: string) => void },
  draft: string,
): void {
  const activeRef = useRef(false);
  const draftRef = useRef(draft);
  const inputActionsRef = useRef(inputActions);
  draftRef.current = draft;
  inputActionsRef.current = inputActions;
  lastPromptsForSelect = prompts;

  useEffect(() => {
    if (!settings.tildaTriggerEnabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (activeRef.current) {
        if (e.key === "Escape") {
          activeRef.current = false;
          removeOverlay();
          return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          highlightNext(e.key === "ArrowDown" ? 1 : -1);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const selected = getSelectedPrompt();
          if (selected) {
            applyPrompt(selected, inputActionsRef.current, draftRef.current);
          }
          activeRef.current = false;
          removeOverlay();
          return;
        }
      }
    };

    const onInput = (e: Event) => {
      if (!settings.tildaTriggerEnabled) return;
      const target = e.target as HTMLTextAreaElement | HTMLInputElement | null;
      if (!target) return;
      const value = target.value;
      const selStart = target.selectionStart ?? 0;

      if (selStart > 0 && value[selStart - 1] === "~" && !activeRef.current) {
        const prevChar = selStart > 1 ? value[selStart - 2] : " ";
        if (prevChar === " " || prevChar === "\n" || selStart === 1) {
          activeRef.current = true;
          showOverlay(target, lastPromptsForSelect, inputActionsRef.current, draftRef.current);
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("input", onInput);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("input", onInput);
      removeOverlay();
    };
  }, [settings.tildaTriggerEnabled]);
}

let highlightIndex = 0;

function removeOverlay(): void {
  const overlay = document.querySelector<HTMLDivElement>("[data-prompt-library-overlay]");
  if (overlay) overlay.remove();
  highlightIndex = 0;
}

function showOverlay(
  target: HTMLElement,
  prompts: Prompt[],
  inputActions: { setDraft: (text: string) => void },
  draft: string,
): void {
  removeOverlay();
  if (prompts.length === 0) return;

  const rect = target.getBoundingClientRect();
  const overlay = document.createElement("div");
  overlay.dataset.promptLibraryOverlay = "";
  overlay.style.cssText = [
    "position: fixed",
    `top: ${rect.bottom + 4}px`,
    `left: ${rect.left}px`,
    "z-index: 2147483647",
    "min-width: 280px",
    "max-width: 400px",
    "max-height: 300px",
    "overflow-y: auto",
    `background: ${TONE.panel}`,
    `border: 1px solid ${TONE.borderStrong}`,
    "border-radius: 8px",
    "box-shadow: 0 8px 24px rgba(3, 8, 18, 0.38)",
    `font-family: ${MONO}`,
    "font-size: 12px",
    "padding: 4px",
  ].join(";");

  highlightIndex = 0;
  prompts.forEach((p, i) => {
    const item = document.createElement("div");
    item.dataset.index = String(i);
    item.style.cssText = [
      "padding: 6px 10px",
      "cursor: pointer",
      "border-radius: 4px",
      `color: ${TONE.text}`,
      i === 0 ? `background: ${TONE.accent}30` : "",
    ].join(";");
    item.textContent = `${p.title} — ${p.body.slice(0, 60)}${p.body.length > 60 ? "…" : ""}`;
    item.onclick = () => {
      applyPrompt(p, inputActions, draft);
      removeOverlay();
    };
    overlay.appendChild(item);
  });
  document.body.appendChild(overlay);
}

function highlightNext(dir: number): void {
  const overlay = document.querySelector<HTMLDivElement>("[data-prompt-library-overlay]");
  if (!overlay) return;
  const items = overlay.children;
  if (items.length === 0) return;
  const current = items[highlightIndex] as HTMLElement;
  if (current) current.style.background = "transparent";
  highlightIndex = (highlightIndex + dir + items.length) % items.length;
  const next = items[highlightIndex] as HTMLElement;
  if (next) {
    next.style.background = `${TONE.accent}30`;
    next.scrollIntoView({ block: "nearest" });
  }
}

function getSelectedPrompt(): Prompt | null {
  const overlay = document.querySelector<HTMLDivElement>("[data-prompt-library-overlay]");
  if (!overlay) return null;
  const items = overlay.children;
  if (items.length === 0 || highlightIndex >= items.length) return null;
  const item = items[highlightIndex] as HTMLElement;
  const index = Number(item.dataset.index);
  return lastPromptsForSelect[index] ?? null;
}

function applyPrompt(prompt: Prompt, inputActions: { setDraft: (text: string) => void }, draft: string): void {
  const idx = draft.lastIndexOf("~");
  if (idx >= 0) {
    inputActions.setDraft(`${draft.slice(0, idx)}${prompt.body}${draft.slice(idx + 1)}`);
  } else {
    inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${prompt.body}` : prompt.body);
  }
}

// ── 设置钩子 ─────────────────────────────────────────────────────────────

function useSettings(): [PluginSettings, boolean] {
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  const load = useCallback(() => {
    apiGetSettings().then((s) => {
      setSettings(s);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  // 监听设置变更事件，实现保存后立即生效
  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as PluginSettings | undefined;
      if (detail) setSettings(detail);
      else load();
    };
    window.addEventListener("pl:settings-changed", onChanged);
    return () => window.removeEventListener("pl:settings-changed", onChanged);
  }, [load]);

  return [settings, ready];
}

// ── 主组件 ───────────────────────────────────────────────────────────────

export function PromptLibraryButton(props: ButtonProps): ReactNode {
  const { inputActions, useInput } = props;
  const draft = useInput((s) => s.draft);

  const [open, setOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{ mode: "none" | "create" | "edit"; id?: string; title: string; body: string; tags: string }>({
    mode: "none", title: "", body: "", tags: ""
  });
  const [toast, setToast] = useState<{ visible: boolean }>({ visible: false });

  const [settings, settingsReady] = useSettings();
  const panelId = useId();
  const refreshController = useRef<AbortController | null>(null);

  const showToast = useCallback(() => {
    setToast({ visible: true });
    setTimeout(() => setToast({ visible: false }), AUTO_LEARN_TOAST_MS);
  }, []);

  const refresh = useCallback(() => {
    refreshController.current?.abort();
    const ctrl = new AbortController();
    refreshController.current = ctrl;
    setPhase("loading");
    setError(null);
    apiList()
      .then((list) => {
        if (ctrl.signal.aborted) return;
        setPrompts(list);
        setPhase("ready");
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      });
  }, []);

  // 自动学习
  useAutoLearn(draft, prompts, settings, useCallback(() => {
    refresh();
    showToast();
  }, [refresh, showToast]));

  // ~ 键触发
  useTildaTrigger(settings, prompts, inputActions, draft);

  useEffect(() => {
    if (open && phase === "idle") refresh();
  }, [open, phase, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editor.mode !== "none") {
          setEditor({ mode: "none", title: "", body: "", tags: "" });
        } else {
          setOpen(false);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, editor.mode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prompts;
    return prompts.filter((p) => {
      const hay = `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [prompts, query]);

  const insert = useCallback(
    async (prompt: Prompt) => {
      // 记录使用次数
      apiUse(prompt.id).catch(() => {});
      const body = prompt.body;
      inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${body}` : body);
      setOpen(false);
    },
    [draft, inputActions],
  );

  const editing = editor.mode !== "none";

  const NO_EDITOR = { mode: "none" as const, title: "", body: "", tags: "" };

  const startCreate = () => setEditor({ mode: "create", title: "", body: "", tags: "" });

  const startEdit = (p: Prompt) => setEditor({
    mode: "edit", id: p.id,
    title: p.title, body: p.body,
    tags: (p.tags ?? []).join(", "),
  });

  const saveEditor = () => {
    const title = editor.title.trim();
    const body = editor.body;
    if (!title || !body) {
      setError("标题和正文为必填项");
      return;
    }
    const tags = editor.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const done = () => {
      setEditor(NO_EDITOR);
      refresh();
    };
    if (editor.mode === "create") {
      apiCreate({ title, body, tags }).then(done, (e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
    } else if (editor.mode === "edit" && editor.id) {
      apiUpdate(editor.id, { title, body, tags }).then(done, (e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
    }
  };

  const remove = (p: Prompt) => {
    if (!confirm(`删除 "${p.title}"？`)) return;
    apiDelete(p.id).then(refresh, (e: unknown) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  };

  // 按钮点击：始终弹出面板，与侧边栏独立显示
  const handleButtonClick = () => {
    setOpen((v) => !v);
  };

  const containerStyle: CSSProperties = {
    display: "inline-flex",
    position: "relative",
    fontFamily: MONO,
  };

  const panelStyle: CSSProperties = {
    position: "absolute",
    right: 0,
    bottom: "calc(100% + 10px)",
    zIndex: 1000,
    width: settings.panelWidth,
    maxWidth: "calc(100vw - 24px)",
    maxHeight: `${settings.panelHeight}px`,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    color: TONE.text,
    background: TONE.panel,
    border: `1px solid ${TONE.borderStrong}`,
    borderRadius: 12,
    boxShadow: "0 18px 48px rgba(3, 8, 18, 0.38)",
    fontFamily: MONO,
  };

  return (
    <span data-prompt-library style={containerStyle}>
      <button
        type="button"
        onClick={handleButtonClick}
        title="提示词库"
        aria-label="提示词库"
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px 5px 8px",
          color: "var(--dsw-alias-label-primary, #f2f6fc)",
          background: "var(--dsw-alias-bg-layer-2, #101722)",
          border: 0,
          borderRadius: 8,
          cursor: "pointer",
          fontFamily: MONO,
          fontSize: 13,
          fontWeight: 430,
          whiteSpace: "nowrap",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--dsw-alias-bg-layer-3, #1d2735)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--dsw-alias-bg-layer-2, #101722)"; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z"
            stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
          />
          <path d="M8 9h3M8 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span>提示词库</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{
          marginLeft: 2,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
        }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* toast */}
      {toast.visible && (
        <span
          role="status" aria-live="polite"
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            right: 0,
            padding: "4px 10px",
            color: TONE.panel,
            background: TONE.mint,
            borderRadius: 6,
            fontSize: 11,
            fontFamily: MONO,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            opacity: 0.92,
            zIndex: 1001,
          }}
        >
          &#10003; 已自动学习
        </span>
      )}

      {open && (
        <>
          <div
            onClick={() => { setEditor(NO_EDITOR); setOpen(false); }}
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
          />
          <section id={panelId} role="dialog" aria-label="提示词库" style={panelStyle}>
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "14px 16px 10px",
                borderBottom: `1px solid ${TONE.border}`,
                flexShrink: 0,
              }}
            >
              <strong style={{ fontSize: 14, fontWeight: 470 }}>提示词库</strong>
              <button
                type="button"
                onClick={startCreate}
                disabled={editing}
                style={{
                  color: TONE.accent,
                  background: "transparent",
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 6,
                  padding: "3px 8px",
                  fontSize: 12,
                  cursor: editing ? "not-allowed" : "pointer",
                  opacity: editing ? 0.5 : 1,
                  fontFamily: MONO,
                }}
              >
                + 新建
              </button>
            </header>

            {!editing && (
              <div style={{ padding: "10px 16px", flexShrink: 0 }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索…"
                  style={{
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
                  }}
                />
              </div>
            )}

            <div style={{ flex: 1, overflow: "auto" }}>
              {phase === "loading" && (
                <div style={{ padding: "20px 16px", color: TONE.muted, fontSize: 13, textAlign: "center" }}>
                  加载中…
                </div>
              )}
              {phase === "error" && (
                <div style={{ padding: "12px 16px", color: TONE.red, fontSize: 13 }}>{error}</div>
              )}

              {editing ? (
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                    标题
                    <input
                      value={editor.title}
                      onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                    正文
                    <textarea
                      value={editor.body}
                      onChange={(e) => setEditor({ ...editor, body: e.target.value })}
                      rows={6}
                      style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                    标签（逗号分隔）
                    <input
                      value={editor.tags}
                      onChange={(e) => setEditor({ ...editor, tags: e.target.value })}
                      style={inputStyle}
                    />
                  </label>
                  {error && <div style={{ color: TONE.red, fontSize: 12 }}>{error}</div>}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => { setEditor(NO_EDITOR); setError(null); }} style={ghostBtnStyle}>
                      取消
                    </button>
                    <button type="button" onClick={saveEditor} style={primaryBtnStyle}>
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {phase === "ready" && filtered.length === 0 && (
                    <li style={{ padding: "16px", color: TONE.muted, fontSize: 13, textAlign: "center" }}>
                      暂无提示词
                    </li>
                  )}
                  {filtered.map((p) => (
                    <li
                      key={p.id}
                      style={{
                        padding: "10px 16px",
                        borderBottom: `1px solid ${TONE.border}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                        <strong style={{ fontSize: 13, fontWeight: 460 }}>{p.title}</strong>
                        {p.tags && p.tags.length > 0 && (
                          <span style={{ color: TONE.quiet, fontSize: 11 }}>
                            {p.tags.map((t) => `#${t}`).join(" ")}
                          </span>
                        )}
                      </div>
                      <pre style={{
                        margin: 0,
                        color: TONE.muted,
                        fontSize: 12,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: MONO,
                        maxHeight: 54,
                        overflow: "hidden",
                      }}>
                        {p.body}
                      </pre>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => insert(p)} style={smallPrimaryStyle}>插入</button>
                        <button type="button" onClick={() => startEdit(p)} style={smallGhostStyle}>编辑</button>
                        <button type="button" onClick={() => remove(p)} style={smallGhostStyle}>删除</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                padding: "10px 16px",
                borderTop: `1px solid ${TONE.border}`,
                flexShrink: 0,
              }}
            >
              <button type="button" onClick={refresh} style={ghostBtnStyle}>刷新</button>
            </footer>
          </section>
        </>
      )}
      <SidebarPromptLibrary inputActions={inputActions} draft={draft} />
    </span>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: "var(--dsw-alias-label-primary, #f2f6fc)",
  background: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderRadius: 7,
  fontFamily: MONO,
  fontSize: 13,
  outline: "none",
};

const primaryBtnStyle: CSSProperties = {
  padding: "6px 12px",
  color: "var(--dsw-alias-bg-layer-2, #101722)",
  background: "var(--dsw-alias-brand-primary, #8ec5ff)",
  border: 0,
  borderRadius: 7,
  cursor: "pointer",
  fontFamily: MONO,
  fontSize: 12,
  fontWeight: 470,
};

const ghostBtnStyle: CSSProperties = {
  padding: "6px 12px",
  color: "var(--dsw-alias-label-secondary, #9daabd)",
  background: "transparent",
  border: "1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderRadius: 7,
  cursor: "pointer",
  fontFamily: MONO,
  fontSize: 12,
};

const smallPrimaryStyle: React.CSSProperties = { ...primaryBtnStyle, padding: "3px 9px", fontSize: 11 };
const smallGhostStyle: React.CSSProperties = { ...ghostBtnStyle, padding: "3px 9px", fontSize: 11 };