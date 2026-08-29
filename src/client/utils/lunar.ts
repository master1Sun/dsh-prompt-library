// 农历与二十四节气计算（中文），供词库助手底部实时信息条使用。
// 农历部分复用宿主 Intl 的汉历（zh-Hans-u-ca-chinese）；节气用太阳黄经近似公式（1900–2100 适用）。

export interface CalendarInfo {
  // 星期文本：中文「周一..周日」，英文「Sun..Sat」
  weekday: string;
  // 农历信息（仅中文）：如「农历 七月十六」；闰月形式如「农历 闰二月」
  lunar?: string;
  // 今日所处的节气名（若有）：如「处暑」
  term?: string;
  // 农历月日（数值，用于节日匹配；仅中文返回）。闰月仅标记 isLeap，不参与节日判定
  lunarMD?: { month: number; day: number; isLeap: boolean };
}

/** 传统节日信息（含中英文名与祝福语，随语言取用）。 */
export interface FestivalInfo {
  // 节日标识，用于 i18n 键 `pl.festival.<key>`
  key: string;
  // 节日中文名，如「中秋节」
  zh: string;
  // 节日英文名，如 "Mid-Autumn Festival"
  en: string;
}

/** 二十四节气名称，按节气顺序排列，index 0 对应小寒（每 15°太阳黄经一个）。 */
const TERM_NAMES = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分",
  "清明", "谷雨", "立夏", "小满", "芒种", "夏至",
  "小暑", "大暑", "立秋", "处暑", "白露", "秋分",
  "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
];

/**
 * 节气近似偏移系数（对应各节气相对 1900 年同日 02:05 UTC 的时间偏移，
 * 单位 ×60000ms；线性拟合自公开历表，1900–2100 年内精度通常可达 ±1 天）。
 */
const TERM_OFFSETS = [
  0, 21208, 42467, 63836, 85337, 107014,
  128867, 150921, 173149, 195551, 218072, 240693,
  263343, 285989, 308563, 331033, 353350, 375494,
  397447, 419210, 440795, 462224, 483532, 504758,
];

/** 计算第 n 个节气在年份 y 发生的本地时间戳（毫秒）。 */
function solarTermOffset(y: number, n: number): number {
  return Date.UTC(1900, 0, 6, 2, 5) + (31556925974.7 * (y - 1900) + TERM_OFFSETS[n] * 60000);
}

/** 获取某本地日期命中的节气名（当天是节气日才返回，否则 undefined）。 */
function solarTermOf(y: number, m: number, d: number): string | undefined {
  for (let i = 0; i < TERM_NAMES.length; i++) {
    const t = new Date(solarTermOffset(y, i));
    if (t.getFullYear() === y && t.getMonth() === m && t.getDate() === d) {
      return TERM_NAMES[i];
    }
  }
  return undefined;
}

/** 农历月名首字 → 数值（zh-Hans-u-ca-chinese 长格式：正月..十月、冬月、腊月）。 */
const LUNAR_MONTH_MAP: Record<string, number> = {
  正: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 冬: 11, 腊: 12,
};

/** 农历日中文数字 → 数值（初一..初十、十一..十九、二十..廿九、三十）。 */
const LUNAR_DAY_MAP: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

/** 解析农历月长文本（如「七月」「腊月」）为数值。 */
function parseLunarMonth(s: string): number {
  if (s.startsWith("十") && LUNAR_MONTH_MAP[s.slice(1)]) return 10 + LUNAR_MONTH_MAP[s.slice(1)];
  return LUNAR_MONTH_MAP[s[0]] ?? 0;
}

/** 解析农历日长文本（如「十六」「廿三」「三十」或数字「7」「15」）为数值。 */
function parseLunarDay(s: string): number {
  const n = parseInt(s, 10);
  if (Number.isFinite(n) && n >= 1 && n <= 30) return n;
  if (s === "三十" || s === "二十" || s === "十") return s === "三十" ? 30 : s === "二十" ? 20 : 10;
  if (s.startsWith("三十")) return 30;
  if (s.startsWith("二十")) return 20 + (LUNAR_DAY_MAP[s[2]] ?? 0);
  if (s.startsWith("廿")) return 20 + (LUNAR_DAY_MAP[s[1]] ?? 0);
  if (s.startsWith("初")) return LUNAR_DAY_MAP[s[1]] ?? 0;
  if (s.startsWith("十")) return 10 + (LUNAR_DAY_MAP[s[1]] ?? 0);
  return LUNAR_DAY_MAP[s[0]] ?? 0;
}

/** 农历月日（数值）：如 7月16日 → { month: 7, day: 16, isLeap: false }；计算失败返回 undefined。 */
function chineseLunarMD(d: Date): { month: number; day: number; isLeap: boolean } | undefined {
  try {
    const parts = new Intl.DateTimeFormat("zh-Hans-u-ca-chinese", {
      month: "long",
      day: "numeric",
    }).formatToParts(d);
    let month = "";
    let day = "";
    let isLeap = false;
    for (const p of parts) {
      if (p.type === "month") {
        month = p.value;
        if (month.includes("闰")) {
          isLeap = true;
          month = month.replace("闰", "");
        }
      } else if (p.type === "day") {
        day = p.value;
      }
    }
    const m = parseLunarMonth(month);
    const dd = parseLunarDay(day);
    if (!m || !dd) return undefined;
    return { month: m, day: dd, isLeap };
  } catch {
    return undefined;
  }
}

/** 中文农历月日文本：如「七月十六」「闰二月廿八」；计算失败时返回 undefined。 */
function chineseLunar(d: Date): string | undefined {
  const md = chineseLunarMD(d);
  if (!md) return undefined;
  // 月份中文长格式（正月..十月、冬月、腊月）
  const MONTH_LONG = ["", "正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];
  // 日期中文长格式（初一..初十、十一..十九、二十..廿九、三十）
  const DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
  return `农历 ${md.isLeap ? "闰" : ""}${MONTH_LONG[md.month] ?? ""}${DIGITS[md.day] ?? ""}`;
}

/** 农历传统节日表：month × day → 节日（闰月不参与判定）。 */
const LUNAR_FESTIVALS: FestivalInfo[] = [
  { key: "spring", zh: "春节", en: "Spring Festival" },
  { key: "lantern", zh: "元宵节", en: "Lantern Festival" },
  { key: "dragonboat", zh: "端午节", en: "Dragon Boat Festival" },
  { key: "qixi", zh: "七夕", en: "Qixi Festival" },
  { key: "zhongyuan", zh: "中元节", en: "Zhongyuan Festival" },
  { key: "midautumn", zh: "中秋节", en: "Mid-Autumn Festival" },
  { key: "chongyang", zh: "重阳节", en: "Double Ninth Festival" },
  { key: "laba", zh: "腊八节", en: "Laba Festival" },
];

/** 各农历节日对应的月份与日期（与 LUNAR_FESTIVALS 顺序一致）。 */
const FESTIVAL_DAY: Array<{ month: number; day: number }> = [
  { month: 1, day: 1 },   // 春节
  { month: 1, day: 15 },  // 元宵节
  { month: 5, day: 5 },   // 端午节
  { month: 7, day: 7 },   // 七夕
  { month: 7, day: 15 },  // 中元节
  { month: 8, day: 15 },  // 中秋节
  { month: 9, day: 9 },   // 重阳节
  { month: 12, day: 8 },  // 腊八节
];

/**
 * 获取某本地日期命中的传统节日（农历）；非节日或闰月返回 null。
 * 除夕（腊月最后一天）通过「次日为正月初一」判定。
 */
export function getFestival(d: Date): FestivalInfo | null {
  const md = chineseLunarMD(d);
  if (!md || md.isLeap) return null;
  for (let i = 0; i < LUNAR_FESTIVALS.length; i++) {
    const fd = FESTIVAL_DAY[i];
    if (fd.month === md.month && fd.day === md.day) return LUNAR_FESTIVALS[i];
  }
  // 除夕：腊月（12 月）最后一天，次日为正月初一
  if (md.month === 12) {
    const next = chineseLunarMD(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
    if (next && next.month === 1 && next.day === 1 && !next.isLeap)
      return { key: "newyeareve", zh: "除夕", en: "New Year's Eve" };
  }
  return null;
}

/**
 * 获取指定本地日期的基础历法信息（星期、农历、节气）。
 * @param d 目标本地日期
 * @param lang 界面语言：中文额外计算农历与节气；英文仅返回星期
 */
export function getCalendarToday(d: Date, lang: "zh" | "en"): CalendarInfo {
  const zh = lang === "zh";
  const weekday = zh
    ? "周" + ["日", "一", "二", "三", "四", "五", "六"][d.getDay()]
    : new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d);
  if (!zh) return { weekday };
  const md = chineseLunarMD(d);
  return {
    weekday,
    lunar: md ? chineseLunar(d) : undefined,
    term: solarTermOf(d.getFullYear(), d.getMonth(), d.getDate()),
    lunarMD: md,
  };
}