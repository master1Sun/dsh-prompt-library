/**
 * 词库助手状态流（复用全插件唯一的那条 WS 连接）。
 *
 * 原先 `/assistant/stream` 是一条独立的长连接，现在与数据变更广播合并到同一条
 * `/api/prompt-library/events` 连接上：连接建立时各推一次活动快照与游戏化快照，
 * 之后状态变化时分类型推 `{type:"activity"|"status", data}`；客户端可用
 * `{type:"set-lang", lang}` 消息切换本连接的文案语言。
 */
import { getActivity, onActivityChange } from "./activity.js";
import {
  buildAssistantStatus,
  computeAchievementProgress,
  onStatusChange,
} from "./gamification.js";
import {
  computeLibraryStats,
  computePoints,
  computeStreak,
  syncAchievementProgress,
} from "./store.js";
import type { WsSession } from "./ws.js";

/** 从请求 URL 解析文案语言（zh/en），解析失败回落 zh。 */
function parseLang(url: string | undefined): "zh" | "en" {
  let lang = "zh";
  try {
    const raw = url ?? "";
    const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
    const lv = new URLSearchParams(q).get("lang");
    if (lv) lang = lv;
  } catch {
    /* 解析失败用默认 zh */
  }
  return lang.toLowerCase().startsWith("en") ? "en" : "zh";
}

/** 构建一次游戏化快照（统计 / 连续活跃 / 积分 / 成就进度）。 */
async function buildStatus(lang: "zh" | "en") {
  const [stats, streak, points] = await Promise.all([
    computeLibraryStats().catch(() => undefined),
    computeStreak().catch(() => 0),
    computePoints().catch(() => ({
      gross: 0,
      decay: 0,
      net: 0,
      inactiveDays: 0,
      lastActiveAt: 0,
    })),
  ]);
  const progress = syncAchievementProgress(computeAchievementProgress(stats, streak));
  return buildAssistantStatus(stats, streak, lang, points, progress);
}

/**
 * 把助手状态流挂到一条已建立的 WS 连接上。
 * 立即推一次当前快照，并订阅两侧状态变化；连接关闭时自动退订。
 */
export function attachAssistantStream(session: WsSession): void {
  let lang = parseLang(session.req.url);

  const sendActivity = () => {
    if (session.closed) return;
    session.send(JSON.stringify({ type: "activity", data: getActivity(lang) }));
  };
  const sendStatus = async () => {
    const status = await buildStatus(lang);
    if (session.closed) return;
    session.send(JSON.stringify({ type: "status", data: status }));
  };
  const pushAll = () => {
    sendActivity();
    void sendStatus();
  };

  pushAll();

  const unsubActivity = onActivityChange(sendActivity);
  const unsubStatus = onStatusChange(sendStatus);
  session.onClose(() => {
    unsubActivity();
    unsubStatus();
  });

  // 客户端切换文案语言：更新本连接的语言并重推一次快照。
  session.onMessage((raw) => {
    let message: { type?: string; lang?: unknown };
    try {
      message = JSON.parse(raw) as { type?: string; lang?: unknown };
    } catch {
      return;
    }
    if (message?.type !== "set-lang" || typeof message.lang !== "string") return;
    const next: "zh" | "en" = message.lang.toLowerCase().startsWith("en") ? "en" : "zh";
    if (next === lang) return;
    lang = next;
    pushAll();
  });
}
