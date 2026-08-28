/**
 * 标签数据弹窗 — 词库助手「数据管理」→「标签数据」入口。
 *
 * 将「标签管理」与「回收站」合并为一个弹窗，采用与人格管理一致的两栏布局：
 * 左侧「标签」独立滚动、右侧「回收站」独立滚动，左右两栏各自上下滚动。
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
  type CSSProperties,
  type ReactNode,
} from "react";
import type { TrashItem } from "../../../../types.js";
import {
  createTag as apiCreateTag,
  deleteTag as apiDeleteTag,
  listTags as apiListTags,
  renameTag as apiRenameTag,
  deleteTrash as apiDeleteTrash,
  listTrash as apiListTrash,
  restoreTrash as apiRestoreTrash,
} from "../../../services/api.js";
import { notifyDataChanged, useDataChanged } from "../../../services/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../../utils/button-style.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../../../utils/dialog-style.js";
import { type PLTranslate, usePLT } from "../../../i18n/i18n.js";
import { DialogCloseButton } from "../../common/DialogCloseButton.js";
import { BookIcon } from "../../common/BookIcon.js";

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
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 18%, transparent)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)",
  mint: "var(--dsw-alias-state-success-primary, #34d399)",
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

/** 标签数据弹窗组件（左侧标签 / 右侧回收站，两栏独立滚动）。 */
export function TagDataModal(props: {
  open: boolean;
  onClose: () => void;
  t?: PLTranslate;
}): ReactNode {
  const { open, onClose, t } = props;
  const T = usePLT(t);

  // ── 标签（左栏）──────────────────────────────────────────────
  const [tagList, setTagList] = useState<Array<{ name: string; count: number }>>([]);
  const [renamingTag, setRenamingTag] = useState<{ from: string; value: string } | null>(null);
  const [newTag, setNewTag] = useState("");

  // ── 回收站（右栏）────────────────────────────────────────────
  const [trashList, setTrashList] = useState<TrashItem[]>([]);
  const [trashSelected, setTrashSelected] = useState<Set<string>>(new Set());
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashQuery, setTrashQuery] = useState("");

  // ── 通用：操作反馈 + 自定义确认弹窗 ─────────────────────────────
  const [msg, setMsg] = useState<{ text: string; kind?: "success" | "info" | "error" } | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pendingConfirm, setPendingConfirm] = useState<{
    message: string;
    danger: boolean;
    action: () => void;
  } | null>(null);
  const requestConfirm = useCallback((message: string, danger: boolean, action: () => void) => {
    setPendingConfirm({ message, danger, action });
  }, []);

  const showMsg = useCallback((text: string, kind: "success" | "info" | "error" = "success") => {
    setMsg({ text, kind });
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), 2600);
  }, []);

  useEffect(
    () => () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    },
    [],
  );

  /** 拉取标签汇总（打开时刷新，删除/重命名后亦刷新）。 */
  const refreshTags = useCallback(() => {
    apiListTags().then(
      (list) => setTagList(list),
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
    );
  }, [showMsg]);

  /** 新建标签：先写入标签库（已存在则忽略）。 */
  const addTag = useCallback(() => {
    const name = newTag.trim();
    if (!name) {
      showMsg(T("pl.createTagEmpty"), "error");
      return;
    }
    apiCreateTag(name).then(
      (res) => {
        showMsg(T("pl.createTagDone", { name: res.name }));
        setNewTag("");
        setTagList((prev) => [
          { name: res.name, count: 0 },
          ...prev.filter((x) => x.name !== res.name),
        ]);
        notifyDataChanged();
      },
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
    );
  }, [newTag, showMsg, T]);

  /** 确认重命名标签：合并到新标签并更新列表。 */
  const confirmRenameTag = useCallback(() => {
    if (!renamingTag) return;
    const from = renamingTag.from;
    const to = renamingTag.value.trim();
    if (!to) {
      showMsg(T("pl.renameTagEmpty"), "error");
      return;
    }
    if (to === from) {
      showMsg(T("pl.renameTagNoChange"), "info");
      return;
    }
    apiRenameTag(from, to).then(
      () => {
        showMsg(T("pl.renameTagDone", { name: to }));
        setRenamingTag(null);
        setTagList((prev) => prev.map((x) => (x.name === from ? { name: to, count: x.count } : x)));
        notifyDataChanged();
      },
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
    );
  }, [renamingTag, showMsg, T]);

  /** 删除标签：被使用时禁止删除，需先从提示词中移除该标签后才能删除。 */
  const removeTag = useCallback(
    (name: string) => {
      const used = tagList.find((x) => x.name === name)?.count ?? 0;
      if (used > 0) {
        showMsg(T("pl.deleteTagInUse", { name, count: used }), "error");
        return;
      }
      requestConfirm(T("pl.deleteTagConfirm", { name }), true, () => {
        apiDeleteTag(name).then(
          () => {
            showMsg(T("pl.deleteTagDone", { name }));
            setTagList((prev) => prev.filter((x) => x.name !== name));
            notifyDataChanged();
          },
          (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
        );
      });
    },
    [showMsg, T, tagList, requestConfirm],
  );

  /** 拉取回收站列表（打开时刷新，恢复/删除后刷新）。 */
  const refreshTrash = useCallback(() => {
    setTrashLoading(true);
    apiListTrash().then(
      (list) => {
        setTrashList(list);
        setTrashSelected(new Set());
        setTrashLoading(false);
      },
      (e: unknown) => {
        showMsg(e instanceof Error ? e.message : String(e), "error");
        setTrashLoading(false);
      },
    );
  }, [showMsg]);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    setNewTag("");
    setRenamingTag(null);
    setTrashQuery("");
    refreshTags();
    refreshTrash();
  }, [open, refreshTags, refreshTrash]);

  // 数据变化（含 host 侧 /prompts 保存）时同步刷新回收站（弹窗打开时生效）
  useDataChanged(() => {
    if (open) refreshTrash();
  });

  /** 按搜索词过滤回收站（匹配标题或正文，忽略大小写）。 */
  const filteredTrash = useMemo(() => {
    const q = trashQuery.trim().toLowerCase();
    if (!q) return trashList;
    return trashList.filter(
      (x) =>
        (x.title || "").toLowerCase().includes(q) ||
        (x.body || "").toLowerCase().includes(q),
    );
  }, [trashList, trashQuery]);

  /** 切换单条回收站选中。 */
  const toggleTrash = useCallback((id: string) => {
    setTrashSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** 全选 / 取消全选（仅针对当前过滤结果）。 */
  const toggleTrashAll = useCallback(() => {
    setTrashSelected((prev) =>
      prev.size === filteredTrash.length ? new Set() : new Set(filteredTrash.map((x) => x.id)),
    );
  }, [filteredTrash]);

  /** 批量恢复选中。 */
  const restoreSelected = useCallback(() => {
    const ids = Array.from(trashSelected);
    if (ids.length === 0) return;
    apiRestoreTrash(ids).then(
      (res) => {
        showMsg(T("pl.trashRestoreDone", { count: res.restored }));
        notifyDataChanged();
        refreshTrash();
      },
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
    );
  }, [trashSelected, showMsg, T, refreshTrash]);

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
        (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
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
          },
          (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
        );
      });
    },
    [showMsg, T, refreshTrash, requestConfirm],
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
          (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
        );
      });
    },
    [showMsg, T, refreshTrash, requestConfirm],
  );

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T("pl.moduleTagData")}
      className={PL_DIALOG_OVERLAY}
      onClick={(e) => e.stopPropagation()}
    >
      <style>{PL_DIALOG_CSS}</style>
      <style>{`
.pl-data-card{transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-data-card:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3, rgba(196,211,232,.31))}
`}</style>
      <div
        className={PL_DIALOG}
        style={{
          width: 860,
          height: 760,
          maxWidth: "calc(100vw - 40px)",
          maxHeight: "calc(100vh - 40px)",
        }}
      >
        {/* 标题 + 关闭按钮（仅通过按钮手动关闭） */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <BookIcon color={TONE.accent} />
          <strong style={{ fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0, color: TONE.text }}>
            {T("pl.moduleTagData")}
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
          {T("pl.moduleTagDataDesc")}
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
            color: msg ? (msg.kind === "error" ? TONE.red : msg.kind === "info" ? TONE.accent : TONE.mint) : "transparent",
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

        {/* 内容区：左标签 / 右回收站，左右两栏各自独立滚动 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            gap: 14,
            paddingTop: 14,
            marginTop: -8,
          }}
        >
          {/* 左栏：标签 */}
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
            {/* 顶部标题 + 新建标签：左侧内容向上滚动时悬浮固定，仅列表滚动 */}
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
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TONE.text }}>
                  {T("pl.moduleTags")}
                </span>
              </div>
              {/* 新建标签 */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginTop: 8 }}>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(clampTag(e.target.value))}
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
            </div>

            {/* 标签列表：仅此区域滚动 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10 }}>
              {tagList.length === 0 ? (
                <div style={{ padding: "10px 0", fontSize: 12, color: TONE.muted }}>
                  {T("pl.tagsNone")}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {tagList.map((tag) => {
                    const editing = renamingTag?.from === tag.name;
                    return (
                      <div
                        key={tag.name}
                        className="pl-data-card"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 12px",
                          background: TONE.row,
                          border: `1px solid ${TONE.border}`,
                          borderRadius: 9,
                        }}
                      >
                        {editing ? (
                          <>
                            <input
                              autoFocus
                              value={renamingTag!.value}
                              onChange={(e) => setRenamingTag({ from: tag.name, value: clampTag(e.target.value) })}
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
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: TONE.accent,
                                flexShrink: 0,
                              }}
                              aria-hidden="true"
                            />
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
                            <span
                              style={{
                                flexShrink: 0,
                                fontSize: 11,
                                color: TONE.muted,
                                lineHeight: 1.4,
                                background: "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))",
                                border: `1px solid ${TONE.border}`,
                                borderRadius: 999,
                                padding: "1px 8px",
                              }}
                            >
                              {tag.count}
                            </span>
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
                              data-tip={tag.count > 0 ? T("pl.deleteTagInUseTitle", { name: tag.name, count: tag.count }) : T("pl.deleteTag")}
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
            </div>
          </div>

          {/* 右栏：回收站 */}
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
            {/* 顶部标题 + 搜索 + 工具栏：右侧内容向上滚动时悬浮固定，仅列表滚动 */}
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
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: TONE.text }}>
                  {T("pl.moduleTrash")}
                </span>
              </div>
              {/* 搜索 */}
              <div style={{ position: "relative", flexShrink: 0, marginTop: 8 }}>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: TONE.quiet, pointerEvents: "none" }}
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.2-3.2" />
                </svg>
                <input
                  value={trashQuery}
                  onChange={(e) => setTrashQuery(e.target.value)}
                  placeholder={T("pl.search")}
                  style={{ ...inputStyle, paddingLeft: 26, paddingRight: 26 }}
                />
                {trashQuery && (
                  <button
                    type="button"
                    aria-label={T("pl.clearSearch")}
                    tabIndex={-1}
                    onClick={() => setTrashQuery("")}
                    style={{
                      position: "absolute",
                      right: 6,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 18,
                      height: 18,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none",
                      borderRadius: "50%",
                      background: "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.14))",
                      color: TONE.muted,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </div>
              {/* 工具栏 */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0, marginTop: 8 }}>
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
                    checked={filteredTrash.length > 0 && trashSelected.size === filteredTrash.length}
                    onChange={toggleTrashAll}
                    disabled={filteredTrash.length === 0}
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
            </div>

            {/* 回收内容列表：仅此区域滚动 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10 }}>
              {trashLoading ? (
                <div style={{ padding: "12px 0", fontSize: 12, color: TONE.muted }}>
                  {T("pl.loading")}
                </div>
              ) : filteredTrash.length === 0 ? (
                <div style={{ padding: "12px 0", fontSize: 12, color: TONE.muted }}>
                  {trashQuery.trim() ? T("pl.searchEmpty") : T("pl.trashEmpty")}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {filteredTrash.map((item) => (
                    <div
                      key={item.id}
                      className="pl-data-card"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 12px",
                        background: TONE.row,
                        border: `1px solid ${TONE.border}`,
                        borderRadius: 9,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={trashSelected.has(item.id)}
                        onChange={() => toggleTrash(item.id)}
                        style={{ marginTop: 3 }}
                      />
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }}>
                          <strong
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 13,
                              fontWeight: 560,
                              minWidth: 0,
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
                              style={{ flexShrink: 0, color: TONE.muted }}
                              aria-hidden="true"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <path d="M14 2v6h6" />
                            </svg>
                            <span
                              style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              data-tip={item.title}
                            >
                              {item.title || T("pl.sidebar.uncategorized")}
                            </span>
                          </strong>
                          <span style={{ fontSize: 10, color: TONE.quiet, flexShrink: 0, whiteSpace: "nowrap" }}>
                            {T("pl.trashDeletedAt", { time: formatTime(item.deletedAt) })}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            fontSize: 11,
                            color: TONE.quiet,
                            lineHeight: 1.5,
                            overflow: "hidden",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.body.replace(/\s+/g, " ").trim() || " "}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <span
                            style={{
                              flexShrink: 0,
                              fontSize: 10,
                              color: daysLeft(item.deletedAt) <= 1 ? TONE.red : TONE.muted,
                              lineHeight: 1.4,
                              background: "var(--dsw-alias-interactive-bg-hover, rgba(196,211,232,.12))",
                              border: `1px solid ${TONE.border}`,
                              borderRadius: 999,
                              padding: "2px 8px",
                            }}
                            data-tip={T("pl.trashCleanupNote")}
                          >
                            {T("pl.trashDaysLeft", { n: daysLeft(item.deletedAt) })}
                          </span>
                          <span style={{ flex: 1 }} />
                          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => restoreOne(item)}>
                            {T("pl.trashRestoreOne")}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => deleteOne(item)} style={{ color: TONE.red }}>
                            {T("pl.trashDeleteOne")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 自定义确认弹窗（替代系统 confirm） */}
      {pendingConfirm && (
        <div className={PL_DIALOG_OVERLAY}>
          <style>{PL_DIALOG_CSS}</style>
          <div
            role="dialog"
            aria-modal="true"
            className={PL_DIALOG}
            style={{ width: 360, maxWidth: "100%", gap: 14 }}
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
    </div>,
    document.body,
  );
}