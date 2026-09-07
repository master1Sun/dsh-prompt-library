/**
 * 报纸「今日 / 历史」动态内容 — 每日词库日报 + 成就速报。
 *
 * 数据来源：
 *  - 每日日报：依据当日本地词库统计由 AI 生成（ai.ts::generateDailyReport），中英各生成一版；
 *  - 成就速报：纯本地成就进度，由 gamification.ts::buildAchievementNews 生成，不依赖网络 / IT 网站 / AI。
 *
 * 持久化：直接存入 SQLite（prompts.db 的 newspapers 表），不再落盘 md 文件。
 * 当日首次打开即生成「中英两版」一并存库；其后当天及历史日期都直接从库读取并回显，
 * 天然支持翻页查看历史，无需再抓取任何网页信息。「第几期」由 newspapers 表去重日期推导（见 listIssueDates）。
 */
import type { PluginSettings } from "../types.js";
import {
  computeLibraryStats,
  computeStreak,
  getNewspaperRecord,
  listNewspaperDates,
  setNewspaperRecord,
  syncAchievementProgress,
  type LibraryStats,
} from "./store.js";
import { buildAchievementNews, computeAchievementProgress } from "./gamification.js";
import {
  generateDailyReport,
  type DailyReportItem,
  type TechNewsItem,
} from "./ai.js";

/** 归一化语言：zh / en。 */
function normalizeDailyLang(lang: string): "zh" | "en" {
  return lang.toLowerCase().startsWith("en") ? "en" : "zh";
}

/** 由词库统计构造「今日词库日报」的输入文本（数字化、语言无关）。 */
function buildStatsText(s: LibraryStats): string {
  const lines: string[] = [
    `词库共 ${s.total} 条提示词，累计使用 ${s.totalUsage} 次，使用率 ${s.total ? Math.round((s.usedCount / s.total) * 100) : 0}%；`,
    `近 7 天使用 ${s.usedIn7Days} 条、新增 ${s.addedIn7Days} 条、AI 完善 ${s.aiRefinedIn7} 条；近 30 天使用 ${s.usedIn30Days} 条、新增 ${s.addedIn30Days} 条。`,
  ];
  if (s.topUsed7.length) {
    lines.push(`近 7 天最常用：${s.topUsed7.slice(0, 3).map((p) => `${p.title}（${p.count}次）`).join("、")}。`);
  }
  if (s.aiRefinedCount) {
    lines.push(`累计 AI 完善 ${s.aiRefinedCount} 条（占比 ${s.aiRefinedPct} %）。`);
  }
  return lines.join("\n");
}

/** 科技快讯（成就速报）来源标记。 */
export type NewsSource = "achievement";

/** 单期报纸内容（数据只来自 newspapers 表读取 / 当日生成）。 */
export interface IssueData {
  date: string;
  lang: "zh" | "en";
  report: DailyReportItem[] | null;
  news: TechNewsItem[] | null;
  newsSource?: NewsSource | null;
}

/** 北京时间（UTC+8）的日期键与当前时间戳。 */
function beijingNow(): { date: string; at: string } {
  const bj = new Date(Date.now() + 8 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${bj.getUTCFullYear()}-${pad(bj.getUTCMonth() + 1)}-${pad(bj.getUTCDate())}`;
  const at = `${date} ${pad(bj.getUTCHours())}:${pad(bj.getUTCMinutes())}:${pad(bj.getUTCSeconds())}（北京时间）`;
  return { date, at };
}

/** 把某一期报纸写入 newspapers 表（按 date + lang 覆盖；失败静默不影响主流程）。 */
function saveIssueToDb(issue: IssueData): void {
  setNewspaperRecord({
    date: issue.date,
    lang: issue.lang,
    report: issue.report,
    news: issue.news,
    newsSource: issue.newsSource ?? "achievement",
  });
}

/** 从 newspapers 表读取某一期报纸；不存在返回 undefined。 */
function readIssueFromDb(date: string, lang: "zh" | "en"): IssueData | undefined {
  const rec = getNewspaperRecord(date, lang);
  if (!rec) return undefined;
  return {
    date: rec.date,
    lang: rec.lang,
    report: rec.report,
    news: rec.news,
    newsSource: rec.newsSource as NewsSource | null,
  };
}

/**
 * 生成当日报纸的中英两版（一次统计，中英各跑一次 AI 生成日报），并一并存库。
 * 返回两版 IssueData（lang 分别为 zh / en）。
 */
async function generateTodayIssue(
  today: string,
  settings: PluginSettings,
): Promise<IssueData[]> {
  const [streak, stats] = await Promise.all([
    computeStreak().catch(() => 0),
    computeLibraryStats().catch(() => undefined),
  ]);
  const statsText = stats ? buildStatsText(stats) : undefined;
  if (!statsText) {
    // 统计都拿不到时，仍按原有空态结构生成，避免上层逻辑依赖数组长度
    const empty = { report: null, news: null, newsSource: "achievement" as const };
    return [
      { date: today, lang: "zh", ...empty },
      { date: today, lang: "en", ...empty },
    ];
  }
  // 成就进度与历史最大进度合并（只增不减），供成就速报使用
  const progress = syncAchievementProgress(computeAchievementProgress(stats, streak));
  const news = {
    zh: buildAchievementNews(stats, streak, "zh", progress),
    en: buildAchievementNews(stats, streak, "en", progress),
  };
  const [reportZh, reportEn] = await Promise.all([
    generateDailyReport(statsText, settings, "zh"),
    generateDailyReport(statsText, settings, "en"),
  ]);
  const versions: IssueData[] = [
    { date: today, lang: "zh", report: reportZh ?? null, news: news.zh.length > 0 ? news.zh : null, newsSource: "achievement" },
    { date: today, lang: "en", report: reportEn ?? null, news: news.en.length > 0 ? news.en : null, newsSource: "achievement" },
  ];
  for (const v of versions) saveIssueToDb(v);
  return versions;
}

/**
 * 取某一期报纸。
 *  - 已有对应语言记录：直接回显（含历史与当日），不再重复生成；
 *  - 未存档日期：
 *      · 今天：由本地词库统计 + 成就进度生成「中英两版」，一并存库，返回请求语言版本；
 *      · 昨天及更早（历史空档）：返回空（日报/新闻为 null，前端显示「今日暂无推荐」）。
 *  - 当日容错：若当日记录里日报为空（说明此前 AI 生成失败被固化），自动重新生成补齐，
 *    仅在补齐成功且返回请求语言版本非空时才用新数据，否则仍回退原缓存，避免永久空白。
 *
 * @param date 报纸日期 YYYY-MM-DD；缺省取今天。
 * @param lang 语言（zh / en），决定返回并回显哪一语言版本。
 * @param settings 插件设置（AI 生成日报时用于解析可用模型）。
 */
export async function getIssue(
  date: string,
  lang: string,
  settings: PluginSettings,
): Promise<IssueData> {
  const L = normalizeDailyLang(lang);
  const today = beijingNow().date;
  // 已有对应语言的记录：先直接回显（历史与当日均已存库）
  const cached = readIssueFromDb(date, L);
  if (cached) {
    // 当日日报为空（上次 AI 生成失败被固化）：重新生成补齐，成功后覆盖存库
    if (date === today && (cached.report === null || cached.report.length === 0)) {
      try {
        const versions = await generateTodayIssue(today, settings);
        const fresh = versions.find((v) => v.lang === L);
        if (fresh && fresh.report && fresh.report.length > 0) return fresh;
      } catch {
        /* 重生成失败则回退缓存，下次打开仍会再试 */
      }
    }
    return cached;
  }

  if (date !== today) {
    // 历史空档：不补生成，返回空态（前端「今日暂无推荐」）
    return { date, lang: L, report: null, news: null, newsSource: null };
  }

  // 当日首访：生成中英两版并存库，返回请求语言版本
  const versions = await generateTodayIssue(today, settings);
  return versions.find((v) => v.lang === L) ?? versions[0];
}

/** 所有已生成过报纸的日期（去重后按时间倒序，最新在前）。 */
export function listIssueDates(): string[] {
  return listNewspaperDates();
}
