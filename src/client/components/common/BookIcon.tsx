/**
 * 书本图标 — 词库助手统一图标（随文本色）。
 *
 * 侧边栏头部、聊天栏按钮、人格管理 / 技能管理 / 数据管理弹窗头部统一使用，
 * 从模块化组件中抽出避免各弹窗重复定义。
 */
import type { ReactNode } from "react";

/** 书本图标（两个 path 的书本图形，随文本色）。 */
export function BookIcon({ color, size = 14 }: { color: string; size?: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color }}>
      <path
        d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
