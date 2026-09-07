/**
 * 会话预览面板的客户端工具函数。
 * 从 PreviewView 拆出：剪贴板、下载触发、类型图标、ZIP 体积格式化、文件名清理。
 */

/** 复制文本到剪贴板：优先 navigator.clipboard，失败时回退临时 textarea（webview 中兼容）。 */
export async function copyText(text: string): Promise<boolean> {
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
export function triggerDownload(blob: Blob, filename: string) {
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
export function fileTypeOf(name: string): string {
  const last = name.lastIndexOf(".");
  return last >= 0 ? name.slice(last + 1).toLowerCase() : "";
}

/** ZIP 选择器行图标：按扩展名映射为 emoji。 */
export function fileIconOf(type: string): string {
  const icons: Record<string, string> = {
    md: "📝", json: "📋", txt: "📄", csv: "📊", log: "📋",
    ts: "📘", js: "📗", py: "🐍", go: "🔵", rs: "🦀", java: "☕",
    c: "⚙️", cpp: "⚙️", css: "🎨", html: "🌐", svg: "🎨",
    png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️", webp: "🖼️", mp4: "🎬",
  };
  return icons[type] || "📄";
}

/** ZIP 选择器行文件体积格式化。 */
export function formatZipSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 把字符串清理成可用的下载文件名（替换非法字符）。 */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[/\\:*?"<>|\s]+/g, "_")
    .replace(/[^\p{L}\p{N}_.-]/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+|[._]+$/g, "");
  return cleaned || "export";
}
