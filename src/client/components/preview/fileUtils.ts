/**
 * 会话预览面板的文件工具函数。
 * 从 PreviewView 拆出：文件大小/时间格式化、大文件判定、扁平列表组装树、路径工具。
 */
import type { PreviewFileEntry } from "../../utils/api.js";
import type { FileTreeNode } from "./previewShared.js";

/** 格式化文件大小：B / KB / MB */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 格式化修改时间：相对时间（如 "2小时前"）或绝对时间 */
export function formatModified(ms: number | undefined): string {
  if (!ms) return "—";
  const now = Date.now();
  const diff = now - ms;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** 判断文件是否过大（需要警告） */
export function isLargeFile(size: number): "warning" | "error" | null {
  if (size > 1024 * 1024) return "error"; // > 1MB
  if (size > 500 * 1024) return "warning"; // > 500KB
  return null;
}

/** 把扁平文件列表组装成嵌套树（目录优先、按名排序；目录节点 path 为相对路径）。 */
export function buildTree(files: PreviewFileEntry[]): FileTreeNode[] {
  const root: FileTreeNode = { name: "", children: [] };

  /** 逐段创建（或复用）目录节点，返回末级目录节点。 */
  const ensureDir = (parts: string[]): FileTreeNode => {
    let node = root;
    let dirPath = "";
    for (const p of parts) {
      dirPath = dirPath ? `${dirPath}/${p}` : p;
      let child = node.children?.find((c) => c.path === dirPath && c.children);
      if (!child) {
        child = { name: p, path: dirPath, children: [] };
        node.children!.push(child);
      }
      node = child;
    }
    return node;
  };

  for (const f of files) {
    const parts = f.name.split("/");
    // 目录条目：建出末级目录节点即可（空目录也会被创建）
    if (f.dir) {
      ensureDir(parts);
      continue;
    }
    const parent = ensureDir(parts.slice(0, -1));
    parent.children!.push({ name: parts[parts.length - 1], path: f.path, type: f.type, size: f.size });
  }

  const sortNode = (n: FileTreeNode) => {
    if (!n.children) return;
    n.children.sort((a, b) => {
      const ad = a.children ? 0 : 1;
      const bd = b.children ? 0 : 1;
      return ad - bd || a.name.localeCompare(b.name);
    });
    n.children.forEach(sortNode);
  };
  sortNode(root);
  return root.children ?? [];
}

/** 返回路径的父目录（兼容 / 与 \ 分隔符）；无分隔符时返回空串。 */
export function dirnameOf(path: string): string {
  const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (at === -1) return "";
  const parent = path.slice(0, at);
  return parent || "";
}
