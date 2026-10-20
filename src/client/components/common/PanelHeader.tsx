/**
 * 面板头部：标题 + 模块说明框（与词库「数据管理」弹窗顶部完全一致）。
 *
 * 用于弹窗内直接渲染的子面板（标签 / 回收站等），补齐顶部标题与描述。
 * 结构与间距严格对齐 LexiconManagerModal 的标题行：
 * - 标题行：`gap:8` + 14px 图标 + 15px/600 标题，无额外内边距
 * - 说明框：`marginTop:10`、11.5px/1.6、7px 10px 内边距、圆角 7
 * 保证切换 tab 时标题的 x / y 坐标不发生跳动。
 */
import type { ReactNode } from "react";
import { getTone, useThemeSync } from "../../utils/theme.js";

export function PanelHeader({
  title,
  desc,
  icon,
  extra,
}: {
  title: string;
  desc: string;
  /** 标题左侧图标（14px），与数据管理的 BookIcon 同位同尺寸。 */
  icon?: ReactNode;
  /** 标题右侧附加内容（如关闭按钮），位于标题与图标同行的最右。 */
  extra?: ReactNode;
}): ReactNode {
  useThemeSync();
  const TONE = getTone();
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {icon}
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
        {extra}
      </div>
      {/* 模块说明（与词库管理弹窗说明框一致） */}
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
        {desc}
      </div>
    </>
  );
}
