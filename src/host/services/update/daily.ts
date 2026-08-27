/**
 * 报纸「今日 / 历史」动态内容 — 每日词库日报 + 成就速报。
 *
 * 数据来源：
 *  - 每日日报：依据当日本地词库统计由 AI 生成（ai.ts::generateDailyReport），中英各生成一版；
 *  - 成就速报：纯本地成就进度，由 gamification.ts::buildAchievementNews 生成，不依赖网络 / IT 网站 / AI。
 *
 * 持久化：不写入任何 JSON 库，仅以 Markdown 为唯一记录。
 *   ~/.dsh/prompt-library/newspapers/zh/YYYY-MM-DD.md   → 中文版
 *   ~/.dsh/prompt-library/newspapers/en/YYYY-MM-DD.md   → 英文版
 * 当日首次打开即生成「中英两版」一并落盘；其后当天及历史日期都直接从对应语言的 md 读取并回显，
 * 天然支持翻页查看历史，无需再抓取任何网页信息。「第几期」由 md 文件数量推导（见 listIssueDates）。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PluginSettings } from "../../../types.js";
import { newspapersDir } from "../../utils/paths.js";
import { computeLibraryStats, computeStreak, type LibraryStats } from "../data/store.js";
import { buildAchievementNews } from "../assistant/gamification.js";
import {
  generateDailyReport,
  type DailyReportItem,
  type TechNewsItem,
} from "../ai/ai.js";

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

/** 单期报纸内容（数据只来自 Markdown 解析 / 当日生成）。 */
export interface IssueData {
  date: string;
  lang: "zh" | "en";
  report: DailyReportItem[] | null;
  news: TechNewsItem[] | null;
  newsSource?: NewsSource | null;
}

/** 某个语言版本的 Markdown 路径：newspapers/<lang>/YYYY-MM-DD.md。 */
function issueMdPath(date: string, lang: "zh" | "en"): string {
  return join(newspapersDir(), lang, `${date}.md`);
}

/** 北京时间（UTC+8）的日期键与当前时间戳。 */
function beijingNow(): { date: string; at: string } {
  const bj = new Date(Date.now() + 8 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${bj.getUTCFullYear()}-${pad(bj.getUTCMonth() + 1)}-${pad(bj.getUTCDate())}`;
  const at = `${date} ${pad(bj.getUTCHours())}:${pad(bj.getUTCMinutes())}:${pad(bj.getUTCSeconds())}（北京时间）`;
  return { date, at };
}

/** 把一个日期键转成中文 / 英文友好的可读日期（用于 Markdown 标题）。 */
function formatFriendlyDate(dateKey: string, lang: "zh" | "en"): string {
  try {
    const d = new Date(`${dateKey}T00:00:00`);
    return d.toLocaleDateString(lang === "en" ? "en-US" : "zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateKey;
  }
}

/**
 * 将某一期报纸按语言写成 Markdown 记录文件（newspapers/<lang>/YYYY-MM-DD.md）。
 * 重名直接覆盖（当日重新生成时保持一致）；写失败静默不影响主流程。
 */
function writeIssueMarkdown(issue: IssueData): void {
  try {
    const { at } = beijingNow();
    const en = issue.lang === "en";
    const lines: string[] = [];
    lines.push(`# ${en ? "The Prompt Daily" : "词库日报"} · ${formatFriendlyDate(issue.date, issue.lang)}`);
    lines.push("");
    lines.push(`> ${en ? "Recorded" : "记录时间"}：${at}`);
    lines.push(`> ${en ? "Language" : "语言"}：${en ? "English" : "中文"}`);
    lines.push(`> ${en ? "Briefs" : "科技快讯"}：${en ? "local achievements" : "本地成就速报"}`);
    lines.push("");
    lines.push(`## 📰 ${en ? "Daily Report" : "每日日报"}`);
    if (issue.report && issue.report.length > 0) {
      for (const r of issue.report) lines.push(`- **${r.headline}**：${r.body}`);
    } else {
      lines.push(en ? "- No recommendations today" : "- （今日暂无推荐）");
    }
    lines.push("");
    lines.push(`## ⭐ ${en ? "Achievement Briefs" : "成就速报"}`);
    if (issue.news && issue.news.length > 0) {
      issue.news.forEach((n, i) => {
        lines.push(`${i + 1}. **${n.title}**${n.summary ? ` — ${n.summary}` : ""}`);
      });
    } else {
      lines.push(en ? "- No achievements yet" : "- （暂无成就动态）");
    }
    mkdirSync(join(newspapersDir(), issue.lang), { recursive: true });
    writeFileSync(issueMdPath(issue.date, issue.lang), `${lines.join("\n")}\n`, "utf8");
  } catch {
    /* 记录失败不影响主流程，正常返回报纸 */
  }
}

/** 从一期 Markdown 反解析出结构化内容（日报 / 成就速报）。 */
function parseIssueMarkdown(date: string, lang: "zh" | "en", content: string): IssueData {
  const report: DailyReportItem[] = [];
  const news: TechNewsItem[] = [];
  let section: "report" | "news" | null = null;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("## ")) {
      const lower = trimmed.toLowerCase();
      if (lower.includes("daily report") || lower.includes("每日日报")) section = "report";
      else if (lower.includes("achievement") || lower.includes("成就速报")) section = "news";
      else section = null;
      continue;
    }
    if (section === "report") {
      const m = trimmed.match(/^-\s*\*\*(.+?)\*\*\s*[:：]\s*(.*)$/);
      if (m) report.push({ headline: m[1].trim(), body: m[2].trim() });
    } else if (section === "news") {
      const m = trimmed.match(/^(\d+)\.\s*\*\*(.+?)\*\*\s*(?:—\s*)?(.*)$/);
      if (m) news.push({ title: m[2].trim(), summary: m[3].trim(), url: "" });
    }
  }
  return {
    date,
    lang,
    report: report.length > 0 ? report : null,
    news: news.length > 0 ? news : null,
    newsSource: "achievement",
  };
}

/**
 * 生成当日报纸的中英两版（一次统计，中英各跑一次 AI 生成日报），并一并落盘 Markdown。
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
  const news = {
    zh: buildAchievementNews(stats, streak, "zh"),
    en: buildAchievementNews(stats, streak, "en"),
  };
  const [reportZh, reportEn] = await Promise.all([
    generateDailyReport(statsText, settings, "zh"),
    generateDailyReport(statsText, settings, "en"),
  ]);
  const versions: IssueData[] = [
    { date: today, lang: "zh", report: reportZh ?? null, news: news.zh.length > 0 ? news.zh : null, newsSource: "achievement" },
    { date: today, lang: "en", report: reportEn ?? null, news: news.en.length > 0 ? news.en : null, newsSource: "achievement" },
  ];
  for (const v of versions) writeIssueMarkdown(v);
  return versions;
}

/**
 * 取某一期报纸。
 *  - 已有对应语言 md：直接解析回显（含历史与当日），不再重复生成；
 *  - 未存档日期：
 *      · 今天：由本地词库统计 + 成就进度生成「中英两版」，一并落盘 Markdown，返回请求语言版本；
 *      · 昨天及更早（历史空档）：返回空（日报/新闻为 null，前端显示「今日暂无推荐」）。
 *  - 当日容错：若当日 md 里日报为空（说明此前 AI 生成失败被固化），自动重新生成补齐，
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
  // 已有对应语言的 md：先直接解析回显（历史与当日均已落盘）
  const mdPath = issueMdPath(date, L);
  if (existsSync(mdPath)) {
    const cached = parseIssueMarkdown(date, L, readFileSync(mdPath, "utf8"));
    // 当日日报为空（上次 AI 生成失败被固化）：重新生成补齐，成功后覆盖落盘
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

  // 当日首访：生成中英两版并落盘，返回请求语言版本
  const versions = await generateTodayIssue(today, settings);
  return versions.find((v) => v.lang === L) ?? versions[0];
}

/** 所有已生成过报纸的日期（中英两版去重后按时间倒序，最新在前）。 */
export function listIssueDates(): string[] {
  const dates = new Set<string>();
  for (const lang of ["zh", "en"] as const) {
    try {
      const dir = join(newspapersDir(), lang);
      for (const name of readdirSync(dir)) {
        if (/^\d{4}-\d{2}-\d{2}\.md$/.test(name)) dates.add(name.slice(0, 10));
      }
    } catch {
      /* 目录不存在则跳过该语言 */
    }
  }
  return [...dates].sort((a, b) => (a < b ? 1 : -1));
}