/**
 * 左侧文件树渲染。
 * 从 PreviewView 拆出：目录可折叠、文件可选中、右键菜单回调、定位高亮闪动。
 */
import type { ReactNode } from "react";
import { S, TYPE_META, type FileTreeNode } from "./previewShared.js";
import { formatFileSize } from "./fileUtils.js";

/** 树形节点渲染（目录可折叠，文件可选中）。 */
export interface TreeProps {
  nodes: FileTreeNode[];
  depth: number;
  collapsed: Set<string>;
  onToggle: (dir: string) => void;
  activePath: string | null;
  onSelect: (path: string) => void;
  /** 列表根目录绝对路径（用于由节点相对/绝对路径还原相对显示路径）。 */
  baseDir: string;
  /** 右键菜单回调：打开菜单，事件对象来自 onContextMenu。 */
  onCtx: (
    e: { clientX: number; clientY: number; preventDefault(): void; stopPropagation(): void },
    n: FileTreeNode,
  ) => void;
  /** 需要高亮闪动的文件绝对路径（「定位」功能）。 */
  flashPath?: string | null;
}

/** 树形节点渲染（目录可折叠，文件可选中）。 */
export function TreeNodes({ nodes, depth, collapsed, onToggle, activePath, onSelect, baseDir, onCtx, flashPath }: TreeProps): ReactNode {
  return (
    <>
      {nodes.map((n) => {
        if (n.children) {
          const open = !collapsed.has(n.path!);
          return (
            <div key={n.path ?? n.name}>
              <div
                className={`${S}-treeDir`}
                style={{ paddingLeft: 4 + depth * 14 }}
                onClick={() => onToggle(n.path!)}
                onContextMenu={(e) => onCtx(e, n)}
                title={n.path}
              >
                <span className={`${S}-treeArrow ${open ? "open" : ""}`}>{open ? "▾" : "▸"}</span>
                <span className={`${S}-treeDirName`}>{n.name}</span>
              </div>
              {open && (
                <TreeNodes
                  nodes={n.children}
                  depth={depth + 1}
                  collapsed={collapsed}
                  onToggle={onToggle}
                  activePath={activePath}
                  onSelect={onSelect}
                  baseDir={baseDir}
                  onCtx={onCtx}
                  flashPath={flashPath}
                />
              )}
            </div>
          );
        }
        const meta = TYPE_META[n.type!];
        return (
          <div
            key={n.path}
            className={`${S}-file ${n.path === activePath ? "active" : ""}${flashPath === n.path ? ` ${S}-flash` : ""}`}
            style={{ paddingLeft: 4 + depth * 14 + 18 }}
            onClick={() => onSelect(n.path!)}
            onContextMenu={(e) => onCtx(e, n)}
            title={n.path}
            data-path={n.path}
          >
            <span
              className={`${S}-fileBadge`}
              style={
                meta
                  ? { color: meta.color, background: `color-mix(in srgb, ${meta.color} 16%, transparent)` }
                  : undefined
              }
            >
              {meta ? meta.label : n.type}
            </span>
            <span className={`${S}-fileName`}>{n.name}</span>
            <span className={`${S}-fileSize`}>{formatFileSize(n.size ?? 0)}</span>
          </div>
        );
      })}
    </>
  );
}
