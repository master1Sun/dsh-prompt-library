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
import { POINTS_WEIGHT } from "../data/store.js";
import type { LibraryStats, PointsSnapshot, PointsKind } from "../data/store.js";
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
export type Rarity = "common" | "rare" | "epic" | "legendary" | "myth";

/** 稀有度 → 成就分值（解锁后计入总成就点）。 */
export const RARITY_POINTS: Record<Rarity, number> = {
  common: 1,
  rare: 3,
  epic: 5,
  legendary: 10,
  myth: 20,
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

/** 单一等级档位门槛（供前端「等级详情」展示）。 */
export interface LevelMilestone {
  level: number;
  /** 达到该等级所需的净积分。 */
  threshold: number;
  zh: string;
  en: string;
}

/** 一种积分获取来路（维度 + 单次基础分值）。 */
export interface PointSourceInfo {
  kind: PointsKind;
  points: number;
  zh: string;
  en: string;
}

/** `/assistant/status` 返回的完整快照。 */
export interface AssistantStatus {
  level: LevelInfo;
  achievements: AchievementInfo[];
  achievementSummary: AchievementSummary;
  easterEgg: EasterEggInfo | null;
  /** 各等级档位门槛（用于等级详情；含当前等级对照）。 */
  levelRules: LevelMilestone[];
  /** 积分获取来路（维度 + 单次分值 + 双语文案）。 */
  pointSources: PointSourceInfo[];
  /** 积分衰减规则文案（按语言）。 */
  decayRule: string;
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

/** 积分获取来路的维度说明（分值取自 POINTS_WEIGHT，仅文案在此维护）。 */
const POINT_SOURCE_META: Array<{ kind: PointsKind; zh: string; en: string }> = [
  { kind: "use", zh: "使用一条提示词", en: "Use a prompt" },
  { kind: "collect", zh: "新增收藏一条提示词", en: "Collect a new prompt" },
  { kind: "learn", zh: "自动学习入库一条新提示词", en: "Auto-learn a new prompt" },
  { kind: "ai", zh: "用 AI 完善一条提示词（重复仅记一次）", en: "AI-polish a prompt (once each)" },
  { kind: "active", zh: "当天首次任意操作（每日限一次）", en: "First action of the day (once daily)" },
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

/**
 * 78 条成就，与全部 78 张塔罗牌一一对应（由前端 buildDeck 按稀有度顺序指派）。
 * 稀有度档位：common 18 / rare 12 / epic 24 / legendary 16 / myth 8。
 * 同档越靠前的成就对应该档越靠前的塔罗牌（优先大阿卡纳）。
 */
const ACHIEVEMENT_RULES: AchievementRule[] = [
  // ── 普通档（18）难度逐级上升 ──
  { id: "first_use", rarity: "common", target: 1, zhTitle: "初出茅庐", enTitle: "First Steps",
    zhDesc: "累计使用 1 次提示词", enDesc: "Use a prompt for the first time",
    progress: (s) => cap(s.totalUsage, 1) },
  { id: "use_10", rarity: "common", target: 10, zhTitle: "渐入佳境", enTitle: "Getting the Hang",
    zhDesc: "累计使用 10 次提示词", enDesc: "Use prompts 10 times in total",
    progress: (s) => cap(s.totalUsage, 10) },
  { id: "use_25", rarity: "common", target: 25, zhTitle: "小试锋芒", enTitle: "Testing Waters",
    zhDesc: "累计使用 25 次提示词", enDesc: "Use prompts 25 times in total",
    progress: (s) => cap(s.totalUsage, 25) },
  { id: "collector_5", rarity: "common", target: 5, zhTitle: "词库发芽", enTitle: "Seedling",
    zhDesc: "词库收藏满 5 条提示词", enDesc: "Collect 5 prompts in the library",
    progress: (s) => cap(s.total, 5) },
  { id: "streak_3", rarity: "common", target: 3, zhTitle: "三日之约", enTitle: "Three Days In",
    zhDesc: "连续 3 天使用词库", enDesc: "Use the library 3 days in a row",
    progress: (_s, streak) => cap(streak, 3) },
  { id: "tags_3", rarity: "common", target: 3, zhTitle: "标签初识", enTitle: "Tag Intro",
    zhDesc: "拥有 3 个不同标签", enDesc: "Keep 3 distinct tags",
    progress: (s) => cap(s.tagStats.length, 3) },
  { id: "learner_1", rarity: "common", target: 1, zhTitle: "自动拾取", enTitle: "Auto Pickup",
    zhDesc: "自动学习入库 1 条提示词", enDesc: "Auto-learn 1 prompt into the library",
    progress: (s) => cap(s.autoLearnedCount, 1) },
  { id: "used_10", rarity: "common", target: 10, zhTitle: "小有涉猎", enTitle: "Dabbler",
    zhDesc: "累计用过 10 条不同的提示词", enDesc: "Use 10 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 10) },
  { id: "used_20", rarity: "common", target: 20, zhTitle: "涉猎渐广", enTitle: "Widening Nets",
    zhDesc: "累计用过 20 条不同的提示词", enDesc: "Use 20 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 20) },
  { id: "ai_first", rarity: "common", target: 1, zhTitle: "AI 信徒", enTitle: "AI Believer",
    zhDesc: "首次用 AI 完善提示词", enDesc: "Polish a prompt with AI for the first time",
    progress: (s) => cap(s.aiRefinedCount, 1) },
  { id: "collector_15", rarity: "common", target: 15, zhTitle: "书架上新", enTitle: "New Shelves",
    zhDesc: "词库收藏满 15 条提示词", enDesc: "Collect 15 prompts in the library",
    progress: (s) => cap(s.total, 15) },
  { id: "tag_focus_3", rarity: "common", target: 3, zhTitle: "小标签家", enTitle: "Mini Tagger",
    zhDesc: "单一标签下收录 3 条提示词", enDesc: "Keep 3 prompts under one tag",
    progress: (s) => cap(s.tagStats.reduce((m, t) => Math.max(m, t.count), 0), 3) },
  { id: "active_7", rarity: "common", target: 5, zhTitle: "活力四射", enTitle: "Full of Energy",
    zhDesc: "近 7 天有 5 条提示词被使用", enDesc: "Use 5 different prompts within 7 days",
    progress: (s) => cap(s.usedIn7Days, 5) },
  { id: "author_10", rarity: "common", target: 10, zhTitle: "持续创作", enTitle: "Steady Writer",
    zhDesc: "近 30 天新增 10 条提示词", enDesc: "Add 10 prompts within 30 days",
    progress: (s) => cap(s.addedIn30Days, 10) },
  { id: "trash_start", rarity: "common", target: 1, zhTitle: "断舍离初阶", enTitle: "Tidy Start",
    zhDesc: "回收站中有 1 条提示词", enDesc: "Keep 1 prompt in the recycle bin",
    progress: (s) => cap(s.trashCount, 1) },
  { id: "hot_15", rarity: "common", target: 15, zhTitle: "热力开场", enTitle: "Warm Start",
    zhDesc: "近 7 天累计使用 15 次提示词", enDesc: "Use prompts 15 times within 7 days",
    progress: (s) => cap(s.usedIn7Days > 0 ? s.topUsed7.reduce((a, b) => a + b.count, 0) : 0, 15) },
  { id: "ai_3", rarity: "common", target: 3, zhTitle: "AI 探路", enTitle: "AI Pathfinder",
    zhDesc: "累计用 AI 完善 3 条提示词", enDesc: "Polish 3 prompts with AI in total",
    progress: (s) => cap(s.aiRefinedCount, 3) },
  { id: "author_3", rarity: "common", target: 3, zhTitle: "勤快写手", enTitle: "Diligent Scribe",
    zhDesc: "近 7 天新增 3 条提示词", enDesc: "Add 3 prompts within 7 days",
    progress: (s) => cap(s.addedIn7Days, 3) },

  // ── 稀有档（12）──
  { id: "use_60", rarity: "rare", target: 60, zhTitle: "驾轻就熟", enTitle: "Skilled Hands",
    zhDesc: "累计使用 60 次提示词", enDesc: "Use prompts 60 times in total",
    progress: (s) => cap(s.totalUsage, 60) },
  { id: "use_120", rarity: "rare", target: 120, zhTitle: "从容不迫", enTitle: "Unflappable",
    zhDesc: "累计使用 120 次提示词", enDesc: "Use prompts 120 times in total",
    progress: (s) => cap(s.totalUsage, 120) },
  { id: "collector_50", rarity: "rare", target: 50, zhTitle: "词库进阶", enTitle: "Library Step",
    zhDesc: "词库收藏满 50 条提示词", enDesc: "Collect 50 prompts in the library",
    progress: (s) => cap(s.total, 50) },
  { id: "collector_120", rarity: "rare", target: 120, zhTitle: "藏书蔚然", enTitle: "Growing Shelves",
    zhDesc: "词库收藏满 120 条提示词", enDesc: "Collect 120 prompts in the library",
    progress: (s) => cap(s.total, 120) },
  { id: "streak_14", rarity: "rare", target: 14, zhTitle: "两周之约", enTitle: "A Fortnight",
    zhDesc: "连续 14 天使用词库", enDesc: "Use the library 14 days in a row",
    progress: (_s, streak) => cap(streak, 14) },
  { id: "tags_8", rarity: "rare", target: 8, zhTitle: "标签行家", enTitle: "Tag Expert",
    zhDesc: "拥有 8 个不同标签", enDesc: "Keep 8 distinct tags",
    progress: (s) => cap(s.tagStats.length, 8) },
  { id: "active_15", rarity: "rare", target: 15, zhTitle: "四处开花", enTitle: "Widespread",
    zhDesc: "近 30 天用过 15 条不同的提示词", enDesc: "Use 15 different prompts within 30 days",
    progress: (s) => cap(s.usedIn30Days, 15) },
  { id: "author_25", rarity: "rare", target: 25, zhTitle: "多产作家", enTitle: "Prolific Author",
    zhDesc: "近 30 天新增 25 条提示词", enDesc: "Add 25 prompts within 30 days",
    progress: (s) => cap(s.addedIn30Days, 25) },
  { id: "learner_15", rarity: "rare", target: 15, zhTitle: "博采众长", enTitle: "Encyclopedic",
    zhDesc: "自动学习入库 15 条提示词", enDesc: "Auto-learn 15 prompts into the library",
    progress: (s) => cap(s.autoLearnedCount, 15) },
  { id: "used_80", rarity: "rare", target: 80, zhTitle: "词库达人", enTitle: "Library Savvy",
    zhDesc: "累计用过 80 条不同的提示词", enDesc: "Use 80 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 80) },
  { id: "used_150", rarity: "rare", target: 150, zhTitle: "见多识广", enTitle: "Well-Traveled",
    zhDesc: "累计用过 150 条不同的提示词", enDesc: "Use 150 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 150) },
  { id: "ai_50", rarity: "rare", target: 50, zhTitle: "AI 炼金术师", enTitle: "AI Alchemist",
    zhDesc: "累计用 AI 完善 50 条提示词", enDesc: "Polish 50 prompts with AI in total",
    progress: (s) => cap(s.aiRefinedCount, 50) },

  // ── 史诗档（24）──
  { id: "use_300", rarity: "epic", target: 300, zhTitle: "炉火纯青", enTitle: "Masterful",
    zhDesc: "累计使用 300 次提示词", enDesc: "Use prompts 300 times in total",
    progress: (s) => cap(s.totalUsage, 300) },
  { id: "use_600", rarity: "epic", target: 600, zhTitle: "独当一面", enTitle: "Standalone",
    zhDesc: "累计使用 600 次提示词", enDesc: "Use prompts 600 times in total",
    progress: (s) => cap(s.totalUsage, 600) },
  { id: "collector_200", rarity: "epic", target: 200, zhTitle: "藏书万卷", enTitle: "A Library's Shores",
    zhDesc: "词库收藏满 200 条提示词", enDesc: "Collect 200 prompts in the library",
    progress: (s) => cap(s.total, 200) },
  { id: "collector_300", rarity: "epic", target: 300, zhTitle: "满屋书香", enTitle: "Books Everywhere",
    zhDesc: "词库收藏满 300 条提示词", enDesc: "Collect 300 prompts in the library",
    progress: (s) => cap(s.total, 300) },
  { id: "streak_60", rarity: "epic", target: 60, zhTitle: "常驻嘉宾", enTitle: "Regular Guest",
    zhDesc: "连续 60 天使用词库", enDesc: "Use the library 60 days in a row",
    progress: (_s, streak) => cap(streak, 60) },
  { id: "tags_15", rarity: "epic", target: 15, zhTitle: "标签全才", enTitle: "Tag All-Rounder",
    zhDesc: "拥有 15 个不同标签", enDesc: "Keep 15 distinct tags",
    progress: (s) => cap(s.tagStats.length, 15) },
  { id: "author_50", rarity: "epic", target: 50, zhTitle: "高产达人", enTitle: "Prod Heavy",
    zhDesc: "近 30 天新增 50 条提示词", enDesc: "Add 50 prompts within 30 days",
    progress: (s) => cap(s.addedIn30Days, 50) },
  { id: "learner_60", rarity: "epic", target: 60, zhTitle: "学海无涯", enTitle: "Endless Study",
    zhDesc: "自动学习入库 60 条提示词", enDesc: "Auto-learn 60 prompts into the library",
    progress: (s) => cap(s.autoLearnedCount, 60) },
  { id: "used_300", rarity: "epic", target: 300, zhTitle: "广开言路", enTitle: "Broad Reach",
    zhDesc: "累计用过 300 条不同的提示词", enDesc: "Use 300 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 300) },
  { id: "used_450", rarity: "epic", target: 450, zhTitle: "历久弥新", enTitle: "Time-Tested",
    zhDesc: "累计用过 450 条不同的提示词", enDesc: "Use 450 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 450) },
  { id: "ai_120", rarity: "epic", target: 120, zhTitle: "AI 点石成金", enTitle: "AI Grandmaster",
    zhDesc: "累计用 AI 完善 120 条提示词", enDesc: "Polish 120 prompts with AI in total",
    progress: (s) => cap(s.aiRefinedCount, 120) },
  { id: "ai_cover_60", rarity: "epic", target: 60, zhTitle: "AI 半壁江山", enTitle: "AI's Midland",
    zhDesc: "AI 完善的词条占比达 60%", enDesc: "60% of your prompts polished by AI",
    progress: (s) => cap(s.aiRefinedPct, 60) },
  { id: "hot_60", rarity: "epic", target: 60, zhTitle: "流量担当", enTitle: "Traffic Lead",
    zhDesc: "近 7 天累计使用 60 次提示词", enDesc: "Use prompts 60 times within 7 days",
    progress: (s) => cap(s.usedIn7Days > 0 ? s.topUsed7.reduce((a, b) => a + b.count, 0) : 0, 60) },
  { id: "word_12000", rarity: "epic", target: 12000, zhTitle: "藏经阁", enTitle: "Vault of Words",
    zhDesc: "收藏词条累计 1.2 万字", enDesc: "Stockpile 12,000 characters of prompts",
    progress: (s) => cap(s.totalBodyLength, 12000) },
  { id: "trash_25", rarity: "epic", target: 25, zhTitle: "断舍离勋章", enTitle: "Declutter Medal",
    zhDesc: "回收站累计有 25 条提示词", enDesc: "Keep 25 prompts in the recycle bin",
    progress: (s) => cap(s.trashCount, 25) },
  { id: "tag_focus_20", rarity: "epic", target: 20, zhTitle: "专业深耕", enTitle: "Deep Focus",
    zhDesc: "单一标签下收录 20 条提示词", enDesc: "Keep 20 prompts under one tag",
    progress: (s) => cap(s.tagStats.reduce((m, t) => Math.max(m, t.count), 0), 20) },
  { id: "ai_week_30", rarity: "epic", target: 30, zhTitle: "周周炼金", enTitle: "Weekly Alchemist",
    zhDesc: "近 7 天用 AI 完善 30 条提示词", enDesc: "Polish 30 prompts with AI within 7 days",
    progress: (s) => cap(s.aiRefinedIn7, 30) },
  { id: "hot_od", rarity: "epic", target: 35, zhTitle: "当日之星", enTitle: "Star of the Day",
    zhDesc: "近 7 天最常用词条单日使用超 35 次", enDesc: "A top prompt is used 35+ times in 7 days",
    progress: (s) => cap(s.topUsed7[0]?.count ?? 0, 35) },
  { id: "use_900", rarity: "epic", target: 900, zhTitle: "挥洒自如", enTitle: "Effortless",
    zhDesc: "累计使用 900 次提示词", enDesc: "Use prompts 900 times in total",
    progress: (s) => cap(s.totalUsage, 900) },
  { id: "collector_400", rarity: "epic", target: 400, zhTitle: "词库拥趸", enTitle: "Devoted Collector",
    zhDesc: "词库收藏满 400 条提示词", enDesc: "Collect 400 prompts in the library",
    progress: (s) => cap(s.total, 400) },
  { id: "used_200", rarity: "epic", target: 200, zhTitle: "眼界开阔", enTitle: "Open Horizons",
    zhDesc: "累计用过 200 条不同的提示词", enDesc: "Use 200 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 200) },
  { id: "streak_30", rarity: "epic", target: 30, zhTitle: "一月同行", enTitle: "A Month Along",
    zhDesc: "连续 30 天使用词库", enDesc: "Use the library 30 days in a row",
    progress: (_s, streak) => cap(streak, 30) },
  { id: "learner_100", rarity: "epic", target: 100, zhTitle: "学无止境", enTitle: "No End to Learning",
    zhDesc: "自动学习入库 100 条提示词", enDesc: "Auto-learn 100 prompts into the library",
    progress: (s) => cap(s.autoLearnedCount, 100) },
  { id: "word_25000", rarity: "epic", target: 25000, zhTitle: "卷帙浩繁", enTitle: "Towering Volumes",
    zhDesc: "收藏词条累计 2.5 万字", enDesc: "Stockpile 25,000 characters of prompts",
    progress: (s) => cap(s.totalBodyLength, 25000) },

  // ── 传说档（16）──
  { id: "use_1000", rarity: "legendary", target: 1000, zhTitle: "登峰造极", enTitle: "Peak Performance",
    zhDesc: "累计使用 1000 次提示词", enDesc: "Use prompts 1000 times in total",
    progress: (s) => cap(s.totalUsage, 1000) },
  { id: "use_2000", rarity: "legendary", target: 2000, zhTitle: "万法归一", enTitle: "Prompts Beyond Measure",
    zhDesc: "累计使用 2000 次提示词", enDesc: "Use prompts 2000 times in total",
    progress: (s) => cap(s.totalUsage, 2000) },
  { id: "collector_600", rarity: "legendary", target: 600, zhTitle: "词海藏珍", enTitle: "Treasure Trove",
    zhDesc: "词库收藏满 600 条提示词", enDesc: "Collect 600 prompts in the library",
    progress: (s) => cap(s.total, 600) },
  { id: "collector_900", rarity: "legendary", target: 900, zhTitle: "词中泰斗", enTitle: "Library Titan",
    zhDesc: "词库收藏满 900 条提示词", enDesc: "Collect 900 prompts in the library",
    progress: (s) => cap(s.total, 900) },
  { id: "streak_150", rarity: "legendary", target: 150, zhTitle: "岁月同行", enTitle: "Seasons Together",
    zhDesc: "连续 150 天使用词库", enDesc: "Use the library 150 days in a row",
    progress: (_s, streak) => cap(streak, 150) },
  { id: "tags_25", rarity: "legendary", target: 25, zhTitle: "标签大家", enTitle: "Tag Mastermind",
    zhDesc: "拥有 25 个不同标签", enDesc: "Keep 25 distinct tags",
    progress: (s) => cap(s.tagStats.length, 25) },
  { id: "used_500", rarity: "legendary", target: 500, zhTitle: "词海摆渡人", enTitle: "Library Ferryman",
    zhDesc: "累计用过 500 条不同的提示词", enDesc: "Use 500 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 500) },
  { id: "used_800", rarity: "legendary", target: 800, zhTitle: "博览群书", enTitle: "Immense Reading",
    zhDesc: "累计用过 800 条不同的提示词", enDesc: "Use 800 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 800) },
  { id: "ai_250", rarity: "legendary", target: 250, zhTitle: "AI 传世之师", enTitle: "AI Legendary",
    zhDesc: "累计用 AI 完善 250 条提示词", enDesc: "Polish 250 prompts with AI in total",
    progress: (s) => cap(s.aiRefinedCount, 250) },
  { id: "learner_150", rarity: "legendary", target: 150, zhTitle: "学贯古今", enTitle: "Era Scholar",
    zhDesc: "自动学习入库 150 条提示词", enDesc: "Auto-learn 150 prompts into the library",
    progress: (s) => cap(s.autoLearnedCount, 150) },
  { id: "hot_200", rarity: "legendary", target: 200, zhTitle: "万人空巷", enTitle: "Stampede",
    zhDesc: "近 7 天累计使用 200 次提示词", enDesc: "Use prompts 200 times within 7 days",
    progress: (s) => cap(s.usedIn7Days > 0 ? s.topUsed7.reduce((a, b) => a + b.count, 0) : 0, 200) },
  { id: "word_50000", rarity: "legendary", target: 50000, zhTitle: "汗牛充栋", enTitle: "Rafters of Books",
    zhDesc: "收藏词条累计 5 万字", enDesc: "Stockpile 50,000 characters of prompts",
    progress: (s) => cap(s.totalBodyLength, 50000) },
  { id: "trash_50", rarity: "legendary", target: 50, zhTitle: "断舍离大师", enTitle: "Declutter Guru",
    zhDesc: "回收站累计有 50 条提示词", enDesc: "Keep 50 prompts in the recycle bin",
    progress: (s) => cap(s.trashCount, 50) },
  { id: "author_100", rarity: "legendary", target: 100, zhTitle: "文思泉涌", enTitle: "Fountain of Words",
    zhDesc: "近 30 天新增 100 条提示词", enDesc: "Add 100 prompts within 30 days",
    progress: (s) => cap(s.addedIn30Days, 100) },
  { id: "streak_180", rarity: "legendary", target: 180, zhTitle: "半载同行", enTitle: "Half-Year Bond",
    zhDesc: "连续 180 天使用词库", enDesc: "Use the library 180 days in a row",
    progress: (_s, streak) => cap(streak, 180) },
  { id: "ai_cover_80", rarity: "legendary", target: 80, zhTitle: "人机合璧", enTitle: "Human-Machine Union",
    zhDesc: "AI 完善的词条占比达 80%", enDesc: "80% of your prompts polished by AI",
    progress: (s) => cap(s.aiRefinedPct, 80) },

  // ── 神话档（8）最高难度，对应最强的大阿卡纳（高塔/星星/月亮/太阳/审判/世界/恶魔/死神）──
  { id: "use_10000", rarity: "myth", target: 10000, zhTitle: "词海无涯", enTitle: "Boundless Words",
    zhDesc: "累计使用 10000 次提示词", enDesc: "Use prompts 10,000 times in total",
    progress: (s) => cap(s.totalUsage, 10000) },
  { id: "collector_1500", rarity: "myth", target: 1500, zhTitle: "词库浩瀚", enTitle: "A Galaxy of Prompts",
    zhDesc: "词库收藏满 1500 条提示词", enDesc: "Collect 1,500 prompts in the library",
    progress: (s) => cap(s.total, 1500) },
  { id: "used_3000", rarity: "myth", target: 3000, zhTitle: "博闻强识", enTitle: "Wide-Eyed",
    zhDesc: "累计用过 3000 条不同的提示词", enDesc: "Use 3,000 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 3000) },
  { id: "ai_1000", rarity: "myth", target: 1000, zhTitle: "AI 神明之手", enTitle: "Hand of the Gods",
    zhDesc: "累计用 AI 完善 1000 条提示词", enDesc: "Polish 1,000 prompts with AI in total",
    progress: (s) => cap(s.aiRefinedCount, 1000) },
  { id: "word_100000", rarity: "myth", target: 100000, zhTitle: "文墨通天", enTitle: "Words Reach the Sky",
    zhDesc: "收藏词条累计 10 万字", enDesc: "Stockpile 100,000 characters of prompts",
    progress: (s) => cap(s.totalBodyLength, 100000) },
  { id: "streak_1095", rarity: "myth", target: 1095, zhTitle: "三年之约", enTitle: "The Three-Year Oath",
    zhDesc: "连续 1095 天使用词库", enDesc: "Use the library 1,095 days in a row",
    progress: (_s, streak) => cap(streak, 1095) },
  { id: "hot_1000", rarity: "myth", target: 1000, zhTitle: "万箭齐发", enTitle: "Storm of Use",
    zhDesc: "近 7 天累计使用 1000 次提示词", enDesc: "Use prompts 1,000 times within 7 days",
    progress: (s) => cap(s.usedIn7Days > 0 ? s.topUsed7.reduce((a, b) => a + b.count, 0) : 0, 1000) },
  { id: "learner_1000", rarity: "myth", target: 1000, zhTitle: "海纳百川", enTitle: "All Rivers Flow",
    zhDesc: "自动学习入库 1000 条提示词", enDesc: "Auto-learn 1,000 prompts into the library",
    progress: (s) => cap(s.autoLearnedCount, 1000) },
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
    // 等级详情：各档门槛 + 积分来路 + 衰减规则（供前端展开展示）
    levelRules: LEVEL_RULES.map((r) => ({ level: r.level, threshold: r.threshold, zh: r.zh, en: r.en })),
    pointSources: POINT_SOURCE_META.map((m) => ({ kind: m.kind, points: POINTS_WEIGHT[m.kind], zh: m.zh, en: m.en })),
    decayRule:
      lang === "en"
        ? "Every 10 days without any activity, 3 points decay."
        : "每连续 10 天无任何活动，将衰减 3 积分。",
  };
}

// ── 报纸「成就速报」 ─────────────────────────────────────────────────────

const RARITY_LABEL: Record<Rarity, Record<GamifyLang, string>> = {
  common: { zh: "普通", en: "Common" },
  rare: { zh: "稀有", en: "Rare" },
  epic: { zh: "史诗", en: "Epic" },
  legendary: { zh: "传说", en: "Legendary" },
  myth: { zh: "神话", en: "Mythic" },
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
  const rarityOrder: Rarity[] = ["myth", "legendary", "epic", "rare", "common"];
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
