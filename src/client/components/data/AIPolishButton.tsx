/**
 * AI 润色 composer 按钮控件。
 *
 * 注册到 `conversation.input.left` 插槽：composer 工具栏中「词库」旁的
 * 一个润色星星按钮。点击后获取当前输入框草稿，调用 harness AI 润色，
 * 处理中按钮图标显示旋转动画；润色完成后弹出结果面板，支持一键覆盖输入框内容。
 *
 * AI 能力完全复用 host 侧 ai.ts（polishPromptBody），
 * 本组件只做浏览器端编排，不重复实现 AI 调用逻辑。
 */
import { useCallback, useLayoutEffect, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { PL_BUTTON_CSS, plBtn } from "../../utils/button-style.js";
import { getSettings as apiGetSettings, polishPrompt } from "../../utils/api.js";
import type { PluginSettings } from "../../../types.js";
import { DEFAULT_SETTINGS } from "../../../types.js";
import { type PLTranslate, usePLT } from "../../utils/i18n.js";
import { useFillDraft } from "../../utils/data-sync.js";
import { rowBackground } from "../../utils/theme.js";

/**
 * `conversation.input.left` 的最小属性合约（与 PromptLibraryButton 一致）。
 * useInput 读取当前草稿；inputActions.setDraft 覆盖输入框内容。
 */
interface ButtonProps {
  useInput: <T>(selector: (s: { draft: string }) => T) => T;
  inputActions: {
    setDraft: (text: string) => void;
  };
  t?: PLTranslate;
}

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  accentSoft: "var(--dsw-alias-brand-primary-weak, rgba(142, 197, 255, 0.14))",
  mint: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff8592)",
} as const;

/** toast 展示时长（毫秒）。 */
const TOAST_MS = 2200;

/** 润色星星图标：主四角星 + 右上小星光。 */
function SparkleIcon({ spinning }: { spinning: boolean }): ReactNode {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ animation: spinning ? "pl-polish-spin 0.9s linear infinite" : "none" }}
    >
      <path
        d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
      />
      <path
        d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
      />
    </svg>
  );
}

/** 读取插件设置，并在设置变更时（pl:settings-changed）立即生效。 */
function useSettings(): PluginSettings {
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);

  const load = useCallback(() => {
    apiGetSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as PluginSettings | undefined;
      if (detail) setSettings(detail);
      else load();
    };
    window.addEventListener("pl:settings-changed", onChanged);
    return () => window.removeEventListener("pl:settings-changed", onChanged);
  }, [load]);

  return settings;
}

export function AIPolishButton(props: ButtonProps): ReactNode {
  const { inputActions, useInput, t } = props;
  const T = usePLT(t);
  const draft = useInput((s) => s.draft);

  // 润色面板/提示需脱离 composer 的层叠上下文渲染（挂到 document.body 的 fixed 浮层），
  // 否则会被 DSH 侧边栏遮挡。containerRef 用于测量按钮视口位置，据此锚定浮层。
  const containerRef = useRef<HTMLSpanElement | null>(null);
  // 浮层锚点（视口右侧/底部偏移）：面板右缘对齐按钮右缘、底边位于按钮上方 4px。
  const [anchor, setAnchor] = useState({ right: 0, bottom: 0 });

  const settings = useSettings();

  // 兜底监听 host 推送的 fill-draft（AI 润色/完善结果）：
  // 与 PromptLibraryButton 同slot挂载，任一方存在都能把内容填进聊天框。
  useFillDraft((body) => {
    if (body) inputActions.setDraft(body);
  });

  const [status, setStatus] = useState<"idle" | "polishing" | "done" | "error">("idle");
  const [result, setResult] = useState("");
  // 润色前的原稿：供结果面板「原稿/润色稿」对比
  const [original, setOriginal] = useState("");
  const [showOriginal, setShowOriginal] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // 定时清除 toast，避免长期悬浮
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  // 面板/提示展示期间：测量按钮位置并跟随滚动/缩放实时更新锚点。
  // useLayoutEffect 在绘制前完成定位，首帧不会出现锚点归零闪烁。
  useLayoutEffect(() => {
    if (status !== "done" && status !== "error" && !toast) return;
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setAnchor({ right: window.innerWidth - r.right, bottom: window.innerHeight - r.top + 4 });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [status, toast]);

  const closeResult = useCallback(() => {
    setStatus("idle");
    setResult("");
    setOriginal("");
    setShowOriginal(false);
    setError("");
  }, []);

  /** 点击润色：取输入框内容 → 调 AI 润色 → 展示结果供用户复制/插入。 */
  const handlePolish = useCallback(() => {
    const text = draft.trim();
    if (!text) {
      showToast(T("pl.polishEmpty"));
      return;
    }
    setStatus("polishing");
    setError("");
    setOriginal(draft);
    setShowOriginal(false);
    // 聊天框按钮润色不启用「{{}} 模板变量保留/新增」能力（与词库内润色区分）
    polishPrompt(draft, { keepVariables: false })
      .then(({ polished }) => {
        // 空结果按失败处理：避免渲染空白面板（issue #8：stripAiFiller 可能把整段清成空串）
        if (!polished || !polished.trim()) {
          setError(T("pl.polishFail"));
          setStatus("error");
          return;
        }
        setResult(polished);
        setStatus("done");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
        showToast(T("pl.polishFail"));
      });
  }, [draft, showToast, T]);

  /** 用润色结果覆盖输入框内容（不再弹出「已替换」toast）。 */
  const applyResult = useCallback(() => {
    if (!result) return;
    inputActions.setDraft(result);
    closeResult();
  }, [result, inputActions, closeResult]);

  /** 复制润色结果到剪贴板。 */
  const copyResult = useCallback(() => {
    navigator.clipboard.writeText(result).catch(() => {});
    showToast(T("pl.copied"));
  }, [result, showToast, T]);

  const containerStyle: CSSProperties = {
    display: "inline-flex",
    position: "relative",
    fontFamily: MONO,
  };

  // 浮层经 portal 挂到 body：fixed 定位脱离 composer 层叠上下文，用视口锚点摆到按钮上方，
  // 层级取全项目统一的最大值（与 # 浮层/菜单/提示同级），确保盖在 DSH 侧边栏之上。
  const panelStyle: CSSProperties = {
    position: "fixed",
    right: anchor.right,
    bottom: anchor.bottom,
    zIndex: 2147483647,
    width: 380,
    maxWidth: "calc(100vw - 24px)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "14px 16px",
    color: TONE.text,
    background: TONE.panel,
    border: `1px solid ${TONE.borderStrong}`,
    borderRadius: 12,
    fontFamily: MONO,
  };

  // 由设置控制显隐（hooks 已全部执行完再判断，保持 hooks 顺序稳定）
  if (!settings.showAIPolishButton) return null;

  return (
    <span ref={containerRef} data-prompt-library-ai-polish style={containerStyle}>
      <style>{PL_BUTTON_CSS}</style>
      {/* 聊天栏按钮无边框（与词库按钮一致）：去掉 .pl-btn--sm 的边框，保留投影取消 */}
      <style>{`.pl-btn.pl-cbn-btn{border:none;box-shadow:none}`}</style>
      <style>{`@keyframes pl-polish-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`${plBtn("ghost", "sm")} pl-cbn-btn`}
        onClick={handlePolish}
        disabled={status === "polishing" || !draft.trim()}
        data-tip={status === "polishing" ? T("pl.polishLoadingTitle") : draft.trim() ? T("pl.polishHoverContent") : T("pl.polishEmpty")}
        aria-label={T("pl.polish")}
        icon={<SparkleIcon spinning={status === "polishing"} />}
      >
        {!settings.aiPolishButtonIconOnly && (status === "polishing" ? T("pl.polishing") : T("pl.polish"))}
      </Button>

      {/* 状态提示（portal 到 body，fixed 锁到按钮上方，避免被侧边栏遮挡） */}
      {toast &&
        createPortal(
          <span
            role="status" aria-live="polite"
            style={{
              position: "fixed",
              bottom: anchor.bottom,
              right: anchor.right,
              padding: "4px 10px",
              color: TONE.panel,
              background: status === "error" ? TONE.red : TONE.mint,
              borderRadius: 6,
              fontSize: 11,
              fontFamily: MONO,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              opacity: 0.92,
              zIndex: 2147483647,
            }}
          >
            {status === "error" ? "\u26A0 " : "\u2713 "}
            {toast}
          </span>,
          document.body,
        )}

      {/* 润色结果面板（portal 到 body，避开侧边栏）：可编辑，支持覆盖输入框。
          不设置点击遮罩关闭——点击其他位置不会关闭面板，只能通过显式按钮操作。 */}
      {status === "done" &&
        createPortal(
          <section role="dialog" aria-label={T("pl.polishResult")} style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <strong style={{ fontSize: 13, fontWeight: 470 }}>{T("pl.polishResult")}</strong>
              {error && <span style={{ color: TONE.red, fontSize: 11 }}>{error}</span>}
            </div>
            {/* 原稿 / 润色稿对比切换 */}
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {([
                { value: false, label: T("pl.polished") },
                { value: true, label: T("pl.original") },
              ] as const).map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setShowOriginal(opt.value)}
                  style={{
                    cursor: "pointer",
                    padding: "2px 10px",
                    fontSize: 11,
                    fontFamily: MONO,
                    color: showOriginal === opt.value ? TONE.accent : TONE.muted,
                    background: showOriginal === opt.value ? TONE.accentSoft : "transparent",
                    border: `1px solid ${showOriginal === opt.value ? TONE.accent : TONE.border}`,
                    borderRadius: 999,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <textarea
              value={showOriginal ? original : result}
              readOnly={showOriginal}
              onChange={(e) => setResult(e.target.value)}
              rows={7}
              aria-label={T("pl.polishResultAria")}
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
                padding: "7px 9px",
                color: TONE.text,
                background: showOriginal ? TONE.panel : rowBackground(),
                border: `1px solid ${TONE.border}`,
                borderRadius: 7,
                fontFamily: MONO,
                fontSize: 12,
                outline: "none",
                opacity: showOriginal ? 0.75 : 1,
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={copyResult}>
                {T("pl.copy")}
              </Button>
              <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={closeResult}>
                {T("pl.close")}
              </Button>
              <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={applyResult}>
                {T("pl.replaceContent")}
              </Button>
            </div>
          </section>,
          document.body,
        )}

      {/* 失败常驻面板（portal 到 body）：模型失败 / 空结果时展示可重试的错误态，而非 2.2s 即消失的瞬时 toast */}
      {status === "error" &&
        createPortal(
          <section role="alert" aria-label={T("pl.polishFailedTitle")} style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <strong style={{ fontSize: 13, fontWeight: 470, color: TONE.red }}>{T("pl.polishFailedTitle")}</strong>
          </div>
          <div style={{ color: TONE.text, fontSize: 12, lineHeight: 1.6 }}>
            {error || T("pl.polishFail")}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={closeResult}>
              {T("pl.close")}
            </Button>
            <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={handlePolish}>
              {T("pl.polish")}
            </Button>
          </div>
          </section>,
          document.body,
        )}
    </span>
  );
}
