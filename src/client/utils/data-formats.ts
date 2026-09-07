/**
 * 词库数据导入导出格式工具。
 *
 * 支持的通用格式（市面上常用）：
 * - JSON：本插件备份格式 { version, prompts }，或数组 / { skills | entries | data } 列表；
 * - CSV：标题行 + title,body,tags 列（支持引号包裹、逗号/换行/双引号转义）；
 * - Markdown：单文件（可选 YAML frontmatter 提供 title/tags，正文即 body）；
 * - 纯文本：单文件，标题取文件名，正文即全文。
 *
 * 导入时若正文包含 HTML 标签或 Markdown 标记，统一转换为纯文本（正常文章内容）。
 * 导出时把勾选的提示词序列化为所选格式供下载。
 */
import { mdToPlainText } from "../../md-text.js";

/** 支持导入导出的格式。 */
export type TransferFormat = "json" | "csv" | "md" | "txt";

/** 导入导出使用的提示词数据（简化结构）。 */
export interface TransferPrompt {
  title: string;
  body: string;
  tags?: string[];
  /** 摘要（AI 摘要），导出时一并写入、导入时回读，保证往返不丢字段。 */
  summary?: string;
  /** 来源格式（导入解析时标注，用于弹窗内来源徽标）。 */
  source?: TransferFormat;
}

/** 序列化结果：文件名 + 内容 + MIME 类型。 */
export interface SerializedFile {
  fileName: string;
  content: string;
  mime: string;
}

/** 取文件名的去扩展名部分（兼容 Windows / 类 Unix 路径）。 */
function baseName(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;
  return base.replace(/\.[^.]+$/, "");
}

/** 解析 JSON：支持本插件备份格式 / 数组 / skills / entries / data 列表；跳过无正文条目。 */
function parseJson(text: string): TransferPrompt[] {
  const raw = JSON.parse(text) as unknown;
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : undefined;
  const list = Array.isArray(raw)
    ? raw
    : obj
      ? (obj.prompts ?? obj.skills ?? obj.entries ?? obj.data)
      : undefined;
  if (!Array.isArray(list)) return [];
  const out: TransferPrompt[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    if (typeof it.body !== "string" || !it.body.trim()) continue;
    out.push({
      title: typeof it.title === "string" ? it.title.trim() : "",
      body: it.body,
      source: "json",
      ...(typeof it.summary === "string" && it.summary.trim()
        ? { summary: it.summary.trim() }
        : {}),
      ...(Array.isArray(it.tags)
        ? {
            tags: it.tags.filter(
              (t): t is string => typeof t === "string" && t.trim() !== "",
            ),
          }
        : {}),
    });
  }
  return out;
}

/** 解析 CSV 文本为二维数组（支持引号包裹与转义、字段内逗号/换行）。 */
function parseCsvRows(text: string): string[][] {
  // 去除 UTF-8 BOM，避免首个表头被 `\uFEFF` 前缀污染
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** 解析 CSV：首行为表头，识别 title/body/tags 列（含中文别名）；无表头时前两列按 title/body 处理。 */
function parseCsv(text: string): TransferPrompt[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  let ti = header.findIndex((h) => h === "title" || h === "标题");
  let bi = header.findIndex(
    (h) => h === "body" || h === "正文" || h === "内容" || h === "content" || h === "prompt",
  );
  const gi = header.findIndex((h) => h === "tags" || h === "标签" || h === "tag");
  const si = header.findIndex((h) => h === "summary" || h === "摘要");
  if (ti === -1 && bi === -1 && header.length >= 2) {
    ti = 0;
    bi = 1;
  }
  if (bi === -1) return [];
  const out: TransferPrompt[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]!;
    const body = (cells[bi] ?? "").trim();
    if (!body) continue;
    const title = ti >= 0 && ti < cells.length ? cells[ti]!.trim() : "";
    const tagsRaw = gi >= 0 && gi < cells.length ? cells[gi]! : "";
    const tags = tagsRaw
      .split(/[|,，;；]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const summary = si >= 0 && si < cells.length ? cells[si]!.trim() : "";
    out.push({
      title,
      body,
      tags: tags.length ? tags : undefined,
      ...(summary ? { summary } : {}),
      source: "csv",
    });
  }
  return out;
}

/** 从正文中提取「标签：…」字段行（导出格式写入的标签字段）：命中则返回标签列表并从正文移除该行。 */
function extractTagLine(body: string): { tags: string[]; body: string } {
  const m = body.match(/^标签\s*[:：]\s*(.+)$/m);
  if (m) {
    return {
      tags: m[1]!
        .split(/[、,，;；|]/)
        .map((s) => s.trim())
        .filter(Boolean),
      body: body.replace(m[0], "").trim(),
    };
  }
  return { tags: [], body };
}

/** 从正文中提取「摘要：…」字段行（导出格式写入的摘要字段）：命中则返回摘要文本并从正文移除该行。 */
function extractSummaryLine(body: string): { summary: string; body: string } {
  const m = body.match(/^摘要\s*[:：]\s*(.+)$/m);
  if (m) {
    return {
      summary: m[1]!.trim(),
      body: body.replace(m[0], "").trim(),
    };
  }
  return { summary: "", body };
}

/** 解析 Markdown：支持导出格式（多条记录以 `---` 分隔、每条以 `# 标题` 开头）与单文件（可选 YAML frontmatter 提供 title/tags，正文即 body；无 frontmatter 时标题取文件名）。 */
function parseMarkdown(fileName: string, text: string): TransferPrompt[] {
  text = text.trim();
  if (!text) return [];
  let title = baseName(fileName);
  let tags: string[] | undefined;
  let content = text;
  // 可选：整体 YAML frontmatter（旧单文件格式）
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      const fm = text.slice(3, end);
      content = text.slice(end + 4).trim();
      const titleMatch = fm.match(/^title\s*:\s*(.+)$/m);
      const tagsMatch = fm.match(/^tags\s*:\s*\[?([^\]]+)\]?$/m);
      if (titleMatch) title = titleMatch[1]!.trim();
      if (tagsMatch) {
        tags = tagsMatch[1]!
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      }
    }
  }
  if (!content) return [];
  // 按 `---` 分隔线拆块（导出格式每条以 `# 标题` 开头）
  const blocks = content
    .split(/^---+$/m)
    .map((b) => b.trim())
    .filter(Boolean);
  const out: TransferPrompt[] = [];
  for (const block of blocks) {
    // 仅当块首行为标题行时取为标题，避免正文中的 `#` 被误识别
    const heading = block.match(/^#{1,6}\s+(.+)/);
    let blockBody = heading ? block.slice(heading[0].length).trim() : block;
    // 提取「标签：…」字段行，作为标签而非留在正文内容里
    const tagLine = extractTagLine(blockBody);
    blockBody = tagLine.body;
    // 提取「摘要：…」字段行，作为摘要而非留在正文内容里
    const summaryLine = extractSummaryLine(blockBody);
    blockBody = summaryLine.body;
    const merged = [...(tags ?? []), ...tagLine.tags];
    out.push({
      title: (heading ? heading[1]!.trim() : "") || title,
      body: blockBody,
      tags: merged.length ? [...new Set(merged)] : undefined,
      ...(summaryLine.summary ? { summary: summaryLine.summary } : {}),
      source: "md",
    });
  }
  return out;
}

/** 解析纯文本：支持导出格式（多条记录以「【标题】」开头、分隔线隔开）与单文件（标题取文件名，正文即全文）。 */
function parseTxt(fileName: string, text: string): TransferPrompt[] {
  text = text.trim();
  if (!text) return [];
  // 按分隔线（一行的连续短横线）拆块，导出格式每条以「【标题】」开头
  const blocks = text
    .split(/^[-—=·]{10,}\s*$/m)
    .map((b) => b.trim())
    .filter(Boolean);
  const out: TransferPrompt[] = [];
  for (const block of blocks) {
    const m = block.match(/^【([^】]+)】/);
    let blockBody = m ? block.slice(m[0].length).trim() : block;
    // 提取「标签：…」字段行，作为标签而非留在正文内容里
    const tagLine = extractTagLine(blockBody);
    blockBody = tagLine.body;
    // 提取「摘要：…」字段行，作为摘要而非留在正文内容里
    const summaryLine = extractSummaryLine(blockBody);
    blockBody = summaryLine.body;
    out.push({
      title: (m ? m[1]!.trim() : "") || baseName(fileName),
      body: blockBody,
      tags: tagLine.tags.length ? [...new Set(tagLine.tags)] : undefined,
      ...(summaryLine.summary ? { summary: summaryLine.summary } : {}),
      source: "txt",
    });
  }
  return out;
}

/** 判断文本是否包含 HTML 标签。 */
function hasHtmlTags(s: string): boolean {
  return /<\/?[a-z][a-z0-9-]*[^>]*>/i.test(s);
}

/** 判断文本是否包含 Markdown 标记（标题 / 引用 / 列表 / 代码围栏 / 表格 / 行内标记）。 */
function hasMarkdown(s: string): boolean {
  return (
    /^\s*(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/m.test(s) ||
    /^\s*```/m.test(s) ||
    /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(s) ||
    /\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\[[^\]]+\]\([^)]*\)|!\[[^\]]*\]\([^)]*\)|`[^`]+`/.test(s)
  );
}

/** 解码常见 HTML 实体（在去除标签后处理，避免误删编码后出现的字面 < >）。 */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

/** 把 HTML / Markdown 格式的正文转换为纯文本；纯文本原样保留。 */
function normalizeBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed || (!hasHtmlTags(trimmed) && !hasMarkdown(trimmed))) return body;
  return decodeHtmlEntities(mdToPlainText(trimmed));
}

/** 根据文件扩展名解析导入内容为提示词条目列表（JSON / CSV / Markdown / 纯文本）。 */
export function parseImportFile(fileName: string, text: string): TransferPrompt[] {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  let entries: TransferPrompt[];
  if (ext === "json") entries = parseJson(text);
  else if (ext === "csv") entries = parseCsv(text);
  else if (ext === "md" || ext === "markdown") entries = parseMarkdown(fileName, text);
  else entries = parseTxt(fileName, text);
  // HTML / Markdown 格式的正文统一转换为纯文本
  for (const e of entries) e.body = normalizeBody(e.body);
  return entries;
}

/** CSV 单元格转义：含逗号/引号/换行时用双引号包裹并转义引号。 */
function csvEscape(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** 把勾选的提示词序列化为所选格式（含文件名与 MIME）。 */
export function serializeExport(
  format: TransferFormat,
  prompts: TransferPrompt[],
): SerializedFile {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const base = `prompt-library-${stamp}`;
  switch (format) {
    case "json":
      return {
        fileName: `${base}.json`,
        mime: "application/json",
        content: JSON.stringify(
          {
            version: 1,
            exportedAt: Date.now(),
            prompts: prompts.map((p) => ({
              title: p.title,
              body: p.body,
              tags: p.tags,
              ...(p.summary ? { summary: p.summary } : {}),
            })),
          },
          null,
          2,
        ),
      };
    case "csv": {
      const lines = ["title,body,tags,summary"];
      for (const p of prompts) {
        lines.push(
          `${csvEscape(p.title)},${csvEscape(p.body)},${csvEscape((p.tags ?? []).join("|"))},${csvEscape(p.summary ?? "")}`,
        );
      }
      // 前置 UTF-8 BOM（\uFEFF），避免 Excel 打开中文 CSV 时乱码
      return { fileName: `${base}.csv`, mime: "text/csv", content: "\uFEFF" + lines.join("\r\n") };
    }
    case "md": {
      const parts: string[] = [];
      for (const p of prompts) {
        const tagsLine = p.tags && p.tags.length ? `\n\n标签：${p.tags.join("、")}` : "";
        const summaryLine = p.summary?.trim() ? `\n\n摘要：${p.summary.trim()}` : "";
        parts.push(`# ${p.title}${tagsLine}${summaryLine}\n\n${p.body.trim()}`);
      }
      return {
        fileName: `${base}.md`,
        mime: "text/markdown",
        content: parts.join("\n\n---\n\n") + "\n",
      };
    }
    case "txt": {
      const parts: string[] = [];
      for (const p of prompts) {
        const tagsLine = p.tags && p.tags.length ? `\n\n标签：${p.tags.join("、")}` : "";
        const summaryLine = p.summary?.trim() ? `\n\n摘要：${p.summary.trim()}` : "";
        parts.push(`【${p.title}】${tagsLine}${summaryLine}\n\n${p.body.trim()}`);
      }
      return {
        fileName: `${base}.txt`,
        mime: "text/plain",
        content: parts.join("\n\n" + "-".repeat(24) + "\n\n"),
      };
    }
  }
}
