/**
 * 「需重启服务」提示气泡（统一样式）。
 *
 * 触发来源：版本不一致——用户更新插件后未重启 dsh web，/version 返回的 server 与
 * installed 不一致时弹出提示，需重启服务方能使新版本代码生效。
 *
 * 说明：桌面端与 Web 端的重启行为不可靠（桌面端不应显示、Web 端重启不生效），因此气泡
 * 仅作提示，不带「重启服务」按钮，由用户自行决定如何重启。
 * 关闭后本次会话不再重复弹出；重启成功后页面重新加载，提示自然消失。
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getVersion } from "../../utils/api.js";
import { type PLTranslate, usePLT } from "../../utils/i18n.js";
import { DialogCloseButton } from "./DialogCloseButton.js";

const MONO =
  '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "黑体", sans-serif';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  border: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
} as const;

/** 本地存储键：记录最近一次「已弹出」的日期，实现「每天只提示一次」。 */
const NOTICE_KEY = "pl-version-notice-last-shown";

/** 本地日期 YYYY-MM-DD（按用户时区）。 */
function todayKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 今天是否已经弹出过（隐私模式/读不到时按「未弹过」处理，避免漏报）。 */
function alreadyShownToday(): boolean {
  try {
    return localStorage.getItem(NOTICE_KEY) === todayKey();
  } catch {
    return false;
  }
}

/** 标记今天已弹出。 */
function markShownToday(): void {
  try {
    localStorage.setItem(NOTICE_KEY, todayKey());
  } catch {
    /* 只读场景忽略 */
  }
}

export function VersionUpdateNotice({ t }: { t?: PLTranslate }): ReactNode {
  const T = usePLT(t);
  const [show, setShow] = useState(false);
  const [server, setServer] = useState("");
  const [installed, setInstalled] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    getVersion()
      .then((v) => {
        // server 为服务端运行版本，installed 为磁盘已安装版本；二者不一致说明更新后未重启。
        // server === "0.0.0" 属于调试环境未注入版本号的情况，忽略以免误报。
        if (alive && v.server && v.installed && v.server !== "0.0.0" && v.server !== v.installed) {
          // 每天只自动弹出一次：今天已弹过则不再弹（localStorage 记录日期）。
          if (!alreadyShownToday()) {
            markShownToday();
            setShow(true);
            setServer(v.server);
            setInstalled(v.installed);
          }
        }
      })
      .catch(() => {
        /* 读取失败忽略 */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!show || dismissed) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 72,
        right: 20,
        zIndex: 2147483647,
        boxSizing: "border-box",
        width: 340,
        maxWidth: "calc(100vw - 40px)",
        padding: "12px 14px",
        paddingRight: 10,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        fontFamily: MONO,
        color: TONE.text,
        background: TONE.panel,
        border: `1px solid ${TONE.border}`,
        borderRadius: 12,
        boxShadow: "0 10px 32px rgba(2,6,23,.24), 0 2px 8px rgba(2,6,23,.12)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>⚠️</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{T("pl.title")} · {T("pl.updateNotice.title")}</span>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: TONE.muted, wordBreak: "break-word" }}>
          {T("pl.updateNotice.text", { server, installed })}
        </div>
      </div>
      <DialogCloseButton label={T("pl.close")} onClick={() => setDismissed(true)} />
    </div>,
    document.body,
  );
}