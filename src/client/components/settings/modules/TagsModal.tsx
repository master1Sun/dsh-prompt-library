/**
 * 标签管理弹窗 — 词库助手「数据管理」→「标签管理」入口。
 *
 * 集中管理提示词标签：新建 / 重命名 / 删除。标签被提示词使用时禁止删除。
 *
 * 由词库助手右键菜单打开，弹窗只能通过关闭按钮手动关闭，不响应遮罩点击。
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
} from "../../../services/api.js";
import { notifyDataChanged } from "../../../services/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../../utils/button-style.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../../../utils/dialog-style.js";
import { type PLTranslate, usePLT } from "../../../i18n/i18n.js";

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

/** 标签管理弹窗组件。 */
export function TagsModal(props: {
  open: boolean;
  onClose: () => void;
  t?: PLTranslate;
}): ReactNode {
  const { open, onClose, t } = props;
  const T = usePLT(t);

  const [tagList, setTagList] = useState<Array<{ name: string; count: number }>>([]);
  const [renamingTag, setRenamingTag] = useState<{ from: string; value: string } | null>(null);
  const [newTag, setNewTag] = useState("");
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

  /** 拉取标签汇总（打开时刷新，删除/重命名后亦刷新）。 */
  const refreshTags = useCallback(() => {
    apiListTags().then(
      (list) => setTagList(list),
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
    );
  }, [showMsg]);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    setNewTag("");
    setRenamingTag(null);
    refreshTags();
  }, [open, refreshTags]);

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
      },
      (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
    );
  }, [renamingTag, showMsg, T]);

  /** 删除标签：被使用时禁止删除，需先从提示词中移除该标签后才能删除。 */
  const removeTag = useCallback(
    (name: string) => {
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
          },
          (e: unknown) => showMsg(e instanceof Error ? e.message : String(e), true),
        );
      });
    },
    [showMsg, T, tagList, requestConfirm],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T("pl.moduleTags")}
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
          width: 560,
          maxWidth: "90%",
          height: "min(560px, calc(100vh - 60px))",
          gap: 12,
        }}
      >
        {/* 标题 + 关闭按钮 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <strong style={{ fontSize: 15, fontWeight: 560, flex: 1, minWidth: 0 }}>
            {T("pl.moduleTags")}
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
          {T("pl.moduleTagsDesc")}
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

        {/* 标签列表（限高滚动） */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 10 }}>
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