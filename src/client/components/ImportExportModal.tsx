/**
 * 导入导出弹窗 — 词库助手右键菜单「导入导出」入口。
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
  type ReactNode,
} from "react";
import type { Prompt } from "../../types.js";
import {
  deletePrompt as apiDeletePrompt,
  listPrompts as apiListPrompts,
  saveExportFile,
} from "../utils/api.js";
import { notifyDataChanged } from "../utils/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../utils/button-style.js";
import {
  PL_DIALOG,
  PL_DIALOG_CSS,
  PL_DIALOG_OVERLAY,
} from "../utils/dialog-style.js";
import { getTone, useThemeSync } from "../utils/theme.js";
import { type PLT, type PLTranslate, usePLT } from "../utils/i18n.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { DialogCloseButton } from "./DialogCloseButton.js";
import { BookIcon } from "./BookIcon.js";
import { SkillImportModal } from "./SkillImportModal.js";
import { ImportEditModal } from "./ImportEditModal.js";
import {
  parseImportFile,
  type TransferFormat,
} from "../utils/data-formats.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

/** 导出勾选列表中的单条提示词（紧凑卡片式，样式与词库管理列表一致）。 */
function PromptCheckRow(props: {
  t: PLT;
  title: string;
  body: string;
  tags?: string[];
  usageCount: number;
  checked: boolean;
  active: boolean;
  onToggle: () => void;
  onPreview: () => void;
}): ReactNode {
  const { t, title, body, tags, usageCount, checked, active, onToggle, onPreview } =
    props;
  // 行内取值跟随父级主题同步重渲染，保证白天/黑夜一致
  const TONE = getTone();
  return (
    <div
      className={active ? "pl-lex-row pl-lex-row--active" : "pl-lex-row"}
      onClick={onPreview}
      title={title}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
        }}
      >
        {/* 勾选导出复选框：点击仅切换勾选，不触发预览 */}
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          aria-label={t("pl.exportSelectAll")}
          style={{
            flexShrink: 0,
            width: 13,
            height: 13,
            margin: 0,
            cursor: "pointer",
            accentColor: TONE.accent,
          }}
        />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 12.5,
            fontWeight: 560,
            lineHeight: 1.4,
            color: TONE.text,
          }}
        >
          {title}
        </span>
        <span
          style={{
            flexShrink: 0,
            fontSize: 11,
            color: TONE.quiet,
          }}
        >
          {t("pl.previewUsage", { count: usageCount })}
        </span>
      </div>
      {/* 正文两行预览：超出部分省略号截断 */}
      <div
        style={{
          fontSize: 11.5,
          lineHeight: 1.5,
          color: TONE.muted,
          minWidth: 0,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          wordBreak: "break-word",
        }}
      >
        {body.replace(/\s+/g, " ").trim() || "\u00A0"}
      </div>
      {tags && tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 10.5,
                lineHeight: 1.4,
                color: TONE.accent,
                background: TONE.accentSoft,
                borderRadius: 4,
                padding: "1px 6px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
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
  // 时间格式化：与词库管理预览一致
  const fmtTime = (ts: number): string =>
    ts ? new Date(ts).toLocaleString() : "-";
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
  // 导出列表搜索词：匹配标题或正文
  const [exportQuery, setExportQuery] = useState("");

  // 待查看详情的提示词（在右侧预览窗口展示，仅可通过关闭按钮关闭）
  const [viewing, setViewing] = useState<Prompt | null>(null);
  // 当前高亮的列表项 ID（预览中的项；再次点击可取消高亮）
  const [activeId, setActiveId] = useState<string | null>(null);
  // 预览窗口待删除确认的提示词（右上角「删除」触发）
  const [deleteTarget, setDeleteTarget] = useState<Prompt | null>(null);

  const [msg, setMsg] = useState<{
    text: string;
    kind?: "success" | "info" | "error";
  } | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 导出成功提示框（导出的 promptId）——点击「确定」关闭
  const [exportDoneMsg, setExportDoneMsg] = useState<string | null>(null);
  // 保存成功结果通知气泡（导入数据 / 导入技能 / 导出技能保存成功后，在一级弹窗左下角弹出）
  const [resultToast, setResultToast] = useState<string | null>(null);
  const resultToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMsg = useCallback(
    (text: string, kind: "success" | "info" | "error" = "success") => {
      setMsg({ text, kind });
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
      msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
    },
    [],
  );

  /** 展示保存成功结果气泡（一级弹窗左下角，4s 后自动消失；悬停暂停 / 手动关闭）。 */
  const showResultToast = useCallback((text: string) => {
    setResultToast(text);
    if (resultToastTimerRef.current) clearTimeout(resultToastTimerRef.current);
    resultToastTimerRef.current = setTimeout(() => setResultToast(null), 4000);
  }, []);
  const pauseResultToast = useCallback(() => {
    if (resultToastTimerRef.current) clearTimeout(resultToastTimerRef.current);
  }, []);
  const resumeResultToast = useCallback(() => {
    if (resultToastTimerRef.current) clearTimeout(resultToastTimerRef.current);
    resultToastTimerRef.current = setTimeout(() => setResultToast(null), 4000);
  }, []);

  useEffect(
    () => () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
      if (resultToastTimerRef.current) clearTimeout(resultToastTimerRef.current);
    },
    [],
  );

  // 打开时重置选区并拉取提示词列表
  useEffect(() => {
    if (!open) return;
    setMsg(null);
    setExportSelected(new Set());
    setExportQuery("");
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
  }, [open, showMsg]);

  // 当预览/高亮的提示词在列表刷新（导入后、重新打开）后已不存在时，
  // 清空预览与高亮，避免右栏继续展示上一次的旧内容
  useEffect(() => {
    if (!activeId) return;
    if (!promptList.some((p) => p.id === activeId)) {
      setActiveId(null);
      setViewing(null);
    }
  }, [activeId, promptList]);

  /** 切换单条提示词导出选中。 */
  const toggleExport = useCallback((id: string) => {
    setExportSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** 导出列表按搜索词过滤：匹配标题或正文，忽略大小写。 */
  const filteredPrompts = useMemo(() => {
    const q = exportQuery.trim().toLowerCase();
    if (!q) return promptList;
    return promptList.filter(
      (p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.body || "").toLowerCase().includes(q),
    );
  }, [promptList, exportQuery]);

  /** 全选 / 取消全选提示词（仅针对当前搜索过滤结果）。 */
  const toggleExportAll = useCallback(() => {
    setExportSelected((prev) =>
      prev.size === filteredPrompts.length
        ? new Set()
        : new Set(filteredPrompts.map((p) => p.id)),
    );
  }, [filteredPrompts]);

  /** 分组展示：按提示词首个标签分组；无标签归入「未分类」。 */
  const groupedPrompts = useMemo(() => {
    const groups = new Map<string, Prompt[]>();
    for (const p of filteredPrompts) {
      const key = p.tags?.[0]?.trim() || T("pl.sidebar.uncategorized");
      const list = groups.get(key);
      if (list) list.push(p);
      else groups.set(key, [p]);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [filteredPrompts, T]);

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

  /** 打开右侧预览窗口（切换到预览模式并高亮对应列表项）。 */
  const openView = useCallback((p: Prompt) => {
    setActiveId(p.id);
    setViewing(p);
  }, []);

  /** 列表项点击：若点击的正是当前预览项则取消（清空高亮与右侧预览），否则打开预览。 */
  const handleRowPreview = useCallback(
    (p: Prompt) => {
      if (activeId === p.id) {
        setActiveId(null);
        setViewing(null);
      } else {
        openView(p);
      }
    },
    [activeId, openView],
  );

  /** 确认删除预览中的提示词：成功后刷新列表、清空预览与勾选，并同步全局数据。 */
  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    apiDeletePrompt(id).then(
      () => {
        setDeleteTarget(null);
        setActiveId(null);
        setViewing(null);
        setExportSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showMsg(T("pl.deleted"), "success");
        notifyDataChanged();
        apiListPrompts().then((list) => setPromptList(list));
      },
      (e: unknown) => {
        setDeleteTarget(null);
        showMsg(e instanceof Error ? e.message : String(e), "error");
      },
    );
  }, [deleteTarget, showMsg, T]);

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
.pl-lex-row{display:flex;flex-direction:column;gap:4;padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(196,211,232,.16));background:var(--dsw-alias-bg-layer-3,#1d2735);cursor:pointer;user-select:none;transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-lex-row:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3,rgba(196,211,232,.31))}
.pl-lex-row--active{background:rgba(142,197,255,.10);border-color:rgba(142,197,255,.5)}
`}</style>
      <div
        className={PL_DIALOG}
        style={{
          position: "relative",
          width: 800,
          height: 800,
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

        {/* 主体：左右分栏（左列操作+列表，右列预览窗口）——与人格管理一致的面板比例 */}
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
                {/* 展示方式切换：列表 / 分类，置于导出标题右侧，样式与词库管理一致 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    marginLeft: "auto",
                    flexShrink: 0,
                    background: TONE.panel,
                    border: `1px solid ${TONE.border}`,
                    borderRadius: 7,
                    padding: 2,
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
                        cursor: "pointer",
                        fontFamily: MONO,
                        fontSize: 11.5,
                        lineHeight: 1.4,
                        padding: "2px 8px",
                        borderRadius: 5,
                        color:
                          exportView === view ? TONE.accent : TONE.quiet,
                        background:
                          exportView === view
                            ? TONE.accentSoft
                            : "transparent",
                        transition: "color .18s, background-color .18s",
                      }}
                    >
                      {view === "list" ? T("pl.viewList") : T("pl.viewGroup")}
                    </button>
                  ))}
                </div>
              </div>

              {/* 导出格式 + 导出按钮：位于导出标题下一行 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 7,
                }}
              >
                {/* 导出格式选择（左侧） */}
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
                {/* 导出操作按钮（居右）：导出选中 + 导出 Skill */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginLeft: "auto",
                    flexShrink: 0,
                  }}
                >
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

              {/* 导出列表搜索：匹配标题或正文 */}
              <div
                style={{
                  position: "relative",
                  flexShrink: 0,
                  marginTop: 9,
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    position: "absolute",
                    left: 9,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: TONE.quiet,
                    pointerEvents: "none",
                  }}
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.2-3.2" />
                </svg>
                <input
                  value={exportQuery}
                  onChange={(e) => setExportQuery(e.target.value)}
                  placeholder={T("pl.search")}
                  spellCheck={false}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "5px 26px 5px 28px",
                    color: TONE.text,
                    background: TONE.panel,
                    border: `1px solid ${TONE.border}`,
                    borderRadius: 7,
                    outline: "none",
                    fontFamily: MONO,
                    fontSize: 12,
                  }}
                />
                {exportQuery && (
                  <button
                    type="button"
                    title={T("pl.clearSearch")}
                    onClick={() => setExportQuery("")}
                    style={{
                      position: "absolute",
                      right: 6,
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: TONE.quiet,
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* 全选 / 计数栏（参考词库管理）：左侧全选/取消全选，右侧已选/总数 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexShrink: 0,
                  marginTop: 9,
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
                      filteredPrompts.length > 0 &&
                      exportSelected.size === filteredPrompts.length
                    }
                    onChange={toggleExportAll}
                    disabled={filteredPrompts.length === 0}
                  />
                  {filteredPrompts.length > 0 &&
                  exportSelected.size === filteredPrompts.length
                    ? T("pl.importEdit.deselectAll")
                    : T("pl.exportSelectAll")}
                </label>
                <span
                  style={{
                    fontSize: 11,
                    color: TONE.quiet,
                    flexShrink: 0,
                  }}
                >
                  {T("pl.export.selectedCount", {
                    selected: exportSelected.size,
                    total: filteredPrompts.length,
                  })}
                </span>
              </div>
            </div>

            {/* 提示词勾选列表（紧凑卡片，样式与词库管理列表一致） */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 10,
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
              ) : filteredPrompts.length === 0 ? (
                <div
                  style={{
                    padding: "14px 0",
                    fontSize: 12,
                    color: TONE.muted,
                    textAlign: "center",
                  }}
                >
                  {exportQuery.trim() ? T("pl.searchEmpty") : T("pl.empty")}
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
                      {/* 分类标题：勾选可全选组内条目，点击其余区域折叠/展开 */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setExportCollapsed((prev) => {
                            const next = new Set(prev);
                            if (next.has(group)) next.delete(group);
                            else next.add(group);
                            return next;
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExportCollapsed((prev) => {
                              const next = new Set(prev);
                              if (next.has(group)) next.delete(group);
                              else next.add(group);
                              return next;
                            });
                          }
                        }}
                        title={
                          collapsed
                            ? T("pl.lexicon.expandGroup")
                            : T("pl.lexicon.collapseGroup")
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "2px 4px",
                          borderRadius: 6,
                          cursor: "pointer",
                          userSelect: "none",
                          transition: "background-color .18s",
                        }}
                      >
                        {/* 组内全选复选框：点击仅切换勾选，不触发折叠/展开 */}
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
                          onClick={(e) => e.stopPropagation()}
                          aria-label={T("pl.exportSelectAll")}
                          style={{
                            flexShrink: 0,
                            width: 13,
                            height: 13,
                            margin: 0,
                            cursor: "pointer",
                            accentColor: TONE.accent,
                          }}
                        />
                        {/* 折叠/展开图标 */}
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
                        {/* 分类标签 */}
                        <span
                          style={{
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: 12,
                            fontFamily: MONO,
                            fontWeight: 560,
                            color: TONE.text,
                          }}
                        >
                          {group}
                        </span>
                        {/* 条目数量 */}
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 11,
                            color: TONE.quiet,
                          }}
                        >
                          {T("pl.sidebar.groupCount", {
                            count: prompts.length,
                          })}
                        </span>
                      </div>
                      {!collapsed &&
                        prompts.map((prompt) => (
                          <PromptCheckRow
                            key={prompt.id}
                            t={T}
                            title={
                              prompt.title || T("pl.sidebar.uncategorized")
                            }
                            body={prompt.body}
                            tags={prompt.tags}
                            usageCount={prompt.usageCount}
                            checked={exportSelected.has(prompt.id)}
                            active={activeId === prompt.id}
                            onToggle={() => toggleExport(prompt.id)}
                            onPreview={() => handleRowPreview(prompt)}
                          />
                        ))}
                    </div>
                  );
                })
              ) : (
                filteredPrompts.map((prompt) => (
                  <PromptCheckRow
                    key={prompt.id}
                    t={T}
                    title={prompt.title || T("pl.sidebar.uncategorized")}
                    body={prompt.body}
                    tags={prompt.tags}
                    usageCount={prompt.usageCount}
                    checked={exportSelected.has(prompt.id)}
                    active={activeId === prompt.id}
                    onToggle={() => toggleExport(prompt.id)}
                    onPreview={() => handleRowPreview(prompt)}
                  />
                ))
              )}
            </div>
          </div>

          {/* 右栏：预览窗口（点击列表项后在此查看详情） */}
          <div
            style={{
              flex: "1.15 1 0",
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              boxSizing: "border-box",
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {viewing ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: 12,
                  height: "100%",
                  boxSizing: "border-box",
                }}
              >
                {/* 标题 + 右上角删除按钮（删除需二次确认） */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 3,
                      height: 15,
                      borderRadius: 2,
                      background: TONE.accent,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: 600,
                      color: TONE.text,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {viewing.title}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={plBtn("ghost", "sm")}
                    onClick={() => setDeleteTarget(viewing)}
                    style={{ color: TONE.red }}
                    data-tip={T("pl.delete")}
                  >
                    {T("pl.delete")}
                  </Button>
                </div>
                {/* 标签：无标签时显示「无标签」占位 */}
                {viewing.tags && viewing.tags.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 5,
                      flexShrink: 0,
                    }}
                  >
                    {viewing.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 11,
                          lineHeight: 1.5,
                          color: TONE.accent,
                          background: TONE.accentSoft,
                          borderRadius: 5,
                          padding: "1px 8px",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 5,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: TONE.quiet,
                        background: TONE.panel,
                        borderRadius: 5,
                        padding: "1px 8px",
                      }}
                    >
                      {T("pl.tagsEmpty")}
                    </span>
                  </div>
                )}
                {/* 统计信息：2×2 对称卡片（与词库管理一致） */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  {[
                    {
                      label: T("pl.lexicon.usage"),
                      value: `${viewing.usageCount} ${T("pl.lexicon.usageUnit")}`,
                    },
                    {
                      label: T("pl.lexicon.createdAt"),
                      value: fmtTime(viewing.createdAt),
                    },
                    {
                      label: T("pl.lexicon.updatedAt"),
                      value: fmtTime(viewing.updatedAt),
                    },
                    {
                      label: T("pl.lexicon.lastUsed"),
                      value: viewing.lastUsedAt
                        ? fmtTime(viewing.lastUsedAt)
                        : T("pl.lexicon.neverUsed"),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        flex: "1 1 calc(50% - 4px)",
                        minWidth: 0,
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        padding: "7px 10px",
                        borderRadius: 7,
                        background: TONE.panel,
                        border: `1px solid ${TONE.border}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          lineHeight: 1.4,
                          color: TONE.quiet,
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          lineHeight: 1.4,
                          color: TONE.text,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
                {/* AI 摘要 */}
                <div style={{ flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: TONE.text,
                      marginBottom: 4,
                    }}
                  >
                    {T("pl.lexicon.summary")}
                  </div>
                  {viewing.summary ? (
                    <div
                      style={{
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: TONE.muted,
                        background: TONE.panel,
                        border: `1px solid ${TONE.border}`,
                        borderRadius: 7,
                        padding: "7px 10px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        // 摘要最多三行高度，内容超出时可滚动查看
                        maxHeight: 57.6,
                        overflowY: "auto",
                      }}
                    >
                      {viewing.summary}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: TONE.quiet }}>
                      {T("pl.lexicon.noSummary")}
                    </div>
                  )}
                </div>
                {/* 正文 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: TONE.text,
                      flexShrink: 0,
                    }}
                  >
                    {T("pl.bodyField")}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflow: "auto",
                      fontSize: 12.5,
                      lineHeight: 1.7,
                      color: TONE.text,
                      background: TONE.panel,
                      border: `1px solid ${TONE.border}`,
                      borderRadius: 7,
                      padding: "8px 10px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: MONO,
                    }}
                  >
                    {viewing.body || " "}
                  </div>
                </div>
              </div>
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
          onSaved={(summary) => {
            setSkillImportOpen(false);
            showResultToast(summary);
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
          onSaved={(summary) => {
            setImportEditOpen(false);
            showResultToast(summary);
          }}
        />

        {/* 技能导出弹窗 */}
        <SkillImportModal
          open={skillExportOpen}
          onClose={() => setSkillExportOpen(false)}
          t={t}
          mode="export"
          initialEntries={skillExportInitial}
          onSaved={(summary) => {
            setSkillExportOpen(false);
            showResultToast(summary);
          }}
        />

        {/* 预览条目删除二次确认（danger：确认按钮红色，仅通过按钮关闭） */}
        <ConfirmDialog
          open={!!deleteTarget}
          danger
          message={
            deleteTarget
              ? T("pl.confirmDelete", { title: deleteTarget.title })
              : ""
          }
          confirmLabel={T("pl.delete")}
          cancelLabel={T("pl.cancel")}
          onCancel={() => setDeleteTarget(null)}
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

        {/* 保存成功结果通知气泡：位于一级弹窗左下角，自动消失（悬停暂停 / 手动关闭） */}
        {resultToast && (
          <div
            role="status"
            onMouseEnter={pauseResultToast}
            onMouseLeave={resumeResultToast}
            style={{
              position: "absolute",
              bottom: 14,
              left: 16,
              zIndex: 300,
              maxWidth: 360,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 12px",
              borderRadius: 12,
              fontSize: 12,
              lineHeight: 1.5,
              color: TONE.text,
              background: "color-mix(in srgb, var(--dsw-alias-bg-layer-1, #171f2b) 82%, transparent)",
              WebkitBackdropFilter: "blur(12px)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${TONE.borderStrong}`,
              boxShadow: "0 8px 24px rgba(0, 0, 0, .22)",
            }}
          >
            <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: "50%", background: TONE.mint }} />
            <span style={{ flex: 1, minWidth: 0 }}>{resultToast}</span>
            <button
              type="button"
              onClick={() => setResultToast(null)}
              data-tip={T("pl.close")}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                color: TONE.quiet,
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
                fontFamily: MONO,
                padding: "0 2px",
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
