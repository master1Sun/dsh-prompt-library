/**
 * 回收站管理面板 — 数据管理弹窗右栏「回收站」子视图。
 *
 * 自包含的回收站子组件（搜索 / 批量恢复 / 批量/单条永久删除），高度撑满父容器，
 * 顶部「搜索 + 工具栏」悬浮固定、下方回收条目列表独立滚动。恢复后通过 data-sync 通知全局。
 *
 * 由词库助手「数据管理」弹窗内部使用，不复用 TagDataModal 的两栏布局。
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
import type { TrashItem } from "../../../types.js";
import {
  deleteTrash as apiDeleteTrash,
  listTrash as apiListTrash,
  restoreTrash as apiRestoreTrash,
} from "../../utils/api.js";
import { notifyDataChanged, useDataChanged } from "../../utils/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../utils/button-style.js";
import { PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../../utils/dialog-style.js";
import { getTone, useThemeSync } from "../../utils/theme.js";
import { type PLTranslate, usePLT } from "../../utils/i18n.js";

const MONO =
  "var(--dsw-font-family, -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Helvetica Neue\", Helvetica, Arial, sans-serif)";

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

/** 回收站管理面板组件（数据管理弹窗右栏子视图）。 */
export function RecycleManagePanel(props: { t?: PLTranslate }): ReactNode {
  const { t } = props;
  const T = usePLT(t);
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "7px 9px",
    color: TONE.text,
    background: TONE.row,
    border: `1px solid ${TONE.border}`,
    borderRadius: 10,
    fontFamily: MONO,
    fontSize: 13,
    outline: "none",
  };

  const [trashList, setTrashList] = useState<TrashItem[]>([]);
  const [trashSelected, setTrashSelected] = useState<Set<string>>(new Set());
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashQuery, setTrashQuery] = useState("");

  const [msg, setMsg] = useState<{ text: string; kind?: "success" | "info" | "error" } | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pendingConfirm, setPendingConfirm] = useState<{
    message: string;
    danger: boolean;
    action: () => void;
  } | null>(null);

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

  /** 拉取回收站列表（每次进入面板时刷新，恢复/删除后亦刷新）。 */
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
    setTrashQuery("");
    refreshTrash();
  }, [refreshTrash]);

  // 数据变化（含 host 侧 /prompts 保存）时同步刷新回收站（面板挂载时生效）
  useDataChanged(() => {
    refreshTrash();
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

  /** 批量恢复选中（带确认）。 */
  const restoreSelected = useCallback(() => {
    const ids = Array.from(trashSelected);
    if (ids.length === 0) return;
    setPendingConfirm({
      message: T("pl.trashRestoreSelectedConfirm", { count: ids.length }),
      danger: false,
      action: () => {
        apiRestoreTrash(ids).then(
          (res) => {
            showMsg(T("pl.trashRestoreDone", { count: res.restored }));
            notifyDataChanged();
            refreshTrash();
          },
          (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
        );
      },
    });
  }, [trashSelected, showMsg, T, refreshTrash]);

  /** 批量永久删除选中。 */
  const deleteSelected = useCallback(() => {
    const ids = Array.from(trashSelected);
    if (ids.length === 0) return;
    setPendingConfirm({
      message: T("pl.trashDeleteConfirm", { count: ids.length }),
      danger: true,
      action: () => {
        apiDeleteTrash(ids).then(
          (res) => {
            showMsg(T("pl.trashDeleteDone", { count: res.deleted }));
            refreshTrash();
          },
          (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
        );
      },
    });
  }, [trashSelected, showMsg, T, refreshTrash]);

  /** 单条恢复。 */
  const restoreOne = useCallback(
    (item: TrashItem) => {
      setPendingConfirm({
        message: T("pl.trashRestoreOneConfirm", { title: item.title }),
        danger: false,
        action: () => {
          apiRestoreTrash([item.id]).then(
            (res) => {
              showMsg(T("pl.trashRestoreDone", { count: res.restored }));
              notifyDataChanged();
              refreshTrash();
            },
            (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
          );
        },
      });
    },
    [showMsg, T, refreshTrash],
  );

  /** 单条永久删除。 */
  const deleteOne = useCallback(
    (item: TrashItem) => {
      setPendingConfirm({
        message: T("pl.trashDeleteOneConfirm", { title: item.title }),
        danger: true,
        action: () => {
          apiDeleteTrash([item.id]).then(
            (res) => {
              showMsg(T("pl.trashDeleteDone", { count: res.deleted }));
              refreshTrash();
            },
            (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
          );
        },
      });
    },
    [showMsg, T, refreshTrash],
  );

  return (
    <>
      <style>{PL_DIALOG_CSS}</style>
      <style>{`
.pl-data-card{transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-data-card:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3, rgba(196,211,232,.31))}
`}</style>
      {/* 操作反馈：预留固定行高，避免显示/隐藏时改变布局引起窗口抖动；按类型区分颜色 */}
      <div
        style={{
          flexShrink: 0,
          height: 18,
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

      {/* 回收站主体：顶部搜索 + 工具栏悬浮固定，仅列表滚动 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 顶部：搜索 + 工具栏（悬浮固定） */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 3,
            padding: "10px 12px 10px 12px",
            background: TONE.row,
            borderBottom: `1px solid ${TONE.border}`,
            borderRadius: 12,
            flexShrink: 0,
          }}
        >
          {/* 搜索 */}
          <div style={{ position: "relative", flexShrink: 0 }}>
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
              {filteredTrash.length > 0 && trashSelected.size === filteredTrash.length
                ? T("pl.trashDeselectAll")
                : T("pl.trashSelectAll")}
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
              {`${trashSelected.size}/${trashList.length}`}
            </span>
          </div>
        </div>

        {/* 回收内容列表：仅此区域滚动 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "3px", overflowY: "auto", minHeight: 0, flex: 1}}>
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

      {/* 自定义确认弹窗（替代系统 confirm） */}
      {pendingConfirm && (
        <div className={PL_DIALOG_OVERLAY}>
          <style>{PL_DIALOG_CSS}</style>
          <div
            role="dialog"
            aria-modal="true"
            className="pl-dialog"
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
    </>
  );
}