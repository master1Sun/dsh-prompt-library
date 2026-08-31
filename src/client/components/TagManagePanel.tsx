/**
 * 标签管理面板 — 数据管理弹窗右栏「标签管理」子视图。
 *
 * 自包含的标签管理子组件（新建 / 重命名 / 删除标签），高度撑满父容器，
 * 顶部「新建标签」悬浮固定、下方标签列表独立滚动。数据变化通过 data-sync 通知全局。
 *
 * 由词库助手「数据管理」弹窗内部使用，不复用 TagDataModal 的两栏布局。
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  createTag as apiCreateTag,
  deleteTag as apiDeleteTag,
  listTags as apiListTags,
  renameTag as apiRenameTag,
} from "../utils/api.js";
import { notifyDataChanged } from "../utils/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../utils/button-style.js";
import { PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../utils/dialog-style.js";
import { getTone, useThemeSync } from "../utils/theme.js";
import { type PLTranslate, usePLT } from "../utils/i18n.js";

const MONO =
  "var(--dsw-font-family, -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Helvetica Neue\", Helvetica, Arial, sans-serif)";

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

/** 标签管理面板组件（数据管理弹窗右栏子视图）。 */
export function TagManagePanel(props: { t?: PLTranslate }): ReactNode {
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
    borderRadius: 7,
    fontFamily: MONO,
    fontSize: 13,
    outline: "none",
  };

  const [tagList, setTagList] = useState<Array<{ name: string; count: number }>>([]);
  const [renamingTag, setRenamingTag] = useState<{ from: string; value: string } | null>(null);
  const [newTag, setNewTag] = useState("");

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

  /** 拉取标签汇总（挂载时刷新，删除/重命名后亦刷新）。 */
  const refreshTags = useCallback(() => {
    apiListTags().then(
      (list) => setTagList(list),
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
    );
  }, [showMsg]);

  // 每一次进入面板都重新拉取一次标签，保证与其它入口数据一致
  useEffect(() => {
    refreshTags();
  }, [refreshTags]);

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
      setPendingConfirm({
        message: T("pl.deleteTagConfirm", { name }),
        danger: true,
        action: () => {
          apiDeleteTag(name).then(
            () => {
              showMsg(T("pl.deleteTagDone", { name }));
              setTagList((prev) => prev.filter((x) => x.name !== name));
              notifyDataChanged();
            },
            (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), "error"),
          );
        },
      });
    },
    [showMsg, T, tagList],
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

      {/* 标签列表主体：顶部新建标签悬浮固定，仅列表滚动 */}
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
        {/* 顶部：新建标签（悬浮固定） */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 3,
            padding:  "2px 10px 8px 10px",
            background: TONE.row,
            borderBottom: `1px solid ${TONE.border}`,
            flexShrink: 0,
          }}
        >
          {/* 新建标签 */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "3px", overflowY: "auto", minHeight: 0, flex: 1 }}>
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