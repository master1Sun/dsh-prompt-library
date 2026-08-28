/**
 * 技能管理弹窗 — 词库助手右键菜单「技能管理」打开。
 *
 * 界面与「人格管理」弹窗（PersonaManagerModal）保持一致的风格：
 * - 左栏「技能管理」：新建技能 + 技能卡片列表（启用开关控制是否可用）；
 * - 右栏「项目绑定」：把启用的会话级技能持久绑定到工作区 / 项目路径（按会话工作目录解析）。
 *
 * 技能的新增 / 编辑 / 启用 / 删除在本弹窗内联完成（与人格管理一致），无需额外弹窗。
 * 数据存储（与人格管理一致）：标题、正文、标签、启用状态等元信息与正文
 * 全部存 SQLite（prompts.db 的 session_prompts 表 body 列），不再落盘 md 文件，
 * 持久绑定存 SQLite（prompts.db 的 prompt_scope_bindings 表，与人格绑定一致）。
 *
 * 交互约束（与其它弹窗一致）：
 * - 只能通过右上角关闭按钮关闭，禁止点击遮罩/外部区域关闭；
 * - 删除需二次确认。
 */
import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ScopeNode, SessionNode, SessionPrompt } from "../../types.js";
import { clampTitle, UNMATCHED_SCOPE_PATH } from "../../types.js";
import {
  createSessionPrompt as apiCreateSessionPrompt,
  deleteSessionPrompt as apiDeleteSessionPrompt,
  generateDraft,
  listSessionPromptBindings,
  listSessionPrompts,
  listSessionScopeTree,
  setSessionPromptBinding,
  clearSessionPromptBinding,
  setSessionPromptBindingForSession,
  clearSessionBinding as apiClearSessionBinding,
  updateSessionPrompt as apiUpdateSessionPrompt,
} from "../utils/api.js";
import { plBtn } from "../utils/button-style.js";
import { getTone, useThemeSync } from "../utils/theme.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../utils/dialog-style.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { DialogCloseButton } from "./DialogCloseButton.js";
import { HarnessSkillModal } from "./HarnessSkillModal.js";
import { type PLT } from "../utils/i18n.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

/** 去掉文件名中的非法字符，空结果回落为 untitled */
function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim() || "untitled";
}

/** 触发下载一个 Markdown 文本文件 */
function downloadMarkdown(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 标签长度上限：按显示宽度计数，中文/全角按 2、半角按 1，合计最多 16（等价于最多 8 个汉字）。 */
const TAG_MAX_UNITS = 16;
/** 截断标签到宽度上限（中文/全角按 2、半角按 1），避免输入时超过限制。 */
function clampTag(s: string): string {
  let n = 0;
  let out = "";
  for (const ch of s) {
    const w = /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 2 : 1;
    if (n + w > TAG_MAX_UNITS) break;
    n += w;
    out += ch;
  }
  return out;
}

interface Props {
  /** 是否显示。 */
  open: boolean;
  /** 关闭弹窗（仅由关闭按钮触发）。 */
  onClose: () => void;
  /** 翻译函数。 */
  t: PLT;
}

/** 书本图标（随文本色，与右键菜单「技能注入」同款）。 */
function BookIcon({ color, size = 14 }: { color: string; size?: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color }}>
      <path
        d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PromptInjectPanel({ open, onClose, t }: Props): ReactNode {
  useThemeSync();
  const TONE = getTone();

  // 会话级技能列表及其加载状态
  const [prompts, setPrompts] = useState<SessionPrompt[]>([]);
  const [loaded, setLoaded] = useState(false);
  // 工作区/项目树与绑定（右栏「项目绑定」用）
  const [scopes, setScopes] = useState<ScopeNode[]>([]);
  const [bindings, setBindings] = useState<Map<string, string[]>>(new Map());
  const [scopesLoaded, setScopesLoaded] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // 正在配置绑定的节点路径（null = 无）
  const [editingPath, setEditingPath] = useState<string | null>(null);
  // 正在配置绑定的会话 id（null = 无；会话用独立状态，避免与节点路径冲突）
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());
  // 绑定配置面板的搜索关键词（卡片列表筛选）
  const [bindSearch, setBindSearch] = useState("");
  // 新建流程：标题输入（新建卡片常驻显示，与人格管理一致）
  const [createName, setCreateName] = useState("");
  // 内容编辑器：当前编辑的技能 id 与草稿（标题 / 标签 / 正文）
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTag, setEditTag] = useState("");
  const [editBody, setEditBody] = useState("");
  // 删除二次确认的目标 id
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // 详情查看的目标 id（点击正文打开详情弹窗）
  const [detailId, setDetailId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 导入导出等操作反馈（error=false 时为成功/普通提示，error=true 时红色警示）
  const [msg, setMsg] = useState<{ text: string; kind?: "success" | "info" | "error" } | null>(null);
  // 操作反馈自动消失定时器引用（提示出现后自动清除，避免残留）
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!msg) return;
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
    return () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, [msg]);
  // 勾选导出的目标 id 集合
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 导入文件选择（MD 单文件）
  const importFileRef = useRef<HTMLInputElement | null>(null);
  // Harness 技能开关弹窗是否显示
  const [harnessOpen, setHarnessOpen] = useState(false);

  // 工作区/项目树的展开/折叠状态持久化（技能管理右栏绑定树）：下次打开恢复到上次状态
  const SCOPE_EXPAND_KEY = "pl:skill-tree-expanded";
  const scopesExpandedFromStorage = (): Set<string> | null => {
    try {
      const raw = localStorage.getItem(SCOPE_EXPAND_KEY);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? new Set<string>(arr) : null;
    } catch {
      return null;
    }
  };
  const persistScopesExpanded = (s: Set<string>) => {
    try {
      localStorage.setItem(SCOPE_EXPAND_KEY, JSON.stringify([...s]));
    } catch {
      /* 忽略存储失败 */
    }
  };
  // 构建展开集合：有历史记录则沿用，否则默认全部展开（与旧行为一致）
  const buildScopesExpanded = (tree: ScopeNode[]) => {
    const stored = scopesExpandedFromStorage();
    if (stored && stored.size > 0) return stored;
    const all = new Set<string>();
    const collect = (nodes: ScopeNode[]) => {
      for (const node of nodes) {
        all.add(node.path);
        collect(node.children);
      }
    };
    collect(tree);
    return all;
  };

  // 重新拉取工作区/项目/会话树（打开及绑定变更后回写）；必须定义在提前返回之前，
  // 与下方加载 effect 一起保证所有 hooks 都在 `if (!open) return null;` 之前稳定调用。
  const refreshScopes = () =>
    listSessionScopeTree().then((tree) => {
      setScopes(tree);
      setExpanded(buildScopesExpanded(tree));
      setScopesLoaded(true);
    });

  // 挂载/打开的翻译函数引用：effect 只依赖 `open`，避免父级重渲染产生的新 `t` 引用触发重复拉取抖动
  const tRef = useRef(t);
  tRef.current = t;

  // 打开弹窗时加载技能列表
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoaded(false);
    setError(null);
    setMsg(null);
    setSelected(new Set());
    setEditingId(null);
    setDeleteId(null);
    setDetailId(null);
    setCreateName("");
    setEditingPath(null);
    setEditingSession(null);
    setDraftIds(new Set());
    setBindSearch("");
    setEditTitle("");
    setEditTag("");
    setEditBody("");
    listSessionPrompts()
      .then((list) => {
        if (!alive) return;
        setPrompts(list);
        setLoaded(true);
      })
      .catch(() => {
        if (!alive) return;
        setLoaded(true);
        setError(tRef.current("pl.inject.opFailed"));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 打开弹窗时加载工作区/项目/会话树 + 全部路径绑定（右栏「项目绑定」用）
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setScopesLoaded(false);
    Promise.all([listSessionScopeTree(), listSessionPromptBindings()])
      .then(([tree, binds]) => {
        if (!alive) return;
        setScopes(tree);
        const map = new Map<string, string[]>();
        for (const b of binds) map.set(b.path, b.promptIds);
        setBindings(map);
        setExpanded(buildScopesExpanded(tree));
        setScopesLoaded(true);
      })
      .catch(() => {
        if (!alive) return;
        setScopesLoaded(true);
        setError(tRef.current("pl.inject.opFailed"));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 关闭时卸载全部渲染（含遮罩），与其它弹窗一致：仅关闭按钮触发，关闭后不残留。
  // 注意：必须位于全部 hooks 之后，避免 open 切换时 hooks 数量变化触发 React 报错。
  if (!open) return null;

  // 刷新技能列表：剔除已被删除技能的绑定引用
  const refresh = () =>
    listSessionPrompts()
      .then((list) => {
        setPrompts(list);
        const ids = new Set(list.map((p) => p.id));
        setBindings((prev) => {
          const next = new Map<string, string[]>();
          for (const [path, promptIds] of prev) next.set(path, promptIds.filter((id) => ids.has(id)));
          return next;
        });
      })
      .catch(() => setError(t("pl.inject.opFailed")));

  // ── 左栏：技能管理 ───────────────────────────────────────────────────────

  // 新建技能：写入标题后立即进入该技能的正文编辑
  const handleCreate = async () => {
    const title = createName.trim();
    if (!title) {
      setError(t("pl.sessionPrompts.nameError"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await apiCreateSessionPrompt({ title, body: "", tags: undefined });
      await refresh();
      setEditTitle(created.title);
      setEditTag((created.tags ?? [])[0] ?? "");
      setEditBody(created.body);
      setEditingId(created.id);
      setCreateName("");
    } catch {
      setError(t("pl.inject.opFailed"));
    } finally {
      setBusy(false);
    }
  };

  // 打开内容编辑器
  const openEditor = (p: SessionPrompt) => {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditTag((p.tags ?? [])[0] ?? "");
    setEditBody(p.body);
    setError(null);
  };

  // 取消编辑：还原草稿
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditTag("");
    setEditBody("");
  };

  // 保存：标题 + 标签 + 正文
  const handleSave = async (p: SessionPrompt) => {
    const title = editTitle.trim();
    if (!title) {
      setError(t("pl.sessionPrompts.nameError"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tags = editTag.trim() ? [editTag.trim()] : undefined;
      await apiUpdateSessionPrompt(p.id, { title, body: editBody, tags });
      await refresh();
      setEditingId(null);
    } catch {
      setError(t("pl.inject.opFailed"));
    } finally {
      setBusy(false);
    }
  };

  // AI 生成：依据「技能标题 + 已输入内容」生成技能正文草稿，填入编辑区（仅生成，不落盘）
  const handleAiGenerate = async () => {
    const title = editTitle.trim();
    if (!title) {
      setError(t("pl.ai.genNeedTitle"));
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const { content } = await generateDraft("skill", title, editBody);
      setEditBody(content);
      setMsg({ text: t("pl.ai.genDone") });
    } catch {
      setError(t("pl.ai.genFailed"));
    } finally {
      setBusy(false);
    }
  };

  // 切换某技能的启用状态（立即保存；与人格「启用」开关一致）。
  // 禁用的技能仍显示在右侧绑定列表（置灰、已有绑定保留可见），但不能新绑定，也不会被注入给 AI。
  const toggleEnabled = (p: SessionPrompt) => {
    setBusy(true);
    setError(null);
    apiUpdateSessionPrompt(p.id, { enabled: !p.enabled })
      .then(() => refresh())
      .catch(() => setError(t("pl.inject.opFailed")))
      .finally(() => setBusy(false));
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setBusy(true);
    setError(null);
    apiDeleteSessionPrompt(deleteId)
      .then(() => refresh())
      .catch(() => setError(t("pl.inject.opFailed")))
      .finally(() => {
        setBusy(false);
        setDeleteId(null);
        if (editingId === deleteId) setEditingId(null);
      });
  };

  // 导出勾选的技能为 Markdown：每条导出成一个 md 文件，文件名取标题
  const handleExport = () => {
    const exportList = prompts.filter((p) => selected.has(p.id));
    if (exportList.length === 0) {
      setMsg({ text: t("pl.exportSelectEmpty"), kind: "error" });
      return;
    }
    for (const p of exportList) {
      downloadMarkdown(`${sanitizeFileName(p.title)}.md`, p.body && p.body.trim() ? p.body.trim() : "");
    }
    setMsg({ text: t("pl.inject.exportDone", { count: exportList.length }) });
  };

  // 从 Markdown 单文件导入一个技能：正文取整个文件内容，标题取文件名（去扩展名）
  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = (await file.text()).trim();
    if (!text) {
      setMsg({ text: t("pl.inject.importEmpty"), kind: "error" });
      return;
    }
    const title = file.name.replace(/\.[^/.]+$/, "").trim() || "untitled";
    setBusy(true);
    setError(null);
    try {
      await apiCreateSessionPrompt({ title, body: text, tags: undefined });
      await refresh();
      setMsg({ text: t("pl.inject.importDone", { count: 1 }) });
    } catch {
      setMsg({ text: t("pl.inject.importFailed"), kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const inputStyle: CSSProperties = {
    boxSizing: "border-box",
    width: "100%",
    background: TONE.row,
    border: `1px solid ${TONE.border}`,
    borderRadius: 7,
    padding: "6px 9px",
    fontSize: 12.5,
    color: TONE.text,
    fontFamily: MONO,
    outline: "none",
  };
  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 120,
    resize: "vertical",
    lineHeight: 1.6,
  };

  // 渲染单张技能卡片（卡片式预览编辑，与人格卡片一致）
  const renderPromptCard = (p: SessionPrompt): ReactNode => {
    const isEditing = editingId === p.id;
    return (
      <div
        key={p.id}
        style={{
          background: TONE.panel,
          border: `1px solid ${TONE.border}`,
          borderRadius: 10,
          overflow: "hidden",
          opacity: p.enabled ? 1 : 0.6,
        }}
      >
        {/* 卡片头部：图标 + 标题（或编辑输入）+ 标签 + 启用开关 + 操作 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            background: TONE.row,
            borderBottom: `1px solid ${TONE.border}`,
          }}
        >
          <input
            type="checkbox"
            title={t("pl.selectExport")}
            checked={selected.has(p.id)}
            disabled={busy}
            onChange={() =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(p.id)) next.delete(p.id);
                else next.add(p.id);
                return next;
              })
            }
            style={{ flexShrink: 0, accentColor: TONE.accent, cursor: busy ? "not-allowed" : "pointer", margin: 0 }}
          />
          <BookIcon color={p.enabled ? TONE.accent : TONE.quiet} />
          {isEditing ? (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              disabled={busy}
              style={{ ...inputStyle, flex: 1, minWidth: 60, background: TONE.panel }}
              maxLength={25}
              title={t("pl.sessionPrompts.titlePlaceholder")}
            />
          ) : (
            <strong
              style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TONE.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={p.title}
            >
              {clampTitle(p.title)}
            </strong>
          )}
          {p.tags && p.tags.length > 0 && (
            <span
              style={{
                flexShrink: 0,
                fontSize: 10.5,
                color: TONE.accent,
                background: TONE.accentSoft,
                border: `1px solid ${TONE.border}`,
                borderRadius: 999,
                padding: "1px 8px",
              }}
            >
              {p.tags[0]}
            </span>
          )}
          {/* 启用开关（胶囊式，与人格「启用」开关一致）：禁用后即使被注入/绑定也不生效 */}
          <button
            type="button"
            role="switch"
            aria-checked={p.enabled}
            title={t("pl.inject.enabled")}
            disabled={busy}
            onClick={() => toggleEnabled(p)}
            style={{
              flexShrink: 0,
              width: 34,
              height: 18,
              borderRadius: 9,
              border: `1px solid ${TONE.border}`,
              background: p.enabled ? TONE.accent : "transparent",
              position: "relative",
              cursor: busy ? "not-allowed" : "pointer",
              padding: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: p.enabled ? 17 : 2,
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: p.enabled ? TONE.panel : TONE.quiet,
                transition: "left .24s cubic-bezier(.22,1,.36,1)",
              }}
            />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={() => {
              // 未启用时点击编辑给出提示（编辑中的「取消」仍可用）
              if (!p.enabled && !isEditing) {
                setMsg({ text: t("pl.inject.disabledEditHint"), kind: "error" });
                return;
              }
              if (isEditing) cancelEdit();
              else openEditor(p);
            }}
          >
            {isEditing ? t("pl.personas.cancel") : t("pl.personas.edit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={() => {
              // 未启用时点击删除给出提示
              if (!p.enabled) {
                setMsg({ text: t("pl.inject.disabledDeleteHint"), kind: "error" });
                return;
              }
              setDeleteId(p.id);
            }}
          >
            {t("pl.personas.delete")}
          </Button>
        </div>

        {/* 卡片正文：预览 或 编辑 */}
        <div style={{ padding: 10 }}>
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11.5, color: TONE.muted }}>{t("pl.inject.tagLabel")}</div>
              <input
                value={editTag}
                onChange={(e) => setEditTag(clampTag(e.target.value))}
                disabled={busy}
                placeholder={t("pl.inject.tagPlaceholder")}
                style={inputStyle}
              />
              <div style={{ fontSize: 11.5, color: TONE.muted }}>{t("pl.inject.contentLabel")}</div>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                disabled={busy}
                placeholder={t("pl.sessionPrompts.bodyPlaceholder")}
                style={textareaStyle}
              />
              <div style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.5 }}>{t("pl.inject.contentHint")}</div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 2 }}>
                <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} disabled={busy} onClick={() => void handleAiGenerate()}>
                  {busy ? t("pl.ai.generating") : t("pl.ai.generate")}
                </Button>
                <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} disabled={busy} onClick={() => void handleSave(p)}>
                  {t("pl.personas.save")}
                </Button>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: TONE.row,
                borderRadius: 7,
                padding: "7px 9px",
                minHeight: 40,
                maxHeight: 96,
                overflow: "hidden",
                fontSize: 11.5,
                lineHeight: 1.5,
                color: TONE.quiet,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                cursor: "pointer",
              }}
              onClick={() => setDetailId(p.id)}
              title={t("pl.inject.viewDetail")}
            >
              {p.body && p.body.trim() ? p.body.trim().slice(0, 300) : t("pl.inject.previewEmpty")}
              {p.body && p.body.trim().length > 300 ? "…" : ""}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── 右栏：项目绑定 ───────────────────────────────────────────────────────

  // 折叠/展开工作区
  const toggleExpand = (wsPath: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(wsPath)) next.delete(wsPath);
      else next.add(wsPath);
      persistScopesExpanded(next);
      return next;
    });

  // 打开某节点的配置面板（草稿 = 当前绑定）
  const openConfig = (nodePath: string) => {
    setEditingPath((prev) => (prev === nodePath ? null : nodePath));
    setEditingSession(null);
    setDraftIds(new Set(bindings.get(nodePath) ?? []));
    setBindSearch("");
    setError(null);
  };

  // 打开某会话的配置面板（草稿 = 该会话当前绑定的技能）
  const openSessionConfig = (sessionId: string, boundPromptIds: string[]) => {
    setEditingSession((prev) => (prev === sessionId ? null : sessionId));
    setEditingPath(null);
    setDraftIds(new Set(boundPromptIds));
    setBindSearch("");
    setError(null);
  };

  // 保存某节点的绑定
  const saveBinding = (nodePath: string) => {
    setBusy(true);
    setError(null);
    setSessionPromptBinding(nodePath, [...draftIds])
      .then(() => {
        setBindings((prev) => new Map(prev).set(nodePath, [...draftIds]));
        setEditingPath(null);
      })
      .catch(() => setError(t("pl.inject.opFailed")))
      .finally(() => setBusy(false));
  };

  // 保存某会话的绑定
  const saveSessionBinding = (sessionId: string) => {
    setBusy(true);
    setError(null);
    setSessionPromptBindingForSession(sessionId, [...draftIds])
      .then(() => {
        // 回写树里该会话节点的绑定
        setScopes((prev) => prev.map((node) => rewriteSessionPrompts(node, sessionId, [...draftIds])));
        setEditingSession(null);
      })
      .catch(() => setError(t("pl.inject.opFailed")))
      .finally(() => setBusy(false));
  };

  // 递归回写树里某会话节点的技能绑定
  const rewriteSessionPrompts = (node: ScopeNode, sessionId: string, promptIds: string[]): ScopeNode => {
    const sessions = node.sessions?.map((s) =>
      s.id === sessionId ? { ...s, boundPromptIds: promptIds } : s,
    );
    return {
      ...node,
      sessions,
      children: node.children.map((child) => rewriteSessionPrompts(child, sessionId, promptIds)),
    };
  };

  // 清除某节点的绑定
  const clearBinding = (nodePath: string) => {
    setBusy(true);
    setError(null);
    clearSessionPromptBinding(nodePath)
      .then(() => {
        setBindings((prev) => {
          const m = new Map(prev);
          m.delete(nodePath);
          return m;
        });
        setEditingPath(null);
      })
      .catch(() => setError(t("pl.inject.opFailed")))
      .finally(() => setBusy(false));
  };

  // 清除某会话的全部绑定
  const clearSessionBinding = (sessionId: string) => {
    setBusy(true);
    setError(null);
    apiClearSessionBinding(sessionId)
      .then(() => {
        setScopes((prev) => prev.map((node) => rewriteSessionPrompts(node, sessionId, [])));
        setEditingSession(null);
      })
      .catch(() => setError(t("pl.inject.opFailed")))
      .finally(() => setBusy(false));
  };

  // 配置面板：搜索 + 卡片列表，勾选即绑定的目标。
  // 展示全部技能：启用技能可勾选/取消；禁用技能置灰（按钮与内容），仅保留已有绑定可见、不能新选。
  // target 既可以是工作区/项目路径，也可以是会话 id（由 editingSession 判定走会话绑定 API）。
  const renderConfigPanel = (target: string): ReactNode => {
    const isSession = editingSession === target;
    const kw = bindSearch.trim().toLowerCase();
    const filtered = kw
      ? prompts.filter(
          (p) =>
            p.title.toLowerCase().includes(kw) ||
            (p.tags ?? [])[0]?.toLowerCase().includes(kw) ||
            p.body.toLowerCase().includes(kw),
        )
      : prompts;
    return (
      <div
        style={{
          margin: "4px 0 8px 18px",
          background: TONE.accentSoft,
          border: `1px solid ${TONE.accent}`,
          borderRadius: 9,
          padding: 9,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <input
          value={bindSearch}
          onChange={(e) => setBindSearch(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder={t("pl.inject.bindSearchPlaceholder")}
          style={{ ...inputStyle, background: TONE.panel }}
        />
        {prompts.length === 0 ? (
          <div style={{ fontSize: 11.5, color: TONE.quiet, textAlign: "center", padding: "8px 0" }}>
            {t("pl.inject.empty")}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ fontSize: 11.5, color: TONE.quiet, textAlign: "center", padding: "8px 0" }}>
            {t("pl.inject.bindNoMatch")}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              gap: 6,
              maxHeight: 190,
              overflow: "auto",
            }}
          >
            {filtered.map((p) => {
              const checked = draftIds.has(p.id);
              const disabled = !p.enabled;
              return (
                <label
                  key={p.id}
                  onClick={(e) => e.stopPropagation()}
                  title={disabled ? t("pl.inject.disabledBindHint") : undefined}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    minWidth: 0,
                    background: TONE.panel,
                    border: `1px solid ${checked ? TONE.accent : TONE.border}`,
                    borderRadius: 8,
                    padding: "7px 8px",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.55 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy || disabled}
                      onChange={() =>
                        setDraftIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.id)) next.delete(p.id);
                          else next.add(p.id);
                          return next;
                        })
                      }
                      style={{ flexShrink: 0, accentColor: TONE.accent, cursor: busy || disabled ? "not-allowed" : "pointer" }}
                    />
                    <strong
                      style={{
                        flex: 1,
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: TONE.text,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={p.title}
                    >
                      {clampTitle(p.title)}
                    </strong>
                  </div>
                  {p.tags && p.tags.length > 0 && (
                    <span
                      style={{
                        alignSelf: "flex-start",
                        fontSize: 10,
                        color: TONE.accent,
                        background: TONE.accentSoft,
                        border: `1px solid ${TONE.accent}`,
                        borderRadius: 999,
                        padding: "0 6px",
                        lineHeight: "15px",
                      }}
                    >
                      {p.tags[0]}
                    </span>
                  )}
                  <div
                    style={{
                      fontSize: 10.5,
                      color: TONE.quiet,
                      lineHeight: 1.4,
                      minHeight: 14,
                      maxHeight: 32,
                      overflow: "hidden",
                      wordBreak: "break-word",
                    }}
                  >
                    {p.body && p.body.trim() ? p.body.trim().slice(0, 60) : ""}
                    {p.body && p.body.trim().length > 60 ? "…" : ""}
                  </div>
                </label>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
          <span style={{ flex: 1, fontSize: 10.5, color: TONE.quiet }}>
            {t("pl.inject.selectedCount", { count: draftIds.size })}
          </span>
          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} disabled={busy} onClick={() => (isSession ? setEditingSession(null) : setEditingPath(null))}>
            {t("pl.personas.cancel")}
          </Button>
          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} disabled={busy || prompts.length === 0} onClick={() => (isSession ? clearSessionBinding(target) : clearBinding(target))}>
            {t("pl.inject.clearBinding")}
          </Button>
          <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} disabled={busy} onClick={() => (isSession ? saveSessionBinding(target) : saveBinding(target))}>
            {t("pl.personas.save")}
          </Button>
        </div>
      </div>
    );
  };

  // 渲染单个会话节点（挂在工作区/项目下的会话行）
  const renderSessionNode = (session: SessionNode, depth: number): ReactNode => {
    const isEditing = editingSession === session.id;
    const boundCount = session.boundPromptIds.length;
    return (
      <div key={session.id} style={{ marginLeft: depth * 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 0",
            minHeight: 28,
          }}
        >
          <span style={{ flexShrink: 0, width: 18 }} />
          <span
            style={{
              flexShrink: 0,
              fontSize: 10.5,
              color: TONE.quiet,
              background: TONE.accentSoft,
              border: `1px solid ${TONE.border}`,
              borderRadius: 999,
              padding: "0 6px",
              lineHeight: "15px",
            }}
          >
            {t("pl.personas.scopes.session")}
          </span>
          <span
            style={{
              flex: 1,
              fontSize: 12.5,
              color: TONE.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={session.cwd || session.id}
          >
            {session.title}
          </span>
          {boundCount > 0 && (
            <span
              style={{
                flexShrink: 0,
                fontSize: 10,
                color: TONE.accent,
                background: TONE.accentSoft,
                borderRadius: 999,
                padding: "0 7px",
                lineHeight: "16px",
              }}
            >
              {t("pl.inject.boundCount", { count: boundCount })}
            </span>
          )}
          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} disabled={busy} onClick={() => openSessionConfig(session.id, session.boundPromptIds)}>
            {isEditing ? t("pl.inject.cancelConfig") : t("pl.inject.config")}
          </Button>
        </div>
        {isEditing && renderConfigPanel(session.id)}
      </div>
    );
  };

  // 渲染单个绑定树节点；depth 决定缩进
  const renderScopeNode = (node: ScopeNode, depth: number): ReactNode => {
    const boundCount = (bindings.get(node.path) ?? []).length;
    const isEditing = editingPath === node.path;
    const hasChildren = node.children.length > 0;
    const hasSessions = (node.sessions?.length ?? 0) > 0;
    const isExpandable = hasChildren || hasSessions;
    const displayTitle = node.path === UNMATCHED_SCOPE_PATH ? t("pl.personas.scopes.others") : node.title;
    return (
      <div key={node.path} style={{ marginLeft: depth * 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 0",
            minHeight: 28,
          }}
        >
          {isExpandable ? (
            <button
              type="button"
              onClick={() => toggleExpand(node.path)}
              title={displayTitle}
              style={{
                flexShrink: 0,
                width: 18,
                height: 18,
                border: "none",
                background: "transparent",
                color: TONE.quiet,
                cursor: "pointer",
                fontSize: 11,
                lineHeight: 1,
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transform: expanded.has(node.path) ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform .24s cubic-bezier(.22,1,.36,1)",
              }}
            >
              ▶
            </button>
          ) : (
            <span style={{ flexShrink: 0, width: 18 }} />
          )}
          <span
            style={{
              flexShrink: 0,
              fontSize: 10.5,
              color: node.kind === "workspace" ? TONE.accent : TONE.quiet,
              background: TONE.accentSoft,
              border: `1px solid ${TONE.border}`,
              borderRadius: 999,
              padding: "0 6px",
              lineHeight: "15px",
            }}
          >
            {node.kind === "workspace" ? t("pl.personas.scopes.workspace") : t("pl.personas.scopes.project")}
          </span>
          <span
            style={{
              flex: 1,
              fontSize: 12.5,
              color: TONE.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={node.path}
          >
            {displayTitle}
          </span>
          {boundCount > 0 && (
            <span
              style={{
                flexShrink: 0,
                fontSize: 10,
                color: TONE.accent,
                background: TONE.accentSoft,
                borderRadius: 999,
                padding: "0 7px",
                lineHeight: "16px",
              }}
            >
              {t("pl.inject.boundCount", { count: boundCount })}
            </span>
          )}
          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} disabled={busy} onClick={() => openConfig(node.path)}>
            {isEditing ? t("pl.inject.cancelConfig") : t("pl.inject.config")}
          </Button>
        </div>
        {isEditing && renderConfigPanel(node.path)}
        {expanded.has(node.path) && hasChildren && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {node.children.map((child) => renderScopeNode(child, depth + 1))}
          </div>
        )}
        {expanded.has(node.path) && hasSessions && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {node.sessions!.map((s) => renderSessionNode(s, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("pl.inject.title")}
          className={PL_DIALOG_OVERLAY}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{PL_DIALOG_CSS}</style>
          <div
            className={PL_DIALOG}
            style={{
              width: 860,
              height: 760,
              maxWidth: "calc(100vw - 40px)",
              maxHeight: "calc(100vh - 40px)",
            }}
          >
            {/* 标题行 + 右上角关闭按钮 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <BookIcon color={TONE.accent} />
              <strong style={{ flex: 1, fontSize: 15, fontWeight: 600, color: TONE.text }}>
                {t("pl.inject.title")}
              </strong>
              <DialogCloseButton onClick={onClose} label={t("pl.close")} />
            </div>

            {/* 绑定说明 */}
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
              {t("pl.inject.note")}
            </div>

            {error && (
              <div style={{ marginTop: 8, fontSize: 12, color: TONE.red, lineHeight: 1.5, flexShrink: 0 }}>
                {error}
              </div>
            )}

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
                      : TONE.mint
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
                    background: msg.kind === "error" ? TONE.red : msg.kind === "info" ? TONE.accent : TONE.mint,
                  }}
                />
              )}
              {msg?.text ?? ""}
            </div>

            {/* 内容区：两栏布局（技能管理 / 项目绑定），左右两栏各自独立滚动 */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                gap: 14,
                paddingTop: 14,
                paddingBottom: 4,
                marginTop: -8,
              }}
            >
              {/* 左栏：技能管理（独立滚动；
              外层为普通块级滚动容器（与右栏一致），内容套一层纵向 flex 保持间距 */}
              <div
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  minHeight: 0,
                  height: "100%",
                  boxSizing: "border-box",
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 10,
                  overflowY: "auto",
                }}
              >
                {/* 顶部标题：左栏内容向上滚动时悬浮固定在顶部（贴顶、无抖动、无空隙） */}
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 3,
                    padding: "10px 10px 8px",
                    background: TONE.row,
                    boxSizing: "border-box",
                    borderBottom: `1px solid ${TONE.border}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 3, height: 13, borderRadius: 2, background: TONE.accent, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TONE.text }}>{t("pl.inject.listTitle")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.5, marginTop: 3 }}>
                    {t("pl.inject.listHint")}
                  </div>
                  {/* 导入导出工具栏：勾选技能后导出（每条一个 md）/ 从单个 md 导入一个技能（随标题一起悬浮） */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.5 }}>{t("pl.exportHint")}</div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} title={t("pl.harnessSkill.btnTitle")} onClick={() => setHarnessOpen(true)}>
                        {t("pl.harnessSkill.btn")}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} disabled={busy} onClick={handleExport}>
                        {t("pl.export")}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} disabled={busy} onClick={() => importFileRef.current?.click()}>
                        {t("pl.import")}
                      </Button>
                    </div>
                  </div>
                  {/* 专门的「新建技能」添加区（随标题一起悬浮） */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      marginTop: 10,
                      background: TONE.accentSoft,
                      border: `1px dashed ${TONE.accent}`,
                      borderRadius: 10,
                      padding: 10,
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: TONE.accent }}>
                      + {t("pl.sessionPrompts.new")}
                    </span>
                    <span style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.5, marginTop: -4 }}>
                      {t("pl.inject.createHint")}
                    </span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleCreate();
                        }}
                        placeholder={t("pl.inject.namePlaceholder")}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} disabled={busy || !createName.trim()} onClick={() => void handleCreate()}>
                        {t("pl.personas.save")}
                      </Button>
                    </div>
                  </div>
                </div>
                {/* 技能卡片列表（随内容滚动） */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 10px 10px" }}>
                  {!loaded ? (
                    <div style={{ fontSize: 12.5, color: TONE.quiet, textAlign: "center", padding: "22px 0" }}>
                      {t("pl.achievements.loading")}
                    </div>
                  ) : prompts.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: TONE.quiet, textAlign: "center", padding: "18px 0" }}>
                      {t("pl.inject.empty")}
                    </div>
                  ) : (
                    prompts.map((p) => renderPromptCard(p))
                  )}
                </div>
              </div>

              {/* 右栏：工作区 / 项目绑定（独立滚动） */}
              <div
                style={{
                  flex: "1.15 1 0",
                  minWidth: 0,
                  height: "100%",
                  boxSizing: "border-box",
                  minHeight: 0,
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 10,
                  overflowY: "auto",
                }}
              >
                {/* 顶部标题 + 说明：内容向上滚动时悬浮固定在顶部（与左栏一致） */}
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                      padding: "10px 10px 8px",
                      background: TONE.row,
                      boxSizing: "border-box",
                      borderBottom: `1px solid ${TONE.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 3, height: 13, borderRadius: 2, background: TONE.accent, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TONE.text }}>
                        {t("pl.personas.scopes.title")}
                      </span>
                      <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} title={t("pl.refresh")} onClick={() => void refreshScopes().catch(() => setError(t("pl.inject.opFailed")))}>
                        {t("pl.refresh")}
                      </Button>
                    </div>
                    <div style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.6, marginTop: 4 }}>
                      {t("pl.inject.projectNote")}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", padding: "10px 10px 10px" }}>
                {!scopesLoaded ? (
                  <div style={{ fontSize: 12.5, color: TONE.quiet, textAlign: "center", padding: "14px 0" }}>
                    {t("pl.achievements.loading")}
                  </div>
                ) : scopes.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: TONE.quiet, textAlign: "center", padding: "14px 0" }}>
                    {t("pl.personas.scopes.empty")}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {scopes.map((ws) => renderScopeNode(ws, 0))}
                  </div>
                )}
                  </div>
              </div>
            </div>

            {/* 删除二次确认 */}
            <ConfirmDialog
              open={deleteId !== null}
              danger
              message={
                deleteId
                  ? t("pl.sessionPrompts.deleteConfirm").replace("{name}", `「${clampTitle(prompts.find((x) => x.id === deleteId)?.title ?? "")}」`)
                  : ""
              }
              confirmLabel={t("pl.personas.delete")}
              cancelLabel={t("pl.personas.cancel")}
              onCancel={() => setDeleteId(null)}
              onConfirm={confirmDelete}
            />

            {/* 导入 MD 文件选择（隐藏） */}
            <input
              ref={importFileRef}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              style={{ display: "none" }}
              onChange={(e) => void handleImport(e)}
            />
          </div>
        </div>,
        document.body,
      )}
      {/* 点击正文 → 详情查看弹窗（仅查看，编辑入口在卡片头部「编辑」按钮） */}
      {detailId
        ? (() => {
            const p = prompts.find((x) => x.id === detailId);
            if (!p) return null;
            const content = p.body && p.body.trim() ? p.body.trim() : t("pl.inject.detailEmpty");
            return createPortal(
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t("pl.inject.detailTitle")}
                className={PL_DIALOG_OVERLAY}
                onClick={(e) => e.stopPropagation()}
              >
                <style>{PL_DIALOG_CSS}</style>
                <div className={PL_DIALOG} style={{ width: 480, maxWidth: "calc(100vw - 40px)", maxHeight: "min(520px, calc(100vh - 40px))", gap: 10 }}>
                  {/* 标题行 + 右上角关闭按钮 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <BookIcon color={TONE.accent} />
                    <strong style={{ flex: 1, fontSize: 14, fontWeight: 600, color: TONE.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {clampTitle(p.title)}
                    </strong>
                    <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => setDetailId(null)}>
                      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </Button>
                  </div>
                  {/* 正文：只读展示，超出可滚动 */}
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      overflowX: "hidden",
                      padding: "10px 11px",
                      paddingRight: 10,
                      background: TONE.row,
                      border: `1px solid ${TONE.border}`,
                      borderRadius: 8,
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: MONO,
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: TONE.text,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {content}
                    </pre>
                  </div>
                </div>
              </div>,
              document.body,
            );
          })()
        : null}
      {/* Harness 技能软控制开关弹窗（列表 ~/.dsh/skills 系统技能 + 项目技能） */}
      <HarnessSkillModal open={harnessOpen} onClose={() => setHarnessOpen(false)} t={t} />
    </>
  );
}
