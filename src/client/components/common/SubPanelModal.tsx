/**
 * 子面板弹窗外壳 — 把「内嵌式子面板」（如数据库管理、插件推荐）包装成独立弹窗。
 *
 * 这些面板原本只在「词库菜单」弹窗的右侧内容区里渲染（根元素为
 * `flex:1; minHeight:0` 的 flex 容器，自身不带遮罩与关闭按钮）。
 * 官方右侧面板的卡片菜单需要在独立弹窗中打开它们，因此这里提供统一外壳：
 * 复用项目既有的 `.pl-dialog` / `.pl-dialog-overlay` 表面样式与关闭按钮，
 * 内部以 flex 列布局承载子面板，使其铺满弹窗内容区。
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  PL_DIALOG,
  PL_DIALOG_CSS,
  PL_DIALOG_MAX,
  PL_DIALOG_OVERLAY,
  PL_DIALOG_OVERLAY_MAX,
} from "../../utils/dialog-style.js";
import { getTone, useThemeSync } from "../../utils/theme.js";
import type { PLT } from "../../utils/i18n.js";
import { DialogCloseButton } from "./DialogCloseButton.js";
import { WindowToggleButton } from "./WindowToggleButton.js";

interface Props {
  /** 是否显示。 */
  open: boolean;
  /** 关闭弹窗（仅由关闭按钮 / Esc 触发，禁止点击遮罩关闭）。 */
  onClose: () => void;
  /** 弹窗标题（子面板自带标题头时可不传）。 */
  title?: string;
  /** 无障碍标签，缺省取 title。 */
  ariaLabel?: string;
  /** 翻译函数（用于关闭按钮提示）。 */
  t: PLT;
  /** 弹窗宽度（px）。 */
  width?: number;
  /** 弹窗高度（px）。 */
  height?: number;
  /** 子面板内容。 */
  children: ReactNode;
}

/** 把内嵌式子面板包装为独立弹窗。 */
export function SubPanelModal({
  open,
  onClose,
  title,
  ariaLabel,
  t,
  width = 960,
  height = 720,
  children,
}: Props): ReactNode {
  useThemeSync();
  const TONE = getTone();
  // 最大化态：铺满视口（桌面端兼容模式保留顶部 36px 标题条）
  const [maximized, setMaximized] = useState(false);

  // 每次重新打开都回到默认尺寸，避免上次的最大化态被带到下一次
  useEffect(() => {
    if (open) setMaximized(false);
  }, [open]);

  // Esc 关闭：与宿主弹窗一致，仅在打开期间挂载
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={
        maximized ? `${PL_DIALOG_OVERLAY} ${PL_DIALOG_OVERLAY_MAX}` : PL_DIALOG_OVERLAY
      }
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title}
    >
      <style>{PL_DIALOG_CSS}</style>
      <div
        className={maximized ? `${PL_DIALOG} ${PL_DIALOG_MAX}` : PL_DIALOG}
        style={{
          width,
          height,
          maxWidth: "calc(100vw - 40px)",
          maxHeight: "calc(100vh - 40px)",
        }}
      >
        {/* 标题行 + 右上角关闭按钮（子面板自带标题时不渲染标题文字） */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <strong
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 15,
              fontWeight: 600,
              color: TONE.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </strong>
          <WindowToggleButton
            maximized={maximized}
            onToggle={() => setMaximized((v) => !v)}
            maximizeLabel={t("pl.windowMaximize")}
            restoreLabel={t("pl.windowRestore")}
          />
          <DialogCloseButton onClick={onClose} label={t("pl.close")} />
        </div>
        {/* 内容区：子面板以 flex 列铺满，内部自行滚动 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
