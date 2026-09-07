/**
 * 通用文本转换（host / client 共享，纯字符串处理，无 Node 依赖）。
 *
 * 把 Markdown / HTML 源码转换为纯文本（正常文章内容）：
 * - 代码围栏（``` ... ```）去掉围栏行，保留代码内容；
 * - 标题去掉行首 # 前缀；列表去掉行首 - * + 与有序序号；引用去掉行首 > 前缀；
 * - 分隔线（--- / *** / ___）整行移除；表格去掉 | 边框与分隔行；
 * - 行内标记：**加粗** / __加粗__ / *斜体* / _斜体_ / ~~删除线~~ / `行内代码` 去除标记，
 *   链接 [文字](url) 保留文字，图片 ![alt](url) 保留 alt；
 * - HTML 标签（如 <div>、<br>、<b> 等）直接去除，只保留标签内的文字内容；
 * - 合并 3 个以上连续空行为单个空行，首尾去空白。
 */
export function mdToPlainText(raw: string): string {
  const lines = raw.replace(/^\uFEFF/, "").split("\n");
  const out: string[] = [];
  let inCode = false;
  for (const line of lines) {
    // 代码围栏：切换块级上下文，围栏行本身移除，代码内容原样保留
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }
    // 表格分隔行（|---|）与分隔线（--- / *** / ___）整行移除
    if (/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)) continue;
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) continue;
    // 块级前缀：标题 / 引用 / 列表
    const stripped = line
      .replace(/^#{1,6}\s+/, "")
      .replace(/^\s*>\s?/, "")
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/^\s*\d+[.)]\s+/, "");
    out.push(stripInlineMd(stripped));
  }
  // 合并 3 个以上连续空行为单个空行，并去除首尾空白
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** 去除单行内的 Markdown 行内标记与 HTML 标签，保留文字内容（表格行先合并单元格分隔）。 */
function stripInlineMd(line: string): string {
  let s = line;
  // 表格行：以 | 开头 / 结尾时去掉边界竖线，单元格以空格连接
  if (s.trimStart().startsWith("|") || s.trimEnd().endsWith("|")) {
    s = s.trim().replace(/^\|/, "").replace(/\|\s*$/, "").replace(/\|/g, " ");
  }
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_m, alt: string) => alt) // 图片 → alt
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // 链接 → 文字
    .replace(/~~([^~]+)~~/g, "$1") // 删除线
    .replace(/`([^`]+)`/g, "$1") // 行内代码
    .replace(/\*\*(.+?)\*\*/g, "$1") // 加粗
    .replace(/\*(.+?)\*/g, "$1") // 斜体
    .replace(/__(.+?)__/g, "$1") // 加粗（下划线）
    .replace(/_(.+?)_/g, "$1") // 斜体（下划线）
    .replace(/<[^>]+>/g, "") // HTML 标签
    .replace(/[ \t]+/g, " ")
    .trim();
}
