/**
 * 提示词库侧边栏面板。
 *
 * 注册到 `workspace.right.sidebar` 插槽，在右侧以浮动面板形式展示。
 * 使用本地状态控制展开/折叠，默认折叠显示展开按钮。
 *
 * 特性：
 * - 默认显示搜索框，搜索所有提示词
 * - 展开时自动聚焦搜索框
 * - 最高 z-index 避免被其他插件覆盖
 * - 支持折叠/展开
 * - 使用次数排序，最常用的在前面
 */
import {
  useCallback,
  useEffect,
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
  listPrompts as apiList,
  updatePrompt as apiUpdate,
  usePrompt as apiUse,
} from "./api.js";

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
  red: "var(--dsw-alias-state-error-primary, #ff8592)",
} as const;

type Editor =
  | { mode: "none" }
  | { mode: "create" }
  | { mode: "edit"; id: string }
  & { title: string; body: string; tags: string };

const NO_EDITOR: Editor = { mode: "none", title: "", body: "", tags: "" };

function useSettings(): PluginSettings {
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);

  const load = useCallback(() => {
    apiGetSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // 监听设置变更事件，立即生效
  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as PluginSettings | undefined;
      if (detail) setSettings(detail);
      else load();
    };
    window.addEventListener("pl:settings-changed", onChanged);
    return () => window.removeEventListener("pl:settings-changed", onChanged);
  }, [load]);

  return settings;
}

export function SidebarPromptLibrary(props?: {
  inputActions?: { setDraft: (text: string) => void };
  draft?: string;
}): ReactNode {
  const { inputActions, draft } = props ?? {};
  const settings = useSettings();
  // 默认折叠，显示展开按钮
  const [collapsed, setCollapsed] = useState(true);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(NO_EDITOR);
  // 每个分组的折叠状态
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((tag: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const refreshController = useRef<AbortController | null>(null);

  // ★ 所有 hooks 必须放在条件返回之前 ★

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

  // 展开时加载数据并聚焦搜索框
  useEffect(() => {
    if (collapsed) return;
    if (phase === "idle") refresh();
    // 自动聚焦搜索框
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [collapsed, phase, refresh]);

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
      apiUse(prompt.id).catch(() => {});
      if (inputActions) {
        const body = prompt.body;
        inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${body}` : body);
      } else {
        navigator.clipboard.writeText(prompt.body).catch(() => {});
      }
    },
    [inputActions, draft],
  );

  // 按 tag 分组（无 tag 归为"未分类"，多 tag 的提示词出现在每个 tag 分组中）
  const tagGrouped = useMemo(() => {
    const groups = new Map<string, Prompt[]>();
    for (const p of filtered) {
      if (p.tags && p.tags.length > 0) {
        for (const tag of p.tags) {
          if (!groups.has(tag)) groups.set(tag, []);
          groups.get(tag)!.push(p);
        }
      } else {
        if (!groups.has("未分类")) groups.set("未分类", []);
        groups.get("未分类")!.push(p);
      }
    }
    // 按标签名排序，"未分类"排最后
    const sorted = Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === "未分类") return 1;
      if (b === "未分类") return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [filtered]);

  // 当设置中启用侧边栏时显示，禁用时隐藏
  if (!settings.rightPanelEnabled) return null;

  const editing = editor.mode !== "none";

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
    const tags = editor.tags.split(",").map((t) => t.trim()).filter(Boolean);
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

  const panelWidth = settings.panelWidth;

  return (
    <>
      {/* 折叠状态：右侧展开标签 — 带缺口的标签样式 */}
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="展开提示词库"
          aria-label="展开提示词库"
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2147483646,
            width: 20,
            height: 80,
            padding: 0,
            border: 0,
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <svg width="20" height="80" viewBox="0 0 20 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* 标签形状：右侧贴边，上下有缺口 — 无边框 */}
            <path
              d="M0 0 L12 0 L20 12 L20 68 L12 80 L0 80 Z"
              fill={TONE.panel}
            />
            {/* 左箭头 */}
            <path
              d="M10 34 L5 40 L10 46"
              stroke={TONE.text}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>
      ) : (
        <section
          role="dialog"
          aria-label="提示词库"
          style={{
            position: "fixed",
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 2147483646,
            width: Math.min(panelWidth, window.innerWidth),
            maxHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            color: TONE.text,
            background: TONE.panel,
            borderLeft: `1px solid ${TONE.borderStrong}`,
            boxShadow: "0 0 48px rgba(3, 8, 18, 0.38)",
            fontFamily: MONO,
          }}
        >
          {/* 折叠按钮 — 位于面板左侧边缘，带缺口的标签样式 */}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="折叠提示词库"
            aria-label="折叠提示词库"
            style={{
              position: "fixed",
              right: Math.min(panelWidth, window.innerWidth),
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 2147483647,
              width: 20,
              height: 80,
              padding: 0,
              border: 0,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <svg width="20" height="80" viewBox="0 0 20 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* 标签形状：左侧贴面板，右侧有缺口 — 无边框 */}
              <path
                d="M20 0 L8 0 L0 12 L0 68 L8 80 L20 80 Z"
                fill={TONE.panel}
              />
              {/* 右箭头 */}
              <path
                d="M10 34 L15 40 L10 46"
                stroke={TONE.text}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>

          {/* 头部 */}
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
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
            </div>
          </header>

          {/* 搜索框 */}
          {!editing && (
            <div style={{ padding: "10px 16px", flexShrink: 0 }}>
              <input
                ref={searchRef}
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

          {/* 内容区 */}
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
              <div>
                {phase === "ready" && filtered.length === 0 && (
                  <div style={{ padding: "16px", color: TONE.muted, fontSize: 13, textAlign: "center" }}>
                    暂无提示词
                  </div>
                )}
                {tagGrouped.map(([tag, items]) => {
                  const isCollapsed = collapsedGroups.has(tag);
                  return (
                  <div key={tag}>
                    {/* 分组头 — 可点击折叠/展开 */}
                    <div
                      onClick={() => toggleGroup(tag)}
                      style={{
                        padding: "8px 16px 4px",
                        fontSize: 11,
                        fontWeight: 470,
                        color: TONE.quiet,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        borderBottom: `1px solid ${TONE.border}`,
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <span style={{ fontSize: 10, width: 12, textAlign: "center", flexShrink: 0 }}>
                        {isCollapsed ? "\u25B6" : "\u25BC"}
                      </span>
                      <span>{tag}</span>
                      <span style={{ fontSize: 10, opacity: 0.6 }}>({items.length})</span>
                    </div>
                    {!isCollapsed && items.map((p) => (
                      <div
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
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            {p.usageCount > 0 && (
                              <span style={{ color: TONE.quiet, fontSize: 10 }}>
                                {p.usageCount}次
                              </span>
                            )}
                            {p.tags && p.tags.length > 0 && (
                              <span style={{ color: TONE.quiet, fontSize: 11 }}>
                                {p.tags.map((t) => `#${t}`).join(" ")}
                              </span>
                            )}
                          </div>
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
                      </div>
                    ))}
                  </div>
                );
              })}
              </div>
            )}
          </div>

          {/* 底部 */}
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
      )}
    </>
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