/**
 * 导入导出弹窗 — 词库助手「数据管理」→「导入导出」入口。
 *
 * 集中放置与提示词数据导入导出相关的操作：
 * - 导出：勾选要导出的提示词，选择格式（JSON / CSV / Markdown / 文本）下载，或导出为 Skill
 * - 导入：从备份文件（JSON / CSV / Markdown / 文本）导入（卡片编辑校验后合并入库），或从 Skills 导入
 *
 * 由词库助手右键菜单打开，弹窗只能通过关闭按钮手动关闭，不响应遮罩点击。
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { Prompt } from "../../../../types.js";
import {
  exportPrompts as apiExport,
  listPrompts as apiListPrompts,
} from "../../../services/api.js";
import { notifyDataChanged } from "../../../services/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../../utils/button-style.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../../../utils/dialog-style.js";
import { type PLTranslate, usePLT } from "../../../i18n/i18n.js";
import { SkillImportModal } from "./SkillImportModal.js";
import { ImportEditModal } from "./ImportEditModal.js";
import {
  parseImportFile,
  serializeExport,
  type TransferFormat,
} from "../../../services/data-formats.js";

const MONO =
  "var(--dsw-font-family, -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Helvetica Neue\", Helvetica, Arial, sans-serif)";

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)",
} as const;

/** 导入/导出分区卡片样式。 */
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

/** 分区卡片标题行：标题 + 说明，baseline 对齐可换行。 */
const sectionTitleStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  flexWrap: "wrap",
};

/** 导出勾选列表中的单条提示词（卡片式）。 */
function PromptCheckRow(props: {
  title: string;
  body: string;
  checked: boolean;
  onToggle: () => void;
}): ReactNode {
  const { title, body, checked, onToggle } = props;
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

  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    apiExport(ids).then(
      (backup) => {
        const file = serializeExport(
          exportFormat,
          backup.prompts.map((p) => ({
            title: p.title,
            body: p.body,
            tags: p.tags,
          })),
        );
        const blob = new Blob([file.content], { type: file.mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showMsg(T("pl.exported", { count: backup.prompts.length }));
      },
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
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

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T("pl.moduleImportExport")}
      className={PL_DIALOG_OVERLAY}
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
          width: 820,
          maxWidth: "90%",
          height: "min(680px, calc(100vh - 60px))",
          gap: 12,
        }}
      >
        {/* 标题 + 关闭按钮（仅通过按钮手动关闭） */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <strong style={{ fontSize: 15, fontWeight: 560, flex: 1, minWidth: 0 }}>
            {T("pl.moduleImportExport")}
          </strong>
          <button
            type="button"
            onClick={onClose}
            aria-label={T("pl.close")}
            data-tip={T("pl.close")}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              border: "none",
              outline: "none",
              borderRadius: 6,
              background: "transparent",
              color: TONE.muted,
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
              transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
              e.currentTarget.style.color = TONE.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = TONE.muted;
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: 12, color: TONE.quiet, lineHeight: 1.6, flexShrink: 0 }}>
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
          }}
        >
          {/* 导入卡片 */}
          <div style={sectionCardStyle}>
            <div style={sectionTitleStyle}>
              <strong style={{ fontSize: 13, color: TONE.text }}>{T("pl.importSection")}</strong>
              <span style={{ fontSize: 11, color: TONE.quiet }}>{T("pl.importSectionDesc")}</span>
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

          {/* 导出卡片 */}
          <div style={sectionCardStyle}>
            <div style={sectionTitleStyle}>
              <strong style={{ fontSize: 13, color: TONE.text }}>{T("pl.exportSection")}</strong>
              <span style={{ fontSize: 11, color: TONE.quiet }}>{T("pl.exportSectionDesc")}</span>
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
              <span style={{ fontSize: 11, color: TONE.quiet }}>
                {exportSelected.size > 0
                  ? `${exportSelected.size}/${promptList.length}`
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
                  maxHeight: 300,
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
                  maxHeight: 380,
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
        <SkillImportModal open={skillImportOpen} onClose={() => setSkillImportOpen(false)} t={t} />

        {/* 通用格式导入弹窗 */}
        <ImportEditModal
          open={importEditOpen}
          onClose={() => setImportEditOpen(false)}
          t={t}
          initialEntries={importEntries}
          onImported={(res) => {
            showMsg(
              T("pl.imported", {
                imported: res.imported,
                updated: res.updated,
                skipped: res.skipped,
              }),
            );
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
          onExported={(result) => {
            const errNote = result.errors.length
              ? T("pl.skillModal.savedExportErrors", { n: result.errors.length })
              : "";
            const names = result.items.length
              ? `：${result.items.map((i) => i.name).join(", ")}`
              : "";
            showMsg(`${T("pl.skillModal.savedExport", { exported: result.exported })}${names}${errNote}`);
          }}
        />
      </div>
    </div>
  );
}