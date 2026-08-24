/**
 * 公告通告远程拉取。
 *
 * 双击词库助手弹出公告弹窗时，从默认公告地址（Gitee 仓库 README）
 * 实时拉取内容；拉取失败时回退内置文案。
 *
 * 支持两种内容格式（按能否解析为 JSON 自动识别）：
 * - JSON：{ "manual": string[], "notice": string }（manual 可缺省）
 * - 纯文本：整体作为通告（notice），若为 Markdown 会做轻量清洗
 */

/** 拉取结果。source 为 remote 时 manual/notice 来自远程；builtin 表示回退内置。 */
export interface AnnouncementData {
  source: "remote" | "builtin";
  manual?: string[];
  notice?: string;
}

/** 默认公告地址：Gitee 仓库 announcement.json（JSON 可同时动态配置使用手册 manual 与通告 notice）。 */
const DEFAULT_ANNOUNCEMENT_URL =
  "https://gitee.com/superBigYo/dsh-prompt-library/raw/master/announcement.json";

/** 远程拉取超时（毫秒）：Gitee 首次访问/解析 DNS 可能较慢，放宽到 8s 减少误判失败。 */
const FETCH_TIMEOUT_MS = 8000;
/** 拉取结果缓存时长（毫秒）：30 秒内不重复请求远程，兼顾实时更新与请求频率。 */
const CACHE_TTL_MS = 30_000;

let cached: { at: number; data: AnnouncementData } | null = null;

/** 校验 URL 协议，只允许 http/https，避免异常协议拉取本地文件。 */
function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** 轻量清洗 Markdown：保留正文换行，去掉标题/加粗/链接/列表/代码等标记。 */
function cleanMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接 → 文本
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // 标题 #
    .replace(/\*\*([^*]+)\*\*/g, "$1") // 加粗
    .replace(/~~([^~]+)~~/g, "$1") // 删除线
    .replace(/`([^`]+)`/g, "$1") // 行内代码
    .replace(/```/g, "") // 代码块分隔符
    .replace(/^[\s]*[-*+]\s+/gm, "• ") // 无序列表 → •
    .replace(/^[\s]*(\d+)\.\s+/gm, "$1. ") // 有序列表保留序号
    .replace(/\n{3,}/g, "\n\n") // 压缩多余空行
    .trim();
}

/** 解析远程内容：JSON 结构或纯文本（Markdown 时轻量清洗）。 */
function parseRemote(text: string): { manual?: string[]; notice?: string } {
  try {
    const obj = JSON.parse(text) as { manual?: unknown; notice?: unknown };
    const manual = Array.isArray(obj.manual)
      ? obj.manual.filter((x): x is string => typeof x === "string")
      : undefined;
    const notice = typeof obj.notice === "string" ? obj.notice : undefined;
    if (manual || notice) return { manual, notice };
  } catch {
    /* 非 JSON，按纯文本处理 */
  }
  const trimmed = cleanMarkdown(text);
  return trimmed ? { notice: trimmed } : {};
}

/** 拉取公告通告：从默认 Gitee 地址实时拉取，失败回退内置。成功结果带 60s 缓存。 */
export async function getAnnouncement(): Promise<AnnouncementData> {
  try {
    const url = DEFAULT_ANNOUNCEMENT_URL;
    if (!url || !isHttpUrl(url)) {
      return { source: "builtin" };
    }
    // 成功结果缓存 60s；失败不缓存，下次打开仍会重试
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { accept: "text/plain, application/json, text/markdown" },
      });
      if (!res.ok) return { source: "builtin" };
      const text = await res.text();
      const { manual, notice } = parseRemote(text);
      const data: AnnouncementData = { source: "remote", manual, notice };
      cached = { at: Date.now(), data };
      return data;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // 拉取失败 / 设置读取失败：回退内置文案
    return { source: "builtin" };
  }
}
