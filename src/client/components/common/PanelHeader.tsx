/**
 * 面板头部：标题 + 模块说明框（与词库/人格等独立弹窗顶部风格一致）。
 * 用于设置面板右侧直接渲染的子面板（标签 / 回收站等），补齐顶部标题与描述。
 */
import type { ReactNode } from "react";
import { getTone, useThemeSync } from "../../utils/theme.js";

export function PanelHeader({ title, desc }: { title: string; desc: string }): ReactNode {
  useThemeSync();
  const TONE = getTone();
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px" }}>
        <span
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
        </span>
      </div>
      {/* 模块说明（与词库管理弹窗说明框一致） */}
      <div
        style={{
          marginTop: 8,
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