/**
 * 词库「词库管理」面板 — 注册到 harness 的 settings.section 插槽（独立槽位）。
 *
 * 集中放置与提示词数据相关的管理操作，全部以内联模块（非弹窗）展示：
 * 1. 导入导出：勾选要导出的提示词生成备份文件，或从备份文件导入（合并式）
 * 2. 标签管理：新建 / 重命名 / 删除标签（表单式）
 * 3. 回收站：表单式展示已删除提示词，支持恢复 / 永久删除
 * 4. 自动备份：备份设置 / 立即备份 / 备份列表与恢复（独立 BackupModule）
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
import type { Prompt, TrashItem } from "../../../types.js";
import {
  createTag as apiCreateTag,
  deleteTag as apiDeleteTag,
  deleteTrash as apiDeleteTrash,
  exportPrompts as apiExport,
  importPrompts as apiImport,
  listPrompts as apiListPrompts,
  listTags as apiListTags,
  listTrash as apiListTrash,
  renameTag as apiRenameTag,
  restoreTrash as apiRestoreTrash,
} from "../../services/api.js";
import { notifyDataChanged, useDataChanged } from "../../services/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../utils/button-style.js";
import { type PLTranslate, usePLT } from "../../i18n/i18n.js";
import { SkillImportModal } from "./modules/SkillImportModal.js";
import { BackupModule } from "./modules/BackupModule.js";

const MONO =
  '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "黑体", sans-serif';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  red: "var(--dsw-alias-state-error-primary, #f87171)",
} as const;

const inputStyle: CSSProperties = {
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
};

/** 内联模块卡片样式。 */
const moduleStyle: CSSProperties = {
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  background: TONE.panel,
  border: `1px solid ${TONE.border}`,
  borderRadius: 10,
  padding: "14px 16px",
  marginTop: 12,
};

const moduleTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 560,
  color: TONE.text,
};

const moduleDescStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: TONE.quiet,
};

/** 格式化删除时间：YYYY-MM-DD HH:mm。 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 计算距自动清除的剩余天数（向上取整，至少显示 1 天；当天显示 0）。 */
function daysLeft(deletedAt: number): number {
  const remain = deletedAt + 30 * 24 * 60 * 60 * 1000 - Date.now();
  return remain <= 0 ? 0 : Math.ceil(remain / (24 * 60 * 60 * 1000));
}

/**
 * 手风琴式模块卡片：标题 + 描述可点击折叠/展开，内容仅在展开时渲染。
 */
function ModuleCard(props: {
  title: ReactNode;
  desc?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}): ReactNode {
  const { title, desc, open, onToggle, children } = props;
  return (
    <section style={moduleStyle}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={moduleTitleStyle}>{title}</div>
          {desc && <div style={moduleDescStyle}>{desc}</div>}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          style={{
            flexShrink: 0,
            color: TONE.muted,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .24s cubic-bezier(.22,1,.36,1)",
          }}
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {open && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>}
    </section>
  );
}

/** 导出勾选列表中的单条提示词行。 */
function PromptCheckRow(props: {
  title: string;
  body: string;
  checked: boolean;
  onToggle: () => void;
}): ReactNode {
  const { title, body, checked, onToggle } = props;
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "7px 9px",
        background: TONE.row,
        border: `1px solid ${TONE.border}`,
        borderRadius: 7,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} style={{ marginTop: 2 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 520,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={title}
        >
          {title}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 11,
            color: TONE.quiet,
            lineHeight: 1.4,
            marginTop: 2,
            maxHeight: 32,
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {body.replace(/\s+/g, " ").trim().slice(0, 80) || " "}
        </span>
      </span>
    </label>
  );
}

/** 词库管理面板组件（独立设置槽位）。 */
export function SettingsDataSection(props?: { t?: PLTranslate }): ReactNode {
  const { t } = props ?? {};
  const T = usePLT(t);
  const importRef = useRef<HTMLInputElement | null>(null);

  // ── 导入导出：提示词勾选列表 ──────────────────────────────────────────────
  const [promptList, setPromptList] = useState<Prompt[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);
  const [exportSelected, setExportSelected] = useState<Set<string>>(new Set());
  // 技能导入弹窗是否打开（选择 md 文件 / 扫描 Skills 目录，编辑校验后保存）
  const [skillImportOpen, setSkillImportOpen] = useState(false);
  // 技能导出弹窗：是否打开 + 由勾选提示词转换的初始条目
  const [skillExportOpen, setSkillExportOpen] = useState(false);
  const [skillExportInitial, setSkillExportInitial] = useState<
    Array<{ promptId: string; name?: string; title: string; body: string; summary?: string }>
  >([]);

  // ── 标签管理 ─────────────────────────────────────────────────────────────
  const [tagList, setTagList] = useState<Array<{ name: string; count: number }>>([]);
  const [renamingTag, setRenamingTag] = useState<{ from: string; value: string } | null>(null);
  const [newTag, setNewTag] = useState("");

  // ── 回收站 ───────────────────────────────────────────────────────────────
  const [trashList, setTrashList] = useState<TrashItem[]>([]);
  const [trashSelected, setTrashSelected] = useState<Set<string>>(new Set());
  const [trashLoading, setTrashLoading] = useState(false);

  // 手风琴折叠：三个模块各自独立展开/收起，默认收起
  const [openIE, setOpenIE] = useState(false);
  const [openTags, setOpenTags] = useState(false);
  const [openTrash, setOpenTrash] = useState(false);

  // 导入导出列表展示方式：列表 / 分组
  const [exportView, setExportView] = useState<"list" | "group">("list");
  // 分组展示时被折叠的分组名集合
  const [exportCollapsed, setExportCollapsed] = useState<Set<string>>(new Set());

  // 操作反馈：短暂显示导入/导出/标签/回收站操作结果
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 自定义确认弹窗：替代系统 confirm()，message 为提示文案，danger 时确认按钮为红色
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; danger: boolean; action: () => void } | null>(null);
  const requestConfirm = useCallback((message: string, danger: boolean, action: () => void) => {
    setPendingConfirm({ message, danger, action });
  }, []);

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

  /** 拉取提示词列表（导出勾选用）。 */
  const refreshPrompts = useCallback(() => {
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
  }, [showMsg]);

  /** 拉取标签汇总。 */
  const refreshTags = useCallback(() => {
    apiListTags().then(
      (list) => setTagList(list),
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
    );
  }, [showMsg]);

  /** 拉取回收站列表。 */
  const refreshTrash = useCallback(() => {
    setTrashLoading(true);
    apiListTrash().then(
      (list) => {
        setTrashList(list);
        setTrashSelected(new Set());
        setTrashLoading(false);
      },
      (e: unknown) => {
        showMsg(e instanceof Error ? e.message : String(e), true);
        setTrashLoading(false);
      },
    );
  }, [showMsg]);

  // 首次进入加载三块数据
  useEffect(() => {
    refreshPrompts();
    refreshTags();
    refreshTrash();
  }, [refreshPrompts, refreshTags, refreshTrash]);

  // 数据变化（含 host 侧 /prompts 保存）时同步刷新，保证管理面板内容与词库一致。
  useDataChanged(() => {
    refreshPrompts();
    refreshTags();
    refreshTrash();
  });

  // ── 导入导出 ─────────────────────────────────────────────────────────────

  /** 导出勾选的提示词为 JSON 备份文件并触发下载。 */
  const exportSelectedPrompts = useCallback(() => {
    const ids = Array.from(exportSelected);
    if (ids.length === 0) {
      showMsg(T("pl.exportNeedSelect"), true);
      return;
    }
    apiExport(ids).then(
      (backup) => {
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const d = new Date();
        const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
        a.href = url;
        a.download = `prompt-library-backup-${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showMsg(T("pl.exported", { count: backup.prompts.length }));
      },
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
    );
  }, [exportSelected, showMsg, T]);

  /** 打开技能导出弹窗：把勾选的提示词转成可编辑条目，编辑校验后写盘为技能。 */
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

  // 导入：读取用户选择的备份 JSON，确认后合并入库
  const onImportFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result)) as unknown;
          requestConfirm(T("pl.importConfirm"), false, () => {
            apiImport(data).then(
              (res) => {
                showMsg(
                  T("pl.imported", {
                    imported: res.imported,
                    updated: res.updated,
                    skipped: res.skipped,
                  }),
                );
                notifyDataChanged();
                refreshPrompts();
                refreshTags();
              },
              (err: unknown) => showMsg(err instanceof Error ? err.message : String(err), true),
            );
          });
        } catch (err) {
          showMsg(err instanceof Error ? err.message : String(err), true);
        }
      };
      reader.readAsText(file);
    },
    [showMsg, T, refreshPrompts, refreshTags, requestConfirm],
  );

  // ── 标签管理 ─────────────────────────────────────────────────────────────

  /** 新建标签：先写入标签库（已存在则忽略）。 */
  const addTag = useCallback(() => {
    const name = newTag.trim();
    if (!name) {
      showMsg(T("pl.createTagEmpty"), true);
      return;
    }
    apiCreateTag(name).then(
      (res) => {
        showMsg(T("pl.createTagDone", { name: res.name }));
        setNewTag("");
        // 新标签置顶展示，避免被按使用次数排序挤到末尾
        setTagList((prev) => [
          { name: res.name, count: 0 },
          ...prev.filter((x) => x.name !== res.name),
        ]);
        notifyDataChanged();
      },
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
    );
  }, [newTag, showMsg, T]);

  /** 确认重命名标签：合并到新标签并更新列表。 */
  const confirmRenameTag = useCallback(() => {
    if (!renamingTag) return;
    const from = renamingTag.from;
    const to = renamingTag.value.trim();
    if (!to) {
      showMsg(T("pl.renameTagEmpty"), true);
      return;
    }
    if (to === from) {
      showMsg(T("pl.renameTagNoChange"), true);
      return;
    }
    apiRenameTag(from, to).then(
      () => {
        showMsg(T("pl.renameTagDone", { name: to }));
        setRenamingTag(null);
        setTagList((prev) =>
          prev.map((x) => (x.name === from ? { name: to, count: x.count } : x)),
        );
        notifyDataChanged();
        refreshPrompts();
      },
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
    );
  }, [renamingTag, showMsg, T, refreshPrompts]);

  /** 删除标签：被使用时禁止删除，需先从提示词中移除该标签后才能删除。 */
  const removeTag = useCallback(
    (name: string) => {
      // 标签正在被提示词使用时不允许删除，提示先清理
      const used = tagList.find((x) => x.name === name)?.count ?? 0;
      if (used > 0) {
        showMsg(T("pl.deleteTagInUse", { name, count: used }), true);
        return;
      }
      requestConfirm(T("pl.deleteTagConfirm", { name }), true, () => {
        apiDeleteTag(name).then(
          () => {
            showMsg(T("pl.deleteTagDone", { name }));
            setTagList((prev) => prev.filter((x) => x.name !== name));
            notifyDataChanged();
            refreshPrompts();
          },
          (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
        );
      });
    },
    [showMsg, T, tagList, refreshPrompts, requestConfirm],
  );

  // ── 回收站管理 ───────────────────────────────────────────────────────────

  /** 切换单条回收站选中。 */
  const toggleTrash = useCallback((id: string) => {
    setTrashSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** 全选 / 取消全选回收站。 */
  const toggleTrashAll = useCallback(() => {
    setTrashSelected((prev) =>
      prev.size === trashList.length ? new Set() : new Set(trashList.map((x) => x.id)),
    );
  }, [trashList]);

  /** 批量恢复选中。 */
  const restoreSelected = useCallback(() => {
    const ids = Array.from(trashSelected);
    if (ids.length === 0) return;
    apiRestoreTrash(ids).then(
      (res) => {
        showMsg(T("pl.trashRestoreDone", { count: res.restored }));
        notifyDataChanged();
        refreshTrash();
        refreshPrompts();
      },
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
    );
  }, [trashSelected, showMsg, T, refreshTrash, refreshPrompts]);

  /** 批量永久删除选中。 */
  const deleteSelected = useCallback(() => {
    const ids = Array.from(trashSelected);
    if (ids.length === 0) return;
    requestConfirm(T("pl.trashDeleteConfirm", { count: ids.length }), true, () => {
      apiDeleteTrash(ids).then(
        (res) => {
          showMsg(T("pl.trashDeleteDone", { count: res.deleted }));
          refreshTrash();
        },
        (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
      );
    });
  }, [trashSelected, showMsg, T, refreshTrash, requestConfirm]);

  /** 单条恢复。 */
  const restoreOne = useCallback(
    (item: TrashItem) => {
      requestConfirm(T("pl.trashRestoreOneConfirm", { title: item.title }), false, () => {
        apiRestoreTrash([item.id]).then(
          (res) => {
            showMsg(T("pl.trashRestoreDone", { count: res.restored }));
            notifyDataChanged();
            refreshTrash();
            refreshPrompts();
          },
          (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
        );
      });
    },
    [showMsg, T, refreshTrash, refreshPrompts, requestConfirm],
  );

  /** 单条永久删除。 */
  const deleteOne = useCallback(
    (item: TrashItem) => {
      requestConfirm(T("pl.trashDeleteOneConfirm", { title: item.title }), true, () => {
        apiDeleteTrash([item.id]).then(
          (res) => {
            showMsg(T("pl.trashDeleteDone", { count: res.deleted }));
            refreshTrash();
          },
          (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
        );
      });
    },
    [showMsg, T, refreshTrash, requestConfirm],
  );

  return (
    <div style={{ color: TONE.text, fontFamily: MONO, maxWidth: 640 }}>
      <style>{`
.pl-data-action{background:var(--dsw-alias-bg-layer-3, #1d2735)}
.pl-data-action:hover{background:var(--dsw-alias-interactive-bg-hover)}
.pl-data-action:active{background:var(--dsw-alias-interactive-bg-active)}
`}</style>
      {/* 面板顶部标题 + 描述 */}
      <div style={{ padding: "2px 0 4px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, color: TONE.text, lineHeight: 1.2 }}>
          {T("pl.set.dataSection")}
        </div>
        <span style={{ fontSize: 12, color: TONE.quiet, lineHeight: 1.5 }}>
          {T("pl.set.dataSectionDesc")}
        </span>
      </div>

      {/* 操作反馈 */}
      {msg && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            lineHeight: 1.5,
            color: msg.error ? TONE.red : TONE.text,
            background: TONE.row,
            border: `1px solid ${TONE.border}`,
            borderRadius: 6,
            padding: "7px 10px",
          }}
        >
          {msg.text}
        </div>
      )}

      {/* ── 模块一：导入导出（手风琴折叠） ───────────────────────────────── */}
      <ModuleCard
        title={T("pl.moduleImportExport")}
        desc={T("pl.moduleImportExportDesc")}
        open={openIE}
        onToggle={() => setOpenIE((v) => !v)}
      >
        {/* 工具栏：全选 + 列表/分组切换 + 导出选中 + 导入 */}
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
                  backgroundColor: exportView === view ? "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))" : "transparent",
                  color: exportView === view ? TONE.text : TONE.muted,
                  transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
                }}
              >
                {view === "list" ? T("pl.viewList") : T("pl.viewGroup")}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            className={plBtn("primary", "sm")}
            onClick={exportSelectedPrompts}
            title={T("pl.exportTitle")}
          >
            {T("pl.exportSelected")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={() => importRef.current?.click()}
            title={T("pl.importTitle")}
          >
            {T("pl.import")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={() => setSkillImportOpen(true)}
            title={T("pl.skillImportBtnTitle")}
          >
            {T("pl.skillImport")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={openSkillExport}
            title={T("pl.skillExportBtnTitle")}
          >
            {T("pl.skillExport")}
          </Button>
          <span style={{ fontSize: 11, color: TONE.quiet }}>
            {exportSelected.size > 0 ? `${exportSelected.size}/${promptList.length}` : T("pl.sidebar.total", { count: promptList.length })}
          </span>
        </div>

        {/* 提示词勾选列表（列表 / 分组两种展示） */}
        {promptLoading ? (
          <div style={{ padding: "12px 0", fontSize: 12, color: TONE.muted }}>
            {T("pl.loading")}
          </div>
        ) : promptList.length === 0 ? (
          <div style={{ padding: "12px 0", fontSize: 12, color: TONE.muted }}>
            {T("pl.empty")}
          </div>
        ) : exportView === "group" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflow: "auto" }}>
            {groupedPrompts.map(([group, prompts]) => {
              const groupChecked = prompts.length > 0 && prompts.every((p) => exportSelected.has(p.id));
              const collapsed = exportCollapsed.has(group);
              return (
                <div key={group} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {/* 分组头：勾选整组 + 折叠/展开 */}
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
                      title={T("pl.exportSelectAll")}
                      style={{ margin: 0 }}
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
                        gap: 6,
                        border: "none",
                        outline: "none",
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
                      <span style={{ fontSize: 11, color: TONE.quiet }}>{T("pl.sidebar.groupCount", { count: prompts.length })}</span>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflow: "auto" }}>
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
      </ModuleCard>

      {/* ── 模块二：标签管理（手风琴折叠，列表限高滚动） ─────────────────── */}
      <ModuleCard
        title={T("pl.moduleTags")}
        desc={T("pl.moduleTagsDesc")}
        open={openTags}
        onToggle={() => setOpenTags((v) => !v)}
      >
        {/* 新建标签 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTag();
            }}
            placeholder={T("pl.createTagPlaceholder")}
            style={{ ...inputStyle, flex: 1 }}
          />
          <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={addTag}>
            {T("pl.createTag")}
          </Button>
        </div>

        {/* 标签列表（限制最大高度，超出滚动） */}
        {tagList.length === 0 ? (
          <div style={{ padding: "10px 0", fontSize: 12, color: TONE.muted }}>
            {T("pl.tagsNone")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflow: "auto" }}>
            {tagList.map((tag) => {
              const editing = renamingTag?.from === tag.name;
              return (
                <div
                  key={tag.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    background: TONE.row,
                    border: `1px solid ${TONE.border}`,
                    borderRadius: 7,
                  }}
                >
                  {editing ? (
                    <>
                      <input
                        autoFocus
                        value={renamingTag!.value}
                        onChange={(e) => setRenamingTag({ from: tag.name, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRenameTag();
                          if (e.key === "Escape") setRenamingTag(null);
                        }}
                        placeholder={T("pl.renameTagPlaceholder")}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => setRenamingTag(null)}>
                        {T("pl.cancel")}
                      </Button>
                      <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={confirmRenameTag}>
                        {T("pl.save")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 520,
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tag.name}
                      </span>
                      <span style={{ fontSize: 11, color: TONE.quiet, flexShrink: 0 }}>{tag.count}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={plBtn("ghost", "sm")}
                        onClick={() => setRenamingTag({ from: tag.name, value: tag.name })}
                      >
                        {T("pl.renameTag")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={plBtn("ghost", "sm")}
                        disabled={tag.count > 0}
                        title={tag.count > 0 ? T("pl.deleteTagInUseTitle", { name: tag.name, count: tag.count }) : T("pl.deleteTag")}
                        onClick={() => removeTag(tag.name)}
                        style={tag.count > 0 ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
                      >
                        {T("pl.deleteTag")}
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ModuleCard>

      {/* ── 模块三：回收站（手风琴折叠，限高滚动 + 30 天自动清除） ─────── */}
      <ModuleCard
        title={T("pl.moduleTrash")}
        desc={T("pl.moduleTrashDesc")}
        open={openTrash}
        onToggle={() => setOpenTrash((v) => !v)}
      >
        {/* 自动清除提示 */}
        <div style={{ fontSize: 11, lineHeight: 1.5, color: TONE.quiet, background: TONE.row, border: `1px solid ${TONE.border}`, borderRadius: 6, padding: "6px 10px" }}>
          {T("pl.trashCleanupNote")}
        </div>

        {/* 工具栏：全选 + 批量恢复/删除 */}
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
              checked={trashList.length > 0 && trashSelected.size === trashList.length}
              onChange={toggleTrashAll}
              disabled={trashList.length === 0}
            />
            {T("pl.trashSelectAll")}
          </label>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={plBtn("primary", "sm")}
            onClick={restoreSelected}
            disabled={trashSelected.size === 0}
          >
            {T("pl.trashRestoreSelected")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={deleteSelected}
            disabled={trashSelected.size === 0}
            style={{ color: TONE.red }}
          >
            {T("pl.trashDeleteSelected")}
          </Button>
          <span style={{ fontSize: 11, color: TONE.quiet }}>
            {trashSelected.size > 0 ? `${trashSelected.size}/${trashList.length}` : ""}
          </span>
        </div>

        {/* 回收内容列表（表单样式，限制最大高度，超出滚动） */}
        {trashLoading ? (
          <div style={{ padding: "12px 0", fontSize: 12, color: TONE.muted }}>
            {T("pl.loading")}
          </div>
        ) : trashList.length === 0 ? (
          <div style={{ padding: "12px 0", fontSize: 12, color: TONE.muted }}>
            {T("pl.trashEmpty")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflow: "auto" }}>
            {trashList.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "8px 10px",
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 7,
                }}
              >
                <input
                  type="checkbox"
                  checked={trashSelected.has(item.id)}
                  onChange={() => toggleTrash(item.id)}
                  style={{ marginTop: 2 }}
                />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }}>
                    <strong
                      style={{
                        fontSize: 13,
                        fontWeight: 520,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={item.title}
                    >
                      {item.title || T("pl.sidebar.uncategorized")}
                    </strong>
                    <span style={{ fontSize: 10, color: TONE.quiet, flexShrink: 0, whiteSpace: "nowrap" }}>
                      {T("pl.trashDeletedAt", { time: formatTime(item.deletedAt) })}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: TONE.quiet,
                      lineHeight: 1.5,
                      maxHeight: 40,
                      overflow: "hidden",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.body.replace(/\s+/g, " ").trim().slice(0, 120) || " "}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => restoreOne(item)}>
                      {T("pl.trashRestoreOne")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => deleteOne(item)} style={{ color: TONE.red }}>
                      {T("pl.trashDeleteOne")}
                    </Button>
                    <span
                      style={{
                        fontSize: 10,
                        color: daysLeft(item.deletedAt) <= 1 ? TONE.red : TONE.quiet,
                        marginLeft: "auto",
                        flexShrink: 0,
                      }}
                      title={T("pl.trashCleanupNote")}
                    >
                      {T("pl.trashDaysLeft", { n: daysLeft(item.deletedAt) })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModuleCard>

      {/* 模块四：自动备份（独立自包含模块，含备份/恢复） */}
      <BackupModule t={t} />

      {/* 导入备份用的隐藏文件选择 */}
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={onImportFile}
      />

      {/* 技能导入弹窗：选择本地 md 文件 / 扫描 Skills 目录，编辑并校验后保存 */}
      <SkillImportModal open={skillImportOpen} onClose={() => setSkillImportOpen(false)} t={t} />

      {/* 技能导出弹窗：把勾选的提示词编辑并校验后写盘为技能 */}
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

      {/* 自定义确认弹窗（替代系统 confirm） */}
      {pendingConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,.32)",
            padding: 20,
            boxSizing: "border-box",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: 360,
              maxWidth: "100%",
              background: TONE.panel,
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              padding: "16px 18px",
              boxShadow: "0 8px 32px rgba(0,0,0,.12)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              color: TONE.text,
              fontFamily: MONO,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {pendingConfirm.message}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={plBtn("ghost", "sm")}
                onClick={() => setPendingConfirm(null)}
              >
                {T("pl.cancel")}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={plBtn("primary", "sm")}
                style={pendingConfirm.danger ? { color: TONE.red } : undefined}
                onClick={() => {
                  const action = pendingConfirm.action;
                  setPendingConfirm(null);
                  action();
                }}
              >
                {T("pl.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
