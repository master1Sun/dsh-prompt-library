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
    version: "0.8.12",
    date: "2026-08-25",
    zh: {
      title: "本地版本说明 · 设置父子层级 · 版权信息",
      items: [
        "公告读取调整：使用手册走本地 i18n 多语言，版本说明改由内置 VERSION_NOTES 管理，不再读取网络 JSON。",
        "版本说明展示优化：公告中仅展示最新一个版本（当前运行版本）的标题 + 更新要点，告别多版本堆叠。",
        "设置面板父子层级：自动学习、词库助手两个主开关下均改为缩进层级+置灰不丢值，关闭父开关只禁用不改勾选状态。",
        "显示控制：新增「显示公告」开关，默认开启；关闭词库助手时公告/工具面板子开关仅灰显保留原值。",
        "组件置灰能力：NumberRow / TextRow / SelectRow 统一支持 disabled，与 ToggleRow 交互风格一致。",
        "设置底部署名区新增版权信息栏：© 年份 作者 · All rights reserved · MIT 许可证 + 免责声明，通用开源格式。",
        "统计可视化：词库面板新增「统计」视图，概览 8 项核心指标，含近 7 天趋势、标签分布柱状图与近期/沉睡提示词清单。",
        "标签过滤：侧边栏与聊天框面板搜索下方新增标签过滤条，选中标签仅展示对应提示词并与搜索词叠加；选中标签呈图钉（pin）效果。",
        "界面焕新：面板圆角与分层阴影、入场动画优化，提示词列表卡片化并带悬浮上浮高亮，标签胶囊化、新增细滚动条与搜索聚焦光圈。",
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
        "Statistics view: new \"Stats\" tab in the prompt panel — 8 core overview metrics, 7-day trend and tag-distribution bar charts, plus recent and dormant prompt lists.",
        "Tag filtering: a tag filter bar under the search box in both the sidebar and the chat button panel; selecting a tag narrows results and stacks with the keyword search; selected tags show a pin effect.",
        "UI polish: softer rounded corners and layered shadows, smoother panel entrance, card-style prompt rows with hover lift, pill-shaped tags, thin scrollbars and a search focus ring.",
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
        "词库助手：新增双击事件，双击小人弹出公告弹窗；助手气泡提示与活动状态动画同步优化。",
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
