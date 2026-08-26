/**
 * 词库数据导入导出格式工具。
 *
 * 支持的通用格式（市面上常用）：
 * - JSON：本插件备份格式 { version, prompts }，或数组 / { skills | entries | data } 列表；
 * - CSV：标题行 + title,body,tags 列（支持引号包裹、逗号/换行/双引号转义）；
 * - Markdown：单文件（可选 YAML frontmatter 提供 title/tags，正文即 body）；
 * - 纯文本：单文件，标题取文件名，正文即全文。
 *
 * 导出时把勾选的提示词序列化为所选格式供下载。
 */

/** 支持导入导出的格式。 */
export type TransferFormat = "json" | "csv" | "md" | "txt";

/** 导入导出使用的提示词数据（简化结构）。 */
export interface TransferPrompt {
  title: string;
  body: string;
  tags?: string[];
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
    out.push({ title, body, tags: tags.length ? tags : undefined, source: "csv" });
  }
  return out;
}

/** 解析 Markdown：可选 YAML frontmatter（title/tags），正文即 body；无 frontmatter 时标题取文件名。 */
function parseMarkdown(fileName: string, text: string): TransferPrompt[] {
  let title = baseName(fileName);
  let tags: string[] | undefined;
  let body = text.trim();
  if (text.trimStart().startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      const fm = text.slice(3, end);
      body = text.slice(end + 4).trim();
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
  return [{ title: title || baseName(fileName), body, tags: tags?.length ? tags : undefined, source: "md" }];
}

/** 解析纯文本：单条目，标题取文件名，正文即全文。 */
function parseTxt(fileName: string, text: string): TransferPrompt[] {
  const body = text.trim();
  return body ? [{ title: baseName(fileName), body, source: "txt" }] : [];
}

/** 根据文件扩展名解析导入内容为提示词条目列表（JSON / CSV / Markdown / 纯文本）。 */
export function parseImportFile(fileName: string, text: string): TransferPrompt[] {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "json") return parseJson(text);
  if (ext === "csv") return parseCsv(text);
  if (ext === "md" || ext === "markdown") return parseMarkdown(fileName, text);
  return parseTxt(fileName, text);
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
        content: JSON.stringify({ version: 1, exportedAt: Date.now(), prompts }, null, 2),
      };
    case "csv": {
      const lines = ["title,body,tags"];
      for (const p of prompts) {
        lines.push(
          `${csvEscape(p.title)},${csvEscape(p.body)},${csvEscape((p.tags ?? []).join("|"))}`,
        );
      }
      return { fileName: `${base}.csv`, mime: "text/csv", content: lines.join("\r\n") };
    }
    case "md": {
      const parts: string[] = [];
      for (const p of prompts) {
        const tagsLine = p.tags && p.tags.length ? `\n\n标签：${p.tags.join("、")}` : "";
        parts.push(`# ${p.title}${tagsLine}\n\n${p.body.trim()}`);
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
        parts.push(`【${p.title}】\n\n${p.body.trim()}`);
      }
      return {
        fileName: `${base}.txt`,
        mime: "text/plain",
        content: parts.join("\n\n" + "-".repeat(24) + "\n\n"),
      };
    }
  }
}
