/**
 * 词库助手的「游戏化」逻辑 — 等级 / 成就 / 时间彩蛋。
 *
 * - 等级：按累计使用次数分 6 档，等级称号中英双语；长期未使用会触发等级回落
 *   （每连续 30 天未使用回落一级，重新使用后恢复）；
 * - 成就：根据统计指标（使用/收藏/AI 完善/连续活跃/新增）判定解锁状态；
 * - 彩蛋：按当前本地时间（时段 + 周末 + 公历节日）挑选一条应景文案。
 *
 * 纯函数 + 数据只读，不做持久化；客户端调用 `/assistant/status` 获取快照，
 * 再本地记忆「已播报过的成就」，避免重复弹成就气泡。
 */
import type { LibraryStats } from "../data/store.js";

/** 文案语言。 */
export type GamifyLang = "zh" | "en";

/** 等级信息（供前端徽章与进度展示）。 */
export interface LevelInfo {
  /** 当前等级（1 起步，已考虑回落）。 */
  level: number;
  /** 当前等级称号（按语言）。 */
  title: string;
  /** 当前累计使用次数。 */
  current: number;
  /** 升下一级所需累计使用次数；0 表示已满级。 */
  next: number;
  /** 当前等级内进度百分比（0-100，满级为 100）。 */
  pct: number;
  /** 是否因长期未使用而触发等级回落（低于累计次数对应的原始等级）。 */
  decayed: boolean;
  /** 距上次使用的天数（本地时区），用于解释回落原因。 */
  inactiveDays: number;
}

/** 单条成就（含解锁状态，供前端播报）。 */
export interface AchievementInfo {
  id: string;
  title: string;
  desc: string;
  achieved: boolean;
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
  easterEgg: EasterEggInfo | null;
}

// ── 等级规则 ───────────────────────────────────────────────────────────

interface LevelRule {
  level: number;
  /** 达到该等级所需累计使用次数（递增）。 */
  threshold: number;
  zh: string;
  en: string;
}

const LEVEL_RULES: LevelRule[] = [
  { level: 1, threshold: 0, zh: "词库萌新", en: "Library Rookie" },
  { level: 2, threshold: 10, zh: "词库学徒", en: "Library Apprentice" },
  { level: 3, threshold: 30, zh: "词库熟手", en: "Library Regular" },
  { level: 4, threshold: 100, zh: "词库专家", en: "Library Expert" },
  { level: 5, threshold: 300, zh: "词库大师", en: "Library Master" },
  { level: 6, threshold: 1000, zh: "词库宗师", en: "Library Grandmaster" },
];

/** 依据累计使用次数计算当前等级与升下一级的进度；支持长期未使用的等级回落。 */
export function computeLevel(totalUsage: number, lang: GamifyLang, inactiveDays = 0): LevelInfo {
  let base = LEVEL_RULES[0];
  for (const r of LEVEL_RULES) {
    if (totalUsage >= r.threshold) base = r;
  }
  // 等级回落：每连续 30 天未使用回落一级（最低回到 1 级），重新使用后恢复原等级
  const DECAY_EVERY_DAYS = 30;
  const drop =
    inactiveDays > 0
      ? Math.min(base.level - 1, Math.floor(inactiveDays / DECAY_EVERY_DAYS))
      : 0;
  const cur = LEVEL_RULES[base.level - 1 - drop];
  const next = LEVEL_RULES.find((r) => r.level === cur.level + 1);
  const pct = next
    ? Math.min(100, Math.round(((totalUsage - cur.threshold) / (next.threshold - cur.threshold)) * 100))
    : 100;
  return {
    level: cur.level,
    title: lang === "en" ? cur.en : cur.zh,
    current: totalUsage,
    next: next ? next.threshold : 0,
    pct,
    decayed: drop > 0,
    inactiveDays,
  };
}

// ── 成就规则 ───────────────────────────────────────────────────────────

interface AchievementRule {
  id: string;
  zhTitle: string;
  enTitle: string;
  zhDesc: string;
  enDesc: string;
  /** 是否已达成（基于统计快照 + 连续活跃天数）。 */
  check: (s: LibraryStats, streak: number) => boolean;
}

const ACHIEVEMENT_RULES: AchievementRule[] = [
  {
    id: "first_use", zhTitle: "初出茅庐", enTitle: "First Steps",
    zhDesc: "累计使用 1 次提示词", enDesc: "Use a prompt for the first time",
    check: (s) => s.totalUsage >= 1,
  },
  {
    id: "use_10", zhTitle: "渐入佳境", enTitle: "Getting the Hang",
    zhDesc: "累计使用 10 次提示词", enDesc: "Use prompts 10 times in total",
    check: (s) => s.totalUsage >= 10,
  },
  {
    id: "use_50", zhTitle: "驾轻就熟", enTitle: "Skilled Hands",
    zhDesc: "累计使用 50 次提示词", enDesc: "Use prompts 50 times in total",
    check: (s) => s.totalUsage >= 50,
  },
  {
    id: "use_200", zhTitle: "炉火纯青", enTitle: "Masterful",
    zhDesc: "累计使用 200 次提示词", enDesc: "Use prompts 200 times in total",
    check: (s) => s.totalUsage >= 200,
  },
  {
    id: "use_1000", zhTitle: "登峰造极", enTitle: "Peak Performance",
    zhDesc: "累计使用 1000 次提示词", enDesc: "Use prompts 1000 times in total",
    check: (s) => s.totalUsage >= 1000,
  },
  {
    id: "collector_20", zhTitle: "小小藏书家", enTitle: "Mini Collector",
    zhDesc: "词库收藏满 20 条提示词", enDesc: "Collect 20 prompts in the library",
    check: (s) => s.total >= 20,
  },
  {
    id: "collector_100", zhTitle: "词库收藏家", enTitle: "Grand Collector",
    zhDesc: "词库收藏满 100 条提示词", enDesc: "Collect 100 prompts in the library",
    check: (s) => s.total >= 100,
  },
  {
    id: "ai_first", zhTitle: "AI 信徒", enTitle: "AI Believer",
    zhDesc: "首次用 AI 完善提示词", enDesc: "Polish a prompt with AI for the first time",
    check: (s) => s.aiRefinedCount >= 1,
  },
  {
    id: "ai_50", zhTitle: "AI 炼金术师", enTitle: "AI Alchemist",
    zhDesc: "累计用 AI 完善 50 条提示词", enDesc: "Polish 50 prompts with AI in total",
    check: (s) => s.aiRefinedCount >= 50,
  },
  {
    id: "streak_7", zhTitle: "七日之约", enTitle: "A Week of Devotion",
    zhDesc: "连续 7 天使用词库", enDesc: "Use the library 7 days in a row",
    check: (_s, streak) => streak >= 7,
  },
  {
    id: "streak_30", zhTitle: "月度劳模", enTitle: "Monthly Champ",
    zhDesc: "连续 30 天使用词库", enDesc: "Use the library 30 days in a row",
    check: (_s, streak) => streak >= 30,
  },
  {
    id: "streak_100", zhTitle: "忠实伙伴", enTitle: "Loyal Companion",
    zhDesc: "连续 100 天使用词库", enDesc: "Use the library 100 days in a row",
    check: (_s, streak) => streak >= 100,
  },
  {
    id: "active_7", zhTitle: "活力四射", enTitle: "Full of Energy",
    zhDesc: "近 7 天有 5 条提示词被使用", enDesc: "Use 5 different prompts within 7 days",
    check: (s) => s.usedIn7Days >= 5,
  },
  {
    id: "author_30", zhTitle: "高产作者", enTitle: "Prolific Author",
    zhDesc: "近 30 天新增 10 条提示词", enDesc: "Add 10 prompts within 30 days",
    check: (s) => s.addedIn30Days >= 10,
  },
  {
    id: "learner_5", zhTitle: "学习达人", enTitle: "Eager Learner",
    zhDesc: "自动学习入库 5 条提示词", enDesc: "Auto-learn 5 prompts into the library",
    check: (s) => s.autoLearnedCount >= 5,
  },
];

/** 计算全部成就的解锁状态。 */
export function computeAchievements(stats: LibraryStats, streak: number, lang: GamifyLang): AchievementInfo[] {
  return ACHIEVEMENT_RULES.map((r) => ({
    id: r.id,
    title: lang === "en" ? r.enTitle : r.zhTitle,
    desc: lang === "en" ? r.enDesc : r.zhDesc,
    achieved: r.check(stats, streak),
  }));
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
  inactiveDays = 0,
  lang: GamifyLang,
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
  return {
    level: computeLevel(s.totalUsage, lang, inactiveDays),
    achievements: computeAchievements(s, streak, lang),
    easterEgg: pickEasterEgg(lang),
  };
}
