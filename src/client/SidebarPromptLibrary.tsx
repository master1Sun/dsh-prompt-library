/**
 * 提示词库侧边栏面板。
 *
 * 以浮动面板形式展示在右侧（position: fixed），使用本地状态控制展开/折叠，
 * 默认折叠时在右侧边缘显示展开标签。
 *
 * 特性：
 * - 默认显示搜索框，搜索所有提示词
 * - 展开时自动聚焦搜索框
 * - 支持分组折叠（状态持久化到 localStorage）
 * - 使用次数排序，最常用的在前面
 * - 刷新按钮位于头部（带刷新图标与刷新状态）
 * - 新建/自动学习的提示词高亮显示「新增」标记
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
  polishPrompt,
  learnPolished,
} from "./api.js";
import { isRecent, markRecent } from "./recent-created.js";
import { useHoverDetail } from "./HoverDetail.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { notifyDataChanged, useDataChanged } from "./data-sync.js";
import { PL_BUTTON_CSS, plBtn } from "./button-style.js";

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
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 20%, transparent)",
  mint: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff8592)",
} as const;

type Editor = { title: string; body: string; tags: string } & (
  | { mode: "none" }
  | { mode: "create" }
  | { mode: "edit"; id: string }
);

const NO_EDITOR: Editor = { mode: "none", title: "", body: "", tags: "" };

/** 分组折叠状态在 localStorage 中的存储键。 */
const COLLAPSED_GROUPS_KEY = "pl:collapsed-groups";

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
  // 复制反馈：最近复制的提示词 id（用于按钮显示「已复制」）
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // AI 润色状态：idle | loading（某条润色中） | done（展示可编辑的润色结果）
  const [polish, setPolish] = useState<
    | { status: "idle" }
    | { status: "loading"; id: string }
    | { status: "done"; id: string }
  >({ status: "idle" });
  // AI 润色结果（可编辑）
  const [polishResult, setPolishResult] = useState("");
  // 当前润色结果是否已获用户确认并纳入画像学习
  const [polishLearned, setPolishLearned] = useState(false);
  // 轻量成功提示（toast），短暂显示后自动消失
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  // 每个分组的折叠状态（持久化到 localStorage，刷新后保持）
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_GROUPS_KEY);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      // 读取失败时使用默认（全部展开）
    }
    return new Set();
  });

  const toggleGroup = useCallback((tag: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      // 同步保存到 localStorage
      try {
        localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // 忽略存储失败
      }
      return next;
    });
  }, []);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const refreshController = useRef<AbortController | null>(null);
  // 提示词行悬停详情（由设置控制，默认关闭）
  const hover = useHoverDetail();
  const hoverEnabled = settings.hoverDetailEnabled;

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

  // 订阅数据变化：聊天面板新增/修改/删除时同步刷新本面板
  useDataChanged(refresh);

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

  // 把文本插入当前草稿；无草稿上下文时回退为复制到剪贴板
  const insertText = useCallback(
    (text: string) => {
      if (inputActions) {
        inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${text}` : text);
      } else {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    },
    [inputActions, draft],
  );

  const insert = useCallback(
    (prompt: Prompt) => {
      apiUse(prompt.id).catch(() => {});
      insertText(prompt.body);
    },
    [insertText],
  );

  // 复制提示词正文到剪贴板，短暂显示「已复制」
  const copy = useCallback((p: Prompt) => {
    navigator.clipboard
      .writeText(p.body)
      .then(() => {
        setCopiedId(p.id);
        setTimeout(() => setCopiedId((cur) => (cur === p.id ? null : cur)), 1500);
      })
      .catch(() => {});
  }, []);

  // 调用 AI 润色提示词正文，成功后进入润色结果视图。
  // 勾选「AI 智能完善」时，润色结果自动纳入 AI 自学习，无需用户确认；
  // 未勾选时，仅展示结果，由用户点击「确认学习」后再纳入画像。
  const startPolish = useCallback((p: Prompt) => {
    setPolish({ status: "loading", id: p.id });
    polishPrompt(p.body).then(
      (res) => {
        setPolishResult(res.polished);
        setPolishLearned(false);
        setPolish({ status: "done", id: p.id });
        if (settings.aiEnrichEnabled) {
          learnPolished(res.polished).then(
            () => {
              setPolishLearned(true);
              showToast("学习成功，已自动纳入用户画像");
            },
            (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
          );
        }
      },
      (e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setPolish({ status: "idle" });
      },
    );
  }, [settings.aiEnrichEnabled, showToast]);

  // 关闭润色结果视图
  const closePolish = useCallback(() => {
    setPolish({ status: "idle" });
    setError(null);
  }, []);

  // 把润色结果保存回词库（更新正文，保留原标题）
  const savePolish = useCallback(() => {
    if (polish.status !== "done") return;
    const id = polish.id;
    const original = prompts.find((x) => x.id === id);
    apiUpdate(id, {
      body: polishResult,
      sourceBody: original && original.body !== polishResult ? original.body : undefined,
      aiRefined: true,
    }).then(() => {
      closePolish();
      notifyDataChanged();
    }, (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [polish, polishResult, prompts, closePolish]);

  // 用户确认许可：把润色结果并入用户画像学习
  const confirmLearn = useCallback(() => {
    if (polish.status !== "done" || polishLearned) return;
    learnPolished(polishResult).then(
      () => {
        setPolishLearned(true);
        showToast("学习成功，已写入用户画像");
      },
      (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    );
  }, [polish, polishResult, polishLearned, showToast]);

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
      notifyDataChanged();
    };
    if (editor.mode === "create") {
      apiCreate({ title, body, tags }).then((p) => {
        markRecent(p.id);
        done();
      }, (e: unknown) =>
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
    apiDelete(p.id).then(notifyDataChanged, (e: unknown) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  };

  const panelWidth = settings.panelWidth;

  return (
    <>
      <style>{`@keyframes pl-refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.pl-collapse-expand-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.pl-collapse-expand-btn:active{background:var(--dsw-alias-interactive-bg-active)}`}</style>
      <style>{PL_BUTTON_CSS}</style>
      {/* 折叠状态：右侧展开按钮 — 仅箭头图标，紧凑圆形 */}
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="展开提示词库"
          aria-label="展开提示词库"
          className="pl-collapse-expand-btn"
          style={{
            position: "fixed",
            right: 6,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2147483646,
            width: 32,
            height: 32,
            padding: 0,
            border: 0,
            borderRadius: "50%",
            background: "transparent",
            color: TONE.text,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
            border: `1px solid ${TONE.borderStrong}`,
            borderRight: 0,
            borderRadius: "12px 0 0 12px",
            boxShadow: "rgba(3, 8, 18, 0.1) 0px 1px 4px",
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
              width: 15,
              height: 80,
              padding: 0,
              border: 0,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <svg width="15" height="80" viewBox="0 0 20 80" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={plBtn("ghost", "sm")}
                onClick={refresh}
                disabled={phase === "loading"}
                title={phase === "loading" ? "刷新中…" : "刷新提示词列表"}
                icon={
                  <svg
                    width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ animation: phase === "loading" ? "pl-refresh-spin 0.9s linear infinite" : "none" }}
                  >
                    <path d="M23 4v6h-6M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                }
              >
                {phase === "loading" ? "刷新中…" : "刷新"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={plBtn("ghost", "sm")}
                onClick={startCreate}
                disabled={editing}
              >
                + 新建
              </Button>
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

            {polish.status === "done" ? (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 13 }}>AI 润色结果</strong>
                  <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={closePolish}>关闭</Button>
                </div>
                <div style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.5 }}>
                  {settings.aiEnrichEnabled
                    ? "仅润色内容。已开启「AI 智能完善」，本次润色将自动纳入 AI 自学习，越用越贴合你的风格。"
                    : "仅润色内容。点击「确认学习」后，本次润色将纳入 AI 自学习，让润色越用越贴合你的风格。"}
                </div>
                <textarea
                  value={polishResult}
                  onChange={(e) => setPolishResult(e.target.value)}
                  rows={8}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 220 }}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => { navigator.clipboard.writeText(polishResult).catch(() => {}); }}>
                    复制
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => insertText(polishResult)}>
                    插入
                  </Button>
                  <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={savePolish}>
                    保存到词库
                  </Button>
                  {settings.aiEnrichEnabled ? (
                    <span
                      style={{
                        ...smallGhostStyle,
                        color: polishLearned ? TONE.quiet : TONE.accent,
                        borderStyle: "dashed",
                        opacity: polishLearned ? 0.7 : 1,
                      }}
                    >
                      {polishLearned ? "已自动纳入自学习" : "自动学习中…"}
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={plBtn("ghost", "sm")}
                      onClick={confirmLearn}
                      disabled={polishLearned}
                    >
                      {polishLearned ? "已学习" : "确认学习"}
                    </Button>
                  )}
                </div>
              </div>
            ) : editing ? (
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
                    style={{ ...inputStyle, resize: "vertical", minHeight: 250 }}
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
                  <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => { setEditor(NO_EDITOR); setError(null); }}>
                    取消
                  </Button>
                  <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={saveEditor}>
                    保存
                  </Button>
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
                      onClick={() => { hover.hide(); toggleGroup(tag); }}
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
                        onClick={hoverEnabled ? hover.hide : undefined}
                        style={{
                          padding: "10px 16px",
                          borderBottom: `1px solid ${TONE.border}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          ...(isRecent(p.id)
                            ? { background: "rgba(142, 197, 255, 0.10)", borderLeft: `3px solid ${TONE.accent}` }
                            : {}),
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                          <strong style={{
                            fontSize: 13,
                            fontWeight: 460,
                            ...(isRecent(p.id) ? { color: TONE.accent } : {}),
                          }}>{p.title}</strong>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            {isRecent(p.id) && (
                              <span
                                title="新增"
                                style={{ width: 8, height: 8, borderRadius: "50%", background: TONE.mint, display: "inline-block", flexShrink: 0 }}
                              />
                            )}
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
                        <pre
                          onMouseEnter={hoverEnabled ? (e) => { e.currentTarget.style.background = "rgba(142, 197, 255, 0.08)"; hover.show(p, e.clientX, e.clientY); } : undefined}
                          onMouseMove={hoverEnabled ? (e) => hover.show(p, e.clientX, e.clientY) : undefined}
                          onMouseLeave={hoverEnabled ? (e) => { e.currentTarget.style.background = "transparent"; hover.leave(); } : undefined}
                          onClick={hoverEnabled ? hover.hide : undefined}
                          style={{
                            margin: 0,
                            color: TONE.quiet,
                            fontSize: 11,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontFamily: MONO,
                            maxHeight: 84,
                            overflow: "hidden",
                            borderRadius: 6,
                            cursor: hoverEnabled ? "pointer" : "default",
                            transition: "background 0.15s ease",
                          }}
                        >
                          {p.body}
                        </pre>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={() => insert(p)}>插入</Button>
                          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => copy(p)}>
                            {copiedId === p.id ? "已复制" : "复制"}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => startEdit(p)}>编辑</Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={plBtn("ghost", "sm")}
                            onClick={() => startPolish(p)}
                            disabled={polish.status === "loading"}
                          >
                            {polish.status === "loading" && polish.id === p.id ? "润色中…" : "AI 润色"}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => remove(p)}>删除</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              </div>
            )}
          </div>
          {hoverEnabled && hover.overlay}
        </section>
      )}
      {/* 成功提示浮层 */}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 24,
            transform: "translateX(-50%)",
            zIndex: 2147483647,
            padding: "9px 16px",
            background: "rgba(46, 160, 67, 0.94)",
            color: "#ffffff",
            borderRadius: 8,
            fontSize: 12,
            fontFamily: MONO,
            boxShadow: "0 4px 18px rgba(3, 8, 18, 0.45)",
            pointerEvents: "none",
          }}
        >
          {toast}
        </div>
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

const smallGhostStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 9px",
  color: "var(--dsw-alias-label-secondary, #9daabd)",
  background: "transparent",
  border: "1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderRadius: 7,
  cursor: "default",
  fontFamily: MONO,
  fontSize: 11,
};
