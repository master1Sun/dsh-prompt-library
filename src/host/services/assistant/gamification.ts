/**
 * 词库助手的「游戏化」逻辑 — 等级 / 成就 / 时间彩蛋。
 *
 * - 等级：按累计「活跃积分」分 6 档（使用/AI完善/自学习/新增收藏/每日活跃多维度加积分），
 *   长期未活跃按周期衰减扣分，净积分低于当前档阈值即回落；等级称号中英双语；
 * - 成就：根据统计指标（使用/收藏/AI 完善/连续活跃/新增/回收站治理等）判定解锁状态；
 * - 彩蛋：按当前本地时间（时段 + 周末 + 公历节日）挑选一条应景文案。
 *
 * 纯函数 + 数据只读，不做持久化；客户端调用 `/assistant/status` 获取快照，
 * 再本地记忆「已播报过的成就」，避免重复弹成就气泡。
 */
import type { LibraryStats, PointsSnapshot } from "../data/store.js";
import type { TechNewsItem } from "../ai/ai.js";

/** 文案语言。 */
export type GamifyLang = "zh" | "en";

/** 等级信息（供前端徽章与进度展示）。 */
export interface LevelInfo {
  /** 当前等级（1 起步，已考虑回落）。 */
  level: number;
  /** 当前等级称号（按语言）。 */
  title: string;
  /** 当前净积分（等级按此分档）。 */
  current: number;
  /** 升下一级所需净积分；0 表示已满级。 */
  next: number;
  /** 原始累计积分（未衰减，用于展示成长总量）。 */
  gross: number;
  /** 因长期未活跃而扣除的积分。 */
  decayedPoints: number;
  /** 当前等级内进度百分比（0-100，满级为 100）。 */
  pct: number;
  /** 是否因长期未活跃而触发积分衰减（净积分低于原始档）。 */
  decayed: boolean;
  /** 距上次活动（积分事件）的天数（本地时区），用于解释回落原因。 */
  inactiveDays: number;
  /** 距回落到上一档的净积分差（level>1 时有效，否则 0）。 */
  dropGap: number;
  /** 上一档称号（按语言；level=1 时为空串）。 */
  prevTitle: string;
}

/** 成就稀有度：影响奖牌配色与成就分值。 */
export type Rarity = "common" | "rare" | "epic" | "legendary";

/** 稀有度 → 成就分值（解锁后计入总成就点）。 */
export const RARITY_POINTS: Record<Rarity, number> = {
  common: 1,
  rare: 3,
  epic: 5,
  legendary: 10,
};

/** 成就成长称号档位：按已解锁比例命名（用于头部排行展示）。 */
export type AchievementRank = "wanderer" | "explorer" | "collector" | "star" | "legend";

/** 单条成就（含解锁状态、稀有度、进度与分值，供前端播报与展示）。 */
export interface AchievementInfo {
  id: string;
  title: string;
  desc: string;
  achieved: boolean;
  /** 稀有度。 */
  rarity: Rarity;
  /** 解锁可得分值。 */
  points: number;
  /** 当前进度值。 */
  progress: number;
  /** 达成目标值。 */
  target: number;
}

/** 成就汇总（头部排行：称号 + 成就点 + 达成数）。 */
export interface AchievementSummary {
  /** 成长称号（按语言）。 */
  rank: string;
  /** 成长称号档位标识。 */
  rankKey: AchievementRank;
  /** 已解锁成就数。 */
  unlocked: number;
  /** 成就总数。 */
  total: number;
  /** 已获得成就点。 */
  earnedPoints: number;
  /** 成就点上限。 */
  maxPoints: number;
}

/** 一条彩蛋文案。 */
export interface EasterEggInfo {
  id: string;
  text: string;
}

/** `/assistant/status` 返回的完整快照。 */
export interface AssistantStatus {
  level: LevelInfo;
  achievements: AchievementInfo[];
  achievementSummary: AchievementSummary;
  easterEgg: EasterEggInfo | null;
}

// ── 等级规则 ───────────────────────────────────────────────────────────

interface LevelRule {
  level: number;
  /** 达到该等级所需的净积分（递增）。 */
  threshold: number;
  zh: string;
  en: string;
}

const LEVEL_RULES: LevelRule[] = [
  { level: 1, threshold: 0, zh: "词库萌新", en: "Library Rookie" },
  { level: 2, threshold: 30, zh: "词库学徒", en: "Library Apprentice" },
  { level: 3, threshold: 90, zh: "词库熟手", en: "Library Regular" },
  { level: 4, threshold: 240, zh: "词库专家", en: "Library Expert" },
  { level: 5, threshold: 600, zh: "词库大师", en: "Library Master" },
  { level: 6, threshold: 1500, zh: "词库宗师", en: "Library Grandmaster" },
];

/**
 * 依据净积分计算当前等级与升下一级的进度。
 * 净积分来自持久化积分账本（已含按未活跃周期衰减的扣分），这里只做分档，
 * 不再额外按 inactiveDays 模拟回落——衰减已体现在 net 中。
 */
export function computeLevel(points: PointsSnapshot, lang: GamifyLang): LevelInfo {
  const net = points.net;
  let base = LEVEL_RULES[0];
  for (const r of LEVEL_RULES) {
    if (net >= r.threshold) base = r;
  }
  const cur = base;
  const next = LEVEL_RULES.find((r) => r.level === cur.level + 1);
  const prev = LEVEL_RULES.find((r) => r.level === cur.level - 1);
  const pct = next
    ? Math.min(100, Math.round(((net - cur.threshold) / (next.threshold - cur.threshold)) * 100))
    : 100;
  return {
    level: cur.level,
    title: lang === "en" ? cur.en : cur.zh,
    current: net,
    next: next ? next.threshold : 0,
    gross: points.gross,
    decayedPoints: points.decay,
    pct,
    decayed: points.decay > 0,
    inactiveDays: points.inactiveDays,
    dropGap: prev ? net - prev.threshold : 0,
    prevTitle: prev ? (lang === "en" ? prev.en : prev.zh) : "",
  };
}

// ── 成就规则 ───────────────────────────────────────────────────────────

interface AchievementRule {
  id: string;
  rarity: Rarity;
  zhTitle: string;
  enTitle: string;
  zhDesc: string;
  enDesc: string;
  /** 达成所需目标值。 */
  target: number;
  /** 当前进度（基于统计快照 + 连续活跃天数）。 */
  progress: (s: LibraryStats, streak: number) => number;
}

/** 取一个不大于 target 的进度（避免进度条溢出）。 */
const cap = (v: number, target: number): number => Math.min(v, target);

const ACHIEVEMENT_RULES: AchievementRule[] = [
  // ── 使用里程碑 ──
  { id: "first_use", rarity: "common", target: 1, zhTitle: "初出茅庐", enTitle: "First Steps",
    zhDesc: "累计使用 1 次提示词", enDesc: "Use a prompt for the first time",
    progress: (s) => cap(s.totalUsage, 1) },
  { id: "use_10", rarity: "common", target: 10, zhTitle: "渐入佳境", enTitle: "Getting the Hang",
    zhDesc: "累计使用 10 次提示词", enDesc: "Use prompts 10 times in total",
    progress: (s) => cap(s.totalUsage, 10) },
  { id: "use_50", rarity: "rare", target: 50, zhTitle: "驾轻就熟", enTitle: "Skilled Hands",
    zhDesc: "累计使用 50 次提示词", enDesc: "Use prompts 50 times in total",
    progress: (s) => cap(s.totalUsage, 50) },
  { id: "use_200", rarity: "epic", target: 200, zhTitle: "炉火纯青", enTitle: "Masterful",
    zhDesc: "累计使用 200 次提示词", enDesc: "Use prompts 200 times in total",
    progress: (s) => cap(s.totalUsage, 200) },
  { id: "use_1000", rarity: "legendary", target: 1000, zhTitle: "登峰造极", enTitle: "Peak Performance",
    zhDesc: "累计使用 1000 次提示词", enDesc: "Use prompts 1000 times in total",
    progress: (s) => cap(s.totalUsage, 1000) },
  { id: "use_3000", rarity: "legendary", target: 3000, zhTitle: "万法归一", enTitle: "Prompts Beyond Measure",
    zhDesc: "累计使用 3000 次提示词", enDesc: "Use prompts 3000 times in total",
    progress: (s) => cap(s.totalUsage, 3000) },

  // ── 词库收藏 ──
  { id: "collector_20", rarity: "common", target: 20, zhTitle: "小小藏书家", enTitle: "Mini Collector",
    zhDesc: "词库收藏满 20 条提示词", enDesc: "Collect 20 prompts in the library",
    progress: (s) => cap(s.total, 20) },
  { id: "collector_100", rarity: "rare", target: 100, zhTitle: "词库收藏家", enTitle: "Grand Collector",
    zhDesc: "词库收藏满 100 条提示词", enDesc: "Collect 100 prompts in the library",
    progress: (s) => cap(s.total, 100) },
  { id: "collector_300", rarity: "epic", target: 300, zhTitle: "藏书万卷", enTitle: "A Library's Shores",
    zhDesc: "词库收藏满 300 条提示词", enDesc: "Collect 300 prompts in the library",
    progress: (s) => cap(s.total, 300) },

  // ── AI 完善 ──
  { id: "ai_first", rarity: "common", target: 1, zhTitle: "AI 信徒", enTitle: "AI Believer",
    zhDesc: "首次用 AI 完善提示词", enDesc: "Polish a prompt with AI for the first time",
    progress: (s) => cap(s.aiRefinedCount, 1) },
  { id: "ai_50", rarity: "rare", target: 50, zhTitle: "AI 炼金术师", enTitle: "AI Alchemist",
    zhDesc: "累计用 AI 完善 50 条提示词", enDesc: "Polish 50 prompts with AI in total",
    progress: (s) => cap(s.aiRefinedCount, 50) },
  { id: "ai_200", rarity: "epic", target: 200, zhTitle: "AI 点石成金", enTitle: "AI Grandmaster",
    zhDesc: "累计用 AI 完善 200 条提示词", enDesc: "Polish 200 prompts with AI in total",
    progress: (s) => cap(s.aiRefinedCount, 200) },
  { id: "ai_cover", rarity: "rare", target: 30, zhTitle: "AI 得力干将", enTitle: "AI's Right Hand",
    zhDesc: "AI 完善的词条占比达 30%", enDesc: "30% of your prompts polished by AI",
    progress: (s) => cap(s.aiRefinedPct, 30) },

  // ── 连续活跃 ──
  { id: "streak_7", rarity: "common", target: 7, zhTitle: "七日之约", enTitle: "A Week of Devotion",
    zhDesc: "连续 7 天使用词库", enDesc: "Use the library 7 days in a row",
    progress: (_s, streak) => cap(streak, 7) },
  { id: "streak_30", rarity: "rare", target: 30, zhTitle: "月度劳模", enTitle: "Monthly Champ",
    zhDesc: "连续 30 天使用词库", enDesc: "Use the library 30 days in a row",
    progress: (_s, streak) => cap(streak, 30) },
  { id: "streak_100", rarity: "epic", target: 100, zhTitle: "忠实伙伴", enTitle: "Loyal Companion",
    zhDesc: "连续 100 天使用词库", enDesc: "Use the library 100 days in a row",
    progress: (_s, streak) => cap(streak, 100) },
  { id: "streak_365", rarity: "legendary", target: 365, zhTitle: "全年无休", enTitle: "Year-round Companion",
    zhDesc: "连续 365 天使用词库", enDesc: "Use the library 365 days in a row",
    progress: (_s, streak) => cap(streak, 365) },

  // ── 近期活跃 ──
  { id: "active_7", rarity: "common", target: 5, zhTitle: "活力四射", enTitle: "Full of Energy",
    zhDesc: "近 7 天有 5 条提示词被使用", enDesc: "Use 5 different prompts within 7 days",
    progress: (s) => cap(s.usedIn7Days, 5) },
  { id: "active_30", rarity: "rare", target: 15, zhTitle: "四处开花", enTitle: "Widespread",
    zhDesc: "近 30 天用过 15 条不同的提示词", enDesc: "Use 15 different prompts within 30 days",
    progress: (s) => cap(s.usedIn30Days, 15) },

  // ── 新增 / 自动学习 ──
  { id: "author_30", rarity: "common", target: 10, zhTitle: "高产作者", enTitle: "Prolific Author",
    zhDesc: "近 30 天新增 10 条提示词", enDesc: "Add 10 prompts within 30 days",
    progress: (s) => cap(s.addedIn30Days, 10) },
  { id: "learner_5", rarity: "common", target: 5, zhTitle: "学习达人", enTitle: "Eager Learner",
    zhDesc: "自动学习入库 5 条提示词", enDesc: "Auto-learn 5 prompts into the library",
    progress: (s) => cap(s.autoLearnedCount, 5) },
  { id: "learner_50", rarity: "rare", target: 50, zhTitle: "学富五车", enTitle: "Encyclopedic",
    zhDesc: "自动学习入库 50 条提示词", enDesc: "Auto-learn 50 prompts into the library",
    progress: (s) => cap(s.autoLearnedCount, 50) },
  { id: "learner_200", rarity: "epic", target: 200, zhTitle: "满载而归", enTitle: "Fully Stocked",
    zhDesc: "自动学习入库 200 条提示词", enDesc: "Auto-learn 200 prompts into the library",
    progress: (s) => cap(s.autoLearnedCount, 200) },

  // ── 标签 ──
  { id: "tags_5", rarity: "common", target: 5, zhTitle: "标签初尝", enTitle: "Tag Starter",
    zhDesc: "拥有 5 个不同标签", enDesc: "Keep 5 distinct tags",
    progress: (s) => cap(s.tagStats.length, 5) },
  { id: "tags_20", rarity: "epic", target: 20, zhTitle: "标签猎人", enTitle: "Tag Hunter",
    zhDesc: "拥有 20 个不同标签", enDesc: "Keep 20 distinct tags",
    progress: (s) => cap(s.tagStats.length, 20) },

  // ── 忠诚 / 积累 ──
  { id: "veteran_50", rarity: "rare", target: 50, zhTitle: "常青树", enTitle: "Evergreen",
    zhDesc: "同一词条被使用 50 次", enDesc: "Use a single prompt 50 times",
    progress: (s) => cap(s.topUsed[0]?.usageCount ?? 0, 50) },
  { id: "word_10000", rarity: "epic", target: 10000, zhTitle: "藏经阁", enTitle: "Vault of Words",
    zhDesc: "收藏词条累计 1 万字", enDesc: "Stockpile 10,000 characters of prompts",
    progress: (s) => cap(s.totalBodyLength, 10000) },

  // ── 近期生产力（近 7 天）──
  { id: "hot_7", rarity: "common", target: 50, zhTitle: "周产爆棚", enTitle: "Hot Streak",
    zhDesc: "近 7 天累计使用 50 次提示词", enDesc: "Use prompts 50 times within 7 days",
    progress: (s) => cap(s.usedIn7Days > 0 ? s.topUsed7.reduce((a, b) => a + b.count, 0) : 0, 50) },
  { id: "hot_od", rarity: "rare", target: 20, zhTitle: "当日之星", enTitle: "Star of the Day",
    zhDesc: "近 7 天最常用词条单日使用超 20 次", enDesc: "A top prompt is used 20+ times in 7 days",
    progress: (s) => cap(s.topUsed7[0]?.count ?? 0, 20) },
  { id: "ai_week", rarity: "rare", target: 10, zhTitle: "周周炼金", enTitle: "Weekly Alchemist",
    zhDesc: "近 7 天用 AI 完善 10 条提示词", enDesc: "Polish 10 prompts with AI within 7 days",
    progress: (s) => cap(s.aiRefinedIn7, 10) },
  { id: "author_week", rarity: "common", target: 5, zhTitle: "高产周", enTitle: "Prolific Week",
    zhDesc: "近 7 天新增 5 条提示词", enDesc: "Add 5 prompts within 7 days",
    progress: (s) => cap(s.addedIn7Days, 5) },

  // ── 回收站治理 ──
  { id: "trash_start", rarity: "common", target: 1, zhTitle: "断舍离初阶", enTitle: "Tidy Start",
    zhDesc: "回收站中有 1 条提示词", enDesc: "Keep 1 prompt in the recycle bin",
    progress: (s) => cap(s.trashCount, 1) },
  { id: "trash_10", rarity: "rare", target: 10, zhTitle: "整理达人", enTitle: "Tidy Master",
    zhDesc: "回收站累计有 10 条提示词", enDesc: "Keep 10 prompts in the recycle bin",
    progress: (s) => cap(s.trashCount, 10) },
  { id: "trash_50", rarity: "epic", target: 50, zhTitle: "断舍离大师", enTitle: "Declutter Guru",
    zhDesc: "回收站累计有 50 条提示词", enDesc: "Keep 50 prompts in the recycle bin",
    progress: (s) => cap(s.trashCount, 50) },

  // ── 词库利用率（盘活沉睡词条的整体量）──
  { id: "used_50", rarity: "common", target: 50, zhTitle: "盘活词库", enTitle: "Wide Usage",
    zhDesc: "累计用过 50 条不同的提示词", enDesc: "Use 50 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 50) },
  { id: "used_200", rarity: "rare", target: 200, zhTitle: "词库伯乐", enTitle: "Keen Curator",
    zhDesc: "累计用过 200 条不同的提示词", enDesc: "Use 200 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 200) },

  // ── 标签深耕 ──
  { id: "tag_focus_10", rarity: "rare", target: 10, zhTitle: "标签深耕", enTitle: "Tag Focus",
    zhDesc: "单一标签下收录 10 条提示词", enDesc: "Keep 10 prompts under one tag",
    progress: (s) => cap(s.tagStats.reduce((m, t) => Math.max(m, t.count), 0), 10) },
];

/** 计算全部成就的解锁状态（含稀有度、进度与分值）。 */
export function computeAchievements(stats: LibraryStats, streak: number, lang: GamifyLang): AchievementInfo[] {
  return ACHIEVEMENT_RULES.map((r) => {
    const progress = r.progress(stats, streak);
    return {
      id: r.id,
      title: lang === "en" ? r.enTitle : r.zhTitle,
      desc: lang === "en" ? r.enDesc : r.zhDesc,
      achieved: progress >= r.target,
      rarity: r.rarity,
      points: RARITY_POINTS[r.rarity],
      progress,
      target: r.target,
    };
  });
}

/** 依据已解锁比例挑选成长称号（中英双语）。 */
export function rankFor(unlockedPct: number, lang: GamifyLang): { rank: string; rankKey: AchievementRank } {
  if (unlockedPct >= 100) return { rank: lang === "en" ? "Legendary Librarian" : "词库传奇", rankKey: "legend" };
  if (unlockedPct >= 75) return { rank: lang === "en" ? "Starlight Collector" : "星辉收藏家", rankKey: "star" };
  if (unlockedPct >= 50) return { rank: lang === "en" ? "Master Collector" : "词库鉴藏家", rankKey: "collector" };
  if (unlockedPct >= 25) return { rank: lang === "en" ? "Library Explorer" : "词库探索者", rankKey: "explorer" };
  return { rank: lang === "en" ? "Library Wanderer" : "词库旅人", rankKey: "wanderer" };
}

/** 汇总成就排行（称号 + 达成数 + 成就点）。 */
export function computeAchievementSummary(
  achievements: AchievementInfo[],
  lang: GamifyLang,
): AchievementSummary {
  const unlocked = achievements.filter((a) => a.achieved).length;
  const total = achievements.length;
  const maxPoints = achievements.reduce((sum, a) => sum + a.points, 0);
  const earnedPoints = achievements.reduce((sum, a) => (a.achieved ? sum + a.points : sum), 0);
  const pct = total === 0 ? 0 : Math.round((unlocked / total) * 100);
  const { rank, rankKey } = rankFor(pct, lang);
  return { rank, rankKey, unlocked, total, earnedPoints, maxPoints };
}

// ── 时间 / 节日彩蛋 ─────────────────────────────────────────────────────

/** 公历节日表：month 1-12，day 1-31。 */
const HOLIDAYS: Array<{ month: number; day: number; zh: string; en: string }> = [
  { month: 1, day: 1, zh: "元旦快乐！今年也要多攒点好词", en: "Happy New Year! Time to hoard more good prompts" },
  { month: 2, day: 14, zh: "情人节快乐～送你一条含情脉脉的提示词", en: "Happy Valentine's Day — here's a heartfelt prompt for you" },
  { month: 3, day: 8, zh: "妇女节快乐！做自己的主角", en: "Happy Women's Day — be your own hero" },
  { month: 5, day: 1, zh: "劳动节快乐，劳动最光荣，摸鱼也合理", en: "Happy Labor Day — work hard, rest harder" },
  { month: 6, day: 1, zh: "儿童节快乐！保持童心，词库也要可可爱爱", en: "Happy Children's Day — stay playful!" },
  { month: 9, day: 10, zh: "教师节快乐！向知识的引路人致敬", en: "Happy Teachers' Day — salute the guides of knowledge" },
  { month: 10, day: 1, zh: "国庆快乐！七天长假，词库陪你充电", en: "Happy National Day! A long break, powered by your library" },
  { month: 12, day: 24, zh: "平安夜快乐！愿你今夜好梦", en: "Happy Christmas Eve! Sweet dreams tonight" },
  { month: 12, day: 25, zh: "圣诞快乐！礼物虽迟但到", en: "Merry Christmas! The gift arrives, fashionably late" },
];

/** 按本地时间挑选一条应景彩蛋：节日 > 周末 > 时段。 */
export function pickEasterEgg(lang: GamifyLang, now: Date = new Date()): EasterEggInfo | null {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const week = now.getDay();
  // 公历节日优先
  for (const h of HOLIDAYS) {
    if (h.month === month && h.day === day) {
      return { id: "holiday", text: lang === "en" ? h.en : h.zh };
    }
  }
  // 周末
  if (week === 0 || week === 6) {
    return {
      id: "weekend",
      text: lang === "en" ? "Happy weekend! The library never sleeps" : "周末愉快！词库不打烊",
    };
  }
  // 时段
  let id = "time";
  let zh: string;
  let en: string;
  if (hour >= 5 && hour < 8) {
    zh = "天刚亮，词库已备好，先来一杯思路吧";
    en = "Early bird! The library is stocked and ready";
  } else if (hour >= 8 && hour < 12) {
    zh = "早上好！今天也要元气满满地提问";
    en = "Good morning! Ready to ask great questions today";
  } else if (hour >= 12 && hour < 14) {
    zh = "午休时间到，记得先干饭再搞词库";
    en = "Lunch break — fuel up before you prompt up";
  } else if (hour >= 14 && hour < 18) {
    zh = "下午茶时间～来条提示词提提神";
    en = "Afternoon tea time — grab a prompt to recharge";
  } else if (hour >= 18 && hour < 22) {
    zh = "晚上好！夜生活刚刚开始，灵感正当时";
    en = "Good evening! Inspiration peaks at night";
  } else {
    zh = "夜深了，夜猫子还在奋斗，记得早点休息";
    en = "Burning the midnight oil? Don't forget to rest";
  }
  return { id, text: lang === "en" ? en : zh };
}

/** 汇总 `/assistant/status` 快照（stats 缺失时用零值兜底，成就/等级照常输出）。 */
export function buildAssistantStatus(
  stats: LibraryStats | undefined,
  streak: number,
  lang: GamifyLang,
  points: PointsSnapshot,
): AssistantStatus {
  const s: LibraryStats =
    stats ??
    ({
      total: 0,
      totalUsage: 0,
      usedCount: 0,
      unusedCount: 0,
      topUsed: [],
      recentUsed: [],
      tagStats: [],
      trashCount: 0,
      usedIn7Days: 0,
      usedIn30Days: 0,
      longestUnused: [],
      totalBodyLength: 0,
      avgBodyLength: 0,
      aiRefinedCount: 0,
      aiRefinedPct: 0,
      addedIn7Days: 0,
      addedIn30Days: 0,
      topUsed7: [],
      aiRefinedIn7: 0,
      autoLearnedCount: 0,
    } as LibraryStats);
  const achievements = computeAchievements(s, streak, lang);
  return {
    level: computeLevel(points, lang),
    achievements,
    achievementSummary: computeAchievementSummary(achievements, lang),
    easterEgg: pickEasterEgg(lang),
  };
}

// ── 报纸「成就速报」 ─────────────────────────────────────────────────────

const RARITY_LABEL: Record<Rarity, Record<GamifyLang, string>> = {
  common: { zh: "普通", en: "Common" },
  rare: { zh: "稀有", en: "Rare" },
  epic: { zh: "史诗", en: "Epic" },
  legendary: { zh: "传说", en: "Legendary" },
};

/**
 * 由本地成就进度生成报纸「科技快讯」（成就速报）条目。
 * 纯本地数据，不依赖网络 / AI：优先已解锁成就，再补当前进度最高的未解锁成就。
 * @returns 成就快讯条目（title=成就标题，summary=描述/进度，url 恒为空串表示无外链）。
 */
export function buildAchievementNews(
  stats: LibraryStats | undefined,
  streak: number,
  lang: GamifyLang,
): TechNewsItem[] {
  const s: LibraryStats =
    stats ??
    ({
      total: 0,
      totalUsage: 0,
      usedCount: 0,
      unusedCount: 0,
      topUsed: [],
      recentUsed: [],
      tagStats: [],
      trashCount: 0,
      usedIn7Days: 0,
      usedIn30Days: 0,
      longestUnused: [],
      totalBodyLength: 0,
      avgBodyLength: 0,
      aiRefinedCount: 0,
      aiRefinedPct: 0,
      addedIn7Days: 0,
      addedIn30Days: 0,
      topUsed7: [],
      aiRefinedIn7: 0,
      autoLearnedCount: 0,
    } as LibraryStats);
  const achieved = computeAchievements(s, streak, lang).filter((a) => a.achieved);
  const pending = computeAchievements(s, streak, lang)
    .filter((a) => !a.achieved)
    .sort((a, b) => b.progress - a.progress);

  const items: TechNewsItem[] = [];
  // 已解锁成就，按稀有度从高到低（传说→传说→史诗→稀有→普通）展示
  const rarityOrder: Rarity[] = ["legendary", "epic", "rare", "common"];
  achieved
    .slice()
    .sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity))
    .forEach((a) => {
      const label = lang === "en" ? "Unlocked" : "已解锁";
      items.push({
        title: `🏅 ${lang === "en" ? `✨ ${label}:` : `${label}`} ${a.title}`,
        summary: `${a.desc}（${RARITY_LABEL[a.rarity][lang]} · ${a.points} ${lang === "en" ? "pts" : "点"}）`,
        url: "",
      });
    });
  // 进度最高的未解锁成就，补充「进行中」
  pending.slice(0, 3).forEach((a) => {
    const label = lang === "en" ? "In progress" : "进行中";
    const pct = a.target > 0 ? Math.round((a.progress / a.target) * 100) : 0;
    items.push({
      title: `⏳ ${label}: ${a.title}`,
      summary: `${a.desc}（${pct}%）`,
      url: "",
    });
  });
  // 全部为空（无任何成就）时兜底一条
  if (items.length === 0) {
    items.push({
      title: lang === "en" ? "No achievements yet" : "暂无成就动态",
      summary: lang === "en" ? "Keep using your library to unlock achievements" : "多使用词库，成就敬请期待",
      url: "",
    });
  }
  return items;
}
