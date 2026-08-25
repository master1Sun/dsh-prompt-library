/**
 * 公告通告读取（本地 + 多语言）。
 *
 * 数据全部来自代码：
 *  - 使用手册：i18n 文案键 pl.announce.manual.*，跟随系统语言；
 *  - 通告（版本更新说明）：src/host/services/update/version-notes.ts，按版本号 + 标题 + 条目排版，支持多语言。
 *
 * 不再读取任何网络 JSON。远程拉取、缓存、URL 校验等整套逻辑已移除。
 * 接口保持不变（/api/prompt-library/announcement），调用方传入 lang 查询参数可指定语言。
 */
import { getAllVersionNotes, normalizeLang, type LangKey } from "./version-notes.js";
import { currentVersion } from "./update.js";

/** 单版本条目（供前端排版使用）。 */
export interface VersionEntry {
  /** 版本号，如 "0.8.11"。 */
  version: string;
  /** 发布日期 YYYY-MM-DD，可选。 */
  date?: string;
  /** 版本标题。 */
  title: string;
  /** 版本更新要点列表。 */
  items: string[];
}

/** 拉取结果：source=local 表示本地产物，manual/versions 都已根据语言填充。 */
export interface AnnouncementData {
  source: "local";
  /** 语言（归一化后），zh 或 en。 */
  lang: LangKey;
  /** 当前运行版本（package.json version），供前端优先匹配当前版本的更新说明。 */
  current: string;
  /** 使用手册条目（已按语言翻译）。 */
  manual: { key: string; text: string }[];
  /** 版本更新说明（按版本倒序，每版本含标题 + 要点）。 */
  versions: VersionEntry[];
}

/** 使用手册的 i18n 键（顺序展示）。与前端 AnnouncementModal 共用同一套键。 */
const MANUAL_KEYS: readonly string[] = [
  "pl.announce.manual.0",
  "pl.announce.manual.1",
  "pl.announce.manual.2",
  "pl.announce.manual.3",
  "pl.announce.manual.4",
];

/** 内置手动文案（当 i18n 翻译函数不可用/取不到时的兜底，zh/en 各一份）。 */
const MANUAL_FALLBACK: Record<LangKey, string[]> = {
  zh: [
    "输入 # 呼出词库：实时筛选、↑↓ 选择、回车插入",
    "自动学习聊天中有价值的提示词，可随时编辑或删除",
    "支持 AI 优化与智能完善，提升提示词质量",
    "支持 {{变量}} 占位符，插入时弹窗逐个填写",
    "侧边栏 / 聊天面板双入口管理词库，支持导出与备份",
  ],
  en: [
    "Type # to open the library: live filter, up/down to select, Enter to insert",
    "Automatically learn valuable prompts from chats; edit or delete anytime",
    "AI polish and smart enrichment to improve prompt quality",
    "Supports {{variable}} placeholders, filled in a popup before insert",
    "Manage the library from the sidebar / chat panel, with export & backup",
  ],
};

/**
 * 读取公告通告：
 *  - manual：使用手册，使用传入的翻译函数填充，缺翻译则回退内置；
 *  - versions：各版本更新说明，直接读本地 VERSION_NOTES，按语言返回。
 *
 * @param lang 请求语言，默认 zh；可传入浏览器语言任意形式，内部归一化。
 * @param t 可选 i18n 翻译函数；传入时优先用于手册键翻译。
 */
export function getAnnouncement(
  lang: string = "zh",
  t?: (key: string) => string | undefined,
): AnnouncementData {
  const L: LangKey = normalizeLang(lang);
  // 使用手册：逐键翻译；缺翻译时用内置兜底（保证显示非空）。
  const fb = MANUAL_FALLBACK[L];
  const manual = MANUAL_KEYS.map((key, i) => {
    const translated = typeof t === "function" ? t(key) : undefined;
    const text =
      typeof translated === "string" && translated.length > 0 ? translated : (fb[i] ?? key);
    return { key, text };
  });
  // 版本说明：直接读本地版本文件（已按语言返回，按版本倒序）；
  // 同时返回当前运行版本，前端据此优先展示「当前版本」对应的更新说明
  const versions = getAllVersionNotes(L);
  return { source: "local", lang: L, current: currentVersion(), manual, versions };
}
