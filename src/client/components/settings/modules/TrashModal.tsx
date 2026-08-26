/**
 * 回收站弹窗 — 词库助手「数据管理」→「回收站」入口。
 *
 * 集中展示已删除的提示词，支持恢复 / 永久删除（单个或批量）；删除后 30 天自动清除。
 *
 * 由词库助手右键菜单打开，弹窗只能通过关闭按钮手动关闭，不响应遮罩点击。
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { TrashItem } from "../../../../types.js";
import {
  deleteTrash as apiDeleteTrash,
  listTrash as apiListTrash,
  restoreTrash as apiRestoreTrash,
} from "../../../services/api.js";
import { notifyDataChanged, useDataChanged } from "../../../services/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../../utils/button-style.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../../../utils/dialog-style.js";
import { type PLTranslate, usePLT } from "../../../i18n/i18n.js";

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

/** 回收站弹窗组件。 */
export function TrashModal(props: {
  open: boolean;
  onClose: () => void;
  t?: PLTranslate;
}): ReactNode {
  const { open, onClose, t } = props;
  const T = usePLT(t);

  const [trashList, setTrashList] = useState<TrashItem[]>([]);
  const [trashSelected, setTrashSelected] = useState<Set<string>>(new Set());
  const [trashLoading, setTrashLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 自定义确认弹窗：替代系统 confirm()
  const [pendingConfirm, setPendingConfirm] = useState<{
    message: string;
    danger: boolean;
    action: () => void;
  } | null>(null);
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
        showMsg(e instanceof Error ? e.message : String(e), true);
        setTrashLoading(false);
      },
    );
  }, [showMsg]);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    refreshTrash();
  }, [open, refreshTrash]);

  // 数据变化（含 host 侧 /prompts 保存）时同步刷新（弹窗打开时生效）
  useDataChanged(() => {
    if (open) refreshTrash();
  });

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
      },
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
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
          },
          (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
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
          (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
        );
      });
    },
    [showMsg, T, refreshTrash, requestConfirm],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T("pl.moduleTrash")}
      className={PL_DIALOG_OVERLAY}
    >
      <style>{PL_DIALOG_CSS}</style>
      <style>{`
.pl-data-card{transition:border-color .24s cubic-bezier(.22,1,.36,1),background-color .24s cubic-bezier(.22,1,.36,1),transform .24s cubic-bezier(.22,1,.36,1)}
.pl-data-card:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3, rgba(196,211,232,.31))}
`}</style>
      <div
        className={PL_DIALOG}
        style={{
          width: 680,
          maxWidth: "90%",
          height: "min(600px, calc(100vh - 60px))",
          gap: 12,
        }}
      >
        {/* 标题 + 关闭按钮 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <strong style={{ fontSize: 15, fontWeight: 560, flex: 1, minWidth: 0 }}>
            {T("pl.moduleTrash")}
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
          {T("pl.moduleTrashDesc")}
        </div>

        {/* 自动清除提示 */}
        <div
          style={{
            flexShrink: 0,
            fontSize: 11,
            lineHeight: 1.5,
            color: TONE.quiet,
            background: TONE.row,
            border: `1px solid ${TONE.border}`,
            borderRadius: 6,
            padding: "6px 10px",
          }}
        >
          {T("pl.trashCleanupNote")}
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

        {/* 工具栏 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
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

        {/* 回收内容列表（限高滚动） */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 10 }}>
          {trashLoading ? (
            <div style={{ padding: "12px 0", fontSize: 12, color: TONE.muted }}>
              {T("pl.loading")}
            </div>
          ) : trashList.length === 0 ? (
            <div style={{ padding: "12px 0", fontSize: 12, color: TONE.muted }}>
              {T("pl.trashEmpty")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {trashList.map((item) => (
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
    </div>
  );
}