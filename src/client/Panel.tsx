/**
 * 提示词库 composer 控件。
 *
 * 注册到 `conversation.input.left` 插槽：composer 工具栏中的一个小按钮，
 * 点击打开一个弹出面板，用于管理可复用的提示词片段。
 * 点击提示词通过会话标准的 `inputActions.setDraft` 将其正文插入当前草稿。
 *
 * Props 来自插槽运行时：InputZone 所有者共享（`session`、`input` 快照）
 * 加上会话标准工具包（`useInput`、`inputActions`）。
 * 没有声明 store seat 或自定义 inject 接口——组件是自包含的。
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
import type { Prompt } from "../types.js";
import {
  createPrompt as apiCreate,
  deletePrompt as apiDelete,
  learnPrompt as apiLearn,
  listPrompts as apiList,
  updatePrompt as apiUpdate,
} from "./api.js";

/**
 * `conversation.input.left` 的最小属性合约。框架传递
 * InputZone 所有者共享加上会话标准工具包（`useInput`、`inputActions`）；
 * 子集类型组件通过参数逆变满足注册调用点。
 */
interface PanelProps {
  /** 会话实时输入机状态的 selector 钩子。 */
  useInput: <T>(selector: (s: { draft: string }) => T) => T;
  /** 公开的输入操作接口（每个会话稳定）。 */
  inputActions: {
    setDraft: (text: string) => void;
  };
}

const MONO =
  'ui-monospace, "Cascadia Mono", "SFMono-Regular", Consolas, monospace';

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
  amber: "var(--dsw-alias-state-warn-primary, #f6c652)",
  red: "var(--dsw-alias-state-error-primary, #ff8592)",
} as const;

// ── 自动学习启发式 ───────────────────────────────────────────────────────

const AUTO_LEARN_MIN_CHARS = 60;
const AUTO_LEARN_DEBOUNCE_MS = 3000;
const AUTO_LEARN_TOAST_MS = 2500;

/**
 * 启发式：这段文本是否适合作为可复用提示词自动学习？
 *
 * 当文本足够长、有句子结构或是多行，并且包含占位符或具有明确的指令性时返回 true。
 */
function isLearnWorthy(text: string): boolean {
  const t = text.trim();
  if (t.length < AUTO_LEARN_MIN_CHARS) return false;
  // 统计句子边界和换行符
  const sentenceEnds = (t.match(/[.!?]\s/g) ?? []).length;
  const newlines = (t.match(/\n/g) ?? []).length;
  // 必须至少有一个清晰的句子边界或是多行
  if (sentenceEnds < 1 && newlines < 1) return false;
  // 强烈信号：包含 {var} 或 [var] 这样的占位符
  const hasPlaceholders = /\{[\w]+\}/.test(t) || /\[[\w]+\]/.test(t);
  // 或者是多行，或者有 2+ 个句子
  return hasPlaceholders || newlines >= 1 || sentenceEnds >= 2;
}

type Editor =
  | { mode: "none" }
  | { mode: "create" }
  | {
      mode: "edit";
      id: string;
    }
  & { title: string; body: string; tags: string };

const NO_EDITOR: Editor = { mode: "none", title: "", body: "", tags: "" };

function tagsToArray(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// ── 自动学习钩子 ─────────────────────────────────────────────────────────

/**
 * 监听 composer 草稿，自动将适合作为提示词的文本保存到库中。
 *
 * - 使用防抖，等待用户停止输入后再检查。
 * - 应用 `isLearnWorthy` 启发式判断。
 * - 对已有提示词列表去重（精确正文匹配）。
 * - 跟踪正在提交的请求，避免重复请求。
 * - 成功持久化新提示词时调用 `onLearned`。
 */
function useAutoLearn(
  draft: string,
  existingPrompts: Prompt[],
  onLearned: () => void,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const text = draft.trim();
    if (!text) return;

    // 启发式过滤
    if (!isLearnWorthy(text)) return;

    // 是否已在实时库中？
    const normalized = text.toLowerCase();
    if (existingPrompts.some((p) => p.body.trim().toLowerCase() === normalized)) {
      return;
    }

    // 本次会话中是否已提交？
    if (submittedRef.current.has(normalized)) return;

    // 防抖：等待用户停止输入
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      submittedRef.current.add(normalized);
      try {
        await apiLearn(text);
        onLearned();
      } catch {
        // 静默失败——自动学习尽最大努力
      }
    }, AUTO_LEARN_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draft, existingPrompts, onLearned]);

  // 卸载时清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}

export function PromptLibraryButton(props: PanelProps): ReactNode {
  const { inputActions, useInput } = props;

  const draft = useInput((s) => s.draft);
  const [open, setOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Editor>(NO_EDITOR);
  const [toast, setToast] = useState<{ title: string; visible: boolean }>({ title: "", visible: false });

  const panelId = useId();
  const refreshController = useRef<AbortController | null>(null);

  const showToast = useCallback((title: string) => {
    setToast({ title, visible: true });
    setTimeout(() => setToast({ title: "", visible: false }), AUTO_LEARN_TOAST_MS);
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

  // 自动学习：监听草稿中适合作为提示词的内容
  useAutoLearn(draft, prompts, useCallback(() => {
    refresh();
    showToast("已自动学习");
  }, [refresh, showToast]));

  useEffect(() => {
    if (open && phase === "idle") refresh();
  }, [open, phase, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditor(NO_EDITOR);
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prompts;
    return prompts.filter((p) => {
      const hay = `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [prompts, query]);

  const insert = useCallback(
    (prompt: Prompt) => {
      const body = prompt.body;
      const next = draft && draft.trim() ? `${draft}\n\n${body}` : body;
      inputActions.setDraft(next);
      setOpen(false);
    },
    [draft, inputActions],
  );

  const startCreate = () =>
    setEditor({ mode: "create", title: "", body: "", tags: "" });

  const startEdit = (p: Prompt) =>
    setEditor({
      mode: "edit",
      id: p.id,
      title: p.title,
      body: p.body,
      tags: (p.tags ?? []).join(", "),
    });

  const saveEditor = () => {
    const title = editor.title.trim();
    const body = editor.body;
    if (!title || !body) {
      setError("标题和正文为必填项");
      return;
    }
    const tags = tagsToArray(editor.tags);
    const done = () => {
      setEditor(NO_EDITOR);
      refresh();
    };
    if (editor.mode === "create") {
      apiCreate({ title, body, tags }).then(done, (e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
    } else if (editor.mode === "edit") {
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

  const editing = editor.mode !== "none";

  return (
    <span data-prompt-library style={{ display: "inline-flex", position: "relative", fontFamily: MONO }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="提示词库"
        aria-label="提示词库"
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          minHeight: 30,
          padding: "4px 9px",
          color: TONE.text,
          background: TONE.panel,
          border: `1px solid ${TONE.border}`,
          borderRadius: 7,
          cursor: "pointer",
          fontFamily: MONO,
          fontSize: 12,
          fontWeight: 430,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M8 9h3M8 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span style={{ whiteSpace: "nowrap" }}>提示词</span>
      </button>

      {/* 自动学习 toast */}
      {toast.visible && (
        <span
          role="status"
          aria-live="polite"
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
            onClick={() => {
              setEditor(NO_EDITOR);
              setOpen(false);
            }}
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
          />
          <section
            id={panelId}
            role="dialog"
            aria-label="提示词库"
            style={{
              position: "absolute",
              zIndex: 1000,
              right: 0,
              bottom: "calc(100% + 10px)",
              width: 380,
              maxWidth: "calc(100vw - 24px)",
              maxHeight: "calc(100vh - 120px)",
              overflowY: "auto",
              color: TONE.text,
              background: TONE.panel,
              border: `1px solid ${TONE.borderStrong}`,
              borderRadius: 12,
              boxShadow: "0 18px 48px rgba(3, 8, 18, 0.38)",
              fontFamily: MONO,
            }}
          >
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "14px 16px 10px",
                borderBottom: `1px solid ${TONE.border}`,
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
              <div style={{ padding: "10px 16px" }}>
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
                <Field label="标题">
                  <input
                    value={editor.title}
                    onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
                <Field label="正文">
                  <textarea
                    value={editor.body}
                    onChange={(e) => setEditor({ ...editor, body: e.target.value })}
                    rows={6}
                    style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}
                  />
                </Field>
                <Field label="标签（逗号分隔）">
                  <input
                    value={editor.tags}
                    onChange={(e) => setEditor({ ...editor, tags: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
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
                    <pre
                      style={{
                        margin: 0,
                        color: TONE.muted,
                        fontSize: 12,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: MONO,
                        maxHeight: 54,
                        overflow: "hidden",
                      }}
                    >
                      {p.body}
                    </pre>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={() => insert(p)} style={smallPrimaryStyle}>
                        插入
                      </button>
                      <button type="button" onClick={() => startEdit(p)} style={smallGhostStyle}>
                        编辑
                      </button>
                      <button type="button" onClick={() => remove(p)} style={smallGhostStyle}>
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <footer
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                padding: "10px 16px",
                borderTop: `1px solid ${TONE.border}`,
              }}
            >
              <button type="button" onClick={refresh} style={ghostBtnStyle}>
                刷新
              </button>
            </footer>
          </section>
        </>
      )}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
      {label}
      {children}
    </label>
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

const smallPrimaryStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  padding: "3px 9px",
  fontSize: 11,
};

const smallGhostStyle: React.CSSProperties = {
  ...ghostBtnStyle,
  padding: "3px 9px",
  fontSize: 11,
};