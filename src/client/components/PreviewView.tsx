/**
 * 会话预览面板。
 *
 * 注册到 `conversation.view` 插槽，作为「监控」旁的独立预览视图标签。
 * 只读取当前会话所在工作目录（cwd）下的可预览文件并渲染预览，会话切换自动跟随：
 * - 支持 md / json / txt / csv（递归扫描子目录）；
 * - 多个文件：左侧按类型分组 + 树形节点展示（目录可折叠，文件带类型徽标与大小），右侧展示内容；
 * - md：正文含标题大纲时再分左右（大纲 + 正文）；
 * - json：以对象（可折叠树）展示；txt：纯文本；csv：解析为表格。
 *
 * 会话 id 优先取宿主注入的 `useSession`（当前被查看的会话，无论是否运行都实时跟随），
 * 未注入时回退到后端「当前会话」端点 `getActiveSessionId()` 轮询（最近活跃会话，与会话监控同口径）；
 * 文件列表通过后端 `preview/list`（后端解析会话工作目录并递归扫描）、内容经 `preview/read` 读取。
 * 头部提供「打开文件夹」按钮：调用宿主原生目录选择器手动指定目录，直接以该目录为根预览
 * （手动模式覆盖会话派生目录，且不随会话切换改变），再次点击可更换目录。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import JSZip from "jszip";
import type { ConversationSnapshot } from "@deepseek-ai/dsh-client-runtime/client";
import type { PLTranslate } from "../utils/i18n.js";
import {
  getActiveSessionId,
  listPreviewFiles,
  listPreviewFilesByDir,
  downloadPreviewFile,
  previewDelete,
  previewMkdir,
  previewNewFile,
  previewRename,
  readPreviewFile,
  savePreviewFile,
  type PreviewFileEntry,
  type PreviewFileType,
} from "../utils/api.js";
import { isDirectoryBrowserAvailable, isDirectoryPickerAvailable, pickExportDirectory } from "../utils/workspace-picker.js";
import { DirectoryPickerModal } from "./DirectoryPickerModal.js";
import { CodeHighlight } from "./CodeHighlight.js";
import { ArtifactExporter } from "./ArtifactExporter.js";
// 聊天结果「产物文件」卡片跳转预览面板的目标路径信号
import { consumePendingPreviewPath, PREVIEW_OPEN_EVENT_NAME } from "../utils/preview-target.js";
import { getTone, useThemeSync } from "../utils/theme.js";

/** Prism 语言标识映射：将文件类型映射到 Prism 支持的语言名。 */
const PRISM_LANG_MAP: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  c: "c",
  cpp: "cpp",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  xml: "markup",
};

/** `conversation.view` 的宿主运行时套件（此视图仅依赖翻译座位与会话快照钩子）。 */
interface PreviewProps {
  /** 会话快照选择器钩子（宿主注入）：读取当前被查看会话，切换会话（无论是否运行）即时跟随。 */
  useSession?: <T>(selector: (s: ConversationSnapshot) => T) => T;
  /** 翻译座位（宿主注入，已绑定 prompt-library 命名空间）。 */
  t?: PLTranslate;
}

/** 大纲条目：锚点 id + 标题层级 + 标题文本。 */
interface OutlineItem {
  id: string;
  level: number;
  text: string;
}

/** 左侧树形节点：目录节点只有 name + children（path 存相对路径用于折叠标识），文件节点带 path/type/size。 */
interface FileTreeNode {
  name: string;
  /** 目录节点：相对路径；文件节点：绝对路径。 */
  path?: string;
  type?: PreviewFileType;
  size?: number;
  children?: FileTreeNode[];
}

/** 样式作用域前缀，避免与宿主类名冲突。 */
const S = "pl-pv";

/** 复制文本到剪贴板：优先 navigator.clipboard，失败时回退临时 textarea（webview 中兼容）。 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 落入回退 */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

/** 触发浏览器下载指定 Blob。 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 由文件扩展名派生出图标用 type（用于 ZIP 选择器行图标）。 */
function fileTypeOf(name: string): string {
  const last = name.lastIndexOf(".");
  return last >= 0 ? name.slice(last + 1).toLowerCase() : "";
}

/** ZIP 选择器行图标：按扩展名映射为 emoji。 */
function fileIconOf(type: string): string {
  const icons: Record<string, string> = {
    md: "📝", json: "📋", txt: "📄", csv: "📊", log: "📋",
    ts: "📘", js: "📗", py: "🐍", go: "🔵", rs: "🦀", java: "☕",
    c: "⚙️", cpp: "⚙️", css: "🎨", html: "🌐", svg: "🎨",
    png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️", webp: "🖼️",
  };
  return icons[type] || "📄";
}

/** ZIP 选择器行文件体积格式化。 */
function formatZipSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 把字符串清理成可用的下载文件名（替换非法字符）。 */
function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[/\\:*?"<>|\s]+/g, "_")
    .replace(/[^\p{L}\p{N}_.-]/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+|[._]+$/g, "");
  return cleaned || "export";
}

/** 右键菜单目标：文件 / 目录 / 列表空白区。 */
interface CtxTarget {
  kind: "file" | "dir" | "blank";
  /** 绝对路径（空白区=当前预览根目录）。 */
  absPath: string;
  /** 相对列表根目录的路径。 */
  relPath: string;
  /** 显示名 / 新建时的默认名。 */
  name: string;
  /** 文件类型（仅文件）。 */
  type?: PreviewFileType;
}

/** 智能文件分类：基于文件名、路径和内容特征。 */
type SmartCategory = "docs" | "config" | "test" | "business" | "styles" | "data" | "other";

/** 各类型的徽标文本与主题色。 */
const TYPE_META: Record<PreviewFileType, { label: string; color: string }> = {
  md: { label: "md", color: "#60a5fa" },
  json: { label: "json", color: "#f59e0b" },
  txt: { label: "txt", color: "#94a3b8" },
  csv: { label: "csv", color: "#34d399" },
  // Programming languages
  ts: { label: "ts", color: "#3178c6" },
  js: { label: "js", color: "#f7df1e" },
  py: { label: "py", color: "#3776ab" },
  go: { label: "go", color: "#00add8" },
  rs: { label: "rs", color: "#dea584" },
  java: { label: "java", color: "#f89820" },
  c: { label: "c", color: "#a8b9cc" },
  cpp: { label: "cpp", color: "#00599c" },
  // Config files
  yml: { label: "yml", color: "#cb171f" },
  yaml: { label: "yaml", color: "#cb171f" },
  toml: { label: "toml", color: "#9c4121" },
  xml: { label: "xml", color: "#e37933" },
  // Log files
  log: { label: "log", color: "#6b7280" },
  // Images
  png: { label: "png", color: "#a855f7" },
  jpg: { label: "jpg", color: "#a855f7" },
  jpeg: { label: "jpeg", color: "#a855f7" },
  gif: { label: "gif", color: "#a855f7" },
  svg: { label: "svg", color: "#ffb13b" },
};

/** 生成唯一锚点 id：英文/中文/数字保留，其余转短横线；重复时追加序号。 */
function anchorId(text: string, used: Set<string>): string {
  let base = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "");
  if (!base) base = "section";
  let id = base;
  let n = 1;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

/** 把标题原始文本中的 Markdown 符号剥成纯文本（用于大纲展示，避免残留 `**`、`` ` `` 等符号）。 */
function stripMd(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)\s]+\)/g, "$1") // ![alt](url) → alt
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1") // [text](url) → text
    .replace(/<([^>]+)>/g, "$1") // <tag> → tag
    .replace(/(`{1,2})([^`\n]+?)\1/g, "$2") // 行内代码 → 内容
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1") // **粗体**
    .replace(/\*([^*\n]+?)\*/g, "$1") // *斜体*
    .replace(/~~([^~\n]+?)~~/g, "$1") // ~~删除线~~
    .replace(/==([^=\n]+?)==/g, "$1") // ==高亮==
    .replace(/_([^_\n]+?)_/g, "$1") // _斜体_
    .replace(/^#+\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 内联标记解析：`code`、**粗体**、*斜体*、~~删除线~~、==高亮==、[链接](url)、![图片](url)、自动 URL。 */
function inlineMd(text: string, keySeq: { n: number }): ReactNode[] {
  const re =
    /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(\*[^*\n]+?\*)|(~~[^~\n]+?~~)|(==[^=\n]+?==)|(!\[[^\]]*\]\([^)\s]+\))|(\[[^\]]+\]\([^)\s]+\))|(<(?:https?:\/\/|\/|#)[^\s>]+>)|((?:https?:\/\/|www\.)[^\s<]+)/g;
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = () => `${keySeq.n++}`;
    if (m[1]) out.push(<code key={k()}>{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k()}>{m[2].slice(2, -2)}</strong>);
    else if (m[3]) out.push(<em key={k()}>{m[3].slice(1, -1)}</em>);
    else if (m[4]) out.push(<del key={k()}>{m[4].slice(2, -2)}</del>);
    else if (m[5]) out.push(<mark key={k()} className={`${S}-hl`}>{m[5].slice(2, -2)}</mark>);
    else if (m[6]) {
      const im = m[6].match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (im) out.push(<img key={k()} className={`${S}-mdImg`} src={im[2]} alt={im[1]} loading="lazy" />);
    } else if (m[7]) {
      const linkMatch = m[7].match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (linkMatch) {
        out.push(
          <a key={k()} href={linkMatch[2]} target="_blank" rel="noreferrer">
            {linkMatch[1]}
          </a>,
        );
      }
    } else if (m[8]) {
      out.push(
        <a key={k()} href={m[8].slice(1, -1)} target="_blank" rel="noreferrer">
          {m[8].slice(1, -1)}
        </a>,
      );
    } else if (m[9]) {
      const url = m[9];
      out.push(
        <a key={k()} href={url.startsWith("www.") ? `https://${url}` : url} target="_blank" rel="noreferrer">
          {url}
        </a>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** 解析一行表格：`| a | b |` → 单元格数组；非表格行返回 null。 */
function tableCells(ln: string): string[] | null {
  const t = ln.trim();
  if (!(t.startsWith("|") && t.endsWith("|"))) return null;
  return t
    .slice(1, -1)
    .split("|")
    .map((s) => s.trim());
}

/** 判断是否为表头分隔行（如 `|---|---|`、`|:---|:---:|`）。 */
function isTableSep(cells: string[] | null): cells is string[] {
  return !!cells && cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

/** 判断是否为列表行（无序 `-`/有序 `1.`/任务 `- [x]`）。 */
function isListLine(s: string): boolean {
  return /^\s*(?:[-*+]|(?:\d+[.)]))\s+/.test(s);
}

/** 解析连续列表行（含缩进）为嵌套列表，支持任务清单 checkbox。 */
function renderListTree(raw: string[], keySeq: { n: number }): ReactNode {
  interface Item {
    depth: number;
    ordered: boolean;
    task: boolean;
    checked: boolean;
    text: string;
  }
  interface Node {
    item: Item;
    children: Node[];
  }
  const indent = (s: string) => Math.floor(s.replace(/\t/g, "    ").length / 2);
  const parsed: Item[] = [];
  for (const ln of raw) {
    const task = ln.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (task)
      parsed.push({
        depth: indent(task[1]),
        ordered: false,
        task: true,
        checked: task[2].toLowerCase() === "x",
        text: task[3],
      });
    else {
      const ol = ln.match(/^(\s*)(\d+[.)])\s+(.*)$/);
      const ul = ln.match(/^(\s*)[-*+]\s+(.*)$/);
      if (ul) parsed.push({ depth: indent(ul[1]), ordered: false, task: false, checked: false, text: ul[2] });
      else if (ol) parsed.push({ depth: indent(ol[1]), ordered: true, task: false, checked: false, text: ol[3] });
    }
  }
  if (parsed.length === 0) return null;
  const root: Node = { item: { depth: -1, ordered: false, task: false, checked: false, text: "" }, children: [] };
  const stack: Node[] = [root];
  for (const p of parsed) {
    const node: Node = { item: p, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].item.depth >= p.depth) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  const renderLevel = (items: Node[]): ReactNode =>
    items.some((n) => n.item.ordered)
      ? (
          <ol key={keySeq.n++}>
            {items.map((n) => (
              <li key={keySeq.n++}>
                {n.item.task ? <input className={`${S}-taskBox`} type="checkbox" defaultChecked={n.item.checked} disabled readOnly /> : null}
                <span className={n.item.task && n.item.checked ? `${S}-done` : undefined}>{inlineMd(n.item.text, keySeq)}</span>
                {n.children.length ? renderLevel(n.children) : null}
              </li>
            ))}
          </ol>
        )
      : (
          <ul key={keySeq.n++}>
            {items.map((n) => (
              <li key={keySeq.n++}>
                {n.item.task ? <input className={`${S}-taskBox`} type="checkbox" defaultChecked={n.item.checked} disabled readOnly /> : null}
                <span className={n.item.task && n.item.checked ? `${S}-done` : undefined}>{inlineMd(n.item.text, keySeq)}</span>
                {n.children.length ? renderLevel(n.children) : null}
              </li>
            ))}
          </ul>
        );
  return renderLevel(root.children);
}

/** 块级 Markdown 轻渲染：返回渲染节点 + 标题大纲（锚点 id 一致，供大纲跳转）。 */
function renderMd(text: string): { outline: OutlineItem[]; body: ReactNode[] } {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  const outline: OutlineItem[] = [];
  const used = new Set<string>();
  const keySeq = { n: 0 };
  let i = 0;
  const heading = (lv: number, id: string, children: ReactNode[]) => {
    const props = { key: keySeq.n++, id, className: `${S}-h` };
    if (lv === 1) return <h1 {...props}>{children}</h1>;
    if (lv === 2) return <h2 {...props}>{children}</h2>;
    if (lv === 3) return <h3 {...props}>{children}</h3>;
    if (lv === 4) return <h4 {...props}>{children}</h4>;
    if (lv === 5) return <h5 {...props}>{children}</h5>;
    return <h6 {...props}>{children}</h6>;
  };
  const pushHeading = (lv: number, rawText: string) => {
    const plain = stripMd(rawText);
    const id = anchorId(plain, used);
    outline.push({ id, level: lv, text: plain });
    out.push(heading(lv, id, inlineMd(rawText, keySeq)));
  };
  const renderTable = (header: string[], rows: string[][]) => (
    <table key={keySeq.n++} className={`${S}-mdTable`}>
      <thead>
        <tr>
          {header.map((c, ci) => (
            <th key={ci}>{inlineMd(c, keySeq)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri}>
            {r.map((c, ci) => (
              <td key={ci}>{inlineMd(c, keySeq)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
  while (i < lines.length) {
    const ln = lines[i];
    // 表格：表头行 + 分隔行 + 数据行
    const headerCells = tableCells(ln);
    if (headerCells && !isTableSep(headerCells)) {
      const sepLine = tableCells(lines[i + 1]);
      if (isTableSep(sepLine)) {
        const rows: string[][] = [];
        let j = i + 2;
        while (j < lines.length) {
          const r = tableCells(lines[j]);
          if (!r || isTableSep(r)) break;
          rows.push(r);
          j += 1;
        }
        out.push(renderTable(headerCells, rows));
        i = j;
        continue;
      }
    }
    // 代码块
    if (/^\s*```/.test(ln)) {
      const buf: string[] = [];
      let j = i + 1;
      while (j < lines.length && !/^\s*```/.test(lines[j])) buf.push(lines[j++]);
      out.push(
        <pre key={keySeq.n++} className={`${S}-mdPre`}>
          <code>{buf.join("\n")}</code>
        </pre>,
      );
      i = j + 1;
      continue;
    }
    // setext 式标题：下一行为 `===` 或 `---`
    const setext = /^(=+|-+)\s*$/.exec(lines[i + 1] ?? "");
    if (setext && ln.trim() !== "" && !tableCells(ln) && !isListLine(ln)) {
      const lv = setext[1][0] === "=" ? 1 : 2;
      pushHeading(lv, ln.trim());
      i += 2;
      continue;
    }
    // ATX 标题
    if (/^\s*(#+)\s+/.test(ln)) {
      const mm = ln.match(/^\s*(#+)\s+(.*)$/)!;
      pushHeading(Math.min(mm[1].length, 6), mm[2].trim());
      i += 1;
      continue;
    }
    // 列表
    if (isListLine(ln)) {
      const raw: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && isListLine(lines[i])) {
        raw.push(lines[i]);
        i += 1;
      }
      const tree = renderListTree(raw, keySeq);
      if (tree) out.push(tree);
      continue;
    }
    // 引用
    if (/^\s*>/.test(ln)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      out.push(<blockquote key={keySeq.n++}>{inlineMd(buf.join(" "), keySeq)}</blockquote>);
      continue;
    }
    // 分隔线
    if (/^\s*(---+|\*\*\*+)\s*$/.test(ln)) {
      out.push(<hr key={keySeq.n++} />);
      i += 1;
      continue;
    }
    if (ln.trim() === "") {
      i += 1;
      continue;
    }
    // 段落
    const para: string[] = [];
    const blockStart = /^\s*(#+|\s*([-*+]|\d+[.)])\s+|>|```|(---+|\*\*\*+)\s*$)/;
    while (i < lines.length && lines[i].trim() !== "" && !blockStart.test(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    out.push(<p key={keySeq.n++}>{inlineMd(para.join(" "), keySeq)}</p>);
  }
  return { outline, body: out };
}

/** 格式化文件大小：B / KB / MB */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 格式化修改时间：相对时间（如 "2小时前"）或绝对时间 */
function formatModified(ms: number | undefined): string {
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
function isLargeFile(size: number): "warning" | "error" | null {
  if (size > 1024 * 1024) return "error"; // > 1MB
  if (size > 500 * 1024) return "warning"; // > 500KB
  return null;
}

/** 把扁平文件列表组装成嵌套树（目录优先、按名排序；目录节点 path 为相对路径）。 */
function buildTree(files: PreviewFileEntry[]): FileTreeNode[] {
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

/** 树形节点渲染（目录可折叠，文件可选中）。 */
interface TreeProps {
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
}

function TreeNodes({ nodes, depth, collapsed, onToggle, activePath, onSelect, baseDir, onCtx }: TreeProps): ReactNode {
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
                />
              )}
            </div>
          );
        }
        const meta = TYPE_META[n.type!];
        return (
          <div
            key={n.path}
            className={`${S}-file ${n.path === activePath ? "active" : ""}`}
            style={{ paddingLeft: 4 + depth * 14 + 18 }}
            onClick={() => onSelect(n.path!)}
            onContextMenu={(e) => onCtx(e, n)}
            title={n.path}
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
            <span className={`${S}-fileSize`}>{formatSize(n.size ?? 0)}</span>
          </div>
        );
      })}
    </>
  );
}

// ── JSON 对象树渲染 ──────────────────────────────────────────────────────

/** JSON 原始值着色渲染。 */
function JsonValue({ value }: { value: unknown }): ReactNode {
  if (value === null) return <span className={`${S}-jNull`}>null</span>;
  const t = typeof value;
  if (t === "string") return <span className={`${S}-jStr`}>"{String(value)}"</span>;
  if (t === "number") return <span className={`${S}-jNum`}>{String(value)}</span>;
  if (t === "boolean") return <span className={`${S}-jBool`}>{String(value)}</span>;
  return <span className={`${S}-jType`}>{String(value)}</span>;
}

/** JSON 单个键值节点：对象/数组可折叠，原始值直接展示。 */
function JsonNode({
  name,
  value,
  depth,
  isArrayItem,
}: {
  name: string;
  value: unknown;
  depth: number;
  isArrayItem?: boolean;
}): ReactNode {
  const isObj = value !== null && typeof value === "object";
  const [open, setOpen] = useState(depth < 1);
  const keyLabel = isArrayItem ? `[${name}]` : name;
  if (!isObj) {
    return (
      <div className={`${S}-jRow`} style={{ paddingLeft: depth * 16 + 10 }}>
        <span className={`${S}-jKey`}>{keyLabel}</span>
        <span className={`${S}-jColon`}>:</span>
        <JsonValue value={value} />
      </div>
    );
  }
  const isArr = Array.isArray(value);
  const entries = Object.entries(value as object);
  if (entries.length === 0) {
    return (
      <div className={`${S}-jRow`} style={{ paddingLeft: depth * 16 + 10 }}>
        <span className={`${S}-jKey`}>{keyLabel}</span>
        <span className={`${S}-jColon`}>:</span>
        <span className={`${S}-jType`}>{isArr ? "[]" : "{}"}</span>
      </div>
    );
  }
  return (
    <div>
      <div className={`${S}-jRow ${S}-jHead`} style={{ paddingLeft: depth * 16 + 10 }} onClick={() => setOpen(!open)}>
        <span className={`${S}-treeArrow ${open ? "open" : ""}`}>{open ? "▾" : "▸"}</span>
        <span className={`${S}-jKey`}>{keyLabel}</span>
        <span className={`${S}-jColon`}>:</span>
        <span className={`${S}-jType`}>{isArr ? `Array(${entries.length})` : `Object(${entries.length})`}</span>
      </div>
      {open && (
        <div>
          {entries.map(([k, v], i) => (
            <JsonNode key={i} name={String(k)} value={v} depth={depth + 1} isArrayItem={isArr} />
          ))}
        </div>
      )}
    </div>
  );
}

/** JSON 根渲染：顶层对象/数组直接展开条目。 */
function JsonTree({ value }: { value: unknown }): ReactNode {
  if (value === null || typeof value !== "object") {
    return <JsonValue value={value} />;
  }
  const isArr = Array.isArray(value);
  const entries = Object.entries(value as object);
  return (
    <div>
      {entries.map(([k, v], i) => (
        <JsonNode key={i} name={String(k)} value={v} depth={0} isArrayItem={isArr} />
      ))}
    </div>
  );
}

// ── CSV 解析与表格渲染 ───────────────────────────────────────────────────

/** 简易 CSV 解析：支持双引号包裹字段与转义引号（""）。 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // 去掉末尾全空行
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.trim() === "")) rows.pop();
  return rows;
}

/** CSV 表格渲染：首行作为表头（至少两行时）。 */
function CsvTable({ rows }: { rows: string[][] }): ReactNode {
  if (rows.length === 0) return <div className={`${S}-empty`}>—</div>;
  const header = rows.length > 1 ? rows[0] : null;
  const body = header ? rows.slice(1) : rows;
  return (
    <div className={`${S}-csvWrap`}>
      <table className={`${S}-csvTable`}>
        {header && (
          <thead>
            <tr>
              {header.map((c, ci) => (
                <th key={ci}>{c}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td key={ci}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 格式化字节大小。 */
function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** 返回路径的父目录（兼容 / 与 \ 分隔符）；无分隔符时返回空串。 */
function dirnameOf(path: string): string {
  const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (at === -1) return "";
  const parent = path.slice(0, at);
  return parent || "";
}

export function PreviewView(props: PreviewProps): ReactNode {
  useThemeSync(); // 订阅宿主主题，白天/黑夜切换时刷新主题色
  // 主题色：右键菜单等浮层也据此统一样式，保证昼夜一致
  const TONE = getTone();
  // 翻译座位；宿主未注入时回退为直接返回 key，保证子弹窗（浏览式目录选择）语言不缺失
  const T: PLTranslate = props?.t ?? ((k: string): string => k);

  // 当前会话 id：优先取宿主注入的 useSession（当前被查看的会话，切换会话无论是否运行都即时跟随），
  // 未注入或取不到时回退到后端「当前会话」端点轮询（最近活跃会话）。后端再据此解析会话所属文件夹。
  const useSession = props?.useSession;
  const viewedSessionId =
    typeof useSession === "function" ? (useSession((s) => s.sessionId) ?? "") : "";
  const [activeSessid, setActiveSessid] = useState<string>("");
  const sessid = viewedSessionId || activeSessid;

  // 解析出的会话所属文件夹（后端返回的根目录，用于头部展示）
  const [dir, setDir] = useState<string>("");
  // 手动选择的预览目录（「打开文件夹」选择后覆盖会话派生目录；null 表示跟随会话）
  const [manualDir, setManualDir] = useState<string | null>(null);
  // 刷新动画状态：点击刷新时 ⟳ 旋转一圈，动画结束后复位
  const [spinning, setSpinning] = useState(false);
  // 浏览式目录选择弹窗（桌面端原生选择器不可用时的回退选择方案）
  const [dirPickerOpen, setDirPickerOpen] = useState(false);
  // 所属文件夹下可预览文件列表
  const [files, setFiles] = useState<PreviewFileEntry[]>([]);
  // 当前选中的文件绝对路径
  const [activePath, setActivePath] = useState<string | null>(null);
  // 当前文件正文
  const [content, setContent] = useState<string | null>(null);
  // 编辑模式：是否处于编辑状态
  const [editing, setEditing] = useState(false);
  // 大纲面板是否收起（默认展开）
  const [tocCollapsed, setTocCollapsed] = useState(false);
  // 编辑中的内容（与 content 分离，避免未保存时污染原始内容）
  const [editContent, setEditContent] = useState<string>("");
  // 保存状态
  const [saving, setSaving] = useState(false);
  // Toast 提示
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  // ── 右键菜单 ──
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; target: CtxTarget } | null>(null);
  // 名称输入弹窗（重命名文件/目录、新建文件/目录共用）
  const [nameDialog, setNameDialog] = useState<{
    title: string;
    label: string;
    initial: string;
    placeholder: string;
    okText: string;
    onOk: (name: string) => Promise<void>;
  } | null>(null);
  // 危险确认弹窗（删除）
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    okText: string;
    onOk: () => Promise<void>;
  } | null>(null);
  // 名称输入框中当前值
  const [nameInput, setNameInput] = useState("");
  // 名称输入弹窗内的校验错误提示
  const [dialogErr, setDialogErr] = useState("");
  // 弹窗进行中（防重复提交）
  const [modalBusy, setModalBusy] = useState(false);
  // 刷新计数：整体自增触发文件列表重载
  const [refreshTick, setRefreshTick] = useState(0);
  // 右键「编辑」时若目标文件尚未加载正文，标记在正文加载完成后自动进入编辑模式
  const editOnLoadRef = useRef(false);
  // ZIP 导出选择器状态：entries 为可勾选文件；zipSel 记录已选（按 rel 路径）
  const [zipExport, setZipExport] = useState<null | {
    title: string;
    rootName: string;
    entries: { absPath: string; rel: string; type: string; size: number }[];
  }>(null);
  const [zipSel, setZipSel] = useState<Set<string>>(new Set());
  const [zipBusy, setZipBusy] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number } | null>(null);
  // 日志文件截断标志和总行数
  const [truncated, setTruncated] = useState<boolean | undefined>(undefined);
  const [totalLines, setTotalLines] = useState<number | undefined>(undefined);
  // 大纲当前高亮项
  const [activeId, setActiveId] = useState<string>("");
  // 已折叠的目录相对路径集合（默认全部展开）
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    // 从 localStorage 读取上次的折叠状态
    try {
      const saved = localStorage.getItem("pl-preview-collapsed");
      if (saved) {
        const arr = JSON.parse(saved) as string[];
        return new Set(arr);
      }
    } catch {}
    return new Set();
  });
  // 当前激活的 Tab（文件类型）
  const [activeTab, setActiveTab] = useState<PreviewFileType | SmartCategory | "all">("all");
  // 列表显示模式：grouped（分组视图）或 list（列表视图）
  type ViewMode = "grouped" | "list";
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // 从 localStorage 读取上次选择的视图模式
    try {
      const saved = localStorage.getItem("pl-preview-viewMode");
      if (saved === "grouped" || saved === "list") return saved;
    } catch {}
    return "grouped"; // 默认分组视图
  });
  // 是否启用智能分类
  const [smartClassify, setSmartClassify] = useState(false);
  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState("");
  // 排序方式
  type SortMode = "name" | "size" | "type" | "modified";
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // 待定位的目标文件（来自聊天结果「产物文件」卡片跳转）：持久保存到文件列表就绪后再定位。
  // 注意：不能用 state 的 activePath 直接存，因为要在文件列表加载完成的效果里消费。
  const targetRef = useRef<string | null>(null);

  // 消费来自聊天结果「产物文件」卡片跳转的目标路径：
  // 挂载时读取模块级待消费信号（激活预览标签后本面板才挂载，信号在此落点），
  // 之后实时监听 window 事件（面板已挂载时点卡片的增量）。
  useEffect(() => {
    const apply = (path?: string | null) => {
      if (!path) return;
      targetRef.current = path;
      // 若目标路径不在当前列表，把其父目录作为手动预览目录重新扫描后再定位
      const hit = files.some((f) => f.path === path);
      if (hit) {
        setActivePath(path);
        targetRef.current = null;
      } else if (!manualDir) {
        // 计算目标文件父目录：聊天产物路径可能不在会话目录下，以父目录为根扫描
        const parent = dirnameOf(path);
        if (parent) setManualDir(parent);
      }
    };
    apply(consumePendingPreviewPath());
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent<{ path?: string }>).detail;
      apply(detail?.path);
    };
    window.addEventListener(PREVIEW_OPEN_EVENT_NAME, onOpen);
    return () => window.removeEventListener(PREVIEW_OPEN_EVENT_NAME, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- files/manualDir 由下方列表效果与 apply 共同驱动
  }, [files, manualDir]);

  // 回退源：仅当宿主未注入 useSession 时，轮询后端「当前会话」端点获取会话 id。
  // useSession 存在时 viewedSessionId 由宿主订阅驱动、随会话切换即时更新，无需轮询。
  useEffect(() => {
    if (useSession) return;
    let alive = true;
    const load = () =>
      getActiveSessionId()
        .then((d) => {
          if (!alive) return;
          const next = d.sessid || "";
          setActiveSessid((prev) => (prev === next ? prev : next));
        })
        .catch(() => {
          /* 后端未就绪时静默，下次轮询再试 */
        });
    load();
    const id = window.setInterval(load, 4000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [useSession]);

  // 持久化：视图模式变化时保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pl-preview-viewMode", viewMode);
    } catch {}
  }, [viewMode]);

  // 持久化：折叠状态变化时保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pl-preview-collapsed", JSON.stringify([...collapsed]));
    } catch {}
  }, [collapsed]);

  // 会话/手动目录变化 → 重新列出文件，保持当前选中（仍存在）或回落第一个。
  // 手动选择的目录优先于会话派生目录（用户显式指定，不随会话切换而改变）。
  useEffect(() => {
    if (!sessid && !manualDir) {
      setDir("");
      setFiles([]);
      setActivePath(null);
      // 不重置 collapsed，保留用户的折叠偏好
      return;
    }
    let alive = true;
    const load = manualDir ? listPreviewFilesByDir(manualDir) : listPreviewFiles(sessid);
    load
      .then(({ dir: root, files: list }) => {
        if (!alive) return;
        setDir(root);
        setFiles(list);
        // 不重置 collapsed，保留用户的折叠偏好
        setActivePath((prev) =>
          prev && list.some((f) => !f.dir && f.path === prev) ? prev : (list.find((f) => !f.dir)?.path ?? null),
        );
      })
      .catch(() => {
        if (alive) {
          setDir("");
          setFiles([]);
          setActivePath(null);
        }
      });
    return () => {
      alive = false;
    };
  }, [sessid, manualDir, refreshTick]);

  // 选中文件变化 → 加载正文
  useEffect(() => {
    if (!activePath) {
      setContent(null);
      setTruncated(undefined);
      setTotalLines(undefined);
      return;
    }
    
    // 立即清空旧内容，避免显示错误类型的内容
    setContent(null);
    setTruncated(undefined);
    setTotalLines(undefined);
    setEditing(false);
    setEditContent("");
    
    let alive = true;
    readPreviewFile(activePath)
      .then((d) => {
        if (alive) {
          setContent(d.content);
          setTruncated(d.truncated);
          setTotalLines(d.totalLines);
          setActiveId("");
          // 右键「编辑」目标为非当前文件时，正文加载完成即自动进入编辑
          if (editOnLoadRef.current) {
            editOnLoadRef.current = false;
            setEditContent(d.content);
            setEditing(true);
          }
        }
      })
      .catch(() => {
        if (alive) {
          setContent(null);
          setTruncated(undefined);
          setTotalLines(undefined);
        }
      });
    return () => {
      alive = false;
    };
  }, [activePath]);

  // 解析 md 正文：大纲 + 渲染节点
  const parsed = useMemo(() => (content ? renderMd(content) : { outline: [], body: [] }), [content]);
  const outline = parsed.outline;

  // 大文件截断提示条：后端只返回部分内容时告知用户（显示全文共多少行）
  const truncHint = truncated
    ? (
        <div className={`${S}-truncHint`}>
          {T?.("pl.preview.truncated") ?? "文件较大，已截断预览，仅显示部分内容"}（共 {totalLines ?? "?"} 行）
        </div>
      )
    : null;

  // 解析 json 正文：对象 + 是否解析失败
  const activeFile = files.find((f) => f.path === activePath) ?? null;
  
  const { jsonValue, jsonError } = useMemo(() => {
    if (activeFile?.type !== "json" || content === null) return { jsonValue: null, jsonError: false };
    try {
      return { jsonValue: JSON.parse(content) as unknown, jsonError: false };
    } catch {
      return { jsonValue: null, jsonError: true };
    }
  }, [activeFile, content]);

  // 智能文件分类：基于文件名、路径和内容特征
  function classifyFile(file: PreviewFileEntry): SmartCategory {
    const name = file.name.toLowerCase();
    const path = file.path.toLowerCase();
    
    // 文档
    if (name.includes("readme") || name.includes("changelog") || name.includes("license") ||
        path.includes("/docs/") || path.includes("/documentation/")) {
      return "docs";
    }
    
    // 配置文件
    if (name.includes("package.json") || name.includes("tsconfig") || name.includes(".env") ||
        name.includes("dockerfile") || name.includes(".gitignore") || name.includes("webpack") ||
        name.includes("vite.config") || name.includes("eslint") || name.includes("prettier") ||
        file.type === "yml" || file.type === "yaml" || file.type === "toml" || file.type === "xml") {
      return "config";
    }
    
    // 测试文件
    if (name.includes(".test.") || name.includes(".spec.") || name.includes("__tests__") ||
        path.includes("/test/") || path.includes("/tests/") || path.includes("/__tests__/")) {
      return "test";
    }
    
    // 样式文件
    if (name.endsWith(".css") || name.endsWith(".scss") || name.endsWith(".sass") ||
        name.endsWith(".less") || name.includes("tailwind") || name.includes("style")) {
      return "styles";
    }
    
    // 数据文件
    if (file.type === "json" || file.type === "csv") {
      return "data";
    }
    
    // 业务代码
    if (["ts", "js", "py", "go", "rs", "java", "c", "cpp"].includes(file.type) &&
        !name.includes(".test.") && !name.includes(".spec.")) {
      return "business";
    }
    
    return "other";
  }
  
  const CATEGORY_LABELS: Record<SmartCategory, string> = {
    docs: "📝 文档",
    config: "🔧 配置",
    test: "🧪 测试",
    business: "💼 业务代码",
    styles: "🎨 样式",
    data: "📊 数据",
    other: "📦 其他",
  };
  
  const CATEGORY_COLORS: Record<SmartCategory, string> = {
    docs: "#60a5fa",
    config: "#f59e0b",
    test: "#10b981",
    business: "#8b5cf6",
    styles: "#ec4899",
    data: "#14b8a6",
    other: "#6b7280",
  };

  // Tab 标签页：统计每种类型的文件数量
  const tabCounts = useMemo(() => {
    const counts = new Map<PreviewFileType, number>();
    for (const f of files) {
      if (f.dir) continue;
      counts.set(f.type, (counts.get(f.type) || 0) + 1);
    }
    return counts;
  }, [files]);

  // 仅文件（剔除目录条目），供扁平列表/分类/计数使用；目录节点只进图层树
  const fileEntries = useMemo(() => files.filter((f) => !f.dir), [files]);

  // 智能分类统计
  const smartCategoryCounts = useMemo(() => {
    const counts = new Map<SmartCategory, number>();
    for (const f of fileEntries) {
      const category = classifyFile(f);
      counts.set(category, (counts.get(category) || 0) + 1);
    }
    return counts;
  }, [fileEntries]);

  // 过滤和排序后的文件列表
  const filteredFiles = useMemo(() => {
    let result = fileEntries;
    
    // 按 Tab 过滤（支持智能分类）
    if (activeTab !== "all") {
      if (smartClassify) {
        // 智能分类模式：按分类过滤
        result = result.filter((f) => classifyFile(f) === activeTab);
      } else {
        // 普通模式：按文件类型过滤
        result = result.filter((f) => f.type === activeTab);
      }
    }
    
    // 按搜索关键词过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(query));
    }
    
    // 排序
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortMode) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "size":
          cmp = a.size - b.size;
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "modified":
          cmp = (a.modified || 0) - (b.modified || 0);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    
    return result;
  }, [files, activeTab, searchQuery, sortMode, sortAsc]);

  // 图层树（分组视图）：按文件夹节点聚合；受类型/智能分类 Tab 与搜索关键字过滤
  const treeNodes = useMemo(() => {
    // 与扁平列表一致的 Tab 谓词
    let pred: (f: PreviewFileEntry) => boolean = () => true;
    if (activeTab !== "all") {
      pred = smartClassify
        ? (f) => classifyFile(f) === activeTab
        : (f) => f.type === activeTab;
    }
    const q = searchQuery.trim().toLowerCase();
    return buildTree(files.filter((f) => (!q || f.name.toLowerCase().includes(q)) && pred(f)));
  }, [files, activeTab, smartClassify, searchQuery]);

  const showFiles = fileEntries.length > 1;
  const showToc = activeFile?.type === "md" && outline.length > 0;

  // 编辑功能
  /** 进入编辑模式 */
  const startEditing = () => {
    if (content === null || truncated) return; // 截断的文件数据不完整，禁止编辑，以免保存时覆盖原文件
    setEditContent(content);
    setEditing(true);
  };

  /** 取消编辑 */
  const cancelEditing = () => {
    setEditing(false);
    setEditContent("");
  };

  /** 保存文件 */
  const handleSave = async () => {
    if (!activePath || !editContent) return;
    
    setSaving(true);
    try {
      await savePreviewFile(activePath, editContent);
      setContent(editContent);
      setEditing(false);
      setToast({ message: T("pl.preview.toast.saveOk"), type: "success" });
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error("Save failed:", err);
      setToast({ message: T("pl.preview.toast.saveFail"), type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // 手动刷新：重列文件 + 重载当前正文（跟随会话或手动目录）
  const refresh = () => {
    setSpinning(true);
    if (!sessid && !manualDir) return;
    const load = manualDir ? listPreviewFilesByDir(manualDir) : listPreviewFiles(sessid);
    load
      .then(({ dir: root, files: list }) => {
        setDir(root);
        setFiles(list);
        // 不重置 collapsed，保留用户的折叠偏好
        setActivePath((prev) =>
          prev && list.some((f) => !f.dir && f.path === prev) ? prev : (list.find((f) => !f.dir)?.path ?? null),
        );
      })
      .catch(() => {});
  };

  // ── 右键菜单 ──
  // 绝对路径 → 相对列表根目录的路径（用于展示「相对路径」）
  const relOf = (abs: string): string =>
    dir ? abs.replace(/\\/g, "/").slice(dir.length).replace(/^\/+/, "") : abs;

  const flash = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), type === "error" ? 3000 : 2000);
  };

  // 打开右键菜单：n 为树/列表节点；null 表示列表空白区。
  const openCtx = (
    e: { clientX: number; clientY: number; preventDefault(): void; stopPropagation(): void },
    n: FileTreeNode | null,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    let target: CtxTarget;
    if (!n) {
      target = { kind: "blank", absPath: dir || "", relPath: "", name: "" };
    } else if (n.children) {
      target = {
        kind: "dir",
        absPath: dir ? `${dir}/${n.path ?? ""}` : (n.path ?? ""),
        relPath: n.path ?? "",
        name: n.name,
      };
    } else {
      target = {
        kind: "file",
        absPath: n.path ?? "",
        relPath: relOf(n.path ?? ""),
        name: n.name,
        type: n.type,
      };
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, target });
  };

  const closeMenu = () => setCtxMenu(null);

  // 任一动作执行前的自定义跳转（裁剪到当前 target）
  const useCtxTarget = (): CtxTarget | null => ctxMenu?.target ?? null;

  // 纯前端动作：复制
  const actCopy = async (what: "abs" | "rel" | "name" | "link") => {
    const t = useCtxTarget();
    if (!t) return;
    const text =
      what === "abs" ? t.absPath : what === "rel" ? t.relPath : what === "name" ? t.name : `[${t.name}](${t.relPath})`;
    const ok = await copyText(text);
    flash(ok ? T("pl.preview.toast.copied") : T("pl.preview.toast.copyFailed"));
    closeMenu();
  };

  const readAndCopy = async (fence: boolean) => {
    const t = useCtxTarget();
    if (!t) return;
    closeMenu();
    try {
      const d = await readPreviewFile(t.absPath);
      const text = fence
        ? "```" + (t.type === "md" ? "markdown" : (t.type ?? "")) + "\n" + d.content.replace(/\s+$/, "") + "\n```"
        : d.content;
      const ok = await copyText(text);
      flash(ok ? T("pl.preview.toast.copied") : T("pl.preview.toast.copyFailed"));
    } catch {
      flash(T("pl.preview.toast.readFailed"), "error");
    }
  };

  // 展开/折叠全部（作用于当前树）
  const collectDirs = (nodes: FileTreeNode[]): string[] =>
    nodes.flatMap((n) => (n.children ? [n.path!, ...collectDirs(n.children)] : []));
  const actExpandAll = () => {
    setCollapsed(new Set());
    closeMenu();
  };
  const actCollapseAll = () => {
    setCollapsed(new Set(collectDirs(treeNodes)));
    closeMenu();
  };
  const actRefresh = () => {
    closeMenu();
    refresh();
  };

  // 右键「编辑」：若目标文件已是当前文件且正文已加载则直接进入编辑，否则加载后自动编辑。
  // 截断的文件数据不完整，禁止编辑以免覆盖原文件。
  const actEdit = () => {
    const t = useCtxTarget();
    if (!t || t.kind !== "file") return;
    if (activePath === t.absPath && truncated) {
      flash(T("pl.preview.editForbiddenTruncated"), "error");
      closeMenu();
      return;
    }
    closeMenu();
    if (activePath === t.absPath && content !== null) {
      setEditContent(content);
      setEditing(true);
    } else {
      editOnLoadRef.current = true;
      setActivePath(t.absPath);
    }
  };

  // 右键「导出」：文件→单文件；文件夹→该目录下所有文件。均弹选择器勾选后打包为 ZIP
  const actExport = () => {
    const t = useCtxTarget();
    if (!t || t.kind === "blank") return;
    closeMenu();
    let entries: { absPath: string; rel: string; type: string; size: number }[];
    if (t.kind === "file") {
      entries = [
        {
          absPath: t.absPath,
          rel: t.relPath || t.name,
          type: fileTypeOf(t.name),
          size: 0,
        },
      ];
    } else {
      const prefix = t.relPath ? t.relPath + "/" : "";
      entries = files
        .filter((f) => !f.dir && f.name.startsWith(prefix))
        .map((f) => ({ absPath: f.path, rel: f.name, type: f.type, size: f.size }));
    }
    if (entries.length === 0) {
      flash(T("pl.preview.toast.noExportable"), "error");
      return;
    }
    setZipExport({
      title: t.kind === "file" ? T("pl.preview.ctx.export") : T("pl.preview.zip.dirTitle"),
      rootName: t.name || "export",
      entries,
    });
    setZipSel(new Set(entries.map((e) => e.rel)));
    setZipProgress(null);
  };

  // 切换 ZIP 勾选
  const toggleZipFile = (rel: string) =>
    setZipSel((prev) => {
      const next = new Set(prev);
      next.has(rel) ? next.delete(rel) : next.add(rel);
      return next;
    });

  // ZIP 全选 / 取消全选
  const toggleZipAll = () => {
    if (!zipExport) return;
    setZipSel((prev) =>
      prev.size === zipExport.entries.length
        ? new Set()
        : new Set(zipExport.entries.map((e) => e.rel)),
    );
  };

  // 把已勾选文件逐个读取原始字节并打包为 ZIP 下载
  const runZipExport = async () => {
    if (!zipExport || zipSel.size === 0 || zipBusy) return;
    setZipBusy(true);
    setZipProgress({ current: 0, total: zipSel.size });
    try {
      const zip = new JSZip();
      const selected = zipExport.entries.filter((e) => zipSel.has(e.rel));
      for (let i = 0; i < selected.length; i++) {
        const e = selected[i];
        try {
          const d = await downloadPreviewFile(e.absPath);
          const bin = atob(d.base64);
          const bytes = new Uint8Array(bin.length);
          for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
          zip.file(e.rel, bytes);
        } catch (err) {
          console.warn("zip export skip:", e.rel, err);
        }
        setZipProgress({ current: i + 1, total: selected.length });
      }
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      triggerDownload(blob, `${sanitizeFilename(zipExport.rootName)}.zip`);
      setZipExport(null);
      flash(T("pl.preview.toast.exported"));
    } catch (err) {
      console.error("zip export failed:", err);
      flash(T("pl.preview.toast.exportFailed"), "error");
    } finally {
      setZipBusy(false);
      setZipProgress(null);
    }
  };

  // ── 写操作：重命名 / 删除 / 新建文件 / 新建目录 ──
  const runAndRefresh = (op: () => Promise<unknown>) =>
    op()
      .then(() => {
        flash(T("pl.preview.toast.opSuccess"));
        setRefreshTick((t) => t + 1);
      })
      .catch((err: unknown) => {
        console.error(err);
        flash(err instanceof Error ? err.message : T("pl.preview.toast.opFailed"), "error");
      });

  const actRename = () => {
    const t = useCtxTarget();
    if (!t) return;
    setNameInput(t.name);
    setNameDialog({
      title: t.kind === "dir" ? T("pl.preview.renameDir") : T("pl.preview.renameFile"),
      label: T("pl.preview.renameLabel"),
      initial: t.name,
      placeholder: "",
      okText: T("pl.preview.ok"),
      onOk: (name) => {
        if (!name.trim()) throw new Error(T("pl.preview.dialog.nameEmpty"));
        return runAndRefresh(() => previewRename(t.absPath, name.trim()));
      },
    });
    closeMenu();
  };

  const actDelete = () => {
    const t = useCtxTarget();
    if (!t) return;
    setConfirmDialog({
      title: t.kind === "dir" ? T("pl.preview.deleteDirTitle") : T("pl.preview.deleteFileTitle"),
      message: T("pl.preview.deleteConfirm", { name: t.relPath || t.name }),
      okText: T("pl.preview.deleteOk"),
      onOk: () => runAndRefresh(() => previewDelete(t.absPath)),
    });
    closeMenu();
  };

  const openNewFileDialog = (baseDirPath: string) => {
    setNameInput("");
    setNameDialog({
      title: T("pl.preview.newFileTitle"),
      label: T("pl.preview.newFileLabel"),
      initial: "",
      placeholder: T("pl.preview.newFilePlaceholder"),
      okText: T("pl.preview.create"),
      onOk: (name) => {
        if (!name.trim()) throw new Error(T("pl.preview.dialog.nameEmpty"));
        return runAndRefresh(() => previewNewFile(baseDirPath, name.trim()));
      },
    });
    closeMenu();
  };

  const openNewDirDialog = (baseDirPath: string) => {
    setNameInput("");
    setNameDialog({
      title: T("pl.preview.newDirTitle"),
      label: T("pl.preview.newDirLabel"),
      initial: "",
      placeholder: T("pl.preview.newDirPlaceholder"),
      okText: T("pl.preview.create"),
      onOk: (name) => {
        if (!name.trim()) throw new Error(T("pl.preview.dialog.nameEmpty"));
        return runAndRefresh(() => previewMkdir(baseDirPath, name.trim()));
      },
    });
    closeMenu();
  };

  // 提交名称输入弹窗：校验非空（不含路径分隔符）→ 防重 → 调用 onOk → 成功后关闭
  const submitNameDialog = async () => {
    const dlg = nameDialog;
    if (!dlg || modalBusy) return;
    const name = nameInput.trim();
    if (!name) {
      setDialogErr(T("pl.preview.dialog.nameEmpty"));
      return;
    }
    if (name.includes("/") || name.includes("\\") || name.includes("..")) {
      setDialogErr(T("pl.preview.dialog.nameInvalid"));
      return;
    }
    setModalBusy(true);
    try {
      // onOk 内部已做完整写操作与刷新；resolve 即成功，reject 表示未处理错误
      await dlg.onOk(name);
      setNameDialog(null);
      setDialogErr("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : T("pl.preview.toast.opFailed");
      setNameDialog(null);
      flash(msg, "error");
    } finally {
      setModalBusy(false);
    }
  };

  // 打开文件夹：优先宿主原生目录选择器；原生不可用（桌面端仅 browse）时回退到浏览式目录选择弹窗
  const openFolder = async () => {
    if (isDirectoryPickerAvailable()) {
      try {
        const picked = await pickExportDirectory();
        if (picked) {
          setManualDir(picked);
          return;
        }
        // 原生选择器被用户取消：不打开浏览弹窗
        return;
      } catch {
        // 原生能力不可用（桌面端报 native capability 缺失）→ 回退到浏览式
      }
    }
    if (!isDirectoryBrowserAvailable()) return;
    setDirPickerOpen(true);
  };

  // 大纲点击 → 平滑滚动到对应标题
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 正文滚动 → 高亮当前所在标题
  const onBodyScroll = () => {
    const el = bodyRef.current;
    if (!el || outline.length === 0) return;
    const top = el.getBoundingClientRect().top + 12;
    let current = "";
    for (const item of outline) {
      const node = document.getElementById(item.id);
      if (node && node.getBoundingClientRect().top <= top) current = item.id;
    }
    setActiveId(current);
  };

  // 目录折叠切换
  const toggleDir = (p: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  // 本面板激活（data-phase="active"）时隐藏底部聊天框，切走时恢复显示；
  // 同时把本面板所在视图容器（.wSkVaW_viewArea）高度设为 100%，使面板铺满可视区域。
  // 用 MutationObserver 监听本面板所在 root 的 data-phase，避免污染其它视图标签。
  useEffect(() => {
    const panel = document.querySelector(`.${S}-wrap`);
    const area = panel instanceof HTMLElement ? panel.closest(".wSkVaW_viewArea") : null;
    let lastSeat: HTMLElement | null = null;
    const sync = () => {
      const root = panel instanceof HTMLElement ? panel.closest(".wSkVaW_root") : null;
      const active = root instanceof HTMLElement && root.getAttribute("data-phase") === "active";
      const seat = document.querySelector(".wSkVaW_composerSeat");
      if (seat instanceof HTMLElement) {
        lastSeat = seat;
        if (active) seat.style.display = "none";
        else seat.style.display = "";
      }
      if (area instanceof HTMLElement) {
        // 切进本面板时铺满 100%，切出时还原
        if (active) area.style.height = "100%";
        else area.style.height = "auto";
      }
    };
    let mo: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      const effRoot = panel instanceof HTMLElement ? panel.closest(".wSkVaW_root") : null;
      if (effRoot instanceof HTMLElement) {
        mo = new MutationObserver(sync);
        mo.observe(effRoot, { attributes: true, attributeFilter: ["data-phase"] });
      }
    }
    sync();
    return () => {
      mo?.disconnect();
      if (lastSeat) lastSeat.style.display = "";
      // 用缓存的引用还原 viewArea 高度，避免残留 100% 影响其它视图
      if (area instanceof HTMLElement) area.style.height = "auto";
    };
  }, []);

  return (
    <div className={`${S}-wrap`}>
      <div className={`${S}-root`}>
        <style>{`
        .${S}-wrap{position:relative;display:flex;flex-direction:row;flex-wrap:nowrap;align-items:stretch;flex:1;height:100%;width:100%;min-height:0;box-sizing:border-box;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
        .${S}-root{box-sizing:border-box;flex:1;min-width:0;min-height:0;overflow:hidden;display:flex;flex-direction:column;color:var(--dsw-alias-label-primary);font-size:12.5px;line-height:20px;background:var(--dsw-alias-bg-layer-1)}
        .${S}-header{flex:none;display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--dsw-alias-bg-container);border-bottom:1px solid var(--dsw-alias-border-l2)}
        .${S}-headerTitle{flex:none;display:flex;align-items:center;gap:6px;font-weight:600;font-size:12.5px;color:var(--dsw-alias-label-primary)}
        .${S}-headerDot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-static-blue-450,var(--dsw-static-blue-500))}
        .${S}-headerPath{flex:1;min-width:0;color:var(--dsw-alias-label-tertiary);font:11px/16px var(--ds-font-family-code,ui-monospace,Consolas,monospace);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .${S}-count{flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px;font-variant-numeric:tabular-nums}
        .${S}-refresh{flex:none;width:26px;height:26px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:15px;line-height:15px;transition:color .24s,background-color .24s}
        .${S}-refresh:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-refresh.spinning{animation:${S}-spin .5s ease}
        @keyframes ${S}-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .${S}-openFolder{flex:none;display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:11.5px;line-height:1;cursor:pointer;white-space:nowrap;transition:background-color .24s,color .24s,border-color .24s}
        .${S}-openFolder:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-static-blue-450)}
        .${S}-openFolder.active{color:var(--dsw-static-blue-450);background:color-mix(in srgb,var(--dsw-static-blue-450) 14%,transparent);border-color:var(--dsw-static-blue-450)}
        .${S}-body{flex:1;min-height:0;display:flex;flex-direction:row;align-items:stretch;overflow:hidden}
        .${S}-files{flex:none;width:280px;min-width:220px;box-sizing:border-box;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;overflow:hidden}
        
        /* Tab 标签页 */
        .${S}-tabs{flex:none;display:flex;gap:4px;padding:8px 8px 4px;overflow-x:auto;border-bottom:1px solid var(--dsw-alias-border-l2)}
        .${S}-tab{flex:none;display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;cursor:pointer;white-space:nowrap;transition:background-color .2s,color .2s}
        .${S}-tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-tab.active{background:var(--dsw-alias-bg-accent);color:var(--dsw-alias-label-inverse);font-weight:600}
        .${S}-tabDot{flex:none;width:6px;height:6px;border-radius:50%}
        .${S}-tabCount{margin-left:2px;font-size:10px;opacity:.8}
        
        /* 搜索框 */
        .${S}-searchBox{flex:none;padding:6px 8px;position:relative}
        .${S}-searchInput{width:100%;max-width:240px;padding:5px 28px 5px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:12px;outline:none;transition:border-color .2s;box-sizing:border-box}
        .${S}-searchInput:focus{border-color:var(--dsw-static-blue-450)}
        .${S}-searchInput::placeholder{color:var(--dsw-alias-label-tertiary)}
        .${S}-searchClear{position:absolute;right:12px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-size:12px;padding:2px 4px;border-radius:4px;line-height:1}
        .${S}-searchClear:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
        
        /* 排序栏 */
        .${S}-sortBar{flex:none;display:flex;gap:4px;padding:4px 8px 6px;border-bottom:1px solid var(--dsw-alias-border-l2);overflow-x:auto}
        .${S}-sortBtn{flex:none;padding:3px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:10px;cursor:pointer;white-space:nowrap;transition:all .2s}
        .${S}-sortBtn:hover{border-color:var(--dsw-static-blue-450);color:var(--dsw-static-blue-450)}
        .${S}-sortToggle{flex:none;width:24px;height:24px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;transition:all .2s}
        .${S}-sortToggle:hover{border-color:var(--dsw-static-blue-450);color:var(--dsw-static-blue-450)}
        
        /* 视图模式切换按钮 */
        .${S}-viewToggle{flex:none;width:28px;height:24px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .2s;margin-right:2px}
        .${S}-viewToggle:hover{border-color:var(--dsw-static-blue-450);color:var(--dsw-static-blue-450)}
        .${S}-viewToggle.active{background:var(--dsw-static-blue-450);border-color:var(--dsw-static-blue-450);color:#fff}
        
        /* 扁平文件列表 */
        .${S}-fileListFlat{flex:1;min-height:0;overflow-y:auto;padding:4px 8px 8px;display:flex;flex-direction:column;gap:2px}
        .${S}-fileItem{display:flex;align-items:center;gap:6px;padding:5px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11.5px;cursor:pointer;text-align:left;width:100%;min-width:0;transition:background-color .2s,color .2s}
        .${S}-fileItem:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-fileItem.active{background:var(--dsw-alias-bg-accent);color:var(--dsw-alias-label-inverse);font-weight:600}
        .${S}-fileItem.warning{border-left:2px solid #f59e0b}
        .${S}-fileItem.error{border-left:2px solid #ef4444}
        .${S}-fileTypeBadge{flex:none;font-size:9px;line-height:14px;font-weight:600;color:#fff;border-radius:3px;padding:0 4px;min-width:24px;text-align:center}
        .${S}-fileName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .${S}-fileMeta{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:1px}
        .${S}-fileSize{font-size:10px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
        .${S}-fileModified{font-size:9px;color:var(--dsw-alias-label-tertiary);opacity:.7}
        .${S}-emptyList{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font-size:12px;padding:24px;text-align:center}
        
        /* 树形文件列表 */
        .${S}-fileListTree{flex:1;min-height:0;overflow-y:auto;padding:4px 8px 8px}
        
        /* 保留旧的树形样式（向后兼容） */
        .${S}-fileList{flex:1;min-height:0;overflow-y:auto;padding:0 8px 8px;display:flex;flex-direction:column;gap:2px}
        .${S}-group{display:flex;flex-direction:column;gap:1px}
        .${S}-groupHead{flex:none;display:flex;align-items:center;gap:6px;padding:6px 8px 3px;font-size:11px;color:var(--dsw-alias-label-secondary);font-weight:600}
        .${S}-groupDot{flex:none;width:7px;height:7px;border-radius:50%}
        .${S}-groupCount{flex:none;color:var(--dsw-alias-label-tertiary);font-size:10px;font-variant-numeric:tabular-nums}
        .${S}-treeDir{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;min-width:0;transition:background-color .24s,color .24s}
        .${S}-treeDir:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-treeArrow{flex:none;width:12px;font-size:10px;line-height:12px;color:var(--dsw-alias-label-tertiary);transition:transform .24s}
        .${S}-treeArrow.open{transform:rotate(90deg)}
        .${S}-treeDirName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
        .${S}-file{display:flex;align-items:center;gap:7px;padding:4px 8px;border-radius:6px;cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;min-width:0;transition:background-color .24s,color .24s}
        .${S}-file:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-file.active{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}
        .${S}-fileBadge{flex:none;font-size:9px;line-height:14px;font-weight:600;color:#60a5fa;background:color-mix(in srgb,#60a5fa 16%,transparent);border-radius:4px;padding:0 4px}
        .${S}-fileName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .${S}-fileSize{flex:none;color:var(--dsw-alias-label-tertiary);font-size:10px;font-variant-numeric:tabular-nums}
        .${S}-content{flex:1;min-width:0;min-height:0;display:flex;flex-direction:row;align-items:stretch;overflow:hidden}
        .${S}-toc{flex:0 1 auto;min-height:0;height:100%;width:200px;min-width:160px;box-sizing:border-box;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;overflow:hidden}
        .${S}-tocHead{flex:none;display:flex;align-items:center;justify-content:space-between;padding:6px 6px 6px 12px;font-size:11px;color:var(--dsw-alias-label-tertiary);font-weight:600}
        .${S}-tocCollapseBtn{display:flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1;cursor:pointer;transition:background .12s ease}
        .${S}-tocCollapseBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-tocCollapsed{width:26px;min-width:26px!important;align-items:center;justify-content:flex-start;padding:6px 0 0;border-right:1px solid var(--dsw-alias-border-l2)}
        .${S}-tocList{flex:1;min-height:0;overflow-y:auto;padding:0 8px 8px}
        .${S}-tocItem{display:block;text-align:left;width:100%;border:0;background:transparent;padding:3px 8px;border-radius:6px;cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:17px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:background-color .24s,color .24s}
        .${S}-tocItem:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-tocItem.active{color:var(--dsw-static-blue-450,var(--dsw-static-blue-500));font-weight:600}
        .${S}-mdBody{flex:1;min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;padding:14px 18px;font-size:13px;line-height:1.8;color:var(--dsw-alias-label-primary)}
        .${S}-mdBody::-webkit-scrollbar,.${S}-fileList::-webkit-scrollbar,.${S}-tocList::-webkit-scrollbar,.${S}-jBody::-webkit-scrollbar,.${S}-txtBody::-webkit-scrollbar,.${S}-csvWrap::-webkit-scrollbar{width:10px;height:10px}
        .${S}-mdBody::-webkit-scrollbar-thumb,.${S}-fileList::-webkit-scrollbar-thumb,.${S}-tocList::-webkit-scrollbar-thumb,.${S}-jBody::-webkit-scrollbar-thumb,.${S}-txtBody::-webkit-scrollbar-thumb,.${S}-csvWrap::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:5px;border:2px solid transparent;background-clip:content-box}
        .${S}-mdBody::-webkit-scrollbar-thumb:hover,.${S}-fileList::-webkit-scrollbar-thumb:hover,.${S}-tocList::-webkit-scrollbar-thumb:hover,.${S}-jBody::-webkit-scrollbar-thumb:hover,.${S}-txtBody::-webkit-scrollbar-thumb:hover,.${S}-csvWrap::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-border-l3)}
        .${S}-mdBody::-webkit-scrollbar-track,.${S}-fileList::-webkit-scrollbar-track,.${S}-tocList::-webkit-scrollbar-track,.${S}-jBody::-webkit-scrollbar-track,.${S}-txtBody::-webkit-scrollbar-track,.${S}-csvWrap::-webkit-scrollbar-track{background:transparent}
        .${S}-mdBody h1,.${S}-mdBody h2,.${S}-mdBody h3,.${S}-mdBody h4,.${S}-mdBody h5,.${S}-mdBody h6{margin:14px 0 8px;font-weight:650;line-height:1.4;color:var(--dsw-alias-label-primary);scroll-margin-top:12px}
        .${S}-mdBody h1{font-size:17px}
        .${S}-mdBody h2{font-size:15px}
        .${S}-mdBody h3{font-size:13.5px}
        .${S}-mdBody h4{font-size:13px}
        .${S}-mdBody h5,.${S}-mdBody h6{font-size:12.5px}
        .${S}-mdBody p{margin:7px 0}
        .${S}-mdBody ul,.${S}-mdBody ol{margin:7px 0;padding-left:22px}
        .${S}-mdBody li{margin:2px 0}
        .${S}-mdBody blockquote{margin:8px 0;padding:4px 12px;border-left:3px solid var(--dsw-alias-border-strong);color:var(--dsw-alias-label-secondary)}
        .${S}-mdBody hr{border:none;border-top:1px solid var(--dsw-alias-border-l2);margin:12px 0}
        .${S}-mdBody a{color:var(--dsw-static-blue-500)}
        .${S}-mdBody strong{font-weight:650}
        .${S}-mdBody em{font-style:italic}
        .${S}-mdBody del{color:var(--dsw-alias-label-tertiary)}
        .${S}-mdBody code{font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:.9em;padding:0 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
        .${S}-mdPre{margin:9px 0;padding:11px 13px;overflow-x:auto;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);white-space:pre-wrap}
        .${S}-mdPre code{background:none;padding:0}
        .${S}-mdImg{max-width:100%;height:auto;border-radius:6px;margin:4px 0}
        .${S}-hl{background:rgba(250,204,21,.22);color:var(--dsw-alias-label-primary);padding:0 2px;border-radius:3px}
        .${S}-taskBox{width:13px;height:13px;margin:0 5px 0 0;vertical-align:-2px;accent-color:#34d399;pointer-events:none}
        .${S}-done{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}
        .${S}-mdTable{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;line-height:1.6}
        .${S}-mdTable th,.${S}-mdTable td{border:1px solid var(--dsw-alias-border-l2);padding:4px 8px;text-align:left;vertical-align:top}
        .${S}-mdTable th{background:var(--dsw-alias-bg-layer-2);font-weight:600;color:var(--dsw-alias-label-secondary);white-space:nowrap}
        .${S}-mdTable td{color:var(--dsw-alias-label-primary)}
        .${S}-jBody{flex:1;min-width:0;min-height:0;overflow:auto;padding:12px 14px;font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:11.5px;line-height:1.7}
        .${S}-jRow{display:flex;align-items:baseline;gap:5px;white-space:nowrap;min-height:20px}
        .${S}-jRow.jHead{cursor:pointer;user-select:none}
        .${S}-jKey{color:var(--dsw-alias-label-secondary);font-weight:600}
        .${S}-jColon{color:var(--dsw-alias-label-tertiary)}
        .${S}-jType{color:var(--dsw-alias-label-tertiary);font-style:italic}
        .${S}-jStr{color:#34d399}
        .${S}-jNum{color:#fbbf24}
        .${S}-jBool{color:#60a5fa}
        .${S}-jNull{color:#94a3b8;font-style:italic}
        .${S}-txtBody{flex:1;min-width:0;min-height:0;overflow:auto;padding:14px 18px;margin:0;font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:12px;line-height:1.7;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word}
        .${S}-csvWrap{flex:1;min-width:0;min-height:0;overflow:auto;padding:14px 18px}
        .${S}-csvTable{width:100%;border-collapse:collapse;font-size:12px;line-height:1.6}
        .${S}-csvTable th,.${S}-csvTable td{border:1px solid var(--dsw-alias-border-l2);padding:4px 8px;text-align:left;vertical-align:top;white-space:nowrap;max-width:360px;overflow:hidden;text-overflow:ellipsis}
        .${S}-csvTable th{background:var(--dsw-alias-bg-layer-2);font-weight:600;color:var(--dsw-alias-label-secondary);position:sticky;top:0}
        .${S}-csvTable td{color:var(--dsw-alias-label-primary)}
        
        /* 代码高亮容器 */
        .${S}-codeBody{flex:1;min-width:0;min-height:100px;height:100%;overflow:auto;padding:14px 18px;background:var(--dsw-alias-bg-subtle);border-radius:8px;font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:13px;line-height:1.6}
        .${S}-codeBody pre[class*="language-"]{margin:0;padding:12px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;font-family:inherit;font-size:inherit;line-height:inherit;white-space:pre;overflow-x:auto}
        .${S}-codeBody code[class*="language-"],.${S}-codeBody pre[class*="language-"]{text-shadow:none !important;color:var(--dsw-alias-label-primary)}
        
        /* 日志文件 */
        .${S}-logBody{flex:1;min-width:0;min-height:0;overflow:auto;padding:14px 18px;margin:0;background:var(--dsw-alias-bg-subtle);border-radius:8px;font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word}
        .${S}-logBody pre{margin:0;padding:0;background:none;border:none;font-family:inherit;font-size:inherit;line-height:inherit;color:inherit;white-space:inherit;word-break:inherit}
        .${S}-logTruncated{margin-top:8px;padding:8px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px;border-top:1px solid var(--dsw-alias-border-l2);font-style:italic}
        .${S}-truncHint{flex-shrink:0;margin-bottom:8px;padding:8px 12px;text-align:center;font-weight:600;font-size:12px;color:var(--dsw-alias-brand-primary,#2563eb);background:var(--dsw-alias-brand-primary-selected,rgba(37,99,235,.08));border:1px solid var(--dsw-alias-brand-primary,#2563eb);border-radius:6px}
        
        /* 图片预览 */
        .${S}-imgBody{flex:1;min-width:0;min-height:0;display:flex;justify-content:center;align-items:center;padding:14px 18px;overflow:auto;background:var(--dsw-alias-bg-subtle);border-radius:8px}
        .${S}-imgBody img{max-width:100%;max-height:70vh;object-fit:contain;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.15)}
        
        .${S}-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;flex:1;min-height:0;color:var(--dsw-alias-label-tertiary);font-size:12.5px;padding:24px;text-align:center}
        .${S}-emptyNote{font-size:11px;opacity:.85}
        
        /* 编辑按钮 */
        .${S}-editBtn,.${S}-cancelBtn,.${S}-saveBtn{padding:4px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;transition:all .2s}
        .${S}-editBtn:hover:not(:disabled){border-color:var(--dsw-static-blue-450);background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-editBtn:disabled{opacity:.5;cursor:not-allowed;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);border-color:var(--dsw-alias-border-l2)}
        .${S}-cancelBtn:hover:not(:disabled){background:var(--dsw-alias-bg-hover)}
        .${S}-saveBtn{background:var(--dsw-static-blue-450);color:#fff;border-color:var(--dsw-static-blue-450)}
        .${S}-saveBtn:hover:not(:disabled){opacity:.9}
        .${S}-saveBtn:disabled,.${S}-cancelBtn:disabled{opacity:.5;cursor:not-allowed}
        
        /* 编辑器 */
        .${S}-editorBody{flex:1;display:flex;flex-direction:column;padding:12px;overflow:hidden;background:var(--dsw-alias-bg-subtle);border-radius:8px;min-height:0}
        .${S}-editorTextarea{flex:1;width:100%;padding:12px;border:none;background:transparent;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-mono);font-size:13px;line-height:1.6;resize:none;outline:none;tab-size:2;overflow:auto}
        .${S}-editorTextarea:focus{outline:none}
        
        /* Toast 提示 */
        .${S}-toast{position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;color:#fff;font-size:13px;font-weight:500;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.15);animation:slideIn .3s ease-out}
        .${S}-toast.success{background:#10b981}
        .${S}-toast.error{background:#ef4444}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}

        /* 右键菜单 */
        .${S}-ctxOverlay{position:fixed;inset:0;z-index:2147483646}
        .${S}-ctxMenu{
          position:fixed;z-index:2147483647;min-width:168px;max-width:280px;box-sizing:border-box;
          padding:4px;border-radius:8px;background:var(--dsw-alias-bg-layer-1, #ffffff);
          border:1px solid var(--dsw-alias-border-l2);box-shadow:0 6px 20px rgba(0,0,0,.18);
          color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.4;
          max-height:calc(100vh - 24px);overflow-y:auto;overscroll-behavior:contain
        }
        .${S}-ctxTitle{padding:4px 8px;font-size:11px;color:var(--dsw-alias-label-tertiary);word-break:break-all;border-bottom:1px solid var(--dsw-alias-border-l2);margin-bottom:4px}
        .${S}-ctxItem{display:flex;align-items:center;gap:8px;padding:6px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;text-align:left;width:100%;white-space:nowrap}
        .${S}-ctxItem:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-ctxItem .${S}-ctxIcon{flex:none;width:14px;height:14px;opacity:.75;display:inline-flex;align-items:center;justify-content:center}
        .${S}-ctxItem.danger{color:#ef4444}
        .${S}-ctxItem.danger:hover{background:rgba(239,68,68,.12)}
        .${S}-ctxSep{height:1px;background:var(--dsw-alias-border-l2);margin:4px 6px}

        /* 名称输入 / 确认 弹窗 */
        .${S}-dialogOverlay{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}
        .${S}-dialog{width:320px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:16px;border-radius:10px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l2);box-shadow:0 12px 32px rgba(0,0,0,.2);color:var(--dsw-alias-label-primary)}
        .${S}-dialogTitle{font-size:14px;font-weight:600;margin-bottom:12px}
        .${S}-dialogMsg{font-size:12.5px;color:var(--dsw-alias-label-secondary);margin-bottom:14px;word-break:break-all;line-height:1.5}
        .${S}-dialogInput{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;outline:none;margin-bottom:14px}
        .${S}-dialogInput:focus{border-color:var(--dsw-static-blue-450)}
        .${S}-dialogBtns{display:flex;justify-content:flex-end;gap:8px}
        .${S}-dialogBtn{padding:6px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:12.5px;cursor:pointer}
        .${S}-dialogBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-dialogBtn.primary{background:var(--dsw-static-blue-450,var(--dsw-alias-brand-primary));border-color:transparent;color:#fff;font-weight:500}
        .${S}-dialogBtn.danger{background:#ef4444;border-color:transparent;color:#fff;font-weight:500}
        .${S}-dialogBtn:disabled{opacity:.5;cursor:not-allowed}

        /* ZIP 导出选择器 */
        .${S}-zipOverlay{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}
        .${S}-zipPanel{width:520px;max-width:calc(100vw - 32px);max-height:82vh;box-sizing:border-box;display:flex;flex-direction:column;border-radius:12px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l2);box-shadow:0 12px 32px rgba(0,0,0,.2);color:var(--dsw-alias-label-primary)}
        .${S}-zipHead{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l2)}
        .${S}-zipTitle{font-size:14px;font-weight:600}
        .${S}-zipClose{background:none;border:0;color:var(--dsw-alias-label-secondary);font-size:15px;cursor:pointer;padding:2px 6px;border-radius:4px}
        .${S}-zipClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-zipActions{display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--dsw-alias-border-l2)}
        .${S}-zipAction{padding:4px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer}
        .${S}-zipAction:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-zipCounter{font-size:12px;color:var(--dsw-alias-label-secondary)}
        .${S}-zipList{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:6px}
        .${S}-zipItem{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;cursor:pointer;user-select:none;font-size:12.5px}
        .${S}-zipItem:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-zipItem.selected{background:rgba(96,165,250,.12)}
        .${S}-zipItem input[type="checkbox"]{cursor:pointer;flex:none}
        .${S}-zipIcon{flex:none;width:18px;text-align:center}
        .${S}-zipName{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;word-break:break-all}
        .${S}-zipSize{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary)}
        .${S}-zipFoot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-top:1px solid var(--dsw-alias-border-l2)}
        .${S}-zipProgress{flex:1;display:flex;align-items:center;gap:8px}
        .${S}-zipBar{flex:1;height:4px;background:var(--dsw-alias-bg-subtle);border-radius:2px;overflow:hidden}
        .${S}-zipFill{height:100%;background:var(--dsw-static-blue-450);transition:width .2s}
        .${S}-zipPct{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary)}
        .${S}-zipBtns{display:flex;gap:8px}
        .${S}-zipBtn{padding:6px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:12.5px;cursor:pointer}
        .${S}-zipBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-zipBtn.primary{background:var(--dsw-static-blue-450,var(--dsw-alias-brand-primary));border-color:transparent;color:#fff;font-weight:500}
        .${S}-zipBtn:disabled{opacity:.5;cursor:not-allowed}
      `}</style>

        {/* 头部：标题 + 打开文件夹 + 当前目录 + 文件数 + 刷新 */}
        <div className={`${S}-header`}>
          <span className={`${S}-headerTitle`}>
            <span className={`${S}-headerDot`} />
            {T?.("pl.view.preview") ?? "预览"}
          </span>
          {(isDirectoryPickerAvailable() || isDirectoryBrowserAvailable()) && (
            <button
              type="button"
              className={`${S}-openFolder${manualDir ? " active" : ""}`}
              title={T("pl.preview.openFolder")}
              onClick={openFolder}
            >
              {T("pl.preview.openFolder")}
            </button>
          )}
          <span className={`${S}-headerPath`} title={dir}>
            {dir || (T?.("pl.preview.noSession") ?? "暂无会话所属文件夹")}
          </span>
          {fileEntries.length > 0 && (
            <span className={`${S}-count`}>{fileEntries.length}</span>
          )}
          
          {/* 导出按钮 */}
          {fileEntries.length > 0 && (
            <ArtifactExporter files={fileEntries} sessionTitle={dir?.split("/").pop()} t={T} />
          )}
          
          {/* 编辑按钮（仅当有选中文件且不是二进制文件、且未被截断时显示可点） */}
          {activeFile && !["png", "jpg", "jpeg", "gif", "svg"].includes(activeFile.type) && (
            <>
              {!editing ? (
                <button
                  type="button"
                  className={`${S}-editBtn`}
                  onClick={startEditing}
                  disabled={truncated}
                  title={truncated ? T("pl.preview.editForbiddenTruncated") : T("pl.preview.editFile")}
                >
                  ✏️ {T("pl.preview.ctx.edit")}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`${S}-cancelBtn`}
                    onClick={cancelEditing}
                    disabled={saving}
                    title={T("pl.preview.cancelEdit")}
                  >
                    {T("pl.preview.cancel")}
                  </button>
                  <button
                    type="button"
                    className={`${S}-saveBtn`}
                    onClick={handleSave}
                    disabled={saving}
                    title={T("pl.preview.saveFile")}
                  >
                    {saving ? T("pl.preview.saving") : `💾 ${T("pl.preview.save")}`}
                  </button>
                </>
              )}
            </>
          )}
          
          <button type="button" className={`${S}-refresh${spinning ? " spinning" : ""}`} title={T?.("pl.preview.refresh") ?? "刷新"} onClick={refresh} onAnimationEnd={() => setSpinning(false)}>
            ⟳
          </button>
        </div>

        <div className={`${S}-body`}>
          {/* 多个文件：Tab 标签页 + 搜索过滤 + 排序 + 扁平列表 */}
          {showFiles && (
            <div className={`${S}-files`}>
              {/* Tab 标签页 */}
              <div className={`${S}-tabs`}>
                {/* 智能分类切换按钮 */}
                <button
                  type="button"
                  className={`${S}-tab${smartClassify ? " smart-active" : ""}`}
                  onClick={() => {
                    setSmartClassify(!smartClassify);
                    setActiveTab("all"); // 切换模式时重置为全部
                  }}
                  title={T("pl.preview.smartClassify")}
                >
                  🤖 {smartClassify ? T("pl.preview.smart") : T("pl.preview.type")}
                </button>
                
                <button
                  type="button"
                  className={`${S}-tab${activeTab === "all" ? " active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  {T("pl.preview.all")}
                  <span className={`${S}-tabCount`}>{fileEntries.length}</span>
                </button>
                
                {smartClassify ? (
                  // 智能分类 Tab
                  Array.from(smartCategoryCounts.entries()).map(([category, count]) => (
                    <button
                      key={category}
                      type="button"
                      className={`${S}-tab${activeTab === category ? " active" : ""}`}
                      onClick={() => setActiveTab(category)}
                    >
                      <span className={`${S}-tabDot`} style={{ background: CATEGORY_COLORS[category] }} />
                      {CATEGORY_LABELS[category]}
                      <span className={`${S}-tabCount`}>{count}</span>
                    </button>
                  ))
                ) : (
                  // 普通文件类型 Tab
                  Array.from(tabCounts.entries()).map(([type, count]) => (
                    <button
                      key={type}
                      type="button"
                      className={`${S}-tab${activeTab === type ? " active" : ""}`}
                      onClick={() => setActiveTab(type)}
                    >
                      <span className={`${S}-tabDot`} style={{ background: TYPE_META[type].color }} />
                      {TYPE_META[type].label}
                      <span className={`${S}-tabCount`}>{count}</span>
                    </button>
                  ))
                )}
              </div>

              {/* 搜索框 */}
              <div className={`${S}-searchBox`}>
                <input
                  type="text"
                  className={`${S}-searchInput`}
                  placeholder={T("pl.preview.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className={`${S}-searchClear`}
                    onClick={() => setSearchQuery("")}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 视图模式切换 + 排序按钮 */}
              <div className={`${S}-sortBar`}>
                {/* 视图模式切换 */}
                <button
                  type="button"
                  className={`${S}-viewToggle${viewMode === "grouped" ? " active" : ""}`}
                  onClick={() => setViewMode("grouped")}
                  title={T("pl.preview.groupView")}
                >
                  ▤
                </button>
                <button
                  type="button"
                  className={`${S}-viewToggle${viewMode === "list" ? " active" : ""}`}
                  onClick={() => setViewMode("list")}
                  title={T("pl.preview.listView")}
                >
                  ☰
                </button>
                
                {/* 仅在列表模式下显示排序按钮 */}
                {viewMode === "list" && (
                  <>
                    <button
                      type="button"
                      className={`${S}-sortBtn`}
                      onClick={() => setSortMode("name")}
                    >
                      {T("pl.preview.name")} {sortMode === "name" && (sortAsc ? "↑" : "↓")}
                    </button>
                    <button
                      type="button"
                      className={`${S}-sortBtn`}
                      onClick={() => setSortMode("size")}
                    >
                      {T("pl.preview.size")} {sortMode === "size" && (sortAsc ? "↑" : "↓")}
                    </button>
                    <button
                      type="button"
                      className={`${S}-sortBtn`}
                      onClick={() => {
                        setSortMode("modified");
                        setSortAsc(false); // 默认最新在前
                      }}
                    >
                      {T("pl.preview.modified")} {sortMode === "modified" && (sortAsc ? "↑" : "↓")}
                    </button>
                    <button
                      type="button"
                      className={`${S}-sortToggle`}
                      onClick={() => setSortAsc(!sortAsc)}
                      title={T("pl.preview.toggleOrder")}
                    >
                      {sortAsc ? "↑" : "↓"}
                    </button>
                  </>
                )}
              </div>

              {/* 文件列表：根据视图模式渲染 */}
              {viewMode === "list" && (
                <div
                  className={`${S}-fileListFlat`}
                  onContextMenu={(e) => openCtx(e, null)}
                >
                  {filteredFiles.length === 0 ? (
                    <div className={`${S}-emptyList`}>
                      {searchQuery ? T("pl.preview.noMatch") : T("pl.preview.noFilesInType")}
                    </div>
                  ) : (
                    filteredFiles.map((f) => {
                      const sizeWarning = isLargeFile(f.size);
                      const fileNode: FileTreeNode = {
                        name: f.name.split("/").pop() ?? f.name,
                        path: f.path,
                        type: f.type,
                        size: f.size,
                      };
                      return (
                        <button
                          key={f.path}
                          type="button"
                          className={`${S}-fileItem${activePath === f.path ? " active" : ""}${sizeWarning ? ` ${sizeWarning}` : ""}`}
                          onClick={() => setActivePath(f.path)}
                          onContextMenu={(e) => openCtx(e, fileNode)}
                          title={f.name}
                        >
                          <span
                            className={`${S}-fileTypeBadge`}
                            style={{ background: TYPE_META[f.type].color }}
                          >
                            {TYPE_META[f.type].label}
                          </span>
                          <span className={`${S}-fileName`}>{f.name.split("/").pop()}</span>
                          <span className={`${S}-fileMeta`}>
                            <span className={`${S}-fileSize`}>{formatFileSize(f.size)}</span>
                            {f.modified && (
                              <span className={`${S}-fileModified`}>{formatModified(f.modified)}</span>
                            )}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
              
              {/* 分组视图 */}
              {viewMode === "grouped" && (
                <div
                  className={`${S}-fileListTree`}
                  onContextMenu={(e) => openCtx(e, null)}
                >
                  {treeNodes.length === 0 ? (
                    <div className={`${S}-emptyList`}>
                      {searchQuery ? T("pl.preview.noMatch") : T("pl.preview.noFilesInType")}
                    </div>
                  ) : (
                    <TreeNodes
                      nodes={treeNodes}
                      depth={0}
                      collapsed={collapsed}
                      onToggle={toggleDir}
                      activePath={activePath}
                      onSelect={setActivePath}
                      baseDir={dir}
                      onCtx={openCtx}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <div className={`${S}-content`}>
            {/* 正文含大纲：左侧大纲（仅 md） */}
            {showToc && (
              <div className={`${S}-toc${tocCollapsed ? ` ${S}-tocCollapsed` : ""}`}>
                {tocCollapsed ? (
                  <button
                    type="button"
                    className={`${S}-tocCollapseBtn`}
                    title={T?.("pl.preview.showOutline") ?? "展开大纲"}
                    onClick={() => setTocCollapsed(false)}
                  >
                    ❯
                  </button>
                ) : (
                  <>
                    <div className={`${S}-tocHead`}>
                      {T?.("pl.preview.outline") ?? "大纲"}
                      <button
                        type="button"
                        className={`${S}-tocCollapseBtn`}
                        title={T?.("pl.preview.hideOutline") ?? "收起大纲"}
                        onClick={() => setTocCollapsed(true)}
                      >
                        ❮
                      </button>
                    </div>
                    <div className={`${S}-tocList`}>
                      {outline.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`${S}-tocItem ${item.id === activeId ? "active" : ""}`}
                          style={{ paddingLeft: 8 + (item.level - 1) * 12 }}
                          onClick={() => scrollTo(item.id)}
                        >
                          {item.text}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 正文渲染：按类型 */}
            {activePath && content !== null && activeFile ? (
              editing ? (
                <div className={`${S}-editorBody`} ref={bodyRef}>
                  <textarea
                    className={`${S}-editorTextarea`}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              ) : activeFile.type === "md" ? (
                <div className={`${S}-mdBody`} ref={bodyRef} onScroll={onBodyScroll}>
                  {truncHint}
                  {parsed.body}
                </div>
              ) : activeFile.type === "json" ? (
                jsonError ? (
                  <div className={`${S}-empty`}>
                    {T?.("pl.preview.jsonError") ?? "JSON 解析失败，请检查文件内容"}
                  </div>
                ) : (
                  <div className={`${S}-jBody`}>
                    <JsonTree value={jsonValue} />
                  </div>
                )
              ) : activeFile.type === "csv" ? (
                <CsvTable rows={parseCsv(content)} />
              ) : activeFile.type === "ts" || activeFile.type === "js" || activeFile.type === "py" ||
                  activeFile.type === "go" || activeFile.type === "rs" || activeFile.type === "java" ||
                  activeFile.type === "c" || activeFile.type === "cpp" ? (
                <div className={`${S}-codeBody`}>
                  <CodeHighlight code={content} language={PRISM_LANG_MAP[activeFile.type]} />
                </div>
              ) : activeFile.type === "yml" || activeFile.type === "yaml" || activeFile.type === "toml" ||
                  activeFile.type === "xml" ? (
                <div className={`${S}-codeBody`}>
                  <CodeHighlight code={content} language={PRISM_LANG_MAP[activeFile.type]} />
                </div>
              ) : activeFile.type === "log" ? (
                <div className={`${S}-logBody`}>
                  {truncHint}
                  <pre>{content}</pre>
                </div>
              ) : activeFile.type === "png" || activeFile.type === "jpg" || activeFile.type === "jpeg" ||
                  activeFile.type === "gif" || activeFile.type === "svg" ? (
                <div className={`${S}-imgBody`}>
                  <img
                    src={`data:image/${activeFile.type === "jpg" ? "jpeg" : activeFile.type};base64,${content}`}
                    alt={activeFile.name}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  {truncHint}
                  <pre className={`${S}-txtBody`}>{content}</pre>
                </div>
              )
            ) : (
              <div className={`${S}-empty`}>
                {!dir
                  ? (T?.("pl.preview.noSession") ?? "暂无会话所属文件夹")
                  : fileEntries.length === 0
                    ? (
                        <>
                          <span>{T?.("pl.preview.noFiles") ?? "当前目录没有可预览文件"}</span>
                          <span className={`${S}-emptyNote`}>{dir}</span>
                        </>
                      )
                    : activeFile
                      ? (T?.("pl.preview.loading") ?? "加载中…")
                      : (T?.("pl.preview.noSession") ?? "暂无会话所属文件夹")}
              </div>
            )}
          </div>
        </div>
        {/* 浏览式目录选择弹窗：预览「打开文件夹」在桌面端（无原生选择器）时的回退选择方案 */}
        <DirectoryPickerModal
          open={dirPickerOpen}
          initialPath={dir || undefined}
          onPick={(d) => {
            setDirPickerOpen(false);
            setManualDir(d);
          }}
          onClose={() => setDirPickerOpen(false)}
          t={T}
        />
        
        {/* 右键菜单（用 portal 挂到 body，避免祖先 transform 破坏 fixed 定位） */}
        {ctxMenu &&
          createPortal(
            <>
              <div
                className={`${S}-ctxOverlay`}
                onMouseDown={closeMenu}
                onContextMenu={(e) => {
                  e.preventDefault();
                  closeMenu();
                }}
              />
              <div
                className={`${S}-ctxMenu`}
                style={{
                  left: Math.min(ctxMenu.x, window.innerWidth - 190),
                  top: Math.min(ctxMenu.y, window.innerHeight - 80),
                  // 统一面板底色 + 在本浮层内就地声明主题变量，保证 portal 子树昼夜一致
                  background: TONE.panel,
                  borderColor: TONE.border,
                  color: TONE.text,
                  ["--dsw-alias-bg-layer-1" as any]: TONE.panel,
                  ["--dsw-alias-border-l2" as any]: TONE.border,
                  ["--dsw-alias-label-primary" as any]: TONE.text,
                  ["--dsw-alias-label-secondary" as any]: TONE.muted,
                  ["--dsw-alias-label-tertiary" as any]: TONE.quiet,
                  ["--dsw-alias-interactive-bg-hover" as any]:
                    "color-mix(in srgb, currentColor 12%, transparent)",
                } as React.CSSProperties}
              >
                {ctxMenu.target.name && (
                  <div className={`${S}-ctxTitle`}>{ctxMenu.target.name}</div>
                )}
                {ctxMenu.target.kind === "file" && (
                  <>
                    <button
                      type="button"
                      className={`${S}-ctxItem`}
                      onClick={actEdit}
                      disabled={
                        ctxMenu.target.kind === "file" &&
                        activePath === ctxMenu.target.absPath &&
                        !!truncated
                      }
                      title={
                        ctxMenu.target.kind === "file" &&
                        activePath === ctxMenu.target.absPath &&
                        !!truncated
                          ? T("pl.preview.editForbiddenTruncated")
                          : undefined
                      }
                      style={
                        ctxMenu.target.kind === "file" &&
                        activePath === ctxMenu.target.absPath &&
                        !!truncated
                          ? { color: "var(--dsw-alias-label-tertiary)", opacity: .5, cursor: "not-allowed" }
                          : undefined
                      }
                    >
                      <span className={`${S}-ctxIcon`}>✏️</span>{T("pl.preview.ctx.edit")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actExport()}>
                      <span className={`${S}-ctxIcon`}>📤</span>{T("pl.preview.ctx.export")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actCopy("abs")}>
                      <span className={`${S}-ctxIcon`}>🔗</span>{T("pl.preview.ctx.copyAbs")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actCopy("rel")}>
                      <span className={`${S}-ctxIcon`}>📂</span>{T("pl.preview.ctx.copyRel")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actCopy("name")}>
                      <span className={`${S}-ctxIcon`}>📄</span>{T("pl.preview.ctx.copyName")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={() => readAndCopy(false)}>
                      <span className={`${S}-ctxIcon`}>📋</span>{T("pl.preview.ctx.copyContent")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => readAndCopy(true)}>
                      <span className={`${S}-ctxIcon`}>🧩</span>{T("pl.preview.ctx.copyFence")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actCopy("link")}>
                      <span className={`${S}-ctxIcon`}>🔎</span>{T("pl.preview.ctx.copyLink")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={actRename}>
                      <span className={`${S}-ctxIcon`}>✏️</span>{T("pl.preview.ctx.rename")}
                    </button>
                    <button type="button" className={`${S}-ctxItem danger`} onClick={actDelete}>
                      <span className={`${S}-ctxIcon`}>🗑️</span>{T("pl.preview.ctx.delete")}
                    </button>
                  </>
                )}
                {ctxMenu.target.kind === "dir" && (
                  <>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actExport()}>
                      <span className={`${S}-ctxIcon`}>📤</span>{T("pl.preview.ctx.export")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button
                      type="button"
                      className={`${S}-ctxItem`}
                      onClick={() => openNewFileDialog(ctxMenu.target.absPath)}
                    >
                      <span className={`${S}-ctxIcon`}>📄</span>{T("pl.preview.ctx.newFile")}
                    </button>
                    <button
                      type="button"
                      className={`${S}-ctxItem`}
                      onClick={() => openNewDirDialog(ctxMenu.target.absPath)}
                    >
                      <span className={`${S}-ctxIcon`}>📁</span>{T("pl.preview.ctx.newDir")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actCopy("abs")}>
                      <span className={`${S}-ctxIcon`}>🔗</span>{T("pl.preview.ctx.copyAbs")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actCopy("rel")}>
                      <span className={`${S}-ctxIcon`}>📂</span>{T("pl.preview.ctx.copyRel")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={actExpandAll}>
                      <span className={`${S}-ctxIcon`}>⤵</span>{T("pl.preview.ctx.expandAll")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={actCollapseAll}>
                      <span className={`${S}-ctxIcon`}>⤴</span>{T("pl.preview.ctx.collapseAll")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={actRefresh}>
                      <span className={`${S}-ctxIcon`}>🔄</span>{T("pl.preview.refresh")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={actRename}>
                      <span className={`${S}-ctxIcon`}>✏️</span>{T("pl.preview.ctx.rename")}
                    </button>
                    <button type="button" className={`${S}-ctxItem danger`} onClick={actDelete}>
                      <span className={`${S}-ctxIcon`}>🗑️</span>{T("pl.preview.ctx.deleteDir")}
                    </button>
                  </>
                )}
                {ctxMenu.target.kind === "blank" && (
                  <>
                    <button
                      type="button"
                      className={`${S}-ctxItem`}
                      onClick={() => openNewFileDialog(ctxMenu.target.absPath)}
                    >
                      <span className={`${S}-ctxIcon`}>📄</span>{T("pl.preview.ctx.newFile")}
                    </button>
                    <button
                      type="button"
                      className={`${S}-ctxItem`}
                      onClick={() => openNewDirDialog(ctxMenu.target.absPath)}
                    >
                      <span className={`${S}-ctxIcon`}>📁</span>{T("pl.preview.ctx.newDir")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={actExpandAll}>
                      <span className={`${S}-ctxIcon`}>⤵</span>{T("pl.preview.ctx.expandAll")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={actCollapseAll}>
                      <span className={`${S}-ctxIcon`}>⤴</span>{T("pl.preview.ctx.collapseAll")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={actRefresh}>
                      <span className={`${S}-ctxIcon`}>🔄</span>{T("pl.preview.refresh")}
                    </button>
                  </>
                )}
              </div>
            </>,
            document.body,
          )}

        {/* 名称输入弹窗（重命名 / 新建文件 / 新建目录） */}
        {nameDialog &&
          createPortal(
            <div className={`${S}-dialogOverlay`} onMouseDown={() => (modalBusy ? undefined : setNameDialog(null))}>
              <div className={`${S}-dialog`} onMouseDown={(e) => e.stopPropagation()}>
                <div className={`${S}-dialogTitle`}>{nameDialog.title}</div>
                <div className={`${S}-dialogMsg`} style={{ marginBottom: 8 }}>
                  {nameDialog.label}
                </div>
                <input
                  className={`${S}-dialogInput`}
                  autoFocus
                  value={nameInput}
                  placeholder={nameDialog.placeholder}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (dialogErr) setDialogErr("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !modalBusy) submitNameDialog();
                    if (e.key === "Escape" && !modalBusy) setNameDialog(null);
                  }}
                />
                {dialogErr && (
                  <div className={`${S}-dialogMsg`} style={{ color: "#ef4444", marginTop: -8 }}>
                    {dialogErr}
                  </div>
                )}
                <div className={`${S}-dialogBtns`}>
                  <button
                    type="button"
                    className={`${S}-dialogBtn`}
                    disabled={modalBusy}
                    onClick={() => setNameDialog(null)}
                  >
                    {T("pl.preview.cancel")}
                  </button>
                  <button
                    type="button"
                    className={`${S}-dialogBtn primary`}
                    disabled={modalBusy}
                    onClick={() => submitNameDialog()}
                  >
                    {nameDialog.okText}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* 危险确认弹窗（删除） */}
        {confirmDialog &&
          createPortal(
            <div
              className={`${S}-dialogOverlay`}
              onMouseDown={() => (modalBusy ? undefined : setConfirmDialog(null))}
            >
              <div className={`${S}-dialog`} onMouseDown={(e) => e.stopPropagation()}>
                <div className={`${S}-dialogTitle`}>{confirmDialog.title}</div>
                <div className={`${S}-dialogMsg`}>{confirmDialog.message}</div>
                <div className={`${S}-dialogBtns`}>
                  <button
                    type="button"
                    className={`${S}-dialogBtn`}
                    disabled={modalBusy}
                    onClick={() => setConfirmDialog(null)}
                  >
                    {T("pl.preview.cancel")}
                  </button>
                  <button
                    type="button"
                    className={`${S}-dialogBtn danger`}
                    disabled={modalBusy}
                    onClick={async () => {
                      const onOk = confirmDialog.onOk;
                      setModalBusy(true);
                      await onOk();
                      setModalBusy(false);
                      setConfirmDialog(null);
                    }}
                  >
                    {confirmDialog.okText}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* Toast 提示 */}
        {toast && (
          <div className={`${S}-toast ${toast.type}`}>
            {toast.type === "success" ? "✓" : "✗"} {toast.message}
          </div>
        )}

        {zipExport &&
          createPortal(
            <div
              className={`${S}-zipOverlay`}
              onMouseDown={() => (zipBusy ? undefined : setZipExport(null))}
            >
              <div
                className={`${S}-zipPanel`}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className={`${S}-zipHead`}>
                  <div className={`${S}-zipTitle`}>{zipExport.title}</div>
                  <button
                    type="button"
                    className={`${S}-zipClose`}
                    disabled={zipBusy}
                    onClick={() => setZipExport(null)}
                    title={T("pl.preview.cancel")}
                  >
                    ✕
                  </button>
                </div>
                <div className={`${S}-zipActions`}>
                  <button type="button" className={`${S}-zipAction`} onClick={toggleZipAll}>
                    {zipSel.size === zipExport.entries.length
                      ? T("pl.preview.zip.unselectAll")
                      : T("pl.preview.zip.selectAll")}
                  </button>
                  <span className={`${S}-zipCounter`}>
                    {T("pl.preview.zip.selected", {
                      n: String(zipSel.size),
                      total: String(zipExport.entries.length),
                    })}
                  </span>
                </div>
                <div className={`${S}-zipList`}>
                  {zipExport.entries.map((e) => (
                    <label
                      key={e.rel}
                      className={`${S}-zipItem ${zipSel.has(e.rel) ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={zipSel.has(e.rel)}
                        disabled={zipBusy}
                        onChange={() => toggleZipFile(e.rel)}
                      />
                      <span className={`${S}-zipIcon`}>{fileIconOf(e.type)}</span>
                      <span className={`${S}-zipName`} title={e.rel}>
                        {e.rel}
                      </span>
                      {e.size > 0 && (
                        <span className={`${S}-zipSize`}>{formatZipSize(e.size)}</span>
                      )}
                    </label>
                  ))}
                </div>
                <div className={`${S}-zipFoot`}>
                  {zipProgress && (
                    <div className={`${S}-zipProgress`}>
                      <div className={`${S}-zipBar`}>
                        <div
                          className={`${S}-zipFill`}
                          style={{ width: `${(zipProgress.current / zipProgress.total) * 100}%` }}
                        />
                      </div>
                      <span className={`${S}-zipPct`}>
                        {zipProgress.current}/{zipProgress.total}
                      </span>
                    </div>
                  )}
                  <div className={`${S}-zipBtns`}>
                    <button
                      type="button"
                      className={`${S}-zipBtn`}
                      disabled={zipBusy}
                      onClick={() => setZipExport(null)}
                    >
                      {T("pl.preview.cancel")}
                    </button>
                    <button
                      type="button"
                      className={`${S}-zipBtn primary`}
                      disabled={zipSel.size === 0 || zipBusy}
                      onClick={runZipExport}
                    >
                      {zipBusy
                        ? T("pl.preview.zip.exporting")
                        : T("pl.preview.zip.export", {
                            n: String(zipSel.size),
                          })}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
