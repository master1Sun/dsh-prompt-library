/**
 * 词库助手阶段文案表（host 端配置，推送给前端展示）。
 *
 * 词库助手统一使用鲸鱼款形象，文案拟人俏皮、带深海治愈感且不分聊天主题；
 * 中文/英文双语齐全，由 getActivity 按系统语言返回当前应展示的一条。
 * 同一阶段每次出现时在多套文案间轮换展示。
 */
import type { ActivityPhase } from "./activity.js";

/** 聊天主题风格。 */
export type TopicStyle = "code" | "writing" | "translate" | "qa" | "general";

/** 助手形象：鲸鱼款（静态）、鲸鱼款·动效（dsh-pet）。 */
export type CharacterKey = "whale" | "dshpet";

/** 规范化语言：zh / en。 */
export type CopyLang = "zh" | "en";

/** 主题风格 → 命中关键词（小写匹配；同义词越多越靠前/命中率越高）。 */
const STYLE_KEYWORDS: Record<Exclude<TopicStyle, "general">, string[]> = {
  code: [
    "代码", "编程", "开发", "bug", "报错", "函数", "接口", "数据库", "前端", "后端",
    "python", "javascript", "typescript", "java", "go ", "rust", "c++", "c#", "sql",
    "代码", "函数", "变量", "算法", "数组", "编译", "部署", "github", "git ", "api",
  ],
  writing: [
    "写作", "文案", "标题", "文章", "润色", "扩写", "改写", "总结", "摘要", "邮件",
    "报告", "剧本", "小说", "歌词", "简历", "essay", "article", "draft", "rewrite",
  ],
  translate: [
    "翻译", "译成", "翻译成", "中译", "英译", "译文", "translate", "translation",
  ],
  qa: [
    "是什么", "为什么", "怎么", "如何", "能否", "区别", "解释", "原理", "含义",
    "what is", "why", "how to", "explain", "difference",
  ],
};

/** 主题风格 → 中文展示标签（可选，用于调试/未来扩展）。 */
const STYLE_LABEL_ZH: Record<TopicStyle, string> = {
  code: "代码",
  writing: "写作",
  translate: "翻译",
  qa: "问答",
  general: "通用",
};

/**
 * 依据最近聊天文本粗分类主题风格（轻量关键词匹配，命中词数最多的风格胜出）。
 * 文本为空或无法判断时返回通用风格。
 */
export function classifyTopic(text: string): TopicStyle {
  const low = text.toLowerCase();
  let best: TopicStyle = "general";
  let bestHits = 0;
  for (const [style, kws] of Object.entries(STYLE_KEYWORDS) as [Exclude<TopicStyle, "general">, string[]][]) {
    let hits = 0;
    for (const kw of kws) if (low.includes(kw)) hits += 1;
    if (hits > bestHits) {
      bestHits = hits;
      best = style;
    }
  }
  return best;
}

/** 主题风格中文标签（按需使用）。 */
export function topicLabelZh(style: TopicStyle): string {
  return STYLE_LABEL_ZH[style];
}

/**
 * 鲸鱼款阶段文案表：阶段 × 语言 × 多套。
 * 语气保留拟人亲和感，但收敛为平实、正常的助口语，不过度卖萌或花哨；
 * 同一阶段多套在每次该阶段出现时轮换展示。
 */
const PHASE_COPY_WHALE: Record<ActivityPhase, Record<CopyLang, string[]>> = {
  idle: {
    zh: ["在这里等你发令", "暂停待命，随时出发", "等待你的下一条指令", "深呼吸，准备就绪"],
    en: [
      "Here waiting for your word",
      "On standby, ready to go",
      "Awaiting your next instruction",
      "Deep breath, all set to go",
    ],
  },
  waiting: {
    zh: [
      "等待模型响应", "呼叫大脑中，请稍等", "信号发射中，等一个回音", "灵感正在路上",
      "竖起耳朵等回复", "大脑正在加载", "它在组织语言，别催", "等它热身完毕",
      "等待连接中", "屏住呼吸等回复",
    ],
    en: [
      "Waiting for the model to respond",
      "Calling the brain, one moment",
      "Sending signals, waiting for a reply",
      "Inspiration is on its way",
      "Ears up, waiting for an answer",
      "The brain is loading",
      "It's wording things, don't rush",
      "Waiting for it to warm up",
      "Still connecting",
      "Holding my breath for the reply",
    ],
  },
  thinking: {
    zh: [
      "正在思考", "嗯……让我想一想", "分析中", "思绪正在梳理", "正在整理思路",
      "眉头一皱，认真分析", "让思路沉淀一下", "正在把线索捋一捋", "别催，在想呢",
      "大脑正在运转", "让我好好想想这个问题", "嗯，有点意思……",
    ],
    en: [
      "Thinking…", "Hmm… let me think", "Analysing", "Sorting through my thoughts",
      "Organizing my thoughts", "Thinking it over carefully", "Letting the idea settle",
      "Tying the clues together", "No rush, I'm thinking", "Working it out",
      "Let me think this through", "Hmm, that's interesting…",
    ],
  },
  tool: {
    zh: [
      "正在处理工具结果", "看看带回什么结果", "正在解析工具返回", "结果解读中",
      "正在核对工具输出", "把线索拼接起来", "结果到手，继续前进",
    ],
    en: [
      "Processing the tool result", "Let's see what it brought back",
      "Parsing the tool output", "Reading the findings", "Checking the tool output",
      "Piecing the clues together", "Result in hand, moving on",
    ],
  },
  review: {
    zh: [
      "正在整理回复", "把想法写下来", "组织语言中", "字斟句酌中",
      "正在生成回复", "把答案整理成文", "遣词造句打磨中", "把最好的表达挑出来",
    ],
    en: [
      "Composing my reply", "Putting thoughts to words", "Organizing my response",
      "Choosing each word carefully", "Drafting the reply", "Framing the answer",
      "Polishing the wording", "Picking the best way to say it",
    ],
  },
  done: {
    zh: [
      "已完成", "搞定，收工", "任务达成", "这一轮圆满完成",
      "顺利抵达终点", "拿下，收工", "稳了，圆满收官",
    ],
    en: [
      "Done", "All set", "Task complete", "This one wrapped up well",
      "Made it to the finish", "Got it, wrapping up", "Solid, clean finish",
    ],
  },
  failed: {
    zh: [
      "执行失败", "哎呀，中途卡住了", "这一步没能走完", "出了点岔子，缓一下再来",
      "工具执行失败", "没跑通，再试一次",
    ],
    en: [
      "Failed", "Hmm, got stuck mid-way", "Couldn't finish this step",
      "Hit a snag, let's retry", "Tool execution failed", "Didn't get through, try again",
    ],
  },
};

/**
 * 取某个阶段应展示的文案（组内按序号轮换）。
 * counter 为累计命中次数（同一阶段每次出现递增），取模后轮换。
 * 词库助手统一使用鲸鱼款无主题文案。
 */
export function pickPhaseCopy(
  lang: CopyLang,
  phase: ActivityPhase,
  counter: number,
): string {
  return PHASE_COPY_WHALE[phase][lang][counter % PHASE_COPY_WHALE[phase][lang].length];
}