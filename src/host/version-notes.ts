/**
 * 词库插件版本管理 — 每个版本附带更新说明（通告），支持多语言。
 *
 * 公告弹窗读取这里的版本列表，按版本号倒序展示：
 *   vX.Y.Z —— 每版本标题 + 更新要点列表，排版清晰。
 *
 * 版本说明文案已外置到插件包 doc/version-notes.json（构建时拷入 lib/doc，
 * 随包分发、可直接编辑），运行时从这里读取并按版本倒序排列。新增 / 修改版本
 * 更新条目时，直接在 doc/version-notes.json 数组中追加即可（最新在上），
 * 并同步 package.json 版本号，保证通告内容真实准确。
 */

import { readBundleDoc } from "./bundle-doc.js";

/** 单条版本更新说明。 */
export interface VersionNote {
  /** 版本号，如 "0.8.11"。 */
  version: string;
  /** 发布日期（可选），YYYY-MM-DD。 */
  date?: string;
  /** 版本亮点（多语言）。 */
  zh: {
    /** 版本标题，如 "公告动态配置 + 自动更新 + 模板变量优化"。 */
    title: string;
    /** 更新要点列表，一条一句。 */
    items: string[];
  };
  en: {
    title: string;
    items: string[];
  };
}

/** 版本说明外置文件名。 */
const VERSION_NOTES_FILE = "version-notes.json";

/**
 * 从插件包外置文件加载版本说明列表，按版本倒序排列（最新在上，由 JSON 顺序保证）。
 * 外置文件缺失 / 解析失败时返回空数组（公告 / -v 无历史文案可展示）。
 */
function loadVersionNotes(): VersionNote[] {
  const raw = readBundleDoc(VERSION_NOTES_FILE, "");
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is VersionNote =>
        !!n &&
        typeof n === "object" &&
        typeof (n as VersionNote).version === "string" &&
        !!((n as VersionNote).zh && (n as VersionNote).en),
    );
  } catch {
    return [];
  }
}

/** 版本更新列表 — 按版本倒序排列（最新在上），来自插件包外置 JSON。 */
export const VERSION_NOTES: VersionNote[] = loadVersionNotes();

/** 支持的语言枚举：归一化到 zh / en。 */
export type LangKey = "zh" | "en";

/** 将浏览器语言归一化成 zh / en。 */
export function normalizeLang(raw: string): LangKey {
  const s = (raw || "zh").toLowerCase();
  if (s.startsWith("en")) return "en";
  return "zh";
}

/** 获取某语言下的某版本说明（版本不存在则返回 null）。 */
export function getVersionNote(version: string, lang: LangKey = "zh"):
  | { title: string; items: string[]; date?: string }
  | null {
  const note = VERSION_NOTES.find((n) => n.version === version);
  if (!note) return null;
  const data = note[lang];
  return { title: data.title, items: [...data.items], date: note.date };
}

/** 获取全部版本说明（按语言、按版本倒序）。 */
export function getAllVersionNotes(lang: LangKey = "zh"): Array<{
  version: string;
  date?: string;
  title: string;
  items: string[];
}> {
  return VERSION_NOTES.map((n) => {
    const data = n[lang];
    return { version: n.version, date: n.date, title: data.title, items: [...data.items] };
  });
}