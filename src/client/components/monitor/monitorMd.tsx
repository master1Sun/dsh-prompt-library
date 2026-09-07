/**
 * 会话监控面板的详情富文本渲染。
 * 从 TokenMonitorView 拆出：JSON 字符串转义与高亮、内联 Markdown、
 * 列表/表格/代码块块级渲染、可折叠 JSON 树与 RichText 正文组件。
 */
import { useState, type ReactNode } from "react";
import { S } from "./monitorShared.js";

/** 生成 JSON 字符串字面量：转义内部引号/反斜杠/控制字符，避免复杂 JSON 结构被破坏；
 *  真实换行（\n / \r）保留原样，由调用方用 pre-wrap 保持多行可读性。 */
export function escapeJsonString(value: string): string {
  let out = '"';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n" || ch === "\r") out += ch; // 保留真实换行
    else if (ch === "\t") out += "\\t";
    else if (ch === "\b") out += "\\b";
    else if (ch === "\f") out += "\\f";
    else if (ch.charCodeAt(0) < 0x20)
      out += `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`;
    else out += ch;
  }
  return out + '"';
}

/** 高亮 JSON 字符串：格式化缩进 + 按 key/string/number/boolean/null 上色。 */
export function highlightJsonText(raw: string) {
  let pretty = raw;
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    // 非合法 JSON，原样展示
  }
  const re =
    /("(?:\\[^]|[^"\\])*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],:]|\s+)/g;
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  let last = 0;
  let keySeq = 0;
  while ((m = re.exec(pretty))) {
    if (m.index > last) out.push(pretty.slice(last, m.index));
    let cls = "jplain";
    if (m[1] !== undefined) cls = m[2] !== undefined ? "jkey" : "jstr";
    else if (m[3] !== undefined) cls = "jnum";
    else if (m[4] !== undefined) cls = m[4] === "null" ? "jnull" : "jbool";
    else cls = "jplain";
    if (cls !== "jplain" && m[0]) {
      out.push(
        <span key={keySeq++} className={`${S}-${cls}`}>
          {m[0]}
        </span>,
      );
    } else {
      out.push(m[0]);
    }
    last = re.lastIndex;
    i += 1;
  }
  if (last < pretty.length) out.push(pretty.slice(last));
  return out.length ? out : pretty;
}

/** 内联标记解析：`code`、**粗体**、*斜体*、~~删除线~~、==高亮==、[链接](url)、![图片](url)、自动 URL。 */
export function inlineMd(text: string, keySeq: { n: number }) {
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
      if (im)
        out.push(<img key={k()} className={`${S}-mdImg`} src={im[2]} alt={im[1]} loading="lazy" />);
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
export function tableCells(ln: string): string[] | null {
  const t = ln.trim();
  if (!(t.startsWith("|") && t.endsWith("|"))) return null;
  return t
    .slice(1, -1)
    .split("|")
    .map((s) => s.trim());
}

/** 判断是否为表头分隔行（如 `|---|---|`、`|:---|:---:|`）。 */
export function isTableSep(cells: string[] | null): cells is string[] {
  return !!cells && cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

/** 判断是否为列表行（无序 `-`/有序 `1.`/任务 `- [x]`）。 */
export function isListLine(s: string): boolean {
  return /^\s*(?:[-*+]|(?:\d+[.)]))\s+/.test(s);
}

/** 解析连续列表行（含缩进）为嵌套列表，支持任务清单 checkbox。 */
export function renderListTree(raw: string[], keySeq: { n: number }): ReactNode {
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
    if (task) parsed.push({ depth: indent(task[1]), ordered: false, task: true, checked: task[2].toLowerCase() === "x", text: task[3] });
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

/** 块级 Markdown 轻渲染（覆盖 txt 的重点高亮需求）。 */
export function mdBlocks(text: string) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  const keySeq = { n: 0 };
  let i = 0;
  const heading = (lv: number, children: ReactNode[]) => {
    if (lv === 1) return <h1 key={keySeq.n++}>{children}</h1>;
    if (lv === 2) return <h2 key={keySeq.n++}>{children}</h2>;
    if (lv === 3) return <h3 key={keySeq.n++}>{children}</h3>;
    if (lv === 4) return <h4 key={keySeq.n++}>{children}</h4>;
    if (lv === 5) return <h5 key={keySeq.n++}>{children}</h5>;
    return <h6 key={keySeq.n++}>{children}</h6>;
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
    // setext 式标题：下一行为 `===` 或 `---`；标号越深使用越小的标题字号
    const setext = /^(=+|-+)\s*$/.exec(lines[i + 1] ?? "");
    if (setext && ln.trim() !== "" && !tableCells(ln) && !isListLine(ln)) {
      const lv = setext[1][0] === "=" ? 1 : 2;
      out.push(heading(lv, inlineMd(ln.trim(), keySeq)));
      i += 2;
      continue;
    }
    const atx = ln.match(/^\s*(#+)\s+(.*)$/);
    if (atx) {
      const lv = Math.min(atx[1].length, 6);
      out.push(heading(lv, inlineMd(atx[2], keySeq)));
      i += 1;
      continue;
    }
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
    if (/^\s*>/.test(ln)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      out.push(<blockquote key={keySeq.n++}>{inlineMd(buf.join(" "), keySeq)}</blockquote>);
      continue;
    }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(ln)) {
      out.push(<hr key={keySeq.n++} />);
      i += 1;
      continue;
    }
    if (ln.trim() === "") {
      i += 1;
      continue;
    }
    const para: string[] = [];
    const blockStart = /^\s*(#+|\s*([-*+]|\d+[.)])\s+|>|```|(---+|\*\*\*+)\s*$)/;
    while (i < lines.length && lines[i].trim() !== "" && !blockStart.test(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    out.push(<p key={keySeq.n++}>{inlineMd(para.join(" "), keySeq)}</p>);
  }
  return out;
}

/** 可折叠 JSON 节点：对象/数组可展开折叠，标量直接着色显示（统一主题配色）。 */
function JsonTreeNode({
  name,
  value,
  depth,
  isArrayIndex,
}: {
  name?: string;
  value: unknown;
  depth: number;
  isArrayIndex?: boolean;
}): ReactNode {
  const [open, setOpen] = useState(true);
  const pad = depth * 14;
  const isObj = value !== null && typeof value === "object";
  // 字符串内嵌 JSON（对象/数组）：展开为可折叠子树而非纯字符串
  if (typeof value === "string" && value.length <= 200000) {
    let nested: unknown;
    let nestedOk = false;
    try {
      const parsed = JSON.parse(value);
      if (parsed !== null && typeof parsed === "object") {
        nested = parsed;
        nestedOk = true;
      }
    } catch {
      nestedOk = false;
    }
    if (nestedOk) {
      return (
        <JsonTreeNode name={name} value={nested} depth={depth} isArrayIndex={isArrayIndex} />
      );
    }
  }
  // 标量节点：无折叠，直接展示键与着色值
  if (!isObj) {
    let cls = `${S}-jstr`;
    let text: string;
    if (value === null) {
      cls = `${S}-jnull`;
      text = "null";
    } else if (typeof value === "string") {
      // 字符串值统一带引号（保持 JSON 语义），转义内部引号/反斜杠等避免破坏复杂 JSON 结构；
      // 真实换行保留原样，由下方 span 用 pre-wrap 展示多行可读性
      text = escapeJsonString(value);
    } else if (typeof value === "number") {
      cls = `${S}-jnum`;
      text = String(value);
    } else if (typeof value === "boolean") {
      cls = `${S}-jbool`;
      text = String(value);
    } else {
      text = String(value);
    }
    return (
      <div className={`${S}-tn`} style={{ paddingLeft: pad }}>
        {name !== undefined && (
          <span className={isArrayIndex ? `${S}-jidx` : `${S}-tk`}>{name}</span>
        )}
        <span
          className={cls}
          style={typeof value === "string" && /[\r\n]/.test(value) ? { whiteSpace: "pre-wrap" } : undefined}
        >
          {text}
        </span>
      </div>
    );
  }
  const isArr = Array.isArray(value);
  const entries: Array<[string, unknown]> = isArr
    ? value.map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);
  const empty = entries.length === 0;
  return (
    <div className={`${S}-tn`}>
      <div
        className={`${S}-tbranch`}
        style={{ paddingLeft: pad }}
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
      >
        <span className={`${S}-carat`}>{empty ? "" : open ? "▾" : "▸"}</span>
        {name !== undefined && (
          <span className={isArrayIndex ? `${S}-jidx` : `${S}-tk`}>{name}</span>
        )}
        <span className={`${S}-hint`}>{isArr ? `Array(${entries.length})` : "Object"}</span>
      </div>
      {open &&
        entries.map(([k, v], i) => (
          <JsonTreeNode key={i} name={k} isArrayIndex={isArr} value={v} depth={depth + 1} />
        ))}
    </div>
  );
}

/** 可折叠 JSON 树入口（替代原多层级表格视图）。 */
export function JsonTree({ value }: { value: unknown }) {
  return (
    <div className={`${S}-tree`}>
      <JsonTreeNode value={value} depth={0} />
    </div>
  );
}

/** 详情正文富文本渲染：json 直接渲染高亮原生 JSON；text 按 markdown（含 ==重点== 高亮）渲染。 */
export function RichText({
  lang,
  content,
}: {
  lang: "text" | "json";
  content: string;
}) {
  if (lang !== "json") {
    return <div className={`${S}-md`}>{mdBlocks(content)}</div>;
  }
  return <pre className={`${S}-detailPre ${S}-json`}>{highlightJsonText(content)}</pre>;
}
