/**
 * 「需重启服务」提示气泡（统一样式）。
 *
 * 两种触发来源共用同一气泡 UI，均提示用户重启服务：
 * 1. 版本不一致：用户更新插件后未重启 dsh web，/version 返回的 server 与 installed 不一致。
 * 2. workbench 首装完成：host 在首次安装 workbench 后通过现有 SSE 推送 `workbench-installed`
 *    事件，本组件订阅后弹出提示，需重启服务方能使 workbench 生效。
 *
 * 说明：桌面端与 Web 端的重启行为不可靠（桌面端不应显示、Web 端重启不生效），因此气泡
 * 仅作提示，不带「重启服务」按钮，由用户自行决定如何重启。
 * 关闭后本次会话不再重复弹出；重启成功后页面重新加载，提示自然消失。
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getVersion } from "../../utils/api.js";
import { useWorkbenchInstalled } from "../../utils/data-sync.js";
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

type NoticeKind = "version" | "workbench";

export function VersionUpdateNotice({ t }: { t?: PLTranslate }): ReactNode {
  const T = usePLT(t);
  const [kind, setKind] = useState<NoticeKind | null>(null);
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
          setKind("version");
          setServer(v.server);
          setInstalled(v.installed);
        }
      })
      .catch(() => {
        /* 读取失败忽略 */
      });
    return () => {
      alive = false;
    };
  }, []);

  // workbench 首装完成（SSE）：一旦收到即显示气泡
  useWorkbenchInstalled(() => {
    setKind((prev) => prev ?? "workbench");
  });

  if (!kind || dismissed) return null;

  const title =
    kind === "version" ? T("pl.updateNotice.title") : T("pl.workbenchNotice.title");
  const text =
    kind === "version"
      ? T("pl.updateNotice.text", { server, installed })
      : T("pl.workbenchNotice.text");

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
          <span style={{ fontSize: 14, fontWeight: 600 }}>{T("pl.title")} · {title}</span>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: TONE.muted, wordBreak: "break-word" }}>
          {text}
        </div>
      </div>
      <DialogCloseButton label={T("pl.close")} onClick={() => setDismissed(true)} />
    </div>,
    document.body,
  );
}