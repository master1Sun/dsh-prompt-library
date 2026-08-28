/**
 * 人格管理弹窗 — 词库助手右键菜单「人格管理」打开。
 *
 * 管理多人格（多份 SOUL，按会话自动切换）：
 * - 列出全部人格（内置默认人格排最前，只读）；
 * - 新建 / 改名 / 启用开关 / 编辑 SOUL 正文 / 删除自定义人格；
 * - 每个会话在发送消息时由 host 按其会话绑定自动选用对应人格。
 *
 * 交互约束（与其它弹窗一致）：
 * - 只能通过右上角关闭按钮或底部「完成」按钮关闭，禁止点击遮罩/外部区域关闭；
 * - 删除需二次确认。
 */
import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import type { PersonaView, ScopeNode, SessionNode } from "../../../types.js";
import { UNMATCHED_SCOPE_PATH } from "../../../types.js";
import {
  createPersona as apiCreatePersona,
  deletePersona as apiDeletePersona,
  generateDraft,
  listPersonas,
  listSessionScopeTree,
  setPersonaBinding as apiSetPersonaBinding,
  setSessionPersonaBinding as apiSetSessionPersonaBinding,
  updatePersona as apiUpdatePersona,
} from "../../services/api.js";
import { plBtn } from "../../utils/button-style.js";
import { getTone, useThemeSync } from "../../utils/theme.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../../utils/dialog-style.js";
import { ConfirmDialog } from "../common/ConfirmDialog.js";
import { DialogCloseButton } from "../common/DialogCloseButton.js";
import { type PLT } from "../../i18n/i18n.js";

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

interface Props {
  /** 是否显示。 */
  open: boolean;
  /** 关闭弹窗（仅由关闭按钮 / 「完成」按钮触发）。 */
  onClose: () => void;
  /** 翻译函数。 */
  t: PLT;
}

/** 词库图标（服务端注入 SOUL 的同款图标，随文本色）。 */
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

export function PersonaManagerModal({ open, onClose, t }: Props): ReactNode {
  useThemeSync();
  const TONE = getTone();

  const [personas, setPersonas] = useState<PersonaView[]>([]);
  const [loaded, setLoaded] = useState(false);
  // 工作区/项目树及其加载状态；绑定下拉的选择值即节点 `bound`（'' = 默认/回落上层）
  const [scopes, setScopes] = useState<ScopeNode[]>([]);
  const [scopesLoaded, setScopesLoaded] = useState(false);
  // 展开的工作区路径集合（默认全部展开，便于看到所有项目）
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // 工作区/项目树的展开/折叠状态持久化（人格管理右栏绑定树）：下次打开恢复到上次状态
  const SCOPE_EXPAND_KEY = "pl:persona-tree-expanded";
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

  // 重新拉取工作区/项目/会话树（打开及绑定变更后回写节点 bound）；必须定义在提前返回之前，
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

  // 新建流程：名称输入（新建卡片常驻显示）
  const [createName, setCreateName] = useState("");
  // 自定义人格名称的实时草稿（key = persona id）
  const [names, setNames] = useState<Record<string, string>>({});
  // 内容编辑器：当前编辑的人格 id 与正文草稿
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  // 删除二次确认的目标 id
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // 详情查看的目标 id（点击内容打开详情弹窗）
  const [detailId, setDetailId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 导入导出等操作反馈（error=false 时为成功/普通提示，error=true 时红色警示）
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  // 勾选导出的目标 id 集合
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 导入文件选择（MD 单文件）
  const importFileRef = useRef<HTMLInputElement | null>(null);

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
    listPersonas()
      .then((list) => {
        if (!alive) return;
        setPersonas(list);
        const draft: Record<string, string> = {};
        for (const p of list) if (!p.isDefault) draft[p.id] = p.name;
        setNames(draft);
        setLoaded(true);
      })
      .catch(() => {
        if (!alive) return;
        setLoaded(true);
        setError(tRef.current("pl.personas.opFailed"));
      });
    return () => {
      alive = false;
    };
  }, [open]);

  // 打开弹窗时加载工作区/项目树（绑定区渲染依赖）
  useEffect(() => {
    if (!open) return;
    refreshScopes().catch(() => {
      /* 拉取失败：界面显示空态即可 */
    });
  }, [open]);

  if (!open) return null;

  const refresh = () => {
    return listPersonas().then((list) => {
      setPersonas(list);
      setNames((prev) => {
        const next: Record<string, string> = {};
        const custom = list.filter((p) => !p.isDefault);
        for (const p of custom) {
          next[p.id] = (prev[p.id] ?? "").trim() ? prev[p.id]! : p.name;
        }
        return next;
      });
    });
  };

  // 新建人格：写入默认 SOUL 后进入该人格的编辑器
  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      setError(t("pl.personas.nameError"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await apiCreatePersona(name);
      await refresh();
      setNames((prev) => ({ ...prev, [created.id]: created.name }));
      setEditContent(created.content);
      setEditingId(created.id);
      setCreateName("");
    } catch {
      setError(t("pl.personas.opFailed"));
    } finally {
      setBusy(false);
    }
  };

  // 打开内容编辑器
  const openEditor = (p: PersonaView) => {
    setEditingId(p.id);
    setEditContent(p.content);
    setError(null);
  };

  // 取消编辑：还原未保存的草稿（正文 + 标题名称都回到最近一次已保存值）
  const cancelEdit = (p: PersonaView) => {
    setEditingId(null);
    setEditContent("");
    setNames((prev) => ({ ...prev, [p.id]: p.name }));
  };

  // 保存：名称草稿 + 启用 + SOUL 正文
  const handleSave = async (p: PersonaView) => {
    const name = (names[p.id] ?? p.name).trim();
    if (!name) {
      setError(t("pl.personas.nameError"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await apiUpdatePersona(p.id, { name, content: editContent });
      setNames((prev) => ({ ...prev, [updated.id]: updated.name }));
      await refresh();
      setEditingId(null);
    } catch {
      setError(t("pl.personas.opFailed"));
    } finally {
      setBusy(false);
    }
  };

  // AI 生成：依据「人格名称 + 已输入内容」生成 SOUL 正文草稿，填入编辑区（仅生成，不落盘）
  const handleAiGenerate = async (p: PersonaView) => {
    const name = (names[p.id] ?? p.name).trim();
    if (!name) {
      setError(t("pl.ai.genNeedTitle"));
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const { content } = await generateDraft("soul", name, editContent);
      setEditContent(content);
      setMsg({ text: t("pl.ai.genDone") });
    } catch {
      setError(t("pl.ai.genFailed"));
    } finally {
      setBusy(false);
    }
  };

  // 切换启用状态（立即保存）
  const toggleEnabled = async (p: PersonaView) => {
    setBusy(true);
    setError(null);
    try {
      await apiUpdatePersona(p.id, { enabled: !p.enabled });
      await refresh();
    } catch {
      setError(t("pl.personas.opFailed"));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setBusy(true);
    setError(null);
    apiDeletePersona(deleteId)
      .then(() => refresh())
      .catch(() => setError(t("pl.personas.opFailed")))
      .finally(() => {
        setBusy(false);
        setDeleteId(null);
        if (editingId === deleteId) setEditingId(null);
      });
  };

  // 导出勾选的人格为 Markdown：每张导出成一个 md 文件，文件名取标题
  const handleExport = () => {
    const exportList = personas.filter((p) => selected.has(p.id));
    if (exportList.length === 0) {
      setMsg({ text: t("pl.exportSelectEmpty"), error: true });
      return;
    }
    for (const p of exportList) {
      const title = p.isDefault ? p.name : (names[p.id] ?? p.name);
      downloadMarkdown(`${sanitizeFileName(title)}.md`, p.content && p.content.trim() ? p.content.trim() : "");
    }
    setMsg({ text: t("pl.personas.exportDone", { count: exportList.length }) });
  };

  // 从 Markdown 单文件导入一个文案：正文取整个文件内容，标题取文件名（去扩展名）
  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = (await file.text()).trim();
    if (!text) {
      setMsg({ text: t("pl.personas.importEmpty"), error: true });
      return;
    }
    const title = file.name.replace(/\.[^/.]+$/, "").trim() || "untitled";
    setBusy(true);
    setError(null);
    try {
      const created = await apiCreatePersona(title);
      await apiUpdatePersona(created.id, { content: text, enabled: true });
      await refresh();
      setMsg({ text: t("pl.personas.importDone", { count: 1 }) });
    } catch {
      setMsg({ text: t("pl.personas.importFailed"), error: true });
    } finally {
      setBusy(false);
    }
  };

  const defaultPersona = personas.find((p) => p.isDefault);
  const customPersonas = personas.filter((p) => !p.isDefault);
  // 绑定下拉里可选的启用人格（只列举可用项，避免选中后被禁用的歧义）
  const bindablePersonas = customPersonas.filter((p) => p.enabled);

  // 设置某路径的绑定（'default' → 回落默认/上层），随后同步树状态
  const handleScopeBind = (nodePath: string, personaId: string) => {
    const value = personaId === "default" ? "" : personaId;
    setBusy(true);
    setError(null);
    apiSetPersonaBinding(nodePath, value || "default")
      .then(() => refreshScopes())
      .catch(() => setError(t("pl.personas.opFailed")))
      .finally(() => setBusy(false));
  };

  // 设置某会话的绑定（'default' → 回落默认/上层），随后回写该会话节点的 boundPersonaId
  const handleSessionBind = (sessionId: string, personaId: string) => {
    const value = personaId === "default" ? "" : personaId;
    setBusy(true);
    setError(null);
    apiSetSessionPersonaBinding(sessionId, value || "default")
      .then(({ personaId: bound }) => {
        setScopes((prev) =>
          prev.map((node) => rewriteSessionPersona(node, sessionId, bound)),
        );
      })
      .catch(() => setError(t("pl.personas.opFailed")))
      .finally(() => setBusy(false));
  };

  // 递归回写树里某会话节点的绑定人格
  const rewriteSessionPersona = (node: ScopeNode, sessionId: string, personaId: string): ScopeNode => {
    const sessions = node.sessions?.map((s) =>
      s.id === sessionId ? { ...s, boundPersonaId: personaId } : s,
    );
    return {
      ...node,
      sessions,
      children: node.children.map((child) => rewriteSessionPersona(child, sessionId, personaId)),
    };
  };

  // 折叠/展开工作区/项目
  const toggleExpand = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      persistScopesExpanded(next);
      return next;
    });

  // 人格选择下拉（工作区/项目/会话通用）
  const renderPersonaSelect = (value: string, onChange: (v: string) => void): ReactNode => {
    const selectValue = bindablePersonas.some((p) => p.id === value) ? value : "default";
    return (
      <select
        value={selectValue}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flexShrink: 0,
          boxSizing: "border-box",
          width: "auto",
          minWidth: 120,
          maxWidth: 180,
          fontSize: 12,
          color: TONE.text,
          background: TONE.row,
          border: `1px solid ${TONE.border}`,
          borderRadius: 7,
          padding: "3px 6px",
          outline: "none",
          cursor: busy ? "not-allowed" : "pointer",
          fontFamily: MONO,
        }}
      >
        <option value="default">{t("pl.personas.scopes.defaultOption")}</option>
        {bindablePersonas.map((p) => (
          <option key={p.id} value={p.id}>
            {names[p.id] ?? p.name}
          </option>
        ))}
      </select>
    );
  };

  // 类型徽标（工作区/项目/会话通用）
  const renderKindBadge = (kind: "workspace" | "project" | "session"): ReactNode => (
    <span
      style={{
        flexShrink: 0,
        fontSize: 10.5,
        color: kind === "workspace" ? TONE.accent : TONE.quiet,
        background: TONE.accentSoft,
        border: `1px solid ${TONE.border}`,
        borderRadius: 999,
        padding: "0 6px",
        lineHeight: "15px",
      }}
    >
      {kind === "workspace"
        ? t("pl.personas.scopes.workspace")
        : kind === "project"
          ? t("pl.personas.scopes.project")
          : t("pl.personas.scopes.session")}
    </span>
  );

  // 渲染单个会话节点（挂在工作区/项目下的会话行）
  const renderSessionNode = (session: SessionNode, depth: number): ReactNode => (
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
        {renderKindBadge("session")}
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
        {renderPersonaSelect(session.boundPersonaId, (v) => handleSessionBind(session.id, v))}
      </div>
    </div>
  );

  // 渲染单个绑定树节点；depth 决定缩进
  const renderScopeNode = (node: ScopeNode, depth: number): ReactNode => {
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
          {/* 可折叠：工作区/项目（有下级或会话）显示折叠按钮，叶节点用占位 */}
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
          {renderKindBadge(node.kind)}
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
          {renderPersonaSelect(node.bound, (v) => handleScopeBind(node.path, v))}
        </div>
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
    minHeight: 150,
    resize: "vertical",
    lineHeight: 1.6,
  };

  // 渲染单张人格卡片（卡片式预览编辑）
  const renderPersonaCard = (p: PersonaView): ReactNode => {
    const isEditing = editingId === p.id;
    const isDefault = p.isDefault;
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
        {/* 卡片头部：图标 + 名称 + 启用 + 操作 */}
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
          <BookIcon color={isDefault ? TONE.accent : p.enabled ? TONE.accent : TONE.quiet} />
          {isDefault ? (
            <>
              <strong style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TONE.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name}
              </strong>
              <span
                style={{
                  fontSize: 10.5,
                  color: TONE.accent,
                  background: TONE.accentSoft,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 999,
                  padding: "1px 8px",
                }}
              >
                {t("pl.personas.defaultBadge")}
              </span>
            </>
          ) : isEditing ? (
            <input
              value={names[p.id] ?? p.name}
              onChange={(e) => setNames((prev) => ({ ...prev, [p.id]: e.target.value }))}
              disabled={busy}
              style={{ ...inputStyle, flex: 1, minWidth: 60, background: TONE.panel }}
              maxLength={25}
              title={t("pl.personas.namePlaceholder")}
            />
          ) : (
            <strong
              style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TONE.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={names[p.id] ?? p.name}
            >
              {names[p.id] ?? p.name}
            </strong>
          )}
          {/* 启用开关（胶囊式，与整体圆角风格一致）；默认人格恒启用（只读显示） */}
          <button
            type="button"
            role="switch"
            aria-checked={p.enabled}
            title={t("pl.personas.enabled")}
            disabled={busy || isDefault}
            onClick={() => void toggleEnabled(p)}
            style={{
              flexShrink: 0,
              width: 34,
              height: 18,
              borderRadius: 9,
              border: `1px solid ${TONE.border}`,
              background: p.enabled ? TONE.accent : "transparent",
              position: "relative",
              cursor: busy || isDefault ? "not-allowed" : "pointer",
              padding: 0,
              opacity: isDefault ? 0.7 : 1,
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
                setMsg({ text: t("pl.personas.disabledEditHint"), error: true });
                return;
              }
              if (isEditing) cancelEdit(p);
              else openEditor(p);
            }}
          >
            {isEditing ? t("pl.personas.cancel") : t("pl.personas.edit")}
          </Button>
          {!isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={plBtn("ghost", "sm")}
              onClick={() => {
                // 未启用时点击删除给出提示
                if (!p.enabled) {
                  setMsg({ text: t("pl.personas.disabledDeleteHint"), error: true });
                  return;
                }
                setDeleteId(p.id);
              }}
            >
              {t("pl.personas.delete")}
            </Button>
          )}
        </div>

        {/* 卡片正文：预览 或 编辑 */}
        <div style={{ padding: 10 }}>
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11.5, color: TONE.muted }}>{t("pl.personas.contentLabel")}</div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={busy || isDefault}
                placeholder="# SOUL"
                style={{ ...textareaStyle, minHeight: isDefault ? 130 : 120 }}
              />
              <div style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.5 }}>{t("pl.personas.contentHint")}</div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 2 }}>
                <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} disabled={busy || isDefault} onClick={() => void handleAiGenerate(p)}>
                  {busy ? t("pl.ai.generating") : t("pl.ai.generate")}
                </Button>
                <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} disabled={busy || isDefault} onClick={() => void handleSave(p)}>
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
              onClick={() => {
                if (!isEditing) setDetailId(p.id);
              }}
              title={t("pl.personas.viewDetail")}
            >
              {p.content && p.content.trim() ? p.content.trim().slice(0, 300) : t("pl.personas.previewEmpty")}
              {!isDefault && p.content && p.content.trim().length > 300 ? "…" : ""}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pl.personas.title")}
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
            {t("pl.personas.title")}
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
          {t("pl.personas.note")}
        </div>

        {error && (
          <div style={{ marginTop: 8, fontSize: 12, color: TONE.red, lineHeight: 1.5, flexShrink: 0 }}>
            {error}
          </div>
        )}

        {msg && (
          <div style={{ marginTop: 8, fontSize: 12, color: msg.error ? TONE.red : TONE.text, lineHeight: 1.5, flexShrink: 0 }}>
            {msg.text}
          </div>
        )}

        {/* 内容区：两栏布局（灵魂管理 / 工作区项目绑定），左右两栏各自独立滚动 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            gap: 14,
            paddingTop: 14,
            paddingBottom: 4,
            marginTop: 8,
          }}
        >
          {/* 左栏：灵魂管理（独立滚动，滚动条与内容预留 10px 间距）；
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
            {/* 顶部标题：左栏内容向上滚动时悬浮固定在顶部（贴顶，无空隙、无抖动） */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 3,
                padding: "10px 10px 8px",
                background: TONE.row,
                borderBottom: `1px solid ${TONE.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 3, height: 13, borderRadius: 2, background: TONE.accent, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TONE.text }}>{t("pl.personas.listTitle")}</span>
              </div>
              <div style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.5, marginTop: 3 }}>
                {t("pl.personas.listHint")}
              </div>
              {/* 导入导出工具栏：勾选人格后导出（每格一个 md）/ 从单个 md 导入一个文案（随标题一起悬浮） */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                <div style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.5 }}>{t("pl.exportHint")}</div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} disabled={busy} onClick={handleExport}>
                    {t("pl.export")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} disabled={busy} onClick={() => importFileRef.current?.click()}>
                    {t("pl.import")}
                  </Button>
                </div>
              </div>
              {/* 专门的「新建灵魂」添加区（随标题一起悬浮，与技能管理左侧一致） */}
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
                  + {t("pl.personas.createTitle")}
                </span>
                <span style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.5, marginTop: -4 }}>
                  {t("pl.personas.createHint")}
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleCreate();
                    }}
                    placeholder={t("pl.personas.namePlaceholder")}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} disabled={busy || !createName.trim()} onClick={() => void handleCreate()}>
                    {t("pl.personas.save")}
                  </Button>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 10px 10px" }}>
              {/* 人格卡片列表 */}
              {!loaded ? (
                <div style={{ fontSize: 12.5, color: TONE.quiet, textAlign: "center", padding: "22px 0" }}>
                  {t("pl.achievements.loading")}
                </div>
              ) : (
                <>
                  {defaultPersona && renderPersonaCard(defaultPersona)}
                  {customPersonas.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: TONE.quiet, textAlign: "center", padding: "18px 0" }}>
                      {t("pl.personas.empty")}
                    </div>
                  ) : (
                    customPersonas.map((p) => renderPersonaCard(p))
                  )}
                </>
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
                <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} title={t("pl.refresh")} onClick={() => void refreshScopes().catch(() => setError(t("pl.personas.opFailed")))}>
                  {t("pl.refresh")}
                </Button>
              </div>
              <div style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.6, marginTop: 4 }}>
                {t("pl.personas.scopes.hint")}
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
              ? t("pl.personas.deleteConfirm").replace("{name}", `「${names[deleteId] ?? ""}」`)
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
      {/* 点击内容 → 详情查看弹窗（仅查看，编辑入口在卡片头部「编辑」按钮） */}
      {detailId
        ? (() => {
            const p = personas.find((x) => x.id === detailId);
            if (!p) return null;
            const detailName = p.isDefault ? p.name : (names[p.id] ?? p.name);
            const content = p.content && p.content.trim() ? p.content.trim() : t("pl.personas.detailEmpty");
            return createPortal(
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t("pl.personas.detailTitle")}
                className={PL_DIALOG_OVERLAY}
                onClick={(e) => e.stopPropagation()}
              >
                <style>{PL_DIALOG_CSS}</style>
                <div className={PL_DIALOG} style={{ width: 480, maxWidth: "calc(100vw - 40px)", maxHeight: "min(520px, calc(100vh - 40px))", gap: 10 }}>
                  {/* 标题行 + 右上角关闭按钮 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <BookIcon color={TONE.accent} />
                    <strong style={{ flex: 1, fontSize: 14, fontWeight: 600, color: TONE.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {detailName}
                    </strong>
                    <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => setDetailId(null)}>
                      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </Button>
                  </div>
                  {/* 正文：只读展示，超出可滚动；右侧预留与滚动条的 10px 间距 */}
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
    </>
  );
}