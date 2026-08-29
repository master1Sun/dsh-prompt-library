// 农历与二十四节气计算（中文），供词库助手底部实时信息条使用。
// 农历部分复用宿主 Intl 的汉历（zh-Hans-u-ca-chinese）；节气用太阳黄经近似公式（1900–2100 适用）。

export interface CalendarInfo {
  // 星期文本：中文「周一..周日」，英文「Sun..Sat」
  weekday: string;
  // 农历信息（仅中文）：如「农历 七月十六」；闰月形式如「农历 闰二月」
  lunar?: string;
  // 今日所处的节气名（若有）：如「处暑」
  term?: string;
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

/** 中文农历月日文本：如「七月十六」「闰二月廿八」；计算失败时返回 undefined。 */
function chineseLunar(d: Date): string | undefined {
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
    if (!month || !day) return undefined;
    return `农历 ${isLeap ? "闰" : ""}${month}${day}`;
  } catch {
    return undefined;
  }
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
  return {
    weekday,
    lunar: chineseLunar(d),
    term: solarTermOf(d.getFullYear(), d.getMonth(), d.getDate()),
  };
}