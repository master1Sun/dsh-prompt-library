/**
 * 导入导出弹窗 — 词库助手「数据管理」→「导入导出」入口。
 *
 * 集中放置与提示词数据导入导出相关的操作：
 * - 导出：勾选要导出的提示词，选择格式（JSON / CSV / Markdown / 文本）下载，或导出为 Skill
 * - 导入：从备份文件（JSON / CSV / Markdown / 文本）导入（卡片编辑校验后合并入库），或从 Skills 导入
 *
 * 由词库助手右键菜单打开，弹窗只能通过关闭按钮手动关闭，不响应遮罩点击。
 */
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import type { Prompt } from "../../../../types.js";
import {
  deletePrompt as apiDelete,
  listPrompts as apiListPrompts,
  saveExportFile,
  updatePrompt as apiUpdate,
} from "../../../services/api.js";
import { notifyDataChanged } from "../../../services/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../../utils/button-style.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../../../utils/dialog-style.js";
import { getTone, useThemeSync } from "../../../utils/theme.js";
import { type PLTranslate, usePLT } from "../../../i18n/i18n.js";
import { insertVariableAt } from "../../common/TemplateVariables.js";
import { TagInput } from "../../common/TagInput.js";
import { ConfirmDialog } from "../../common/ConfirmDialog.js";
import { DialogCloseButton } from "../../common/DialogCloseButton.js";
import { BookIcon } from "../../common/BookIcon.js";
import { SkillImportModal } from "./SkillImportModal.js";
import { ImportEditModal } from "./ImportEditModal.js";
import {
  parseImportFile,
  type TransferFormat,
} from "../../../services/data-formats.js";

const MONO =
  "var(--dsw-font-family, -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Helvetica Neue\", Helvetica, Arial, sans-serif)";

/** 编辑表单通用输入框样式。 */
const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 9px",
  color: "var(--dsw-alias-label-primary, #f2f6fc)",
  background: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderRadius: 7,
  fontFamily: MONO,
  fontSize: 13,
  outline: "none",
};

/** 导出勾选列表中的单条提示词（卡片式）。 */
function PromptCheckRow(props: {
  title: string;
  body: string;
  checked: boolean;
  onToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  viewLabel: string;
  editLabel: string;
  deleteLabel: string;
}): ReactNode {
  const { title, body, checked, onToggle, onView, onEdit, onDelete, viewLabel, editLabel, deleteLabel } = props;
  // 行内取值跟随父级主题同步重渲染，保证白天/黑夜一致
  const TONE = getTone();
  return (
    <label
      className="pl-data-card"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 12px",
        background: checked ? "rgba(142, 197, 255, 0.10)" : TONE.row,
        border: `1px solid ${checked ? "rgba(142, 197, 255, 0.5)" : TONE.border}`,
        borderRadius: 9,
        cursor: "pointer",
        userSelect: "none",
        transition:
          "border-color .24s cubic-bezier(.22,1,.36,1), background-color .24s cubic-bezier(.22,1,.36,1)",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ marginTop: 3, accentColor: TONE.accent, cursor: "pointer", flexShrink: 0 }}
      />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 560,
            lineHeight: 1.4,
            minWidth: 0,
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            data-tip={title}
          >
            {title}
          </span>
          {/* 行内操作：查看 / 编辑 / 删除（按钮点击需阻断事件冒泡，避免误触发勾选） */}
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 2, flexShrink: 0 }}
            onClick={(e) => e.preventDefault()}
          >
            {[
              { label: viewLabel, color: TONE.muted, action: onView },
              { label: editLabel, color: TONE.accent, action: onEdit },
              { label: deleteLabel, color: TONE.red, action: onDelete },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  b.action();
                }}
                style={{
                  flexShrink: 0,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: b.color,
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: MONO,
                  padding: "2px 5px",
                  borderRadius: 5,
                  transition: "background-color .18s, color .18s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                  e.currentTarget.style.color = TONE.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = b.color;
                }}
              >
                {b.label}
              </button>
            ))}
          </span>
        </span>
        <span
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            fontSize: 11,
            color: TONE.quiet,
            lineHeight: 1.5,
            marginTop: 3,
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {body.replace(/\s+/g, " ").trim() || " "}
        </span>
      </span>
    </label>
  );
}

/** 导入导出弹窗组件。 */
export function ImportExportModal(props: {
  open: boolean;
  onClose: () => void;
  t?: PLTranslate;
}): ReactNode {
  const { open, onClose, t } = props;
  const T = usePLT(t);
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();
  // 导入/导出分区卡片样式（跟随主题 token，与人格管理 / 技能管理分区一致）
  const sectionCardStyle: CSSProperties = {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "12px 14px",
    background: TONE.row,
    border: `1px solid ${TONE.border}`,
    borderRadius: 10,
  };
  const importRef = useRef<HTMLInputElement | null>(null);

  const [promptList, setPromptList] = useState<Prompt[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);
  const [exportSelected, setExportSelected] = useState<Set<string>>(new Set());
  // 技能导入弹窗（选择 md 文件 / 扫描 Skills 目录，编辑校验后保存）
  const [skillImportOpen, setSkillImportOpen] = useState(false);
  // 通用格式导入弹窗（由所选文件解析出的初始条目）
  const [importEditOpen, setImportEditOpen] = useState(false);
  const [importEntries, setImportEntries] = useState<
    Array<{ title: string; body: string; tags?: string[] }>
  >([]);
  const [exportFormat, setExportFormat] = useState<TransferFormat>("json");
  // 技能导出弹窗（由勾选提示词转换的初始条目）
  const [skillExportOpen, setSkillExportOpen] = useState(false);
  const [skillExportInitial, setSkillExportInitial] = useState<
    Array<{ promptId: string; name?: string; title: string; body: string; summary?: string }>
  >([]);

  // 导入导出列表展示方式：列表 / 分组
  const [exportView, setExportView] = useState<"list" | "group">("list");
  const [exportCollapsed, setExportCollapsed] = useState<Set<string>>(new Set());

  // 待查看详情的提示词（查看弹层，仅可通过关闭按钮关闭）
  const [viewing, setViewing] = useState<Prompt | null>(null);
  // 编辑中的提示词：标题 / 正文 / 标签（标签为单选，兼容下拉组件）
  const [editing, setEditing] = useState<{ id: string; title: string; body: string; tags: string } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const editBodyRef = useRef<HTMLTextAreaElement | null>(null);
  // 待确认删除的提示词（自定义确认弹窗，替代系统 confirm）
  const [deleteConfirm, setDeleteConfirm] = useState<Prompt | null>(null);

  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 导出成功提示框（导出的 promptId）——点击「确定」关闭
  const [exportDoneMsg, setExportDoneMsg] = useState<string | null>(null);

  const showMsg = useCallback((text: string, error = false) => {
    setMsg({ text, error });
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
  }, []);

  useEffect(
    () => () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    },
    [],
  );

  // 打开时重置选区并拉取提示词列表
  useEffect(() => {
    if (!open) return;
    setMsg(null);
    setExportSelected(new Set());
    setPromptLoading(true);
    apiListPrompts().then(
      (list) => {
        setPromptList(list);
        setPromptLoading(false);
      },
      (e: unknown) => {
        showMsg(e instanceof Error ? e.message : String(e), true);
        setPromptLoading(false);
      },
    );
  }, [open, showMsg]);

  /** 切换单条提示词导出选中。 */
  const toggleExport = useCallback((id: string) => {
    setExportSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** 全选 / 取消全选提示词。 */
  const toggleExportAll = useCallback(() => {
    setExportSelected((prev) =>
      prev.size === promptList.length ? new Set() : new Set(promptList.map((p) => p.id)),
    );
  }, [promptList]);

  /** 分组展示：按提示词首个标签分组；无标签归入「未分类」。 */
  const groupedPrompts = useMemo(() => {
    const groups = new Map<string, Prompt[]>();
    for (const p of promptList) {
      const key = p.tags?.[0]?.trim() || T("pl.sidebar.uncategorized");
      const list = groups.get(key);
      if (list) list.push(p);
      else groups.set(key, [p]);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [promptList, T]);

  /** 导出勾选的提示词为所选格式并触发下载。 */
  const exportSelectedPrompts = useCallback(() => {
    const ids = Array.from(exportSelected);
    if (ids.length === 0) {
      showMsg(T("pl.exportNeedSelect"), true);
      return;
    }
    // 走后端下载：前端只传 ids + format，后端拉取数据并组织文件写入系统「下载」目录。
    // 写完后才 resolve，避开浏览器下载「选择保存路径」对话框的时序问题，也不拉取正文大文本。
    saveExportFile(ids, exportFormat).then(
      (r) => {
        setExportDoneMsg(T("pl.exportedPath", { count: r.count, path: r.filePath }));
      },
      (e) => showMsg(e instanceof Error ? e.message : String(e), true),
    );
  }, [exportSelected, exportFormat, showMsg, T]);

  /** 打开技能导出弹窗：把勾选的提示词转成可编辑条目。 */
  const openSkillExport = useCallback(() => {
    const ids = Array.from(exportSelected);
    if (ids.length === 0) {
      showMsg(T("pl.skillExportNeedSelect"), true);
      return;
    }
    const selected = promptList.filter((p) => ids.includes(p.id));
    setSkillExportInitial(
      selected.map((p) => ({
        promptId: p.id,
        title: p.title,
        body: p.body,
        summary: p.summary ?? "",
      })),
    );
    setSkillExportOpen(true);
  }, [exportSelected, promptList, showMsg, T]);

  /** 读取用户选择的数据文件并解析出条目。 */
  const onImportFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        if (!text.trim()) {
          showMsg(T("pl.importEdit.parseEmpty"), true);
          return;
        }
        try {
          const parsed = parseImportFile(file.name, text);
          if (parsed.length === 0) {
            showMsg(T("pl.importEdit.parseEmpty"), true);
            return;
          }
          setImportEntries(parsed);
          setImportEditOpen(true);
        } catch (err) {
          showMsg(T("pl.importEdit.parseFail", { err: err instanceof Error ? err.message : String(err) }), true);
        }
      };
      reader.readAsText(file);
    },
    [showMsg, T],
  );

  // 刷新提示词列表：编辑 / 删除成功后同步数据（通知宿主并重新拉取）
  const refreshList = useCallback(() => {
    notifyDataChanged();
    apiListPrompts().then(
      (list) => setPromptList(list),
      () => {},
    );
  }, []);

  /** 打开查看详情弹层。 */
  const openView = useCallback((p: Prompt) => setViewing(p), []);

  /** 打开编辑弹层（标签预填首个，兼容单选下拉）。 */
  const openEdit = useCallback((p: Prompt) => {
    setEditError(null);
    setEditing({
      id: p.id,
      title: p.title,
      body: p.body,
      tags: (p.tags ?? [])[0] ?? "",
    });
  }, []);

  /** 在正文光标处插入 {{变量名}}（有选中文本时以选中内容为变量名）。 */
  const insertEditVar = useCallback(() => {
    if (!editing) return;
    const textarea = editBodyRef.current;
    const scrollTop = textarea?.scrollTop ?? 0;
    insertVariableAt(
      textarea,
      editing.body,
      (next) => setEditing({ ...editing, body: next }),
      T("pl.insertVariableDefault"),
    );
    // 状态更新重渲染 + 光标定位后再恢复滚动位置，避免正文较长时插入变量后跳回顶部
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (textarea) textarea.scrollTop = scrollTop;
      });
    });
  }, [editing, T]);

  /** 保存编辑：更新词库中的提示词并刷新列表。 */
  const saveEdit = useCallback(() => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title || !editing.body) {
      setEditError(T("pl.requireTitleBody"));
      return;
    }
    const tags = editing.tags.trim() ? [editing.tags.trim()] : [];
    apiUpdate(editing.id, { title, body: editing.body, tags }).then(
      () => {
        setEditing(null);
        setEditError(null);
        showMsg(T("pl.updated"));
        refreshList();
      },
      (e: unknown) => setEditError(e instanceof Error ? e.message : String(e)),
    );
  }, [editing, T, showMsg, refreshList]);

  /** 请求删除提示词：弹出确认对话框。 */
  const requestDelete = useCallback((p: Prompt) => setDeleteConfirm(p), []);

  /** 确认删除：从词库删除并移入回收站，刷新列表并清空相关勾选。 */
  const confirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    apiDelete(deleteConfirm.id).then(
      () => {
        setDeleteConfirm(null);
        setExportSelected((prev) => {
          const next = new Set(prev);
          next.delete(deleteConfirm.id);
          return next;
        });
        showMsg(T("pl.deleted"));
        refreshList();
      },
      (e: unknown) => {
        setDeleteConfirm(null);
        showMsg(e instanceof Error ? e.message : String(e), true);
      },
    );
  }, [deleteConfirm, showMsg, refreshList]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T("pl.moduleImportExport")}
      className={PL_DIALOG_OVERLAY}
      onClick={(e) => e.stopPropagation()}
    >
      <style>{PL_DIALOG_CSS}</style>
      <style>{`
.pl-data-action{background:var(--dsw-alias-bg-layer-3, #1d2735)}
.pl-data-action:hover{background:var(--dsw-alias-interactive-bg-hover)}
.pl-data-action:active{background:var(--dsw-alias-interactive-bg-active)}
.pl-data-card{transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-data-card:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3, rgba(196,211,232,.31))}
`}</style>
      <div
        className={PL_DIALOG}
        style={{
          position: "relative",
          width: 860,
          height: 760,
          maxWidth: "calc(100vw - 40px)",
          maxHeight: "calc(100vh - 40px)",
        }}
      >
        {/* 标题行 + 右上角关闭按钮（仅通过按钮手动关闭） */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <BookIcon color={TONE.accent} />
          <strong style={{ flex: 1, fontSize: 15, fontWeight: 600, color: TONE.text, minWidth: 0 }}>
            {T("pl.moduleImportExport")}
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
          {T("pl.moduleImportExportDesc")}
        </div>

        {/* 操作反馈 */}
        {msg && (
          <div
            style={{
              flexShrink: 0,
              fontSize: 12,
              lineHeight: 1.5,
              color: msg.error ? TONE.red : TONE.text,
              marginTop: 8,
            }}
          >
            {msg.text}
          </div>
        )}

        {/* 主体：可滚动 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            paddingRight: 10,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 8,
            paddingTop: 14,
            paddingBottom: 4,
          }}
        >
          {/* 导入卡片 */}
          <div style={sectionCardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 3, height: 13, borderRadius: 2, background: TONE.accent, flexShrink: 0 }} />
              <strong style={{ fontSize: 13, fontWeight: 600, color: TONE.text }}>{T("pl.importSection")}</strong>
            </div>
            <div style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.5, marginTop: 3 }}>
              {T("pl.importSectionDesc")}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={plBtn("primary", "sm")}
                onClick={() => importRef.current?.click()}
                data-tip={T("pl.importTitle")}
              >
                {T("pl.import")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={plBtn("ghost", "sm")}
                onClick={() => setSkillImportOpen(true)}
                data-tip={T("pl.skillImportBtnTitle")}
              >
                {T("pl.skillImport")}
              </Button>
            </div>
          </div>

          {/* 导出卡片（flex 拉伸占满剩余高度，避免分组视图下方留白） */}
          <div style={{ ...sectionCardStyle, flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 3, height: 13, borderRadius: 2, background: TONE.accent, flexShrink: 0 }} />
              <strong style={{ fontSize: 13, fontWeight: 600, color: TONE.text }}>{T("pl.exportSection")}</strong>
            </div>
            <div style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.5, marginTop: 3 }}>
              {T("pl.exportSectionDesc")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
                <input
                  type="checkbox"
                  checked={promptList.length > 0 && exportSelected.size === promptList.length}
                  onChange={toggleExportAll}
                  disabled={promptList.length === 0}
                />
                {T("pl.exportSelectAll")}
              </label>

              {/* 展示方式切换：列表 / 分组 */}
              <div style={{ display: "inline-flex", borderRadius: 7, border: `1px solid ${TONE.border}`, overflow: "hidden" }}>
                {(["list", "group"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setExportView(view)}
                    style={{
                      border: "none",
                      outline: "none",
                      padding: "3px 9px",
                      fontSize: 12,
                      lineHeight: 1.6,
                      cursor: "pointer",
                      fontFamily: MONO,
                      backgroundColor:
                        exportView === view
                          ? "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))"
                          : "transparent",
                      color: exportView === view ? TONE.text : TONE.muted,
                      transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
                    }}
                  >
                    {view === "list" ? T("pl.viewList") : T("pl.viewGroup")}
                  </button>
                ))}
              </div>

              {/* 导出格式选择 */}
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: TONE.muted,
                }}
              >
                <span>{T("pl.exportFormat")}</span>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as TransferFormat)}
                  style={{
                    padding: "3px 6px",
                    fontSize: 12,
                    fontFamily: MONO,
                    color: TONE.text,
                    background: TONE.row,
                    border: `1px solid ${TONE.border}`,
                    borderRadius: 7,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="md">Markdown</option>
                  <option value="txt">{T("pl.format.txt")}</option>
                </select>
              </label>

              <Button
                type="button"
                variant="primary"
                size="sm"
                className={plBtn("primary", "sm")}
                onClick={exportSelectedPrompts}
                data-tip={T("pl.exportTitle")}
              >
                {T("pl.exportSelected")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={plBtn("ghost", "sm")}
                onClick={openSkillExport}
                data-tip={T("pl.skillExportBtnTitle")}
              >
                {T("pl.skillExport")}
              </Button>
              <span style={{ fontSize: 12, fontWeight: 600, color: exportSelected.size > 0 ? TONE.accent : TONE.quiet }}>
                {exportSelected.size > 0
                  ? `${T("pl.export.selectedCount", { selected: exportSelected.size, total: promptList.length })}`
                  : T("pl.sidebar.total", { count: promptList.length })}
              </span>
            </div>

            {/* 提示词勾选列表 */}
            {promptLoading ? (
              <div style={{ padding: "12px 0", fontSize: 12, color: TONE.muted }}>
                {T("pl.loading")}
              </div>
            ) : promptList.length === 0 ? (
              <div style={{ padding: "12px 0", fontSize: 12, color: TONE.muted }}>
                {T("pl.empty")}
              </div>
            ) : exportView === "group" ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  padding: "12px",
                  boxSizing: "border-box",
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 10,
                }}
              >
                {groupedPrompts.map(([group, prompts]) => {
                  const groupChecked =
                    prompts.length > 0 && prompts.every((p) => exportSelected.has(p.id));
                  const collapsed = exportCollapsed.has(group);
                  return (
                    <div key={group} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={groupChecked}
                          onChange={() => {
                            setExportSelected((prev) => {
                              const next = new Set(prev);
                              for (const p of prompts) {
                                if (next.has(p.id)) next.delete(p.id);
                                else next.add(p.id);
                              }
                              return next;
                            });
                          }}
                          data-tip={T("pl.exportSelectAll")}
                          style={{ margin: 0, accentColor: TONE.accent, cursor: "pointer", flexShrink: 0 }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setExportCollapsed((prev) => {
                              const next = new Set(prev);
                              if (next.has(group)) next.delete(group);
                              else next.add(group);
                              return next;
                            })
                          }
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            cursor: "pointer",
                            color: TONE.text,
                            fontSize: 12,
                            fontFamily: MONO,
                            userSelect: "none",
                          }}
                          aria-expanded={!collapsed}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 16 16"
                            style={{
                              color: TONE.muted,
                              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                              transition: "transform .24s cubic-bezier(.22,1,.36,1)",
                              flexShrink: 0,
                            }}
                            aria-hidden="true"
                          >
                            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span style={{ fontWeight: 560 }}>{group}</span>
                          <span style={{ fontSize: 11, color: TONE.quiet }}>
                            {T("pl.sidebar.groupCount", { count: prompts.length })}
                          </span>
                        </button>
                      </div>
                      {!collapsed &&
                        prompts.map((prompt) => (
                          <PromptCheckRow
                            key={prompt.id}
                            title={prompt.title || T("pl.sidebar.uncategorized")}
                            body={prompt.body}
                            checked={exportSelected.has(prompt.id)}
                            onToggle={() => toggleExport(prompt.id)}
                            onView={() => openView(prompt)}
                            onEdit={() => openEdit(prompt)}
                            onDelete={() => requestDelete(prompt)}
                            viewLabel={T("pl.view")}
                            editLabel={T("pl.edit")}
                            deleteLabel={T("pl.delete")}
                          />
                        ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  padding: "12px",
                  boxSizing: "border-box",
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 10,
                }}
              >
                {promptList.map((prompt) => (
                  <PromptCheckRow
                    key={prompt.id}
                    title={prompt.title || T("pl.sidebar.uncategorized")}
                    body={prompt.body}
                    checked={exportSelected.has(prompt.id)}
                    onToggle={() => toggleExport(prompt.id)}
                    onView={() => openView(prompt)}
                    onEdit={() => openEdit(prompt)}
                    onDelete={() => requestDelete(prompt)}
                    viewLabel={T("pl.view")}
                    editLabel={T("pl.edit")}
                    deleteLabel={T("pl.delete")}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 导入数据用的隐藏文件选择 */}
        <input
          ref={importRef}
          type="file"
          accept=".json,.csv,.md,.markdown,.txt,text/plain,text/markdown,text/csv,application/json"
          style={{ display: "none" }}
          onChange={onImportFile}
        />

        {/* 技能导入弹窗 */}
        <SkillImportModal
          open={skillImportOpen}
          onClose={() => setSkillImportOpen(false)}
          t={t}
          onImported={() => {
            notifyDataChanged();
            apiListPrompts().then((list) => setPromptList(list));
          }}
        />

        {/* 通用格式导入弹窗 */}
        <ImportEditModal
          open={importEditOpen}
          onClose={() => setImportEditOpen(false)}
          t={t}
          initialEntries={importEntries}
          onImported={() => {
            notifyDataChanged();
            apiListPrompts().then((list) => setPromptList(list));
          }}
        />

        {/* 技能导出弹窗 */}
        <SkillImportModal
          open={skillExportOpen}
          onClose={() => setSkillExportOpen(false)}
          t={t}
          mode="export"
          initialEntries={skillExportInitial}
        />

        {/* 查看详情弹层：展示完整标题 / 标签 / 正文，仅可通过关闭按钮关闭 */}
        {viewing && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={T("pl.view")}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              background: TONE.panel,
              borderRadius: 12,
            }}
          >
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderBottom: `1px solid ${TONE.border}`,
              }}
            >
              <strong
                style={{
                  flex: "1 1 auto",
                  minWidth: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                data-tip={viewing.title}
              >
                {viewing.title}
              </strong>
              <DialogCloseButton onClick={() => setViewing(null)} label={T("pl.close")} />
            </div>
            {viewing.tags && viewing.tags.length > 0 && (
              <div style={{ flexShrink: 0, display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 14px 0" }}>
                {viewing.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      maxWidth: 96,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      padding: "2px 8px",
                      borderRadius: 8,
                      fontSize: 11,
                      color: TONE.accent,
                      background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 12%, transparent)",
                    }}
                    data-tip={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                padding: "12px 14px",
                fontSize: 13,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: TONE.text,
              }}
            >
              {viewing.body || " "}
            </div>
          </div>
        )}

        {/* 编辑弹层：修改标题 / 正文 / 标签，保存后写入词库 */}
        {editing && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={T("pl.editPrompt")}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 11,
              display: "flex",
              flexDirection: "column",
              background: TONE.panel,
              borderRadius: 12,
            }}
          >
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderBottom: `1px solid ${TONE.border}`,
              }}
            >
              <strong style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600 }}>
                {T("pl.editPrompt")}
              </strong>
              <DialogCloseButton
                onClick={() => {
                  setEditing(null);
                  setEditError(null);
                }}
                label={T("pl.close")}
              />
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                {T("pl.titleField")}
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  style={inputStyle}
                />
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
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
                      e.preventDefault();
                      e.stopPropagation();
                      insertEditVar();
                    }}
                    data-tip={T("pl.insertVariableTitle")}
                  >
                    {`{{${T("pl.insertVariableDefault")}}}`}
                  </Button>
                </span>
                <textarea
                  ref={editBodyRef}
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  rows={6}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 220, lineHeight: 1.6, whiteSpace: "pre-wrap" }}
                />
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                {T("pl.tagsField")}
                <TagInput
                  value={editing.tags}
                  onChange={(v) => setEditing({ ...editing, tags: v })}
                  suggestions={Array.from(new Set(promptList.flatMap((p) => p.tags ?? [])))}
                  inputStyle={inputStyle}
                  t={t}
                />
              </label>
              {editError && <div style={{ color: TONE.red, fontSize: 12 }}>{editError}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={plBtn("ghost", "sm")}
                  onClick={() => {
                    setEditing(null);
                    setEditError(null);
                  }}
                >
                  {T("pl.cancel")}
                </Button>
                <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={saveEdit}>
                  {T("pl.save")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 删除确认弹窗（自定义，替代系统 confirm） */}
        <ConfirmDialog
          open={!!deleteConfirm}
          danger
          message={T("pl.confirmDelete", { title: deleteConfirm?.title ?? "" })}
          confirmLabel={T("pl.delete")}
          cancelLabel={T("pl.cancel")}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={confirmDelete}
        />

        {/* 导出成功提示框：点击「确定」关闭；覆盖在弹窗上方，半透明遮罩区分层级 */}
        {exportDoneMsg && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 100,
              borderRadius: 12,
              background: "rgba(0, 0, 0, 0.32)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <div className={PL_DIALOG} style={{ width: 320, maxWidth: "100%", gap: 14, position: "static" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{exportDoneMsg}</div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={() => setExportDoneMsg(null)}>
                  {T("pl.confirm")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}