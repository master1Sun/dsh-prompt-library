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
  listTags as apiListTags,
  saveExportFile,
  updatePrompt as apiUpdate,
} from "../../../services/api.js";
import { notifyDataChanged } from "../../../services/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../../utils/button-style.js";
import {
  PL_DIALOG,
  PL_DIALOG_CSS,
  PL_DIALOG_OVERLAY,
} from "../../../utils/dialog-style.js";
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
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

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

/** 导出勾选列表中的单条提示词（紧凑卡片式）。 */
function PromptCheckRow(props: {
  title: string;
  body: string;
  checked: boolean;
  active: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
}): ReactNode {
  const {
    title,
    body,
    checked,
    active,
    onToggle,
    onPreview,
    onEdit,
    onDelete,
    editLabel,
    deleteLabel,
  } = props;
  // 行内取值跟随父级主题同步重渲染，保证白天/黑夜一致
  const TONE = getTone();
  return (
    <div
      className="pl-data-card"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "7px 9px",
        // 勾选导出的项不高亮；仅「预览/编辑」中的当前项高亮
        background: active ? "rgba(142, 197, 255, 0.10)" : TONE.row,
        border: `1px solid ${active ? "rgba(142, 197, 255, 0.5)" : TONE.border}`,
        borderRadius: 8,
        cursor: "pointer",
        userSelect: "none",
        transition:
          "border-color .24s cubic-bezier(.22,1,.36,1), background-color .24s cubic-bezier(.22,1,.36,1)",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        // 只有点击勾选框才切换勾选，其余位置不触发
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: 3,
          accentColor: TONE.accent,
          cursor: "pointer",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
        title={title}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
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
          >
            {title}
          </span>
          {/* 行内操作：编辑 / 删除（按钮点击需阻断事件冒泡，避免误触预览） */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              flexShrink: 0,
            }}
          >
            {[
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
                  e.currentTarget.style.backgroundColor =
                    "var(--dsw-alias-interactive-bg-hover)";
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
    </div>
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
    Array<{
      promptId: string;
      name?: string;
      title: string;
      body: string;
      summary?: string;
    }>
  >([]);

  // 导入导出列表展示方式：列表 / 分组
  const [exportView, setExportView] = useState<"list" | "group">("list");
  const [exportCollapsed, setExportCollapsed] = useState<Set<string>>(
    new Set(),
  );

  // 待查看详情的提示词（在右侧预览窗口展示，仅可通过关闭按钮关闭）
  const [viewing, setViewing] = useState<Prompt | null>(null);
  // 编辑中的提示词：标题 / 正文 / 标签（标签为单选，兼容下拉组件）
  const [editing, setEditing] = useState<{
    id: string;
    title: string;
    body: string;
    tags: string;
  } | null>(null);
  // 当前高亮的列表项 ID（预览或编辑中的项；取消/保存编辑后回到预览态）
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const editBodyRef = useRef<HTMLTextAreaElement | null>(null);
  // 待确认删除的提示词（自定义确认弹窗，替代系统 confirm）
  const [deleteConfirm, setDeleteConfirm] = useState<Prompt | null>(null);

  const [msg, setMsg] = useState<{
    text: string;
    kind?: "success" | "info" | "error";
  } | null>(null);
  // 词库全部标签候选（含未被提示词引用的残留标签），供编辑时下拉选择
  const [libraryTags, setLibraryTags] = useState<string[]>([]);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 导出成功提示框（导出的 promptId）——点击「确定」关闭
  const [exportDoneMsg, setExportDoneMsg] = useState<string | null>(null);

  const showMsg = useCallback(
    (text: string, kind: "success" | "info" | "error" = "success") => {
      setMsg({ text, kind });
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
      msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
    },
    [],
  );

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
        showMsg(e instanceof Error ? e.message : String(e), "error");
        setPromptLoading(false);
      },
    );
    // 用词库标签表作为完整候选（含未被提示词引用的残留标签），避免编辑时缺失部分标签
    apiListTags().then(
      (tags) => setLibraryTags(tags.map((x) => x.name)),
      () => setLibraryTags([]),
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
      prev.size === promptList.length
        ? new Set()
        : new Set(promptList.map((p) => p.id)),
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
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [promptList, T]);

  /** 导出勾选的提示词为所选格式并触发下载。 */
  const exportSelectedPrompts = useCallback(() => {
    const ids = Array.from(exportSelected);
    if (ids.length === 0) {
      showMsg(T("pl.exportNeedSelect"), "error");
      return;
    }
    // 走后端下载：前端只传 ids + format，后端拉取数据并组织文件写入系统「下载」目录。
    // 写完后才 resolve，避开浏览器下载「选择保存路径」对话框的时序问题，也不拉取正文大文本。
    saveExportFile(ids, exportFormat).then(
      (r) => {
        setExportDoneMsg(
          T("pl.exportedPath", { count: r.count, path: r.filePath }),
        );
      },
      (e) => showMsg(e instanceof Error ? e.message : String(e), "error"),
    );
  }, [exportSelected, exportFormat, showMsg, T]);

  /** 打开技能导出弹窗：把勾选的提示词转成可编辑条目。 */
  const openSkillExport = useCallback(() => {
    const ids = Array.from(exportSelected);
    if (ids.length === 0) {
      showMsg(T("pl.skillExportNeedSelect"), "error");
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
          showMsg(T("pl.importEdit.parseEmpty"), "error");
          return;
        }
        try {
          const parsed = parseImportFile(file.name, text);
          if (parsed.length === 0) {
            showMsg(T("pl.importEdit.parseEmpty"), "error");
            return;
          }
          setImportEntries(parsed);
          setImportEditOpen(true);
        } catch (err) {
          showMsg(
            T("pl.importEdit.parseFail", {
              err: err instanceof Error ? err.message : String(err),
            }),
            "error",
          );
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

  /** 打开右侧预览窗口（切换到预览模式并高亮对应列表项）。 */
  const openView = useCallback((p: Prompt) => {
    setEditing(null);
    setEditError(null);
    setActiveId(p.id);
    setViewing(p);
  }, []);

  /** 打开右侧编辑窗口（标签预填首个，兼容单选下拉；保留预览数据，取消后可回到预览态）。 */
  const openEdit = useCallback((p: Prompt) => {
    setEditError(null);
    setActiveId(p.id);
    setViewing(p);
    setEditing({
      id: p.id,
      title: p.title,
      body: p.body,
      tags: (p.tags ?? [])[0] ?? "",
    });
  }, []);

  /** 列表项点击：若点击的正是当前预览/编辑项则取消（清空高亮与右侧预览），否则打开预览。 */
  const handleRowPreview = useCallback(
    (p: Prompt) => {
      if (activeId === p.id) {
        setActiveId(null);
        setViewing(null);
        setEditing(null);
        setEditError(null);
      } else {
        openView(p);
      }
    },
    [activeId, openView],
  );

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
        // 关闭编辑、回到预览状态（activeId 仍在则高亮保留），并展示更新后的内容
        setEditing(null);
        setEditError(null);
        setViewing((cur) =>
          cur ? { ...cur, title, body: editing.body, tags } : cur,
        );
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
        // 若删除的是当前预览/编辑中的项，清空右侧窗口与左侧高亮
        if (activeId === deleteConfirm.id) {
          setActiveId(null);
          setViewing(null);
          setEditing(null);
          setEditError(null);
        }
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
        showMsg(e instanceof Error ? e.message : String(e), "error");
      },
    );
  }, [deleteConfirm, activeId, showMsg, refreshList]);

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <BookIcon color={TONE.accent} />
          <strong
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: 600,
              color: TONE.text,
              minWidth: 0,
            }}
          >
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
                background:
                  msg.kind === "error"
                    ? TONE.red
                    : msg.kind === "info"
                      ? TONE.accent
                      : TONE.mint,
              }}
            />
          )}
          {msg?.text ?? ""}
        </div>

        {/* 主体：左右分栏（左列操作+列表，右列预览/编辑窗口）——与人格管理一致的面板比例 */}
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
          {/* 左栏：导入/导出操作 + 提示词列表（紧凑） */}
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
            {/* 顶部标题 + 导入导出操作：内容上滑时悬浮固定在顶部 */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 3,
                padding: "10px 10px 9px",
                background: TONE.row,
                borderBottom: `1px solid ${TONE.border}`,
              }}
            >
              {/* 功能分区 1：导入 */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 3,
                    height: 13,
                    borderRadius: 2,
                    background: TONE.accent,
                    flexShrink: 0,
                  }}
                />
                <strong
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: TONE.text,
                    flexShrink: 0,
                  }}
                >
                  {T("pl.importSection")}
                </strong>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: TONE.quiet,
                    lineHeight: 1.5,
                    textAlign: "right",
                  }}
                >
                  {T("pl.importSectionDesc")}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginTop: 6,
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className={plBtn("primary", "sm")}
                  onClick={() => importRef.current?.click()}
                  data-tip={T("pl.importTitle")}
                >
                  {T("pl.importData")}
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

              {/* 分区间的分割线：导入 / 导出是两个独立功能 */}
              <div
                style={{
                  height: 1,
                  background: TONE.border,
                  margin: "12px 0 10px",
                }}
              />

              {/* 功能分区 2：导出 */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 3,
                    height: 13,
                    borderRadius: 2,
                    background: TONE.accent,
                    flexShrink: 0,
                  }}
                />
                <strong
                  style={{ fontSize: 12, fontWeight: 600, color: TONE.text }}
                >
                  {T("pl.exportSection")}
                </strong>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: TONE.quiet,
                    flexShrink: 0,
                  }}
                >
                  {exportSelected.size > 0
                    ? T("pl.export.selectedCount", {
                        selected: exportSelected.size,
                        total: promptList.length,
                      })
                    : T("pl.sidebar.total", { count: promptList.length })}
                </span>
              </div>
              {/* 导出工具栏：列表/分组 + 格式 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 7,
                }}
              >
                {/* 展示方式切换：列表 / 分组 */}
                <div
                  style={{
                    display: "inline-flex",
                    borderRadius: 7,
                    border: `1px solid ${TONE.border}`,
                    overflow: "hidden",
                  }}
                >
                  {(["list", "group"] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setExportView(view)}
                      style={{
                        border: "none",
                        outline: "none",
                        padding: "3px 24px",
                        fontSize: 12,
                        lineHeight: 1.6,
                        cursor: "pointer",
                        fontFamily: MONO,
                        backgroundColor:
                          exportView === view
                            ? "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))"
                            : "transparent",
                        color: exportView === view ? TONE.text : TONE.muted,
                        transition:
                          "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
                      }}
                    >
                      {view === "list" ? T("pl.viewList") : T("pl.viewGroup")}
                    </button>
                  ))}
                </div>

                {/* 导出格式选择（居右） */}
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    color: TONE.muted,
                    marginLeft: "auto",
                  }}
                >
                  <span>{T("pl.exportFormat")}</span>
                  <select
                    value={exportFormat}
                    onChange={(e) =>
                      setExportFormat(e.target.value as TransferFormat)
                    }
                    style={{
                      padding: "3px 16px",
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
              </div>

              {/* 导出操作按钮栏（与上方筛选区分隔）：左侧全选，右侧导出操作 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginTop: 9,
                  paddingTop: 9,
                  borderTop: `1px solid ${TONE.border}`,
                }}
              >
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    color: TONE.muted,
                    cursor: "pointer",
                    userSelect: "none",
                    flexShrink: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      promptList.length > 0 &&
                      exportSelected.size === promptList.length
                    }
                    onChange={toggleExportAll}
                    disabled={promptList.length === 0}
                  />
                  {promptList.length > 0 && exportSelected.size === promptList.length
                    ? T("pl.importEdit.deselectAll")
                    : T("pl.exportSelectAll")}
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
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
                </div>
              </div>
            </div>

            {/* 提示词勾选列表（紧凑卡片） */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: "10px 10px",
              }}
            >
              {promptLoading ? (
                <div
                  style={{
                    padding: "14px 0",
                    fontSize: 12,
                    color: TONE.muted,
                    textAlign: "center",
                  }}
                >
                  {T("pl.loading")}
                </div>
              ) : promptList.length === 0 ? (
                <div
                  style={{
                    padding: "14px 0",
                    fontSize: 12,
                    color: TONE.muted,
                    textAlign: "center",
                  }}
                >
                  {T("pl.empty")}
                </div>
              ) : exportView === "group" ? (
                groupedPrompts.map(([group, prompts]) => {
                  const groupChecked =
                    prompts.length > 0 &&
                    prompts.every((p) => exportSelected.has(p.id));
                  const collapsed = exportCollapsed.has(group);
                  return (
                    <div
                      key={group}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
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
                          style={{
                            margin: 0,
                            accentColor: TONE.accent,
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
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
                              transform: collapsed
                                ? "rotate(-90deg)"
                                : "rotate(0deg)",
                              transition:
                                "transform .24s cubic-bezier(.22,1,.36,1)",
                              flexShrink: 0,
                            }}
                            aria-hidden="true"
                          >
                            <path
                              d="M4 6l4 4 4-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span style={{ fontWeight: 560 }}>{group}</span>
                          <span style={{ fontSize: 11, color: TONE.quiet }}>
                            {T("pl.sidebar.groupCount", {
                              count: prompts.length,
                            })}
                          </span>
                        </button>
                      </div>
                      {!collapsed &&
                        prompts.map((prompt) => (
                          <PromptCheckRow
                            key={prompt.id}
                            title={
                              prompt.title || T("pl.sidebar.uncategorized")
                            }
                            body={prompt.body}
                            checked={exportSelected.has(prompt.id)}
                            active={activeId === prompt.id}
                            onToggle={() => toggleExport(prompt.id)}
                            onPreview={() => handleRowPreview(prompt)}
                            onEdit={() => openEdit(prompt)}
                            onDelete={() => requestDelete(prompt)}
                            editLabel={T("pl.edit")}
                            deleteLabel={T("pl.delete")}
                          />
                        ))}
                    </div>
                  );
                })
              ) : (
                promptList.map((prompt) => (
                  <PromptCheckRow
                    key={prompt.id}
                    title={prompt.title || T("pl.sidebar.uncategorized")}
                    body={prompt.body}
                    checked={exportSelected.has(prompt.id)}
                    active={activeId === prompt.id}
                    onToggle={() => toggleExport(prompt.id)}
                    onPreview={() => handleRowPreview(prompt)}
                    onEdit={() => openEdit(prompt)}
                    onDelete={() => requestDelete(prompt)}
                    editLabel={T("pl.edit")}
                    deleteLabel={T("pl.delete")}
                  />
                ))
              )}
            </div>
          </div>

          {/* 右栏：预览 / 编辑窗口（点击列表项后在此查看详情或编辑） */}
          <div
            style={{
              flex: "1.15 1 0",
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              boxSizing: "border-box",
              background: TONE.panel,
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              overflowY: "auto",
            }}
          >
            {editing ? (
              <>
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 3,
                    padding: "10px 14px 8px",
                    background: TONE.panel,
                    borderBottom: `1px solid ${TONE.border}`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        width: 3,
                        height: 13,
                        borderRadius: 2,
                        background: TONE.accent,
                        flexShrink: 0,
                      }}
                    />
                    <strong
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: TONE.text,
                      }}
                    >
                      {T("pl.editPrompt")}
                    </strong>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 9,
                    padding: "12px 14px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      fontSize: 12,
                      color: TONE.muted,
                    }}
                  >
                    {T("pl.titleField")}
                    <input
                      value={editing.title}
                      onChange={(e) =>
                        setEditing({ ...editing, title: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      fontSize: 12,
                      color: TONE.muted,
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      {T("pl.bodyField")}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={plBtn("ghost", "sm")}
                        style={{ flex: "0 0 auto" }}
                        onMouseDown={(e: ReactMouseEvent<HTMLButtonElement>) =>
                          e.preventDefault()
                        }
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
                      onChange={(e) =>
                        setEditing({ ...editing, body: e.target.value })
                      }
                      rows={8}
                      style={{
                        ...inputStyle,
                        resize: "none",
                        minHeight: 340,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    />
                  </div>
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      fontSize: 12,
                      color: TONE.muted,
                    }}
                  >
                    {T("pl.tagsField")}
                    <TagInput
                      value={editing.tags}
                      onChange={(v) => setEditing({ ...editing, tags: v })}
                      suggestions={libraryTags}
                      inputStyle={inputStyle}
                      t={t}
                    />
                  </label>
                  {editError && (
                    <div style={{ color: TONE.red, fontSize: 12 }}>
                      {editError}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                      marginTop: 2,
                    }}
                  >
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
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className={plBtn("primary", "sm")}
                      onClick={saveEdit}
                    >
                      {T("pl.save")}
                    </Button>
                  </div>
                </div>
              </>
            ) : viewing ? (
              <>
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 3,
                    padding: "10px 14px 8px",
                    background: TONE.panel,
                    borderBottom: `1px solid ${TONE.border}`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        width: 3,
                        height: 13,
                        borderRadius: 2,
                        background: TONE.accent,
                        flexShrink: 0,
                      }}
                    />
                    <strong
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: TONE.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      data-tip={viewing.title}
                    >
                      {viewing.title}
                    </strong>
                    {typeof viewing.usageCount === "number" && (
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 11,
                          color: TONE.quiet,
                        }}
                      >
                        {T("pl.previewUsage", { count: viewing.usageCount })}
                      </span>
                    )}
                  </div>
                  {viewing.tags && viewing.tags.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 5,
                        marginTop: 8,
                      }}
                    >
                      {viewing.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            maxWidth: 120,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            padding: "2px 8px",
                            borderRadius: 8,
                            fontSize: 11,
                            color: TONE.accent,
                            background:
                              "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 12%, transparent)",
                          }}
                          data-tip={tag}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  style={{
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
              </>
            ) : (
              <div
                style={{
                  height: "100%",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: 24,
                  fontSize: 12.5,
                  color: TONE.quiet,
                  textAlign: "center",
                }}
              >
                {T("pl.previewEmpty")}
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
            <div
              className={PL_DIALOG}
              style={{
                width: 320,
                maxWidth: "100%",
                gap: 14,
                position: "static",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {exportDoneMsg}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className={plBtn("primary", "sm")}
                  onClick={() => setExportDoneMsg(null)}
                >
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
