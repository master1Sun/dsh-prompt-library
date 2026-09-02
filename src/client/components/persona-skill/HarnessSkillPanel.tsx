/**
 * Harness 技能开关弹窗 — 独立模态弹窗，尺寸与其它管理弹窗一致（800×800，小视口随窗口缩小）。
 *
 * 由 PromptInjectPanel 左栏工具栏「技能开关」按钮打开/关闭：
 * - 列出并软控制 harness 自动注入的技能，仅能通过右上角关闭按钮收起（禁止点击蒙层关闭）。
 *
 * 列出两类技能：
 * - 系统通用技能：位于 ~/.dsh/skills；
 * - 项目技能：位于当前项目 <项目>/.dsh/skills。
 *
 * 说明：这些技能由 harness 在每次会话开头自动注入，插件无法硬性移除，只能做「软控制」
 * —— 关闭某个技能的开关后，其名称会被列入系统提示的「已禁用清单」，靠模型遵循「别自动用」。
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { listHarnessSkillToggles, setHarnessSkillToggle, deleteHarnessSkill, type HarnessSkillItem } from "../../utils/api.js";
import { plBtn } from "../../utils/button-style.js";
import { getTone, useThemeSync } from "../../utils/theme.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_EMBED_OVERLAY, PL_DIALOG_OVERLAY } from "../../utils/dialog-style.js";
import { ConfirmDialog } from "../common/ConfirmDialog.js";
import { DialogCloseButton } from "../common/DialogCloseButton.js";
import { BookIcon } from "../common/BookIcon.js";
import { type PLT } from "../../utils/i18n.js";

interface Props {
  /** 是否展开。 */
  open: boolean;
  /** 收起面板（展开时关闭按钮触发，恢复右栏项目绑定）。 */
  onClose: () => void;
  /** 翻译函数。 */
  t: PLT;
  /** 容器：传入时视为左侧词库面板内嵌，弹窗局限于容器（右栏）内展示，而非全屏浮层。 */
  container?: HTMLElement;
}

export function HarnessSkillPanel({ open, onClose, t, container }: Props): ReactNode {
  useThemeSync();
  const TONE = getTone();

  const [items, setItems] = useState<HarnessSkillItem[]>([]);
  const [projectRoot, setProjectRoot] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  // 顶部通知：按类型着色并自动消失（成功绿 / 信息主题色 / 错误红，2.6s 后清除）
  const [feedback, setFeedback] = useState<{ text: string; kind: "info" | "success" | "error" } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 待删除的技能 id（弹确认框）
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const tRef = useRef(t);
  tRef.current = t;

  // 弹出顶部通知并安排自动消失（仅保留最后一条）
  const notify = useCallback((text: string, kind: "info" | "success" | "error") => {
    setFeedback({ text, kind });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFeedback(null), 2600);
  }, []);

  const load = useCallback(async () => {
    setLoaded(false);
    setFeedback(null);
    try {
      const { items: list, projectRoot: pr } = await listHarnessSkillToggles();
      setItems(list);
      setProjectRoot(pr);
    } catch {
      notify(tRef.current("pl.inject.opFailed"), "error");
    } finally {
      setLoaded(true);
    }
  }, [notify]);

  // 卸载时清理自动消失定时器
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDeleteId(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 切换某技能开关：乐观更新，失败回滚并提示
  const toggle = async (item: HarnessSkillItem) => {
    const next = !item.enabled;
    const prevItem = item;
    setBusy(true);
    setFeedback(null);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, enabled: next } : i)));
    try {
      await setHarnessSkillToggle(item.id, next);
      notify(next ? t("pl.harnessSkill.enabled") : t("pl.harnessSkill.disabled"), "success");
    } catch {
      setItems((prev) => prev.map((i) => (i.id === prevItem.id ? { ...i, enabled: prevItem.enabled } : i)));
      notify(t("pl.inject.opFailed"), "error");
    } finally {
      setBusy(false);
    }
  };

  // 删除某技能（确认后调用后端删除目录，成功刷新列表 + 通知）
  const removeSkill = async (id: string) => {
    setDeleteId(null);
    setBusy(true);
    setFeedback(null);
    try {
      await deleteHarnessSkill(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      notify(t("pl.harnessSkill.deleted"), "success");
    } catch {
      notify(t("pl.inject.opFailed"), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const systemItems = items.filter((i) => i.scope === "system");
  const projectItems = items.filter((i) => i.scope === "project");

  const renderSwitch = (item: HarnessSkillItem): ReactNode => (
    <button
      type="button"
      role="switch"
      aria-checked={item.enabled}
      title={t("pl.inject.enabled")}
      disabled={busy}
      onClick={() => void toggle(item)}
      style={{
        flexShrink: 0,
        width: 34,
        height: 18,
        borderRadius: 9,
        border: `1px solid ${TONE.border}`,
        background: item.enabled ? TONE.accent : "transparent",
        position: "relative",
        cursor: busy ? "not-allowed" : "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: item.enabled ? 17 : 2,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: item.enabled ? TONE.panel : TONE.quiet,
          transition: "left .24s cubic-bezier(.22,1,.36,1)",
        }}
      />
    </button>
  );

  const renderItem = (item: HarnessSkillItem): ReactNode => (
    <div
      key={item.id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: TONE.panel,
        border: `1px solid ${TONE.border}`,
        borderRadius: 8,
        padding: "8px 10px",
      }}
    >
      <BookIcon color={item.enabled ? TONE.accent : TONE.quiet} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: item.enabled ? TONE.text : TONE.quiet,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={item.name}
          >
            {item.title}
          </strong>
          <span
            style={{
              flexShrink: 0,
              fontSize: 10,
              color: TONE.accent,
              background: TONE.accentSoft,
              border: `1px solid ${TONE.border}`,
              borderRadius: 999,
              padding: "0 6px",
              lineHeight: "15px",
            }}
          >
            {item.name}
          </span>
        </div>
        {item.summary && (
          <div
            style={{
              fontSize: 11,
              color: TONE.quiet,
              lineHeight: 1.4,
              marginTop: 3,
              minHeight: 14,
              maxHeight: 34,
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {item.summary}
          </div>
        )}
      </div>
      {/* 右侧操作：开关 + 删除 */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {renderSwitch(item)}
        <button
          type="button"
          title={t("pl.delete")}
          aria-label={t("pl.delete")}
          disabled={busy}
          onClick={() => setDeleteId(item.id)}
          style={{
            width: 20,
            height: 20,
            border: "none",
            outline: "none",
            borderRadius: 5,
            background: "transparent",
            cursor: busy ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: TONE.quiet,
            padding: 0,
            transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06))";
            e.currentTarget.style.color = TONE.red;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = TONE.quiet;
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  );

  const renderSection = (title: string, hint: string, list: HarnessSkillItem[]): ReactNode => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 3, height: 13, borderRadius: 2, background: TONE.accent, flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: TONE.text }}>{title}</span>
        <span style={{ fontSize: 11, color: TONE.quiet }}>（{list.length}）</span>
      </div>
      <div style={{ fontSize: 11, color: TONE.quiet, lineHeight: 1.5 }}>{hint}</div>
      {list.length === 0 ? (
        <div style={{ fontSize: 11.5, color: TONE.quiet, textAlign: "center", padding: "12px 0" }}>
          {t("pl.harnessSkill.empty")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{list.map(renderItem)}</div>
      )}
    </div>
  );

  // 顶部通知着色：错误红 / 成功绿 / 信息主题色
  const feedbackColor =
    feedback?.kind === "error" ? TONE.red : feedback?.kind === "success" ? TONE.mint : TONE.accent;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pl.harnessSkill.title")}
      className={container ? undefined : PL_DIALOG_OVERLAY}
      style={container ? PL_DIALOG_EMBED_OVERLAY : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <style>{PL_DIALOG_CSS}</style>
      {/* 弹窗主体：独立弹窗固定 800×800 随视口缩小；容器内嵌时铺满右栏（100%） */}
      <div
        className={PL_DIALOG}
        style={
          container
            ? { width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", padding: "16px 18px", background: TONE.panel }
            : { width: 800, height: 800, maxWidth: "calc(100vw - 40px)", maxHeight: "calc(100vh - 40px)", padding: "16px 18px" }
        }
      >
        {/* 标题行 + 刷新 + 右上角关闭按钮（吸顶固定） */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <BookIcon color={TONE.accent} />
          <strong
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: 600,
              color: TONE.text,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {t("pl.harnessSkill.title")}
          </strong>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            disabled={busy}
            onClick={() => void load()}
          >
            {t("pl.refresh")}
          </Button>
          <DialogCloseButton onClick={onClose} label={t("pl.close")} />
        </div>

        {/* 说明框（软控制） */}
        <div
          style={{
            flexShrink: 0,
            marginTop: 10,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: TONE.quiet,
            background: TONE.accentSoft,
            border: `1px solid ${TONE.border}`,
            borderRadius: 7,
            padding: "7px 10px",
          }}
        >
          {projectRoot
            ? t("pl.harnessSkill.noteProject", { project: projectRoot })
            : t("pl.harnessSkill.note")}
        </div>

        {/* 顶部通知：固定 18px 行高占位（避免出现/消失时布局跳动），按类型着色 + 圆点指示 */}
        <div
          role={feedback ? "alert" : undefined}
          style={{
            flexShrink: 0,
            marginTop: 8,
            height: 18,
            lineHeight: "18px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
          }}
        >
          {feedback && (
            <>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: feedbackColor,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: feedbackColor,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {feedback.text}
              </span>
            </>
          )}
        </div>

        {/* 内容区：独立滚动（标题/说明/通知保持固定） */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            marginTop: 10,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            paddingBottom: 8,
          }}
        >
          {!loaded ? (
            <div style={{ fontSize: 12.5, color: TONE.quiet, textAlign: "center", padding: "22px 0" }}>
              {t("pl.achievements.loading")}
            </div>
          ) : (
            <>
              {renderSection(t("pl.harnessSkill.systemTitle"), t("pl.harnessSkill.systemHint"), systemItems)}
              {renderSection(t("pl.harnessSkill.projectTitle"), t("pl.harnessSkill.projectHint"), projectItems)}
            </>
          )}
        </div>

        {/* 删除确认弹窗（删除为永久操作，需二次确认） */}
        <ConfirmDialog
          danger
          open={deleteId != null}
          message={t("pl.harnessSkill.deleteConfirm", {
            name: items.find((i) => i.id === deleteId)?.title ?? "",
          })}
          confirmLabel={t("pl.delete")}
          cancelLabel={t("pl.cancel")}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => (deleteId ? void removeSkill(deleteId) : undefined)}
        />
      </div>
    </div>,
    container || document.body,
  );
}