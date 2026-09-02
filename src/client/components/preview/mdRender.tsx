/**
 * Markdown 轻量渲染引擎。
 * 从 PreviewView 拆出：解析 md 正文为 ReactNode + 标题大纲，供预览面板正文与大纲面板使用。
 */
import type { ReactNode } from "react";
import { S, type OutlineItem } from "./previewShared.js";

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
export function renderMd(text: string): { outline: OutlineItem[]; body: ReactNode[] } {
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
    // ATX 标题：单次 match 判空，避免守卫正则与捕获正则不一致时 mm 为 null 崩溃
    const atx = ln.match(/^\s*(#+)\s+(.*)$/);
    if (atx) {
      pushHeading(Math.min(atx[1].length, 6), atx[2].trim());
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
