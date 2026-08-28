/**
 * 浏览式目录选择弹窗 — 桌面端（无 native capability）的目录选择回退方案。
 *
 * 宿主桌面端只提供 `browse` 能力（listDirectory / createDirectory），
 * 不支持原生 pickDirectory；本弹窗用 listDirectory 逐层列出子目录，
 * 用户逐级进入子目录后点击「选择此目录」确认，支持面包屑跳转与新建文件夹。
 *
 * 弹窗只能通过关闭按钮 / 取消 / 选择操作手动关闭，不响应遮罩点击。
 */
import {
  Fragment,
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import type { DirectoryListing } from "@deepseek-ai/dsh-client-runtime/client";
import { plBtn } from "../utils/button-style.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../utils/dialog-style.js";
import type { PLTranslate } from "../utils/i18n.js";
import {
  createExportDirectory,
  listExportDirectory,
} from "../utils/workspace-picker.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)",
} as const;

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 9px",
  color: TONE.text,
  background: TONE.row,
  border: `1px solid ${TONE.border}`,
  borderRadius: 7,
  fontFamily: MONO,
  fontSize: 13,
  outline: "none",
};

/** 极简文件夹图标（不使用 emoji）。 */
function FolderIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        d="M1.5 3.5A1.5 1.5 0 0 1 3 2h3l1.5 1.8h5.5A1.5 1.5 0 0 1 14.5 5.3v7.2a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5v-9z"
        fill="var(--dsw-alias-brand-primary, #8ec5ff)"
        fillOpacity="0.45"
      />
      <path d="M1.5 6h13v.8h-13z" fill="var(--dsw-alias-brand-primary, #8ec5ff)" fillOpacity="0.45" />
    </svg>
  );
}

/** 浏览式目录选择弹窗。 */
export function DirectoryPickerModal(props: {
  open: boolean;
  /** 初始浏览目录；缺省列出宿主 home。 */
  initialPath?: string;
  /** 确认选择：返回当前浏览到的目录绝对路径。 */
  onPick: (path: string) => void;
  onClose: () => void;
  /** 已绑定命名空间的翻译函数。 */
  t: PLTranslate;
}): ReactNode {
  const { open, initialPath, onPick, onClose, t } = props;

  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  /** 加载指定目录（缺省为宿主 home）的一层子目录。 */
  const load = useCallback(async (target?: string) => {
    setLoading(true);
    setError(null);
    try {
      const l = await listExportDirectory(target);
      setListing(l);
    } catch (e) {
      setListing(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // 打开时复位状态并加载初始目录
  useEffect(() => {
    if (!open) return;
    setListing(null);
    setError(null);
    setNewFolderOpen(false);
    setNewFolderName("");
    setCreateErr(null);
    void load(initialPath || undefined);
  }, [open, initialPath, load]);

  if (!open) return null;

  /** 进入上一级目录（面包屑倒数第二项为当前目录的父目录）。 */
  const goUp = (): void => {
    const crumbs = listing?.crumbs;
    if (!crumbs || crumbs.length < 2) return;
    const parent = crumbs[crumbs.length - 2];
    if (parent) void load(parent.path);
  };

  /** 新建文件夹并刷新当前目录。 */
  const handleCreateFolder = async (): Promise<void> => {
    const name = newFolderName.trim();
    if (!name || !listing) return;
    setCreating(true);
    setCreateErr(null);
    try {
      await createExportDirectory(listing.path, name);
      setNewFolderOpen(false);
      setNewFolderName("");
      void load(listing.path);
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const crumbs = listing?.crumbs ?? [];
  const lastCrumbIndex = crumbs.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pl.dirPicker.title")}
      className={PL_DIALOG_OVERLAY}
    >
      <style>{PL_DIALOG_CSS}</style>
      <div
        className={PL_DIALOG}
        style={{
          width: 580,
          maxWidth: "92%",
          height: "min(540px, calc(100vh - 80px))",
          gap: 10,
        }}
      >
        {/* 标题 + 关闭按钮（弹窗仅通过按钮手动关闭） */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <strong style={{ fontSize: 14, fontWeight: 560, flex: 1, minWidth: 0 }}>
            {t("pl.dirPicker.title")}
          </strong>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("pl.close")}
            data-tip={t("pl.close")}
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
              transition:
                "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
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

        {/* 当前路径 + 上级 / 新建文件夹 */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: "6px 9px",
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              borderRadius: 7,
              fontSize: 12,
              color: TONE.muted,
              fontFamily: MONO,
              overflowWrap: "anywhere",
            }}
            title={listing?.path}
          >
            {listing ? listing.path : t("pl.dirPicker.loading")}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={goUp}
            disabled={loading || !listing || crumbs.length < 2}
            style={{ flexShrink: 0 }}
          >
            {t("pl.dirPicker.up")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={() => {
              setNewFolderOpen((v) => !v);
              setCreateErr(null);
            }}
            disabled={loading || !listing}
            style={{ flexShrink: 0 }}
          >
            {t("pl.dirPicker.newFolder")}
          </Button>
        </div>

        {/* 新建文件夹输入行 */}
        {newFolderOpen && listing && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
            <input
              type="text"
              value={newFolderName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") void handleCreateFolder();
                if (e.key === "Escape") setNewFolderOpen(false);
              }}
              placeholder={t("pl.dirPicker.folderPlaceholder")}
              spellCheck={false}
              autoFocus
              style={{ ...inputStyle, flex: 1 }}
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              className={plBtn("primary", "sm")}
              onClick={() => void handleCreateFolder()}
              disabled={creating || !newFolderName.trim()}
              style={{ flexShrink: 0 }}
            >
              {t("pl.confirm")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={plBtn("ghost", "sm")}
              onClick={() => setNewFolderOpen(false)}
              style={{ flexShrink: 0 }}
            >
              {t("pl.cancel")}
            </Button>
            {createErr ? (
              <span style={{ fontSize: 11, color: TONE.red, minWidth: 0 }}>{createErr}</span>
            ) : null}
          </div>
        )}

        {/* 面包屑：祖先链逐级可跳转 */}
        {crumbs.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", flexShrink: 0 }}>
            {crumbs.map((c, i) => {
              const isLast = i === lastCrumbIndex;
              return (
                <Fragment key={`${c.path}-${i}`}>
                  {i > 0 && <span style={{ color: TONE.quiet, fontSize: 11 }}>/</span>}
                  <button
                    type="button"
                    onClick={() => void load(c.path)}
                    disabled={isLast}
                    style={{
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      cursor: isLast ? "default" : "pointer",
                      padding: "2px 4px",
                      borderRadius: 5,
                      fontSize: 12,
                      color: isLast ? TONE.text : TONE.accent,
                      fontFamily: MONO,
                      transition: "background-color .24s cubic-bezier(.22,1,.36,1)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isLast) e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {c.name}
                  </button>
                </Fragment>
              );
            })}
          </div>
        )}

        {/* 目录列表 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            padding: 4,
            background: TONE.row,
            border: `1px solid ${TONE.border}`,
            borderRadius: 8,
          }}
        >
          {loading ? (
            <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: TONE.quiet }}>
              {t("pl.dirPicker.loading")}
            </div>
          ) : error ? (
            <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: TONE.red, lineHeight: 1.6 }}>
              {t("pl.dirPicker.browseFailed")}
              <div style={{ fontSize: 11, color: TONE.quiet, overflowWrap: "anywhere" }}>{error}</div>
            </div>
          ) : listing && listing.entries.length === 0 ? (
            <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: TONE.quiet }}>
              {t("pl.dirPicker.empty")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {listing?.entries.map((e) => (
                <button
                  key={e.path}
                  type="button"
                  onClick={() => void load(e.path)}
                  title={e.path}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "5px 8px",
                    border: "none",
                    outline: "none",
                    borderRadius: 6,
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 12,
                    color: TONE.text,
                    opacity: e.hidden ? 0.5 : 1,
                    fontFamily: MONO,
                    transition: "background-color .24s cubic-bezier(.22,1,.36,1)",
                  }}
                  onMouseEnter={(ev) => {
                    ev.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                  }}
                  onMouseLeave={(ev) => {
                    ev.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <FolderIcon />
                  <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{e.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 + 取消 / 选择此目录 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: TONE.quiet, lineHeight: 1.5 }}>
            {t("pl.dirPicker.enterHint")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={onClose}
          >
            {t("pl.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={plBtn("primary", "sm")}
            onClick={() => {
              if (listing) onPick(listing.path);
            }}
            disabled={!listing || loading}
          >
            {t("pl.dirPicker.selectCurrent")}
          </Button>
        </div>
      </div>
    </div>
  );
}
