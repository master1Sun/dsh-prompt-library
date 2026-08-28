/**
 * 词库插件版本管理 — 每个版本附带更新说明（通告），支持多语言。
 *
 * 公告弹窗读取这里的版本列表，按版本号倒序展示：
 *   vX.Y.Z —— 每版本标题 + 更新要点列表，排版清晰。
 *
 * 修改版本：在 VERSION_NOTES 数组顶部追加新条目即可（最新在上）。
 * 发布新版本时，同步 package.json 版本号与这里的条目，保证通告内容真实准确。
 */

/** 单条版本更新说明。 */
export interface VersionNote {
  /** 版本号，如 "0.8.11"。 */
  version: string;
  /** 发布日期（可选），YYYY-MM-DD。 */
  date?: string;
  /** 版本亮点（多语言）。 */
  zh: {
    /** 版本标题，如 "公告动态配置 + 自动更新 + 模板变量优化"。 */
    title: string;
    /** 更新要点列表，一条一句。 */
    items: string[];
  };
  en: {
    title: string;
    items: string[];
  };
}

/**
 * 版本更新列表 — 按版本倒序排列（最新在上）。
 * 新增版本在数组首部追加即可。
 */
export const VERSION_NOTES: VersionNote[] = [
  {
    version: "0.9.3",
    date: "2026-08-28",
    zh: {
      title: "等级配色 · 技能管理 · 数据管理整合 · 图标统一",
      items: [
        "等级配色：词库助手米兔身体随之色系（灰→蓝→绿→紫→黄→橙），2 级起背后带同色光晕，满级升级为炫彩彩虹光晕。",
        "成就配色：等级圆环、进度条、当前等级统计行统一跟随等级色，与助手皮肤一致，不再混用品牌蓝。",
        "技能管理：右键菜单新增「技能管理」入口，列出系统与项目级 harness 技能，可逐项开关自动注入。",
        "数据管理：标签管理与回收站合并为「标签数据」弹窗，采用与人格管理一致的左右双栏独立滚动布局。",
        "图标统一：侧边栏、聊天按钮及人格/技能/数据管理弹窗统一使用书本图标，随文本色渲染。",
        "导入导出优化：技能导入导出与目录选择等操作整理到独立弹窗，流程更清晰。",
      ],
    },
    en: {
      title: "Level colors · Skill manager · Data management merge · Unified icon",
      items: [
        "Level colors: the assistant rabbit recolor follows the level ladder (grey→blue→green→purple→yellow→orange); from level 2 it glows in its level color, and at max level it becomes a rainbow prism glow.",
        "Achievement colors: the level ring, progress bar and current-level stats row all follow the level color, matching the assistant skin instead of the brand blue.",
        "Skill manager: a new \"Skills\" entry in the context menu lists system and project harness skills with per-item auto-injection toggles.",
        "Data management: tag management and the trash merge into a single \"Tag data\" dialog with a two-column independently-scrolling layout like the persona manager.",
        "Unified icon: the sidebar, chat button and persona/skill/data dialogs all use the bookmark icon, tinted by text color.",
        "Import/export polish: skill import/export and directory picking move into dedicated dialogs for a clearer flow.",
      ],
    },
  },
  {
    version: "0.9.2",
    date: "2026-08-28",
    zh: {
      title: "会话技能注入 · 导入标签下拉 · 公告优化",
      items: [
        "会话技能：可绑定技能到指定会话，启用后该会话自动注入对应技能提示词。",
        "技能管理：词库管理更名为「技能管理」，支持创建、编辑、绑定会话与注入技能。",
        "导入标签：导入提示词的标签改为下拉选择既有标签，不再自由输入，界面更规范。",
        "公告优化：修复历史期次无法切换、今日当前期高亮不清的问题，历史下拉与导航按钮增加悬停反馈。",
        "今日日报：AI 生成日报失败时会自动重试补齐，避免永久显示「今日暂无推荐」。",
        "设置文案：选项名称更简洁（词库管理 / 公告 / 等级徽章 / 成就公告），并移除冗余的条件说明。",
      ],
    },
    en: {
      title: "Session skill injection · Import tag dropdown · Announcement polish",
      items: [
        "Session skills: bind a skill to specific sessions; when enabled, the session auto-injects the skill prompt.",
        "Skill manager: \"Word bank\" is renamed \"Skills\" with create, edit, session-binding and injection.",
        "Import tags: the tag field in import is now a dropdown of existing tags instead of free text.",
        "Announcement polish: fixed history issues not switchable and unclear current-issue highlight; history dropdown and nav buttons gain hover feedback.",
        "Daily report: failed AI report generation now retries to backfill instead of staying \"No recommendations today\".",
        "Settings copy: option names simplified (Assistant panel / Announcement / Level badge / Achievements) and redundant conditional text removed.",
      ],
    },
  },
  {
    version: "0.9.1",
    date: "2026-08-27",
    zh: {
      title: "每日日报 · 鲸鱼形象 · 成就与洞察升级",
      items: [
        "每日日报：公告弹窗新增「词库日报」与「成就速报」，每日推荐与历史期数可切换，一键阅读原文。",
        "鲸鱼新形象：新增「鲸鱼款」助手形象（静态 / 动效两种），与小白兔随时切换。",
        "洞察视图：统计面板新增「洞察」页，含词库健康评分、成长曲线、使用高峰洞察、热门标签与本周热词。",
        "成就详情：成就弹窗可展开等级详情，展示各等级所需积分、积分获取来路与衰减规则。",
        "每日幸运签：打开成就页随机抽取好运签，六种签文点缀每日心情。",
        "稀有度补全：成就稀有度体系加入「神话」档位，集齐传说与神话更添收集乐趣。",
        "默认人格完整模板：默认人格开箱即含词库助手完整设定；新建自定义人格仍只留标题占位，由你自行填写。",
        "纯图标默认：词库与 AI 优化按钮默认改为纯图标显示，界面更清爽，可在设置中随时改回图文模式。",
      ],
    },
    en: {
      title: "Daily report · Whale look · Achievements & insights",
      items: [
        "Daily report: the announcement dialog gains \"The Prompt Daily\" and \"Achievement Briefs\" — daily picks with a history list and a read-article link.",
        "Whale look: new \"Whale\" assistant appearance (static / animated), switchable with the rabbit and the husky anytime.",
        "Insights tab: the stats panel adds an \"Insights\" view — library health score, growth curve, peak-hour insights, hot tags and weekly hot words.",
        "Achievement details: the dialog can expand level details, showing points per level, how to earn points and the decay rule.",
        "Daily lucky draw: opening the achievements page draws a fortune slip, six flavors to brighten the day.",
        "Rarity filled out: the achievement rarity ladder gains a \"Mythic\" tier to deepen the collection fun.",
        "Full default persona: the default SOUL ships with a complete assistant setup; new custom personas still start with a blank title-only template for you to fill in.",
        "Icon-only by default: the library and AI-polish buttons now default to icon-only for a cleaner UI, switchable back in settings.",
      ],
    },
  },
  {
    version: "0.9.0",
    date: "2026-08-26",
    zh: {
      title: "哈士奇形象 · 满级解锁 · 导入归零 · 人格留白",
      items: [
        "新增「哈士奇」助手形象，灰白毛色、冰蓝眼睛，与米兔形象可随时切换。",
        "成就满级后解锁「显示词库助手」开关，可自由开启/关闭；未满级前开关置灰，助手强制常驻。",
        "导入的数据使用次数归零，按「新数据」处理；备份恢复仍保留原使用记录。",
        "新建人格默认只有一行标题，正文留空由你自己填写。",
        "等级回落：30 天未使用自动降一级，等级不再只升不降。",
        "成就升级：成就弹窗改为等级圆环 + 奖牌墙，不同等级助手配色与星章不同。",
        "助手换装：按聊天主题切换职业形象（代码-工程师帽 / 写作-贝雷帽 / 翻译-领带 / 问答-眼镜）。",
        "心情系统：助手记录每日会话成败，成功开心蹦跳、失败垂头丧气，情绪同步到动作与气泡。",
        "设置新增「等级助手」「我的等级公告」开关，可分别控制等级徽章、成就入口与解锁播报。",
        "词库助手左键不再联动面板，开合统一走右键菜单；右键菜单按开关显隐。",
        "修复公告弹窗无法打开的问题。",
      ],
    },
    en: {
      title: "Husky look · Max-level unlock · Fresh ledger · Blank personae",
      items: [
        "New \"Husky\" assistant look with grey fur and ice-blue eyes, switchable with the classic rabbit anytime.",
        "Reaching the max level unlocks the \"Show assistant\" toggle; below max it stays disabled and the assistant is always shown.",
        "Imported prompts begin at zero usage and are treated as new data; backup restores keep their original usage.",
        "A new persona opens with a single title line; the body is left blank for you to fill in.",
        "Level decay: unused for 30 days drops one level; levels can now decrease.",
        "Achievements upgrade: dialog reworked into a level ring + medal wall; each level shows distinct colors and star badges.",
        "Costumes: the assistant switches outfits by chat topic (engineer hat for code / beret for writing / tie for translation / glasses for Q&A).",
        "Mood system: the assistant records daily session wins/losses — happy and bouncy on success, downcast on failure, reflected in actions and bubbles.",
        "New toggles \"Level assistant\" and \"Level announcements\" control the level badge, achievements entry and unlock toasts.",
        "Left-click no longer toggles the panel; open/close goes through the context menu, which hides itself based on the toggles.",
        "Fixed the announcement dialog not opening.",
      ],
    },
  },
  {
    version: "0.8.15",
    date: "2026-08-25",
    zh: {
      title: "查看详情 · 全局主题提示 · 卡片列表",
      items: [
        "查看详情：聊天框与侧边栏新增「查看」按钮，展示完整标题、标签与正文预览；查看时点击外部不关闭面板，仅可手动关闭。",
        "全局主题提示：所有鼠标悬停提示改为随黑夜/白天模式自适应渲染，并修复「#」浮层内提示被遮挡的问题。",
        "卡片列表：设置面板的导入导出、标签管理、回收站列表统一改为卡片样式，信息层次更清晰。",
        "长文本截断：侧边栏折叠标签、查看面板标签、标签过滤条过长内容统一以省略号截断并悬停显示完整内容。",
        "上下文推荐智能化：输入框为空时基于最近对话智能推荐提示词，最多 5 条，按相关度 + 常用度综合评分排序，不再随机推荐。",
        "版本说明匹配：公告弹窗按当前运行版本展示对应的更新内容，不再固定显示最新版。",
        "套模板分类过滤：模板选择弹窗支持按标签分类筛选，并与搜索词叠加生效。",
        "套模板体验优化：弹窗固定宽高（仅窗口缩放时自适应），顶部展示选中内容预览；取消变量填充时返回模板选择页并保留搜索/标签状态。",
        "变量默认名本地化：{{}} 插入按钮的默认变量名按界面语言显示（中文「变量名」/ 英文「variable」）。",
      ],
    },
    en: {
      title: "View details · Themed tooltips · Card lists",
      items: [
        "View action: chat and sidebar panels gain a \"View\" button showing full title, tags and body; the panel stays open on outside clicks and closes only manually.",
        "Themed tooltips: all hover tooltips now adapt to light/dark mode, and the tooltip inside the \"#\" overlay is no longer hidden behind the popup.",
        "Card lists: import/export, tag management and trash lists in settings are reworked into card-style rows with clearer hierarchy.",
        "Truncation: long sidebar group tags, view-panel tags and filter-bar chips now truncate with ellipsis and show the full value on hover.",
        "Smart context recommendations: when the input is empty, up to 5 prompts are suggested from the recent conversation, ranked by a combined relevance + usage score instead of random picks.",
        "Version-matched release notes: the announcement dialog now shows notes for the current running version rather than always the latest.",
        "Template tag filtering: the template picker supports filtering by tag categories, stacked with the keyword search.",
        "Template flow polish: fixed modal size (only shrinks when the window is smaller), a selected-content preview on top, and cancelling the variable fill returns to the picker keeping search/tag state.",
        "Localized default variable name: the {{}} insert button uses the UI-language default (变量名 in Chinese, variable in English).",
      ],
    },
  },
  {
    version: "0.8.14",
    date: "2026-08-25",
    zh: {
      title: "导出技能 AI 生成 · 自定义 JSON 导入",
      items: [
        "导出技能 AI 生成：校验通过后自动逐条用 AI 生成英文技能名与描述，正文中的 {{变量名}} 原样保留并在描述中补全；技能名/摘要为空时自动补全，已有内容则保留。",
        "AI 失败定位：AI 生成失败的条目在列表中红色高亮并显示具体失败原因（未连接 LLM / 无可用模型 / 返回空 / 解析失败）。",
        "自定义 JSON 导入：导出技能弹窗新增「上传 JSON」按钮，支持数组或 skills/entries/prompts 列表批量添加自定义技能条目。",
        "结构整理：备份与技能导入/导出组件拆分到独立模块目录，导出技能功能与校验/AI 操作合并为单一入口。",
      ],
    },
    en: {
      title: "Export skills with AI · Custom JSON import",
      items: [
        "AI-generated exports: after validation, AI produces an English skill name and description for each checked entry; {{variable}} placeholders in the body are preserved and reflected in the description; empty names/summaries are auto-filled while existing values are kept.",
        "AI failure pinpointing: entries whose AI generation failed are highlighted in red in the list with the exact reason (no LLM / no model route / empty output / parse failure).",
        "Custom JSON import: the export dialog gains an \"Upload JSON\" button that accepts an array or a skills/entries/prompts list to bulk-add custom skill entries.",
        "Structure cleanup: backup and skill import/export components moved into a dedicated module folder; export now merges validation and AI generation into a single entry point.",
      ],
    },
  },
  {
    version: "0.8.13",
    date: "2026-08-25",
    zh: {
      title: "统计可视化 · 标签过滤 · 界面焕新",
      items: [
        "统计可视化：词库面板新增「统计」视图，概览 8 项核心指标，含近 7 天趋势、标签分布柱状图与近期/沉睡提示词清单。",
        "标签过滤：侧边栏与聊天框面板搜索下方新增标签过滤条，选中标签仅展示对应提示词并与搜索词叠加；选中标签呈图钉（pin）效果。",
        "界面焕新：面板圆角与分层阴影、入场动画优化，提示词列表卡片化并带悬浮上浮高亮，标签胶囊化、新增细滚动条与搜索聚焦光圈。",
      ],
    },
    en: {
      title: "Statistics view · Tag filtering · UI polish",
      items: [
        "Statistics view: new \"Stats\" tab in the prompt panel — 8 core overview metrics, 7-day trend and tag-distribution bar charts, plus recent and dormant prompt lists.",
        "Tag filtering: a tag filter bar under the search box in both the sidebar and the chat button panel; selecting a tag narrows results and stacks with the keyword search; selected tags show a pin effect.",
        "UI polish: softer rounded corners and layered shadows, smoother panel entrance, card-style prompt rows with hover lift, pill-shaped tags, thin scrollbars and a search focus ring.",
      ],
    },
  },
  {
    version: "0.8.12",
    date: "2026-08-25",
    zh: {
      title: "本地版本说明 · 设置父子层级 · 版权信息",
      items: [
        "公告读取调整：使用手册走本地 i18n 多语言，版本说明改由内置 VERSION_NOTES 管理，不再读取网络 JSON。",
        "版本说明展示优化：公告中仅展示最新一个版本（当前运行版本）的标题 + 更新要点，告别多版本堆叠。",
        "设置面板父子层级：自动学习、词库助手两个主开关下均改为缩进层级+置灰不丢值，关闭父开关只禁用不改勾选状态。",
        "显示控制：新增「显示公告」开关，默认开启；关闭词库助手时公告/词库管理子开关仅灰显保留原值。",
        "组件置灰能力：NumberRow / TextRow / SelectRow 统一支持 disabled，与 ToggleRow 交互风格一致。",
        "设置底部署名区新增版权信息栏：© 年份 作者 · All rights reserved · MIT 许可证 + 免责声明，通用开源格式。",
      ],
    },
    en: {
      title: "Local release notes · Settings parent-child hierarchy · Copyright footer",
      items: [
        "Announcement source reworked: user guide now ships with plugin i18n; release notes read from built-in VERSION_NOTES, no longer fetch remote JSON.",
        "Release notes display: dialog shows only the latest (current) version — title + highlights, no stacked history.",
        "Settings parent-child hierarchy: auto-learn and assistant sections now use indent-based children with gray-out on disabled, preserving saved values when toggling parents.",
        "Visibility controls: added \"Show announcement\" toggle (default on); closing the assistant only disables (never clears) announcement / right-panel sub-toggles.",
        "Row components disabled support: NumberRow / TextRow / SelectRow all accept disabled props, matching ToggleRow interaction style.",
        "Copyright footer added below signature: © year author · All rights reserved · MIT badge + disclaimer in standard OSS format.",
      ],
    },
  },
  {
    version: "0.8.11",
    date: "2026-08-25",
    zh: {
      title: "公告动态配置 · 自动更新 · 模板变量优化",
      items: [
        "公告动态配置：双击词库助手即可查看公告，使用手册与通告内容随版本内置并支持多语言切换。",
        "自动更新：新增自动更新开关与更新提醒，版本检查以 npm 为主源、GitHub Release 兜底，发现新版本后可按配置后台静默安装。",
        "模板变量优化：插入 {{变量}} 时聚焦输入框，预览区自动滚动定位到对应位置；未填变量会拦截插入并提示，避免遗漏。",
        "词库助手：新增双击事件，双击助手弹出公告弹窗；助手气泡提示与活动状态动画同步优化。",
        "公告显示控制：新增「显示公告」开关，关闭后双击词库助手不再弹出公告，默认开启，仅在显示词库助手时可配置。",
        "使用手册本地化：公告中的使用手册支持 i18n 多语言切换，跟随系统语言自动变更。",
      ],
    },
    en: {
      title: "Dynamic announcements · Auto updates · Template variables",
      items: [
        "Dynamic announcements: double-click the assistant to open the announcement dialog; guides and release notes ship with the plugin and follow the system locale.",
        "Auto updates: new auto-update toggle and notifications; npm registry is the primary source with GitHub Releases fallback; can install in the background when enabled.",
        "Template variables: focus handler auto-scrolls preview to the highlighted segment; unfilled variables now block insert with an inline warning.",
        "Assistant enhancements: double-click gesture opens announcements; bubble hints and activity state animations are polished.",
        "Announcement visibility: new toggle to enable/disable the announcement dialog (default on, only configurable when the assistant is visible).",
        "Localized user guide: the embedded usage guide follows the system language.",
      ],
    },
  },
  {
    version: "0.8.10",
    date: "2026-08-24",
    zh: {
      title: "模板变量未填校验 · 预览滚动定位",
      items: [
        "模板变量插入时，选中某个变量输入框会自动滚动预览区域到对应片段。",
        "未填写的变量会拦截插入操作，并聚焦到第一个未填写的变量输入框，防止漏填。",
        "提示词标题 40 字限制收紧到 25 字，写入与显示两端统一 clamp。",
        "五维灵魂边界优化：学习经验/风格洞察不再无限追加，只保留最近 20 条并做相似合并。",
      ],
    },
    en: {
      title: "Template variable validation · preview scroll-to-segment",
      items: [
        "When focusing a variable input, the preview scrolls to the highlighted segment automatically.",
        "Unfilled variables now block insert and focus the first empty input, preventing missing values.",
        "Prompt title max length tightened to 25 chars on both write and display.",
        "Soul boundary MEMORY/USER no longer append indefinitely; only the most recent 20 entries are kept with similar-entry merging.",
      ],
    },
  },
  {
    version: "0.8.9",
    date: "2026-08-23",
    zh: {
      title: "# 实时筛选触发 · 自动学习质量过滤",
      items: [
        "输入 # 实时筛选词库，输入筛选词、↑↓ 选择、回车插入、空格结束、Esc 关闭。",
        "自动学习新增 isLowQuality 过滤（空白、纯表情、客套问候、单字应答等），减少误入库垃圾提示词。",
        "新增 isLearnWorthy 信息密度判断：多句/列表/占位符等结构可学阈值低；无结构单句需 2 倍长度才学。",
        "近似去重：用字符二元组 Jaccard 相似度做模糊去重，高度重复的相似文本不再重复入库。",
        "基础标题梳理 buildTitle：首行去除 markdown 标记，超长优先句末断句，避免生硬截断。",
      ],
    },
    en: {
      title: "# live filter trigger · auto-learn quality gates",
      items: [
        "Type # to open the library with live filtering; arrow keys to select, Enter to insert, Space to end, Esc to close.",
        "Auto-learn low-quality filter: rejects blanks, pure emoji/symbols, greetings, one-word replies.",
        "isLearnWorthy density gate: structural prompts (lists / placeholders / multi-sentence) accepted sooner; unstructured single sentences need 2x length.",
        "Near-duplicate detection via character bigram Jaccard: highly similar prompts no longer re-enter the library.",
        "Basic title builder buildTitle: strips markdown prefixes and prefers sentence-end breaks before length clamping.",
      ],
    },
  },
];

/** 支持的语言枚举：归一化到 zh / en。 */
export type LangKey = "zh" | "en";

/** 将浏览器语言归一化成 zh / en。 */
export function normalizeLang(raw: string): LangKey {
  const s = (raw || "zh").toLowerCase();
  if (s.startsWith("en")) return "en";
  return "zh";
}

/** 获取某语言下的某版本说明（版本不存在则返回 null）。 */
export function getVersionNote(version: string, lang: LangKey = "zh"):
  | { title: string; items: string[]; date?: string }
  | null {
  const note = VERSION_NOTES.find((n) => n.version === version);
  if (!note) return null;
  const data = note[lang];
  return { title: data.title, items: [...data.items], date: note.date };
}

/** 获取全部版本说明（按语言、按版本倒序）。 */
export function getAllVersionNotes(lang: LangKey = "zh"): Array<{
  version: string;
  date?: string;
  title: string;
  items: string[];
}> {
  return VERSION_NOTES.map((n) => {
    const data = n[lang];
    return { version: n.version, date: n.date, title: data.title, items: [...data.items] };
  });
}
