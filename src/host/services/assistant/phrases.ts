/**
 * 词库助手阶段文案表（host 端配置，推送给前端展示）。
 *
 * 按「聊天主题风格」分组，每种风格下的每个活动阶段配多套文案（轮换使用），
 * 中文/英文双语齐全，由 getActivity 按系统语言返回当前应展示的一条。
 * 主题风格依据最近聊天内容用轻量关键词分类；无法判断时回退到通用风格。
 */
import type { ActivityPhase } from "./activity.js";

/** 聊天主题风格。 */
export type TopicStyle = "code" | "writing" | "translate" | "qa" | "general";

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
 * 阶段文案表：风格 × 阶段 × 语言 × 多套。
 * 文案风格拟人俏皮、一眼秒懂；同一阶段多套在每次该阶段出现时轮换展示。
 */
const PHASE_COPY: Record<TopicStyle, Record<ActivityPhase, Record<CopyLang, string[]>>> = {
  code: {
    idle: { zh: ["待命中，随叫随到"], en: ["On standby, at your service"] },
    waiting: {
      zh: ["把需求甩过来，我这就撸码", "代码有啥疑难杂症？尽管问"],
      en: ["Throw me your request, I'll start coding", "Code got you stuck? Fire away"],
    },
    thinking: {
      zh: ["正在给代码做体检…", "大脑正在编译你的需求…"],
      en: ["Running a health check on the code…", "Compiling your request in my head…"],
    },
    tool: {
      zh: ["正在拉出代码助手…", "工具链已就位，稍等…"],
      en: ["Summoning the code helper…", "Toolchain loaded, hang tight…"],
    },
    review: {
      zh: ["正在清理代码草稿…", "正在整理答案的格式…"],
      en: ["Cleaning up the code draft…", "Formatting the answer…"],
    },
    done: {
      zh: ["代码出炉，请验收！", "搞定了，跑得通！"],
      en: ["Code's out — review it!", "Done, and it runs!"],
    },
    failed: {
      zh: ["代码没跑通，重试下？", "又出 bug 了，稍后再战"],
      en: ["Code didn't run, retry?", "Hit a bug, let's try again"],
    },
  },
  writing: {
    idle: { zh: ["待命中，随叫随到"], en: ["On standby, at your service"] },
    waiting: {
      zh: ["灵感要来了？我文思泉涌", "请开始你的创作，我随时接梗"],
      en: ["Feeling inspired? My muse is ready", "Start creating, I'll pick up the beat"],
    },
    thinking: {
      zh: ["正在推敲遣词造句…", "文字正在脑内排兵布阵…"],
      en: ["Weighing every word…", "Words lining up in my head…"],
    },
    tool: {
      zh: ["正在调出文房四宝…", "笔杆子已备好…"],
      en: ["Fetching my quill and ink…", "Pen at the ready…"],
    },
    review: {
      zh: ["正在润色文字…", "正在把草稿变成成品…"],
      en: ["Polishing the prose…", "Turning the draft into a gem…"],
    },
    done: {
      zh: ["大作完工，请过目！", "字斟句酌完毕，请审阅！"],
      en: ["Masterpiece done — take a look!", "Words refined, ready for review!"],
    },
    failed: {
      zh: ["这稿子翻车了，再来？", "文思断线，重来一次？"],
      en: ["Draft went sideways, retry?", "Muse left me, try again?"],
    },
  },
  translate: {
    idle: { zh: ["待命中，随叫随到"], en: ["On standby, at your service"] },
    waiting: {
      zh: ["要翻哪国语言？包在我身上", "来吧，把要翻译的话交给我"],
      en: ["Which language? I've got you", "Hand me the text to translate"],
    },
    thinking: {
      zh: ["正在脑内切换语言…", "查字典模式启动…"],
      en: ["Switching languages in my head…", "Dictionary mode on…"],
    },
    tool: {
      zh: ["正在调出词典…", "翻译引擎预热中…"],
      en: ["Opening the dictionary…", "Warming up the translator…"],
    },
    review: {
      zh: ["正在校准译文…", "正在检查语句通顺度…"],
      en: ["Fine-tuning the translation…", "Checking the wording…"],
    },
    done: {
      zh: ["译文出炉，请验收！", "翻译完成，稳稳的！"],
      en: ["Translation ready — check it!", "Translated, and rock solid!"],
    },
    failed: {
      zh: ["翻译卡壳了，再来？", "译文没生成好，稍后再试"],
      en: ["Translation hiccup, retry?", "Translation failed, try again soon"],
    },
  },
  qa: {
    idle: { zh: ["待命中，随叫随到"], en: ["On standby, at your service"] },
    waiting: {
      zh: ["有什么想不开的问题？欢迎来问", "知识库已就绪，请出题"],
      en: ["Got a burning question? Ask away", "Knowledge base ready — quiz me"],
    },
    thinking: {
      zh: ["正在翻查知识库…", "资料正在脑子里高速运转…"],
      en: ["Digging through my knowledge…", "Data whirling in my head…"],
    },
    tool: {
      zh: ["正在连线资料库…", "检索工具已上线…"],
      en: ["Dialing into the archives…", "Search engine online…"],
    },
    review: {
      zh: ["正在汇总要点…", "正在整理结论…"],
      en: ["Summing up the key points…", "Wrapping up the answer…"],
    },
    done: {
      zh: ["答案已打包，请查收！", "问题已拿下！"],
      en: ["Answer ready — catch!", "Question, conquered!"],
    },
    failed: {
      zh: ["没查到满意答案，重试？", "这题超纲了，再来一次？"],
      en: ["No solid answer found, retry?", "That one's beyond me, try again?"],
    },
  },
  general: {
    idle: { zh: ["待命中，随叫随到"], en: ["On standby, at your service"] },
    waiting: {
      zh: ["请开始你的表演", "说吧，我洗耳恭听"],
      en: ["Your move!", "Go ahead, I'm all ears"],
    },
    thinking: {
      zh: ["CPU 已拉满…", "脑细胞正在加班…"],
      en: ["Brains in overdrive…", "Brain cells working overtime…"],
    },
    tool: {
      zh: ["正在掏工具箱…", "法宝正在加载…"],
      en: ["Grabbing my toolbox…", "Loading my superpower…"],
    },
    review: {
      zh: ["正在收拾摊子…", "正在把思路捋顺…"],
      en: ["Tidying up…", "Getting my thoughts in line…"],
    },
    done: {
      zh: ["搞定，收工！", "漂亮，交卷！"],
      en: ["Nailed it, done!", "Beautiful — mission complete!"],
    },
    failed: {
      zh: ["翻车了，再来一次？", "哎哟，这局有点悬"],
      en: ["Oops, crashed. Retry?", "Yikes, that was a close one"],
    },
  },
};

/**
 * 取某个阶段应展示的文案（组内按序号轮换）。
 * counter 为累计命中次数（同一阶段每次出现递增），取模后轮换。
 */
export function pickPhaseCopy(
  lang: CopyLang,
  phase: ActivityPhase,
  style: TopicStyle,
  counter: number,
): string {
  const group = PHASE_COPY[style][phase][lang];
  return group[counter % group.length];
}
