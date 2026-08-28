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
 * 语气拟人俏皮、带深海治愈感，不分主题；同一阶段多套在每次该阶段出现时轮换展示。
 */
const PHASE_COPY_WHALE: Record<ActivityPhase, Record<CopyLang, string[]>> = {
  idle: {
    zh: ["在这里等你发令", "暂停待命，随时出发", "蹲一个继续的指令", "深呼吸，准备就绪"],
    en: [
      "Here waiting for your word",
      "On standby, ready to go",
      "Awaiting a go signal",
      "Deep breath, all set to go",
    ],
  },
  waiting: {
    zh: [
      "等待模型响应", "呼叫大脑中，请稍等", "信号发射中，等一个回音", "灵感正在路上～",
      "竖起耳朵等回复", "大脑在咕噜咕噜加载", "等它伸个懒腰再开口", "模型：来了来了",
      "等一个灵感砸中我", "滴——等待连线中", "它在组织语言，别催", "等它热身完毕",
      "灵感快递派送中", "屏住呼吸等回复",
    ],
    en: [
      "Waiting for the model to respond",
      "Calling the brain, one moment",
      "Sending signals, waiting for a reply",
      "Inspiration is on its way~",
      "Ears up, waiting for an answer",
      "Brain is chugging along",
      "Letting it stretch before it speaks",
      "Model: coming, coming",
      "Waiting for a spark to hit me",
      "Beep — still connecting",
      "It's wording things, don't rush",
      "Waiting for it to warm up",
      "Inspiration express, on its way",
      "Holding my breath for the reply",
    ],
  },
  thinking: {
    zh: [
      "正在思考", "嗯……让我想一想", "脑内风暴进行中", "思绪咕噜咕噜冒泡", "灵光集结中～",
      "眉头一皱，认真分析", "左脑右脑一起开会", "答案正在浮出水面", "盘一下，盘一下逻辑",
      "让子弹再飞一会儿", "别催别催，在想呢", "大脑转起来了", "让我把线索捋一捋",
      "脑内跑火车中", "小脑瓜高速运转", "让我琢磨琢磨", "翻翻脑子里的藏书",
      "让我嚼一嚼这个问题", "脑子在煮咖啡，马上好", "思考的鱼游来了",
      "让我康康这里面的门道", "正在盘逻辑链", "思绪整理收纳中", "嗯？有点意思……",
      "让思路沉淀一下", "脑内弹幕飞速滚动",
    ],
    en: [
      "Thinking…", "Hmm… let me mull it over", "Brainstorm in progress", "Thoughts bubbling up",
      "Gathering sparks~", "Frowning, analysing carefully", "Left brain and right brain in a huddle",
      "The answer is surfacing", "Let me untangle the logic", "Letting it all sink in",
      "No rush, I'm thinking", "Brain's spinning up", "Let me connect the dots",
      "Thoughts racing along", "Little head at full speed", "Let me chew on this",
      "Browsing the library in my head", "Let me chew over this question",
      "Brain's brewing coffee, almost done", "A thought-fish just swam by",
      "Let me peek at the trick here", "Unravelling the logic chain",
      "Sorting and storing thoughts", "Hmm? Now that's interesting…",
      "Letting the idea settle", "Thoughts scrolling by at light speed",
    ],
  },
  tool: {
    zh: [
      "处理工具结果", "看看带回了什么", "消化一下刚到的结果", "结果解读中～", "验收工具的成果",
      "把线索拼接起来", "战利品清点中", "这份结果有点东西", "把新情报归档", "结果到手，继续前进",
    ],
    en: [
      "Processing the tool result",
      "Let's see what it brought back",
      "Taking in the fresh result",
      "Reading the findings~",
      "Checking the tool's work",
      "Piecing the clues together",
      "Counting the loot",
      "Now this result is interesting",
      "Filing the new intel",
      "Result in hand, onward",
    ],
  },
  review: {
    zh: [
      "整理回复中", "把想法写下来", "组织语言中～", "落笔成文，请稍候", "字斟句酌中",
      "把答案装进信封里", "遣词造句打磨中", "把思绪码成整整齐齐的字", "奋笔疾书中",
      "把最好的表达挑出来", "文字排版美容师上线", "收尾润色一下下",
    ],
    en: [
      "Polishing the reply",
      "Putting thoughts to paper",
      "Organizing my words~",
      "Writing it out, one moment",
      "Choosing each word carefully",
      "Sealing the answer in an envelope",
      "Whittling the wording",
      "Lining thoughts up into neat words",
      "Writing away at full speed",
      "Picking the best way to say it",
      "The word-stylist is on",
      "Just adding a final polish",
    ],
  },
  done: {
    zh: [
      "完成啦", "搞定收工～", "任务达成，耶！", "这一轮圆满完成", "顺利抵达终点", "收工！求摸摸奖励",
      "交差！下一位", "齐活，漂亮收官", "拿下！击掌～", "稳了，满分交卷", "搞定，去喝口水",
      "完工咯，转个圈圈", "这一轮，我们配合满分", "妥了妥了，收工收工",
    ],
    en: [
      "All done!", "Nailed it, wrapping up~", "Task complete, yay!", "This round, flawlessly done",
      "Made it to the finish", "Done! Pet me as a reward?", "Handing it in! Next, please",
      "All set, beautiful finish", "Got it! High five~", "Solid, perfect score", "Done, time for water",
      "All wrapped up, spinning in circles", "That round, we were the perfect team",
      "Sorted, sorted — done, done",
    ],
  },
  failed: {
    zh: [
      "执行失败", "哎呀，中途卡住了", "这一步没能走完", "被小石头绊倒了", "半路翻车了，揉揉膝盖",
      "出了点岔子，缓缓再来", "工具执行失败", "工具闹脾气了，哄哄它", "哎呀，工具掉链子了",
      "这个工具今天不太听话", "工具翻车了，扶起来继续", "没跑通，再来一次",
      "工具：我罢工三秒钟", "这一步摔了一跤，没事",
    ],
    en: [
      "Execution failed", "Oops, got stuck mid-way", "Couldn't finish this step",
      "Tripped over a little stone", "Took a tumble, rubbing my knees",
      "Hit a snag, catch our breath and retry", "Tool execution failed",
      "Tool's throwing a tantrum, let's soothe it", "Oops, the tool fell off track",
      "This tool's being stubborn today", "The tool flipped over — pick it up and go on",
      "Didn't get through, try again", "Tool: I'm on strike for three seconds",
      "This step stumbled, no worries",
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