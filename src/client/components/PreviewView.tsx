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
 * 未注入时回退到后端诊断端点 `diagSession()` 轮询（最近活跃会话，与会话监控同口径）；
 * 文件列表通过后端 `preview/list`（后端解析会话工作目录并递归扫描）、内容经 `preview/read` 读取。
 * 头部提供「打开文件夹」按钮：调用宿主原生目录选择器手动指定目录，直接以该目录为根预览
 * （手动模式覆盖会话派生目录，且不随会话切换改变），再次点击可更换目录。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ConversationSnapshot } from "@deepseek-ai/dsh-client-runtime/client";
import type { PLTranslate } from "../utils/i18n.js";
import {
  diagSession,
  listPreviewFiles,
  listPreviewFilesByDir,
  readPreviewFile,
  type PreviewFileEntry,
  type PreviewFileType,
} from "../utils/api.js";
import { isDirectoryBrowserAvailable, isDirectoryPickerAvailable, pickExportDirectory } from "../utils/workspace-picker.js";
import { DirectoryPickerModal } from "./DirectoryPickerModal.js";
// 聊天结果「产物文件」卡片跳转预览面板的目标路径信号
import { consumePendingPreviewPath, PREVIEW_OPEN_EVENT_NAME } from "../utils/preview-target.js";

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

/** 按类型分组后的组结构。 */
interface TypeGroup {
  type: PreviewFileType;
  label: string;
  nodes: FileTreeNode[];
}

/** 样式作用域前缀，避免与宿主类名冲突。 */
const S = "pl-pv";

/** 各类型的徽标文本与主题色。 */
const TYPE_META: Record<PreviewFileType, { label: string; color: string }> = {
  md: { label: "md", color: "#60a5fa" },
  json: { label: "json", color: "#f59e0b" },
  txt: { label: "txt", color: "#94a3b8" },
  csv: { label: "csv", color: "#34d399" },
};

/** 各类型分组标题的 i18n 键。 */
const GROUP_LABEL_KEY: Record<PreviewFileType, string> = {
  md: "pl.preview.group.md",
  json: "pl.preview.group.json",
  txt: "pl.preview.group.txt",
  csv: "pl.preview.group.csv",
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
    const id = anchorId(rawText, used);
    outline.push({ id, level: lv, text: rawText });
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

/** 把扁平文件列表组装成嵌套树（目录优先、按名排序；目录节点 path 为相对路径）。 */
function buildTree(files: PreviewFileEntry[]): FileTreeNode[] {
  const root: FileTreeNode = { name: "", children: [] };
  for (const f of files) {
    const parts = f.name.split("/");
    let node = root;
    let dirPath = "";
    for (let i = 0; i < parts.length - 1; i++) {
      dirPath = dirPath ? `${dirPath}/${parts[i]}` : parts[i];
      let child = node.children?.find((c) => c.path === dirPath);
      if (!child) {
        child = { name: parts[i], path: dirPath, children: [] };
        node.children!.push(child);
      }
      node = child;
    }
    node.children!.push({ name: parts[parts.length - 1], path: f.path, type: f.type, size: f.size });
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
}

function TreeNodes({ nodes, depth, collapsed, onToggle, activePath, onSelect }: TreeProps): ReactNode {
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
  // 翻译座位；宿主未注入时回退为直接返回 key，保证子弹窗（浏览式目录选择）语言不缺失
  const T: PLTranslate = props?.t ?? ((k: string): string => k);

  // 当前会话 id：优先取宿主注入的 useSession（当前被查看的会话，切换会话无论是否运行都即时跟随），
  // 未注入或取不到时回退到后端诊断端点轮询（最近活跃会话）。后端再据此解析会话所属文件夹。
  const useSession = props?.useSession;
  const viewedSessionId =
    typeof useSession === "function" ? (useSession((s) => s.sessionId) ?? "") : "";
  const [diagSessid, setDiagSessid] = useState<string>("");
  const sessid = viewedSessionId || diagSessid;

  // 解析出的会话所属文件夹（后端返回的根目录，用于头部展示）
  const [dir, setDir] = useState<string>("");
  // 手动选择的预览目录（「打开文件夹」选择后覆盖会话派生目录；null 表示跟随会话）
  const [manualDir, setManualDir] = useState<string | null>(null);
  // 浏览式目录选择弹窗（桌面端原生选择器不可用时的回退选择方案）
  const [dirPickerOpen, setDirPickerOpen] = useState(false);
  // 所属文件夹下可预览文件列表
  const [files, setFiles] = useState<PreviewFileEntry[]>([]);
  // 当前选中的文件绝对路径
  const [activePath, setActivePath] = useState<string | null>(null);
  // 当前文件正文
  const [content, setContent] = useState<string | null>(null);
  // 大纲当前高亮项
  const [activeId, setActiveId] = useState<string>("");
  // 已折叠的目录相对路径集合（默认全部展开）
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
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

  // 回退源：轮询后端诊断端点的最近活跃会话 id（useSession 不可用时兜底）
  useEffect(() => {
    let alive = true;
    const load = () =>
      diagSession()
        .then((d) => {
          if (!alive) return;
          const next = d.sessid || "";
          setDiagSessid((prev) => (prev === next ? prev : next));
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
  }, []);

  // 会话/手动目录变化 → 重新列出文件，保持当前选中（仍存在）或回落第一个。
  // 手动选择的目录优先于会话派生目录（用户显式指定，不随会话切换而改变）。
  useEffect(() => {
    if (!sessid && !manualDir) {
      setDir("");
      setFiles([]);
      setActivePath(null);
      setCollapsed(new Set());
      return;
    }
    let alive = true;
    const load = manualDir ? listPreviewFilesByDir(manualDir) : listPreviewFiles(sessid);
    load
      .then(({ dir: root, files: list }) => {
        if (!alive) return;
        setDir(root);
        setFiles(list);
        setCollapsed(new Set());
        setActivePath((prev) =>
          prev && list.some((f) => f.path === prev) ? prev : (list[0]?.path ?? null),
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
  }, [sessid, manualDir]);

  // 选中文件变化 → 加载正文
  useEffect(() => {
    if (!activePath) {
      setContent(null);
      return;
    }
    let alive = true;
    readPreviewFile(activePath)
      .then((d) => {
        if (alive) {
          setContent(d.content);
          setActiveId("");
        }
      })
      .catch(() => {
        if (alive) setContent(null);
      });
    return () => {
      alive = false;
    };
  }, [activePath]);

  // 解析 md 正文：大纲 + 渲染节点
  const parsed = useMemo(() => (content ? renderMd(content) : { outline: [], body: [] }), [content]);
  const outline = parsed.outline;

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

  // 按类型分组 + 构建树
  const groups = useMemo<TypeGroup[]>(() => {
    const order: PreviewFileType[] = ["md", "json", "txt", "csv"];
    const byType = new Map<PreviewFileType, PreviewFileEntry[]>();
    for (const f of files) {
      const arr = byType.get(f.type);
      if (arr) arr.push(f);
      else byType.set(f.type, [f]);
    }
    const out: TypeGroup[] = [];
    for (const t of order) {
      const list = byType.get(t);
      if (list && list.length > 0) {
        out.push({ type: t, label: T?.(GROUP_LABEL_KEY[t]) ?? TYPE_META[t].label, nodes: buildTree(list) });
      }
    }
    return out;
  }, [files, T]);

  const showFiles = files.length > 1;
  const showToc = activeFile?.type === "md" && outline.length > 0;

  // 手动刷新：重列文件 + 重载当前正文（跟随会话或手动目录）
  const refresh = () => {
    if (!sessid && !manualDir) return;
    const load = manualDir ? listPreviewFilesByDir(manualDir) : listPreviewFiles(sessid);
    load
      .then(({ dir: root, files: list }) => {
        setDir(root);
        setFiles(list);
        setCollapsed(new Set());
        setActivePath((prev) =>
          prev && list.some((f) => f.path === prev) ? prev : (list[0]?.path ?? null),
        );
      })
      .catch(() => {});
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
        .${S}-openFolder{flex:none;display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 11px;border:0;border-radius:13px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1;cursor:pointer;white-space:nowrap;transition:background-color .24s,color .24s}
        .${S}-openFolder:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-openFolder.active{color:var(--dsw-static-blue-450);background:color-mix(in srgb,var(--dsw-static-blue-450) 14%,transparent)}
        .${S}-body{flex:1;min-height:0;display:flex;flex-direction:row;align-items:stretch;overflow:hidden}
        .${S}-files{flex:none;width:220px;min-width:170px;box-sizing:border-box;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;overflow:hidden}
        .${S}-filesHead{flex:none;padding:8px 12px 6px;font-size:11px;color:var(--dsw-alias-label-tertiary);font-weight:600}
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
        .${S}-toc{flex:none;width:200px;min-width:160px;box-sizing:border-box;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;overflow:hidden}
        .${S}-tocHead{flex:none;padding:8px 12px 6px;font-size:11px;color:var(--dsw-alias-label-tertiary);font-weight:600}
        .${S}-tocList{flex:1;min-height:0;overflow-y:auto;padding:0 8px 8px;display:flex;flex-direction:column;gap:1px}
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
        .${S}-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;flex:1;min-height:0;color:var(--dsw-alias-label-tertiary);font-size:12.5px;padding:24px;text-align:center}
        .${S}-emptyNote{font-size:11px;opacity:.85}
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
          {files.length > 0 && (
            <span className={`${S}-count`}>{files.length}</span>
          )}
          <button type="button" className={`${S}-refresh`} title={T?.("pl.preview.refresh") ?? "刷新"} onClick={refresh}>
            ⟳
          </button>
        </div>

        <div className={`${S}-body`}>
          {/* 多个文件：左侧按类型分组 + 树形节点 */}
          {showFiles && (
            <div className={`${S}-files`}>
              <div className={`${S}-filesHead`}>
                {T?.("pl.preview.files") ?? "文件"} · {files.length}
              </div>
              <div className={`${S}-fileList`}>
                {groups.map((g) => (
                  <div key={g.type} className={`${S}-group`}>
                    <div className={`${S}-groupHead`}>
                      <span className={`${S}-groupDot`} style={{ background: TYPE_META[g.type].color }} />
                      <span className={`${S}-groupLabel`}>{g.label}</span>
                      <span className={`${S}-groupCount`}>{g.nodes.length}</span>
                    </div>
                    <TreeNodes
                      nodes={g.nodes}
                      depth={0}
                      collapsed={collapsed}
                      onToggle={toggleDir}
                      activePath={activePath}
                      onSelect={(p) => setActivePath(p)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`${S}-content`}>
            {/* 正文含大纲：左侧大纲（仅 md） */}
            {showToc && (
              <div className={`${S}-toc`}>
                <div className={`${S}-tocHead`}>
                  {T?.("pl.preview.outline") ?? "大纲"}
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
              </div>
            )}

            {/* 正文渲染：按类型 */}
            {activePath && content !== null && activeFile ? (
              activeFile.type === "md" ? (
                <div className={`${S}-mdBody`} ref={bodyRef} onScroll={onBodyScroll}>
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
              ) : (
                <pre className={`${S}-txtBody`}>{content}</pre>
              )
            ) : (
              <div className={`${S}-empty`}>
                {!dir
                  ? (T?.("pl.preview.noSession") ?? "暂无会话所属文件夹")
                  : files.length === 0
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
      </div>
    </div>
  );
}
