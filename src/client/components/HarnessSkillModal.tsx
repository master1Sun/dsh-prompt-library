/**
 * Harness 技能开关弹窗 — 词库助手右键菜单「技能管理」里独立按钮打开。
 *
 * 用于列出并软控制 harness 自动注入的技能：
 * - 系统通用技能：位于 ~/.dsh/skills；
 * - 项目技能：位于当前项目 <项目>/.dsh/skills。
 *
 * 说明：这些技能由 harness 在每次会话开头自动注入，插件无法硬性移除，只能做「软控制」
 * —— 关闭某个技能的开关后，其名称会被列入系统提示的「已禁用清单」，靠模型遵循「别自动用」。
 *
 * 交互约束（与其它弹窗一致）：只能通过关闭按钮手动关闭，禁止点击遮罩/外部区域关闭。
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { listHarnessSkillToggles, setHarnessSkillToggle, type HarnessSkillItem } from "../utils/api.js";
import { plBtn } from "../utils/button-style.js";
import { getTone, useThemeSync } from "../utils/theme.js";
import { PL_DIALOG, PL_DIALOG_CSS, PL_DIALOG_OVERLAY } from "../utils/dialog-style.js";
import { DialogCloseButton } from "./DialogCloseButton.js";
import { BookIcon } from "./BookIcon.js";
import { type PLT } from "../utils/i18n.js";

interface Props {
  /** 是否显示。 */
  open: boolean;
  /** 关闭弹窗（仅由关闭按钮触发）。 */
  onClose: () => void;
  /** 翻译函数。 */
  t: PLT;
}

export function HarnessSkillModal({ open, onClose, t }: Props): ReactNode {
  useThemeSync();
  const TONE = getTone();

  const [items, setItems] = useState<HarnessSkillItem[]>([]);
  const [projectRoot, setProjectRoot] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const tRef = useRef(t);
  tRef.current = t;

  const load = useCallback(async () => {
    setLoaded(false);
    setError(null);
    setMsg(null);
    try {
      const { items: list, projectRoot: pr } = await listHarnessSkillToggles();
      setItems(list);
      setProjectRoot(pr);
    } catch {
      setError(tRef.current("pl.inject.opFailed"));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 切换某技能开关：乐观更新，失败回滚并提示
  const toggle = async (item: HarnessSkillItem) => {
    const next = !item.enabled;
    const prevItem = item;
    setBusy(true);
    setError(null);
    setMsg(null);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, enabled: next } : i)));
    try {
      await setHarnessSkillToggle(item.id, next);
      setMsg({ text: next ? t("pl.harnessSkill.enabled") : t("pl.harnessSkill.disabled") });
    } catch {
      setItems((prev) => prev.map((i) => (i.id === prevItem.id ? { ...i, enabled: prevItem.enabled } : i)));
      setError(t("pl.inject.opFailed"));
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
      {renderSwitch(item)}
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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("pl.harnessSkill.title")}
      className={PL_DIALOG_OVERLAY}
      onClick={(e) => e.stopPropagation()}
    >
      <style>{PL_DIALOG_CSS}</style>
      <div className={PL_DIALOG} style={{ width: 860, height: 760, maxWidth: "calc(100vw - 40px)", maxHeight: "calc(100vh - 40px)", gap: 4 }}>
        {/* 标题行 + 刷新 + 关闭按钮 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <BookIcon color={TONE.accent} />
          <strong style={{ flex: 1, fontSize: 15, fontWeight: 600, minWidth: 0, color: TONE.text }}>
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
          {projectRoot ? t("pl.harnessSkill.noteProject", { project: projectRoot }) : t("pl.harnessSkill.note")}
        </div>

        {msg && !msg.error && (
          <div style={{ marginTop: 8, fontSize: 12, color: TONE.text, lineHeight: 1.5, flexShrink: 0 }}>{msg.text}</div>
        )}
        {error ? (
          <div style={{ marginTop: 8, fontSize: 12, color: TONE.red, lineHeight: 1.5, flexShrink: 0 }}>{error}</div>
        ) : msg?.error ? (
          <div style={{ marginTop: 8, fontSize: 12, color: TONE.red, lineHeight: 1.5, flexShrink: 0 }}>{msg.text}</div>
        ) : null}

        {/* 内容区（独立滚动） */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginTop: 10,
            padding: 4,
            paddingBottom: 8,
            overflowY: "auto",
            boxSizing: "border-box",
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
      </div>
    </div>,
    document.body,
  );
}