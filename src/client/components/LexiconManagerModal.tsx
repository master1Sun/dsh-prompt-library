/**
 * 数据管理弹窗 — 词库助手右键菜单「数据管理」入口。
 *
 * 左右分栏（与导入导出 / 人格管理一致的布局）：
 * - 左侧列表：词库提示词列表，顶部固定标题与「新建」按钮；
 * - 右侧窗口：展示所选提示词的完整详情（标题 / 标签 / AI 摘要 / 正文 / 统计），并可进入编辑。
 * 新建 / 编辑共用右侧的表单（标题 + 标签单选 + 正文），保存后刷新列表。
 *
 * 由词库助手右键菜单打开，点击遮罩（空白处）或右上角关闭按钮均可关闭。
 */
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { Prompt } from "../../types.js";
import {
  createPrompt as apiCreatePrompt,
  deletePrompt as apiDeletePrompt,
  listPrompts as apiListPrompts,
  listTags as apiListTags,
  polishPrompt as apiPolish,
  updatePrompt as apiUpdatePrompt,
} from "../utils/api.js";
import { notifyDataChanged, useDataChanged } from "../utils/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../utils/button-style.js";
import {
  PL_DIALOG,
  PL_DIALOG_CSS,
  PL_DIALOG_OVERLAY,
} from "../utils/dialog-style.js";
import { getTone, rowBackground, useThemeSync } from "../utils/theme.js";
import { type PLTranslate, usePLT } from "../utils/i18n.js";
import { TagInput } from "./TagInput.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { DialogCloseButton } from "./DialogCloseButton.js";
import { BookIcon } from "./BookIcon.js";
import { insertVariableAt } from "./TemplateVariables.js";
import { TagManagePanel } from "./TagManagePanel.js";
import { RecycleManagePanel } from "./RecycleManagePanel.js";

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

/** 操作反馈信息。 */
interface Msg {
  kind: "ok" | "info" | "error";
  text: string;
}

/** 编辑表单草稿（新建 / 编辑共用）。 */
interface Draft {
  title: string;
  body: string;
  tag: string;
}

export function LexiconManagerModal(props: {
  open: boolean;
  onClose: () => void;
  t?: PLTranslate;
  container?: HTMLElement;
}): ReactNode {
  const { open, onClose, t, container } = props;
  const T = usePLT(t);
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();

  const [list, setList] = useState<Prompt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tagList, setTagList] = useState<string[]>([]);
  // 左侧列表视图：列表（平铺）/ 分类（按标签分组）
  const [viewMode, setViewMode] = useState<"list" | "group">("list");
  // 列表搜索关键词：匹配标题 / 正文 / 标签
  const [search, setSearch] = useState("");
  // 分类视图中折叠的分组标签集合
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  // 编辑态：null = 未编辑（右侧预览）；{ id: null } = 新建；{ id } = 编辑指定项
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [draft, setDraft] = useState<Draft>({ title: "", body: "", tag: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  // 操作反馈出现后 2.6 秒自动清除（与人格/技能管理一致）
  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(timer);
  }, [msg]);
  const [deleteTarget, setDeleteTarget] = useState<Prompt | null>(null);
  // 多选删除：勾选集合（按 id）+ 批量删除二次确认开关
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  // 数据子面板覆盖：词库助手独立弹窗内点击「标签 / 回收站」后覆盖右侧；null 表示展示详情（左侧菜单内嵌时该能力被隐藏）
  const [dataSub, setDataSub] = useState<"tags" | "trash" | null>(null);
  // 编辑表单正文输入框引用：供「插入变量 {{}}」定位光标
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // 头部「全选」复选框引用：部分选中时显示半选状态
  const selectAllRef = useRef<HTMLInputElement>(null);
  // 预览「AI 优化」（参考 PromptLibraryButton 查看详情）：状态 / 润色文本 / 原稿对比 / 失败提示
  const [viewPolish, setViewPolish] = useState<{
    status: "idle" | "loading" | "done";
    id: string;
  }>({ status: "idle", id: "" });
  const [viewPolishText, setViewPolishText] = useState("");
  const [viewPolishSummary, setViewPolishSummary] = useState("");
  const [viewShowOriginal, setViewShowOriginal] = useState(false);
  const [viewPolishError, setViewPolishError] = useState<string | null>(null);
  // AI 优化会话目标 id：优化期间切换条目时丢弃过期结果
  const polishTargetRef = useRef("");

  /** 加载提示词列表 + 标签候选。 */
  const load = useCallback(() => {
    return Promise.all([apiListPrompts(), apiListTags()]).then(
      ([prompts, tags]) => {
        setList(prompts);
        setTagList(tags.map((x) => x.name));
        setLoaded(true);
      },
      (e: unknown) => {
        setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      },
    );
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);
  // 其他组件增删改提示词后自动刷新
  useDataChanged(load);

  const selected = useMemo(
    () => list.find((p) => p.id === selectedId) ?? null,
    [list, selectedId],
  );

  /** 时间戳 → 本地可读时间。 */
  const fmtTime = (ts: number): string =>
    ts ? new Date(ts).toLocaleString() : "-";

  /** 点击列表项：已选中则取消预览，否则切换到该条目的预览（并关闭已打开的标签/回收站覆盖）。 */
  const selectItem = (id: string): void => {
    setSelectedId((prev) => (prev === id ? null : id));
    setEditing(null);
    setDataSub(null);
  };

  /** 按搜索关键词过滤：匹配标题 / 正文 / 标签（不区分大小写）。 */
  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return list;
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(kw) ||
        p.body.toLowerCase().includes(kw) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(kw)),
    );
  }, [list, search]);

  /** 按标签分组（分类视图）：无标签条目归入「暂无标签」组。 */
  const grouped = useMemo(() => {
    const map = new Map<string, Prompt[]>();
    for (const p of filtered) {
      const key = (p.tags ?? [])[0] ?? "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()];
  }, [filtered]);

  /** 切换分组标签的折叠状态。 */
  const toggleGroup = (key: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /** 勾选 / 取消勾选单条提示词（不影响右侧预览切换）。 */
  const toggleSelect = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** 头部「全选」：全部已选 → 取消全选；否则勾选当前可见（过滤后）的全部条目。 */
  const toggleSelectAll = (): void => {
    setSelectedIds((prev) =>
      filtered.length > 0 && prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((p) => p.id)),
    );
  };

  /** 全选复选框三态：全选 / 半选（部分勾选）/ 未选。 */
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < filtered.length;
    }
  }, [selectedIds, filtered]);

  /** 确认批量删除：删除当前勾选且仍在列表中的条目，完成后刷新并清空勾选。 */
  const confirmBatchDelete = (): void => {
    if (busy || selectedIds.size === 0) return;
    // 只删除仍存在于列表中的勾选项，避免对已删除 id 重复请求
    const ids = Array.from(selectedIds).filter((id) => list.some((p) => p.id === id));
    if (ids.length === 0) {
      setSelectedIds(new Set());
      setBatchDeleteOpen(false);
      return;
    }
    setBusy(true);
    Promise.all(ids.map((id) => apiDeletePrompt(id))).then(
      () => {
        setBusy(false);
        setBatchDeleteOpen(false);
        setSelectedIds(new Set());
        if (selectedId && ids.includes(selectedId)) {
          setSelectedId(null);
          setEditing(null);
        }
        setMsg({ kind: "ok", text: T("pl.lexicon.batchDeleteDone", { count: ids.length }) });
        notifyDataChanged();
        void load();
      },
      (e: unknown) => {
        setBusy(false);
        setBatchDeleteOpen(false);
        setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
        notifyDataChanged();
        void load();
      },
    );
  };

  /** 开始新建：清空草稿并进入右侧表单（同时关闭已打开的标签/回收站覆盖层）。 */
  const startCreate = (): void => {
    setEditing({ id: null });
    setDraft({ title: "", body: "", tag: "" });
    setDataSub(null);
  };

  /** 开始编辑指定项：用其内容填充草稿。 */
  const startEdit = (p: Prompt): void => {
    setEditing({ id: p.id });
    setDraft({ title: p.title, body: p.body, tag: (p.tags ?? [])[0] ?? "" });
  };

  /** 取消新建/编辑：退出表单；新建取消时同时关闭右侧预览（清空选中）。 */
  const cancelEdit = (): void => {
    const wasNew = editing?.id == null;
    setEditing(null);
    if (wasNew) setSelectedId(null);
  };

  /** 在正文光标处插入 {{变量名}}：先记录滚动位置，插入后恢复，避免内容回到顶部。 */
  const insertVar = (): void => {
    const textarea = bodyRef.current;
    const scrollTop = textarea?.scrollTop ?? 0;
    insertVariableAt(
      textarea,
      draft.body,
      (v) => {
        setDraft((d) => ({ ...d, body: v }));
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (textarea) textarea.scrollTop = scrollTop;
          });
        });
      },
      T("pl.insertVariableDefault"),
    );
  };

  /** 保存（新建 / 编辑）：校验必填后调用后端并刷新列表。 */
  const save = (): void => {
    if (busy) return;
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title || !body) {
      setMsg({ kind: "error", text: T("pl.requireTitleBody") });
      return;
    }
    setBusy(true);
    const tag = draft.tag ? [draft.tag] : undefined;
    const finish = (): void => {
      setBusy(false);
      setEditing(null);
      notifyDataChanged();
      void load();
    };
    if (editing?.id) {
      apiUpdatePrompt(editing.id, { title, body, tags: tag }).then(
        () => {
          setMsg({ kind: "ok", text: T("pl.lexicon.saved") });
          finish();
        },
        (e: unknown) => {
          setBusy(false);
          setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
        },
      );
    } else {
      apiCreatePrompt({ title, body, tags: tag }).then(
        (created) => {
          setMsg({ kind: "ok", text: T("pl.lexicon.newDone") });
          setSelectedId(created.id);
          finish();
        },
        (e: unknown) => {
          setBusy(false);
          setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
        },
      );
    }
  };

  /** 确认删除：删除后若正选中/编辑该项则清空右侧窗口。 */
  const confirmDelete = (): void => {
    if (!deleteTarget || busy) return;
    setBusy(true);
    const id = deleteTarget.id;
    apiDeletePrompt(id).then(
      () => {
        setBusy(false);
        setDeleteTarget(null);
        if (selectedId === id) {
          setSelectedId(null);
          setEditing(null);
        }
        setMsg({ kind: "ok", text: T("pl.lexicon.deleteDone") });
        notifyDataChanged();
        void load();
      },
      (e: unknown) => {
        setBusy(false);
        setDeleteTarget(null);
        setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      },
    );
  };

  /** 清空预览「AI 优化」状态（切换条目 / 关闭弹窗 / 保存完成后调用）。 */
  const resetPolish = useCallback(() => {
    polishTargetRef.current = "";
    setViewPolish({ status: "idle", id: "" });
    setViewPolishText("");
    setViewPolishSummary("");
    setViewShowOriginal(false);
    setViewPolishError(null);
  }, []);

  // 切换预览条目或关闭弹窗时，复位 AI 优化状态，避免残留结果/动画
  useEffect(() => {
    resetPolish();
  }, [selectedId, open, resetPolish]);

  /** 预览「AI 优化」：对当前条目正文执行润色，期间展示进度动画，成功后展示可编辑结果。 */
  const startPolish = useCallback(async () => {
    if (!selected || viewPolish.status === "loading") return;
    const id = selected.id;
    polishTargetRef.current = id;
    setViewPolish({ status: "loading", id });
    setViewShowOriginal(false);
    setViewPolishError(null);
    try {
      const res = await apiPolish(selected.body, { withSummary: true });
      // 优化期间用户切换了条目：丢弃过期结果
      if (polishTargetRef.current !== id) return;
      setViewPolishText(res.polished);
      setViewPolishSummary(res.summary ?? "");
      setViewPolish({ status: "done", id });
    } catch (e: unknown) {
      if (polishTargetRef.current !== id) return;
      setViewPolish({ status: "idle", id: "" });
      setViewPolishError(e instanceof Error ? e.message : String(e));
    }
  }, [selected, viewPolish.status]);

  /** 复制润色结果到剪贴板。 */
  const copyPolish = useCallback(() => {
    if (!viewPolishText) return;
    navigator.clipboard.writeText(viewPolishText).catch(() => {});
    setMsg({ kind: "ok", text: T("pl.copied") });
  }, [viewPolishText, T]);

  /** 取消润色结果，回到普通正文预览。 */
  const cancelPolish = useCallback(() => {
    resetPolish();
  }, [resetPolish]);

  /** 把润色结果保存回词库（更新正文，保留原稿作对比，标记已 AI 完善）。 */
  const savePolish = useCallback(() => {
    if (viewPolish.status !== "done" || !selected || busy) return;
    const body = viewPolishText.trim();
    if (!body) return;
    setBusy(true);
    apiUpdatePrompt(selected.id, {
      body,
      summary: viewPolishSummary.trim() || undefined,
      sourceBody: selected.body !== body ? selected.body : undefined,
      aiRefined: true,
    }).then(
      (updated) => {
        setBusy(false);
        setList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        resetPolish();
        setMsg({ kind: "ok", text: T("pl.lexicon.saved") });
        notifyDataChanged();
        void load();
      },
      (e: unknown) => {
        setBusy(false);
        setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      },
    );
  }, [viewPolish.status, viewPolishText, viewPolishSummary, selected, busy, resetPolish, T]);

  if (!open) return null;

  /** 左侧单条提示词（紧凑卡片式列表项）。 */
  const renderRow = (p: Prompt): ReactNode => {
    const active = p.id === selectedId;
    return (
      <div
        key={p.id}
        className={active ? "pl-lex-row pl-lex-row--active" : "pl-lex-row"}
        onClick={() => selectItem(p.id)}
        title={p.title}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
          {/* 多选删除复选框：点击仅切换勾选，不改变右侧预览 */}
          <input
            type="checkbox"
            checked={selectedIds.has(p.id)}
            onChange={() => toggleSelect(p.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={T("pl.lexicon.selectAll")}
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
            {p.title}
          </span>
          <span
            style={{
              flexShrink: 0,
              fontSize: 11,
              color: TONE.quiet,
            }}
          >
            {T("pl.previewUsage", { count: p.usageCount })}
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
          {p.body || "\u00A0"}
        </div>
        {p.tags && p.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {p.tags.slice(0, 2).map((tag) => (
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
  };

  /** 右侧：提示词详情预览。 */
  const renderPreview = (p: Prompt): ReactNode => {
    return (
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
        {/* 标题 + 操作按钮 */}
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
            {p.title}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={() => startEdit(p)}
          >
            {T("pl.lexicon.edit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={() => setDeleteTarget(p)}
            style={{ color: TONE.red }}
            data-tip={T("pl.delete")}
          >
            {T("pl.delete")}
          </Button>
        </div>
        {/* 标签：无标签时显示「无标签」占位 */}
        {p.tags && p.tags.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 5,
              flexShrink: 0,
            }}
          >
            {p.tags.map((tag) => (
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
        {/* 统计信息：2×2 对称卡片 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
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
              {T("pl.lexicon.usage")}
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
              {p.usageCount} {T("pl.lexicon.usageUnit")}
            </span>
          </div>
          <div
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
              {T("pl.lexicon.createdAt")}
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
              {fmtTime(p.createdAt)}
            </span>
          </div>
          <div
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
              {T("pl.lexicon.updatedAt")}
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
              {fmtTime(p.updatedAt)}
            </span>
          </div>
          <div
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
              {T("pl.lexicon.lastUsed")}
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
              {p.lastUsedAt ? fmtTime(p.lastUsedAt) : T("pl.lexicon.neverUsed")}
            </span>
          </div>
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
          {p.summary ? (
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
              {p.summary}
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: TONE.quiet }}>
              {T("pl.lexicon.noSummary")}
            </div>
          )}
        </div>
        {/* 正文预览：默认展示原正文；AI 优化中显示进度动画；完成后展示可编辑润色结果 */}
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
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: TONE.text,
                flexShrink: 0,
              }}
            >
              {T("pl.bodyField")}
            </span>
            {viewPolish.status === "idle" ? (
              p.aiRefined ? (
                /* 已 AI 完善：不再显示优化按钮，改为提示已完成 */
                <span
                  style={{
                    marginLeft: "auto",
                    flexShrink: 0,
                    fontSize: 11,
                    color: TONE.mint,
                  }}
                >
                  {T("pl.refinedDone")}
                </span>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={plBtn("ghost", "sm")}
                  onClick={() => void startPolish()}
                  disabled={busy}
                  data-tip={T("pl.polishBtnTitle")}
                  style={{ marginLeft: "auto", flexShrink: 0, color: TONE.accent }}
                >
                  {T("pl.polish")}
                </Button>
              )
            ) : viewPolish.status === "loading" ? (
              <span
                style={{
                  marginLeft: "auto",
                  flexShrink: 0,
                  fontSize: 11,
                  color: TONE.accent,
                }}
              >
                {T("pl.polishing")}
              </span>
            ) : (
              <span
                style={{
                  marginLeft: "auto",
                  flexShrink: 0,
                  fontSize: 11,
                  color: TONE.mint,
                }}
              >
                {`✓ ${T("pl.refinedDone")}`}
              </span>
            )}
          </div>
          {viewPolish.status === "loading" ? (
            /* 优化中：不确定进度条动画 */
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: TONE.panel,
                border: `1px solid ${TONE.border}`,
                borderRadius: 7,
              }}
            >
              <div
                style={{
                  width: "70%",
                  height: 4,
                  borderRadius: 2,
                  overflow: "hidden",
                  background: TONE.border,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: "40%",
                    borderRadius: 2,
                    background: TONE.accent,
                    animation: "pl-progress 1.2s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
          ) : viewPolish.status === "done" ? (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                {([
                  { value: false, label: T("pl.polished") },
                  { value: true, label: T("pl.original") },
                ] as const).map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setViewShowOriginal(opt.value)}
                    style={{
                      cursor: "pointer",
                      padding: "2px 10px",
                      fontSize: 11,
                      fontFamily: MONO,
                      color:
                        viewShowOriginal === opt.value
                          ? TONE.accent
                          : TONE.muted,
                      background:
                        viewShowOriginal === opt.value
                          ? TONE.accentSoft
                          : "transparent",
                      border: `1px solid ${
                        viewShowOriginal === opt.value
                          ? TONE.accent
                          : TONE.border
                      }`,
                      borderRadius: 999,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* AI 摘要：优化完成后展示用途摘要（保存时一并入库） */}
              {viewPolishSummary.trim() && (
                <div
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    background: TONE.accentSoft,
                    border: `1px solid ${TONE.border}`,
                    borderRadius: 7,
                    padding: "6px 10px",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 11,
                      fontWeight: 600,
                      color: TONE.accent,
                      lineHeight: 1.6,
                    }}
                  >
                    {T("pl.lexicon.summary")}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: TONE.text,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {viewPolishSummary}
                  </span>
                </div>
              )}
              <textarea
                value={viewShowOriginal ? p.body : viewPolishText}
                readOnly={viewShowOriginal}
                onChange={(e) => setViewPolishText(e.target.value)}
                style={{
                  flex: 1,
                  minHeight: 0,
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  color: TONE.text,
                  background: viewShowOriginal ? TONE.panel : rowBackground(),
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 7,
                  fontFamily: MONO,
                  outline: "none",
                  resize: "none",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  opacity: viewShowOriginal ? 0.75 : 1,
                }}
              />
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  flexShrink: 0,
                }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={plBtn("ghost", "sm")}
                  onClick={copyPolish}
                >
                  {T("pl.copy")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={plBtn("ghost", "sm")}
                  onClick={cancelPolish}
                  disabled={busy}
                >
                  {T("pl.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className={plBtn("primary", "sm")}
                  onClick={savePolish}
                  disabled={busy}
                >
                  {T("pl.saveToLibrary")}
                </Button>
              </div>
            </>
          ) : (
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
              {p.body}
            </div>
          )}
          {viewPolishError && (
            <div
              style={{
                flexShrink: 0,
                color: TONE.red,
                fontSize: 11,
                lineHeight: 1.5,
                wordBreak: "break-word",
              }}
            >
              {T("pl.polishFail")}
            </div>
          )}
        </div>
      </div>
    );
  };

  /** 右侧：新建 / 编辑表单。 */
  const renderEditor = (): ReactNode => {
    const isNew = editing?.id == null;
    return (
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
            }}
          >
            {isNew ? T("pl.lexicon.creatingTitle") : T("pl.lexicon.editingTitle")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={cancelEdit}
            disabled={busy}
          >
            {T("pl.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={plBtn("primary", "sm")}
            onClick={save}
            disabled={busy}
          >
            {T("pl.save")}
          </Button>
        </div>
        {/* 标题 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: TONE.text,
            }}
          >
            {T("pl.titleField")}
          </span>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder={T("pl.titleField")}
            style={inputStyle}
          />
        </div>
        {/* 标签（单选） */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: TONE.text,
            }}
          >
            {T("pl.tagsField")}
          </span>
          <TagInput
            value={draft.tag}
            onChange={(v) => setDraft((d) => ({ ...d, tag: v }))}
            suggestions={tagList}
            inputStyle={inputStyle}
            t={t}
          />
        </div>
        {/* 正文 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 11.5,
                fontWeight: 600,
                color: TONE.text,
              }}
            >
              {T("pl.bodyField")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={plBtn("ghost", "sm")}
              onClick={insertVar}
              data-tip={T("pl.insertVariableTitle")}
              style={{ flexShrink: 0 }}
            >
              {T("pl.skillModal.insertVar")}
            </Button>
          </div>
          <textarea
            ref={bodyRef}
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            placeholder={T("pl.bodyField")}
            style={{ ...inputStyle, flex: 1, minHeight: 0, resize: "none", lineHeight: 1.6 }}
          />
        </div>
      </div>
    );
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T("pl.lexicon.title")}
      className={container ? undefined : PL_DIALOG_OVERLAY}
      onClick={(e) => {
        // 点击蒙层（空白处）关闭；点击对话框内部不关闭
        if (!container && e.target === e.currentTarget) onClose();
      }}
    >
      {!container && <style>{PL_DIALOG_CSS}</style>}
      {/* AI 优化进度条动画（与 PromptLibraryButton 查看详情一致的不确定进度） */}
      <style>{`@keyframes pl-progress { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }`}</style>
      <style>{`
.pl-lex-row{display:flex;flex-direction:column;gap:4;padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(196,211,232,.16));background:var(--dsw-alias-bg-layer-3,#1d2735);cursor:pointer;user-select:none;transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-lex-row:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3,rgba(196,211,232,.31))}
.pl-lex-row--active{background:rgba(142,197,255,.10);border-color:rgba(142,197,255,.5)}
`}</style>
      <div
        className={PL_DIALOG}
        style={{
          position: "relative",
          ...(container ? {} : { width: 800, height: 800 }),
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
            {T("pl.lexicon.title")}
          </strong>
          {!container && <DialogCloseButton onClick={onClose} label={T("pl.close")} />}
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
          {T("pl.lexicon.desc")}
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

        {/* 主体：左右分栏（左列列表 / 右列预览编辑）——与人格管理一致的面板比例 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            gap: 2,
            paddingTop: 14,
            paddingBottom: 4,
            marginTop: -8,
          }}
        >
          {/* 左栏：顶部标题固定 + 列表独立滚动 + 底部全选栏 */}
          <div
            style={{
              flex: "1 1 0",
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* 顶部标题 + 新建按钮：固定在左栏顶部 */}
            <div
              style={{
                flexShrink: 0,
                padding: "10px 10px 9px",
                background: TONE.row,
              }}
            >
              {/* 第一行：标题 + 右侧独立「新建」按钮 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 3,
                    height: 13,
                    borderRadius: 2,
                    background: TONE.accent,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: TONE.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {T("pl.lexicon.listTitle")}
                </span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className={plBtn("primary", "sm")}
                  onClick={startCreate}
                  disabled={busy || !!editing}
                >
                  {T("pl.lexicon.new")}
                </Button>
              </div>
              {/* 第二行：「列表 / 分类」视图切换 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 9,
                }}
              >
                {/* 列表 / 分类 视图切换（左） */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexShrink: 0,
                    background: TONE.panel,
                    border: `1px solid ${TONE.border}`,
                    borderRadius: 7,
                    padding: 2,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    style={{
                      border: "none",
                      outline: "none",
                      cursor: "pointer",
                      fontFamily: MONO,
                      fontSize: 11.5,
                      lineHeight: 1.4,
                      padding: "2px 8px",
                      borderRadius: 5,
                      color: viewMode === "list" ? TONE.accent : TONE.quiet,
                      background: viewMode === "list" ? TONE.accentSoft : "transparent",
                      transition: "color .18s, background-color .18s",
                    }}
                  >
                    {T("pl.lexicon.listView")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("group")}
                    style={{
                      border: "none",
                      outline: "none",
                      cursor: "pointer",
                      fontFamily: MONO,
                      fontSize: 11.5,
                      lineHeight: 1.4,
                      padding: "2px 8px",
                      borderRadius: 5,
                      color: viewMode === "group" ? TONE.accent : TONE.quiet,
                      background: viewMode === "group" ? TONE.accentSoft : "transparent",
                      transition: "color .18s, background-color .18s",
                    }}
                  >
                    {T("pl.lexicon.groupView")}
                  </button>
                </div>
                {/* 右侧：标签 / 回收站，仅在词库助手独立弹窗（无 container 内嵌）时显示，点击后在右侧覆盖对应子面板 */}
                {!container && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 6,
                      minWidth: 0,
                    }}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={plBtn("ghost", "sm")}
                      onClick={() => setDataSub("tags")}
                    >
                      {T("pl.lexicon.viewTags")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={plBtn("ghost", "sm")}
                      onClick={() => setDataSub("trash")}
                    >
                      {T("pl.lexicon.viewTrash")}
                    </Button>
                  </div>
                )}
              </div>
              {/* 搜索过滤 */}
              <div style={{ position: "relative", marginTop: 9 }}>
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 9,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fill: "none",
                    stroke: TONE.quiet,
                    strokeWidth: 2,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    pointerEvents: "none",
                  }}
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.5" y2="16.5" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                {search && (
                  <button
                    type="button"
                    title={T("pl.clearSearch")}
                    onClick={() => setSearch("")}
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
            </div>
            {/* 全选 + 删除 / 计数栏：左侧全选与删除按钮、右侧「选中数量 | 总数」，下方分割线与列表区分 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                flexShrink: 0,
                padding: "9px 10px 10px",
                borderBottom: `1px solid ${TONE.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
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
                    ref={selectAllRef}
                    checked={
                      filtered.length > 0 &&
                      selectedIds.size === filtered.length
                    }
                    onChange={toggleSelectAll}
                    disabled={filtered.length === 0}
                    aria-label={T("pl.lexicon.selectAll")}
                    style={{
                      flexShrink: 0,
                      margin: 0,
                      cursor: "pointer",
                      accentColor: TONE.accent,
                    }}
                  />
                  {filtered.length > 0 && selectedIds.size === filtered.length
                    ? T("pl.lexicon.deselectAll")
                    : T("pl.lexicon.selectAll")}
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={plBtn("ghost", "sm")}
                  onClick={() => setBatchDeleteOpen(true)}
                  disabled={selectedIds.size === 0}
                  style={{ color: TONE.red }}
                  data-tip={T("pl.lexicon.batchDelete")}
                >
                  {T("pl.lexicon.batchDelete")}
                </Button>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 11,
                  color: TONE.quiet,
                }}
              >
                {T("pl.lexicon.selectedTotal", {
                  selected: selectedIds.size,
                  total: filtered.length,
                })}
              </span>
            </div>
            {/* 列表内容（独立滚动） */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
              }}
            >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 10,
              }}
            >
              {!loaded ? (
                <div
                  style={{
                    fontSize: 12.5,
                    color: TONE.quiet,
                    textAlign: "center",
                    padding: "22px 0",
                  }}
                >
                  {T("pl.loading")}
                </div>
              ) : list.length === 0 ? (
                <div
                  style={{
                    fontSize: 12.5,
                    color: TONE.quiet,
                    textAlign: "center",
                    padding: "22px 0",
                  }}
                >
                  {T("pl.empty")}
                </div>
              ) : filtered.length === 0 ? (
                <div
                  style={{
                    fontSize: 12.5,
                    color: TONE.quiet,
                    textAlign: "center",
                    padding: "22px 0",
                  }}
                >
                  {T("pl.lexicon.noSearchResult")}
                </div>
              ) : viewMode === "group" ? (
                grouped.map(([tag, items]) => {
                  const isCollapsed = collapsed.has(tag);
                  return (
                    <div
                      key={tag || "__none__"}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {/* 分组标题：勾选可全选组内条目，点击其余区域折叠/展开 */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleGroup(tag)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleGroup(tag);
                          }
                        }}
                        title={isCollapsed ? T("pl.lexicon.expandGroup") : T("pl.lexicon.collapseGroup")}
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
                          checked={
                            items.length > 0 &&
                            items.every((p) => selectedIds.has(p.id))
                          }
                          onChange={() => {
                            const allChecked =
                              items.length > 0 &&
                              items.every((p) => selectedIds.has(p.id));
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              for (const p of items) {
                                if (allChecked) next.delete(p.id);
                                else next.add(p.id);
                              }
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={T("pl.lexicon.selectAll")}
                          style={{
                            flexShrink: 0,
                            width: 13,
                            height: 13,
                            margin: 0,
                            cursor: "pointer",
                            accentColor: TONE.accent,
                          }}
                        />
                        {/* 折叠/展开图标：与导入导出导出列表一致的 SVG 箭头 */}
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 16 16"
                          style={{
                            color: TONE.muted,
                            transform: isCollapsed
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
                        {/* 分类标签：与导入导出导出列表一致的字号、字重与字体 */}
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
                          {tag || T("pl.tagsNone")}
                        </span>
                        {/* 条目数量：与导入导出一致的括号计数 */}
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 11,
                            color: TONE.quiet,
                          }}
                        >
                          {T("pl.sidebar.groupCount", {
                            count: items.length,
                          })}
                        </span>
                      </div>
                      {!isCollapsed && items.map((p) => renderRow(p))}
                    </div>
                  );
                })
              ) : (
                filtered.map((p) => renderRow(p))
              )}
            </div>
            </div>
          </div>

          {/* 右栏：词库详情预览 / 编辑（相对定位，供子面板覆盖） */}
          <div
            style={{
              position: "relative",
              flex: "1 1 0",
              minWidth: 0,
              height: "100%",
              boxSizing: "border-box",
              minHeight: 0,
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* 详情 / 编辑内容（原有可滚动容器，保持既有表现） */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                boxSizing: "border-box",
                overflowY: "auto",
              }}
            >
              {editing ? (
                renderEditor()
              ) : selected ? (
                renderPreview(selected)
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    boxSizing: "border-box",
                    fontSize: 12.5,
                    color: TONE.quiet,
                    padding: 20,
                    textAlign: "center",
                  }}
                >
                  {T("pl.lexicon.previewEmpty")}
                </div>
              )}
            </div>
            {/* 数据子面板覆盖：只在词库助手独立弹窗（有「标签 / 回收站」按钮）时可用；点击后覆盖右侧，点详情或 X 关闭 */}
            {dataSub && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 5,
                  display: "flex",
                  flexDirection: "column",
                  background: TONE.row,
                  borderRadius: 10,
                  padding: "0 0 10px",
                  boxSizing: "border-box",
                }}
              >
                {/* 覆盖面板头部：标题 + X 关闭 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                    padding: "8px 0 9px 8px",
                    borderBottom: `1px solid ${TONE.border}`,
                  }}
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
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      color: TONE.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dataSub === "tags" ? T("pl.moduleTags") : T("pl.moduleTrash")}
                  </span>
                  <DialogCloseButton
                    onClick={() => setDataSub(null)}
                    label={T("pl.close")}
                  />
                </div>
                {/* 覆盖面板内容：子面板自含滚动 */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  {dataSub === "tags" ? (
                    <TagManagePanel t={t} />
                  ) : (
                    <RecycleManagePanel t={t} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 删除二次确认 */}
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
        {/* 批量删除二次确认 */}
        <ConfirmDialog
          open={batchDeleteOpen}
          danger
          message={T("pl.lexicon.confirmBatchDelete", { count: selectedIds.size })}
          confirmLabel={T("pl.lexicon.batchDelete")}
          cancelLabel={T("pl.cancel")}
          onCancel={() => setBatchDeleteOpen(false)}
          onConfirm={confirmBatchDelete}
        />
      </div>
    </div>,
    container || document.body,
  );
}
