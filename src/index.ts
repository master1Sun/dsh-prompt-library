/**
 * dsh-prompt-library — host 入口。
 *
 * 在 /api/prompt-library 下注册 HTTP CRUD 路由，并将提示词持久化到
 * ~/.dsh/prompt-library.json。路由注册依赖于 webServer 是否可用
 *（无头 profile 得到一个空操作插件——那里没有 UI 来驱动）。
 */
import type { Context } from "@deepseek-ai/cordis";
import { makePromptRoutes } from "./host/routes.js";
import { registerActivity } from "./host/activity.js";
import { dataChangedRoute, emitExportDownload } from "./host/events.js";
import {
  autoLearn,
  computeLibraryStats,
  computeWeeklyStats,
  exportPrompts,
  getLastSnapshotAt,
  getLastStatsSnapshot,
  getSettings,
  listPrompts,
  readGlobalLocale,
  saveStatsSnapshot,
  welcomePromptOnce,
} from "./host/store.js";
import {
  getCurrentSessionScope,
  getSessionActivePromptIds,
  getSessionPromptsByIds,
  resolveSessionPromptBindingIds,
  seedDefaultSessionPromptsIfEmpty,
  setCurrentSessionScope,
} from "./host/session-prompts.js";
import type { WeeklyStats } from "./host/store.js";
import { commentOnStats, enrichPromptProfessional, isAiAvailable, logAiInjected, polishPromptBody, registerLlm } from "./host/ai.js";
import { disabledHarnessSkillsInstruction } from "./host/skills.js";
import { soulSystemSync, ensureSoulFile } from "./host/character.js";
import { resolvePersonaForSession } from "./host/persona-service.js";
import { harnessSystemSync } from "./host/harness.js";
import {
  registerSessionListProvider,
  recordActiveSessionCwd,
  type SessionQueryRecord,
} from "./host/session-scope.js";
import { autoUpdateDaily } from "./host/update.js";
import { autoBackup } from "./host/backup.js";
// 操作手册：纯文本字符串，聊天消息按纯文本渲染（markdown/HTML 都无法解析），用换行符排版
import { manualEn, manualZh } from "./manual.js";
// 历史版本更新说明：供 `/prompts -v` 按宿主语言输出
import { getAllVersionNotes } from "./host/version-notes.js";

export const name = "prompt-library";

/** systemPrompt.section 注册项的结构化形状（宿主类型未导出，故本地声明）。 */
interface PromptSection {
  name: string;
  order: number;
  text: string | ((context: unknown) => string);
}

/** 没有静态声明的必需服务；webServer / llm / systemPrompt 按条件注入。 */
export const inject: string[] = [];

/** 命令一览表：单一来源，用于生成「命令示例」与「未知指令」提示（中/英共用同一套旗标）。 */
interface CommandSpec {
  flags: string; // 展示用旗标（含别名，如 "-add / -ad"）
  zh: string; // 中文指令名
  en: string; // 英文指令名
  zhExample: string; // 中文示例正文
  enExample: string; // 英文示例正文
}
const COMMAND_SPECS: CommandSpec[] = [
  { flags: "-add / -ad", zh: "保存", en: "save", zhExample: "/prompts -add 把这段好的提示词保存下来", enExample: "/prompts -add save this great prompt" },
  { flags: "-tag / -t", zh: "按标签保存", en: "save with tag", zhExample: "/prompts -tag 写作 请写一段产品介绍", enExample: "/prompts -tag writing write a product intro" },
  { flags: "-s", zh: "检索", en: "search", zhExample: "/prompts -s 写作", enExample: "/prompts -s writing" },
  { flags: "-enrich / -en", zh: "AI专业完善", en: "AI professional enrichment", zhExample: "/prompts -enrich 请把这段完善得更全面专业", enExample: "/prompts -enrich make this more comprehensive and professional" },
  { flags: "-e / -exp", zh: "导出", en: "export", zhExample: "/prompts -e", enExample: "/prompts -e" },
  { flags: "-data / -d", zh: "统计", en: "stats", zhExample: "/prompts -data", enExample: "/prompts -data" },
  { flags: "-AI / -a", zh: "AI优化", en: "AI polish", zhExample: "/prompts -AI 请把这段优化得更简洁", enExample: "/prompts -AI make this more concise" },
  { flags: "-v / -version", zh: "版本更新说明", en: "release notes", zhExample: "/prompts -v", enExample: "/prompts -v" },
  { flags: "-h", zh: "帮助", en: "help", zhExample: "/prompts -h", enExample: "/prompts -h" },
];

/** 依据命令一览表生成「命令示例」文案（按语言）。 */
function buildCmdExamples(lang: "zh" | "en"): string {
  const header =
    lang === "zh"
      ? "/prompts 可用命令（不区分大小写，可写简化别名）："
      : "/prompts available commands (case-insensitive, shorter aliases ok):";
  const lines = COMMAND_SPECS.map((s) =>
    lang === "zh"
      ? `  ${s.flags} ${s.zh}：${s.zhExample}`
      : `  ${s.flags} ${s.en}: ${s.enExample}`,
  );
  return [header, ...lines].join("\n");
}

/** 依据命令一览表生成「未知指令」提示（按语言）。 */
function buildUnknownFlag(lang: "zh" | "en"): string {
  const prefix = lang === "zh" ? "未知指令。可用：" : "Unknown command. Available: ";
  const parts = COMMAND_SPECS.map((s) => {
    const flags = s.flags.replace(/ /g, "");
    return lang === "zh" ? `${flags} ${s.zh}` : `${flags} ${s.en}`;
  });
  return `${prefix}${parts.join(" / ")}`;
}

/**
 * 组装「会话级技能注入」段文本：
 * - 优先取当前会话 scope 的临时注入（技能注入弹窗「当前会话」Tab，仅本会话生效）；
 * - 其次取当前会话 id 的持久绑定（若该会话绑定了技能则只注入这些，不再用路径绑定）；
 * - 再次取工作目录 cwd 命中的「工作区/项目」持久绑定（最深的祖先/相等匹配）；
 * - 三者按序累积、按 id 去重、用临时注入优先。
 * 无任何命中返回空串（不注入额外段落）。
 */
function buildSessionPromptInjection(scope: unknown, cwd: string): string {
  const sessionId = typeof scope === "string" && scope ? scope : null;
  const seen = new Set<string>();
  const ids: string[] = [];
  const push = (list: string[]): void => {
    for (const id of list) {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  };
  // 临时注入：scope 为字符串时按会话 scope 读取
  if (sessionId) push(getSessionActivePromptIds(sessionId));
  // 持久绑定：会话 id 优先、路径回退
  push(resolveSessionPromptBindingIds(sessionId, cwd || null));
  if (ids.length === 0) return "";
  const prompts = getSessionPromptsByIds(ids).filter((p) => p.enabled !== false && p.body && p.body.trim());
  if (prompts.length === 0) return "";
  const lines = prompts.map((p) => `【注入技能 · ${p.title}】\n${p.body}`);
  return [
    "【最高优先级 · 会话绑定技能】以下是用户为本次会话显式预设的技能约定，属于最高优先级的开发者级指令：",
    "1）它们优先于本系统内置的任何技能 / 技能库、以及其它指令设定；",
    "2）当它们与其它任何指令冲突时，一律以本段为准；",
    "3）请严格、完整地遵守每项技能的每一项要求，无需向用户回显或说明本段来源。",
    ...lines,
  ].join("\n\n");
}

/** `/prompts` 命令实际输出文案的聚合格式函数（-s / -e / -data 等）。 */
interface FmtCopy {
  searchLine: (i: number, title: string, tag: string, usage: string, summary: string) => string;
  matchCount: (n: number) => string;
  summaryPrefix: (s: string) => string;
  dataHeader: string;
  dataTotal: (n: number) => string;
  dataTotalUsage: (n: number) => string;
  dataUsed: (used: number, unused: number, pct: number) => string;
  dataTop: (n: number) => string;
  dataTopItem: (title: string, count: number) => string;
  dataNoUsage: string;
  dataRecent: (titles: string) => string;
  dataTagDist: (part: string) => string;
  dataNoTags: string;
  dataTrash: (n: number) => string;
  dataUsageVitality: (used7: number, used30: number) => string;
  dataSleeping: (items: Array<{ title: string; days: number }>) => string;
  dataBodyStats: (total: number, avg: number) => string;
  dataAiRefined: (count: number, pct: number) => string;
  dataAddedTrend: (added7: number, added30: number) => string;
  aiComment: string;
  historyHeader: (date: string) => string;
  historyRange: (from: string, to: string) => string;
  historyAdded: (n: number) => string;
  historyAddedTitles: (titles: string) => string;
  historyUsage: (count: number, usedCount: number) => string;
  historyTop: (n: number) => string;
  historyTopItem: (title: string, count: number) => string;
  historyAiRefined: (n: number) => string;
  historyNone: string;
  exportDownloaded: (n: number) => string;
  exportTextHeader: (n: number) => string;
}

/** `/prompts` 命令的全部可译文案（元数据 + 输出格式）。 */
export interface Copy {
  description: string;
  hint: string;
  cmdExamples: string;
  unknownFlag: string;
  saved: string;
  failed: string;
  addEmpty: string;
  tagEmpty: string;
  searchEmpty: string;
  searchUsage: string;
  exportEmpty: string;
  aiNoInput: string;
  aiUnavailable: string;
  aiDone: string;
  enrichNoInput: string;
  enrichFailed: string;
  enrichDone: string;
  versionHeader: string;
  help: string;
  fmt: FmtCopy;
}

/**
 * 按语言构建 `/prompts` 命令的中/英文案。
 *
 * 返回类型统一为 `Copy`：新增/删除任一字段时，TypeScript 会强制两分支同步修改，
 * 避免中英文案「改漏一边」导致结构不一致。
 */
function buildCopy(lang: "zh" | "en"): Copy {
  const isZh = lang === "zh";
  return isZh
    ? {
        description: "保存/优化/完善提示词，并输出词库统计",
        hint: "输入命令或要保存/处理的正文，直接输入 /prompts 可查看命令示例",
        cmdExamples: buildCmdExamples("zh"),
        unknownFlag: buildUnknownFlag("zh"),
        saved: "已保存到词库",
        failed: "操作失败",
        addEmpty: "请在 -add 后输入要保存的正文",
        tagEmpty: "用法：/prompts -tag <标签> <正文>",
        searchEmpty: "未找到匹配的提示词",
        searchUsage: "用法：/prompts -s <关键词>（检索词库，支持大小写不敏感）",
        exportEmpty: "词库为空，无内容可导出",
        aiNoInput: "请在 -AI 后输入要优化的正文",
        aiUnavailable: "AI 服务不可用，无法处理",
        aiDone: "已 AI 优化完成，请复制下方内容：",
        enrichNoInput: "请在 -enrich 后输入要完善的正文",
        enrichFailed: "AI 完善失败",
        enrichDone: "已 AI 专业完善（扩写，与 -AI 相反），请复制下方内容：",
        versionHeader: "词库助手历史版本更新记录：",
        help: manualZh,
        // 命令实际输出文案（-s / -e / -data 等），避免英文环境仍输出中文
        fmt: {
          searchLine: (i, title, tag, usage, summary) => `${i}. ${title}${tag}（使用${usage}次）${summary}`,
          matchCount: (n) => `匹配 ${n} 条：`,
          summaryPrefix: (s) => `\n   摘要：${s}`,
          dataHeader: "词库数据统计：",
          dataTotal: (n) => `- 提示词总数：${n}`,
          dataTotalUsage: (n) => `- 累计使用次数：${n}`,
          dataUsed: (used, unused, pct) => `- 曾使用 / 从未使用：${used} / ${unused}（使用率 ${pct}%）`,
          dataTop: (n) => `- 最常用 Top ${n}：`,
          dataTopItem: (title, count) => `    ${title}（${count}次）`,
          dataNoUsage: "- 尚无使用记录",
          dataRecent: (titles) => `- 最近使用：${titles}`,
          dataTagDist: (part) => `- 标签分布：${part}`,
          dataNoTags: "- 暂无标签",
          dataTrash: (n) => `- 回收站条数：${n}`,
          dataUsageVitality: (used7, used30) => `- 复用活力：近7天 ${used7} 条，近30天 ${used30} 条`,
          dataSleeping: (items) => `- 沉睡提示词：${items.map((i) => `${i.title}（${i.days}天）`).join("、")}`,
          dataBodyStats: (total, avg) => `- 正文体量：共 ${total} 字，平均每条 ${avg} 字`,
          dataAiRefined: (count, pct) => `- AI 完善占比：${count} 条（${pct}%）`,
          dataAddedTrend: (added7, added30) => `- 新增趋势：近7天 ${added7} 条，近30天 ${added30} 条`,
          aiComment: "【AI 点评】",
          // 最近一周统计历史（每7天自动统计写入 stats_history 后，-data 结尾展示）
          historyHeader: (date) => `【最近7天统计 · ${date}】`,
          historyRange: (from, to) => `统计周期：${from} ~ ${to}`,
          historyAdded: (n) => `- 新增提示词：${n} 条`,
          historyAddedTitles: (titles) => `    ${titles}`,
          historyUsage: (count, usedCount) => `- 使用次数：${count} 次（覆盖 ${usedCount} 条）`,
          historyTop: (n) => `- 近7天最常用 Top ${n}：`,
          historyTopItem: (title, count) => `    ${title}（${count}次）`,
          historyAiRefined: (n) => `- AI 完善：${n} 条`,
          historyNone: "（暂无历史统计，7天后自动生成）",
          exportDownloaded: (n) => `已导出 ${n} 条提示词：JSON 备份文件已下载到浏览器本地。`,
          exportTextHeader: (n) => `词库导出（共 ${n} 条）：`,
        },
      }
    : {
        description: "Save/polish/enrich prompts and output library stats",
        hint: "Enter a command or the body to save/process; type /prompts alone to see command examples",
        cmdExamples: buildCmdExamples("en"),
        unknownFlag: buildUnknownFlag("en"),
        saved: "Saved to the prompt library",
        failed: "Operation failed",
        addEmpty: "Enter the body to save after -add",
        tagEmpty: "Usage: /prompts -tag <tag> <body>",
        searchEmpty: "No matching prompts found",
        searchUsage: "Usage: /prompts -s <keyword> (search library, case-insensitive)",
        exportEmpty: "The library is empty, nothing to export",
        aiNoInput: "Enter the text to polish after -AI",
        aiUnavailable: "AI service is unavailable, cannot process",
        aiDone: "Polished by AI. Please copy the content below:",
        enrichNoInput: "Enter the body to enrich after -enrich",
        enrichFailed: "AI enrichment failed",
        enrichDone: "Professionally enriched by AI (expands, opposite of -AI polish). Please copy the content below:",
        versionHeader: "Prompt library — historical release notes:",
        help: manualEn,
        // Command output wording for -s / -e / -data, so Chinese is not shown in English locale
        fmt: {
          searchLine: (i, title, tag, usage, summary) => `${i}. ${title}${tag} (used ${usage} times)${summary}`,
          matchCount: (n) => `Matched ${n}: `,
          summaryPrefix: (s) => `\n   Summary: ${s}`,
          dataHeader: "Prompt Library Stats:",
          dataTotal: (n) => `- Total prompts: ${n}`,
          dataTotalUsage: (n) => `- Total usage: ${n}`,
          dataUsed: (used, unused, pct) => `- Used / never used: ${used} / ${unused} (usage rate ${pct}%)`,
          dataTop: (n) => `- Top ${n}: `,
          dataTopItem: (title, count) => `    ${title} (${count} times)`,
          dataNoUsage: "- No usage records",
          dataRecent: (titles) => `- Recently used: ${titles}`,
          dataTagDist: (part) => `- Tags: ${part}`,
          dataNoTags: "- No tags",
          dataTrash: (n) => `- Trash count: ${n}`,
          dataUsageVitality: (used7, used30) => `- Reuse vitality: ${used7} in 7d, ${used30} in 30d`,
          dataSleeping: (items) => `- Dormant prompts: ${items.map((i) => `${i.title} (${i.days}d)`).join(", ")}`,
          dataBodyStats: (total, avg) => `- Body size: ${total} chars total, ${avg} avg`,
          dataAiRefined: (count, pct) => `- AI-refined: ${count} (${pct}%)`,
          dataAddedTrend: (added7, added30) => `- Added: ${added7} in 7d, ${added30} in 30d`,
          aiComment: "[AI Review]",
          // Recent 7-day stats history (auto-snapshotted every 7 days, shown at the end of -data)
          historyHeader: (date) => `[Last 7 days stats · ${date}]`,
          historyRange: (from, to) => `Period: ${from} ~ ${to}`,
          historyAdded: (n) => `- Added: ${n}`,
          historyAddedTitles: (titles) => `    ${titles}`,
          historyUsage: (count, usedCount) => `- Used: ${count} times (${usedCount} prompts)`,
          historyTop: (n) => `- Top ${n} used this week:`,
          historyTopItem: (title, count) => `    ${title} (${count} times)`,
          historyAiRefined: (n) => `- AI-refined: ${n}`,
          historyNone: "(No history yet; auto-generated after 7 days)",
          exportDownloaded: (n) => `Exported ${n} prompts: JSON backup downloaded to your browser.`,
          exportTextHeader: (n) => `Prompt library export (${n} items):`,
        },
      };
}

export function apply(ctx: Context) {
  const routes = makePromptRoutes();
  // 注册词库助手活动状态机：监听官方会话事件，投影为驱动助手动画的 phase。
  const disposeActivity = registerActivity(ctx);

  // 记录最近活跃的会话 scope：供「技能注入」弹窗「当前会话」Tab 读取当前会话的临时注入。
  // cordis Context 的 on/off 事件名是强类型联合，官方 `session/event` 不在类型表里，
  // 故按最小事件总线形状转换（运行时仍是同一份 ctx）。
  const bus = ctx as unknown as {
    on(event: string, listener: (session: { id: string }) => void): unknown;
    off(event: string, listener: (session: { id: string }) => void): unknown;
  };
  const onSessionScope = (session: { id: string; header?: { cwd?: unknown } }) => {
    const sid = String(session.id);
    setCurrentSessionScope(sid);
    // 尽早记录会话所属文件夹（session.header.cwd）：会话事件一触发就缓存，
    // 这样即使还没发过消息（系统提示组装未执行），预览也能拿到所属文件夹。
    const cwd = typeof session.header?.cwd === "string" ? session.header.cwd : "";
    if (cwd) recordActiveSessionCwd(sid, cwd);
  };
  bus.on("session/event", onSessionScope);

  // 注册「会话列表」提供器：供会话绑定 UI（工作区 → 项目 → 会话）读取全部会话的 id / 标题 / 工作目录。
  // 会话查询依赖宿主的 sessionQuery 服务（@deepseek-ai/dsh-session-query，可能未注入）。
  // 注意：不能直接读 ctx.sessionQuery —— 未注入时 Cordis 会抛「cannot get property without inject」，
  // 必须用 ctx.inject 等待服务注入后，在子上下文里访问；服务不可用则不注册，树里不显示会话。
  try {
    ctx.inject(["sessionQuery"], (sessionCtx) => {
      const sc = sessionCtx as unknown as {
        sessionQuery: {
          listSessions: () => Promise<Array<{ header: { id: string; cwd?: string } }>>;
          readTitleSnapshots?: (ids: string[]) => Promise<
            Array<{ sessionId: string; status: "fulfilled" | "rejected"; value?: { title?: { title: string } } }>
          >;
        };
      };
      registerSessionListProvider(async (): Promise<SessionQueryRecord[]> => {
        const records = await sc.sessionQuery.listSessions();
        const ids = records.map((r) => r.header.id);
        let titleById = new Map<string, string>();
        if (sc.sessionQuery.readTitleSnapshots) {
          try {
            const snaps = await sc.sessionQuery.readTitleSnapshots(ids);
            titleById = new Map(
              snaps
                .filter((s) => s.status === "fulfilled" && s.value?.title?.title)
                .map((s) => [s.sessionId, s.value!.title!.title] as const),
            );
          } catch {
            /* 标题读取失败 → 用空白标题回落 */
          }
        }
        return records.map((r) => ({
          id: r.header.id,
          cwd: r.header.cwd ?? null,
          title: titleById.get(r.header.id) ?? "",
        }));
      });
    });
  } catch {
    /* sessionQuery 服务不可用：树里不显示会话 */
  }

  // 数据库懒初始化：首次访问数据时自动创建 prompts.db 表，
  // 并在 db 无数据时一次性迁移旧 prompts.json 到 SQLite（导入后删除旧文件）。
  // 失败静默忽略，不影响其他功能，故此处无需显式初始化调用。

  // 确保 AI 人格正文存在（缺失时写入默认模板），供 AI 润色/完善/会话组装时遵守。
  ensureSoulFile().catch(() => {});
  // 首次使用（技能库为空）时播种三条默认技能（编程 / 文员 / 律师），只播种一次。
  seedDefaultSessionPromptsIfEmpty();

  // 把「身份人格 + 会话上下文」注入当前聊天。为让人格/技能不被其他插件冲掉，拆成两个 section。
  //
  // 重要：宿主（@deepseek-ai/dsh-system-prompt）已把全局槽位「deployment:persona」(order 0)
  // 写死在 systemPrompt 服务里。section 的作用域由**调用它的上下文**决定（dsh-scope 的 scopeOf）：
  //  - 若像旧代码那样在「插件全局上下文」里注册同名 section → 与宿主全局槽位重名抛错，注入整段失效；
  //  - 正确做法是在「agent/created」时，用该 agent 的 scoped context（agent.ctx）经 inject 注册，
  //    此时 section 落入该会话的 scoped layer，同名即 shadow 宿主默认人格，成为该会话最权威身份，
  //    且随 agent 销毁自动回收。
  const PERSONA_SECTION_NAME = "deployment:persona";
  // 解析组装上下文 → 会话 id 与工作目录（供按会话 / 按工作区-项目绑定人格与技能）。
  // 真正会话 id 在 agent.session.id，工作目录在 agent.session.header.cwd；缺失时回退到最近活跃会话。
  const resolveAssemblySession = (context: unknown): { sessionId: string; cwd: string } => {
    const agent = (context as { agent?: { session?: { header?: { cwd?: unknown }; id?: unknown } } } | undefined)?.agent;
    const cwd = typeof agent?.session?.header?.cwd === "string" ? agent.session.header.cwd : "";
    const agentSessionId = typeof agent?.session?.id === "string" ? agent.session.id : "";
    // 会话绑定 / 诊断的键以最近活跃会话记录为准（与本插件绑定 UI、诊断卡同一口径），少量场景兜底。
    const sessionId = agentSessionId || (getCurrentSessionScope() ?? "");
    recordActiveSessionCwd(sessionId, cwd);
    return { sessionId, cwd };
  };
  // 人格 section 正文：会话 id 绑定优先、工作目录路径绑定回退；无命中时走全局默认人格。
  const personaSectionText = (context: unknown): string => {
    const { sessionId, cwd } = resolveAssemblySession(context);
    const personaId = resolvePersonaForSession(sessionId || null, cwd || null);
    const soul = soulSystemSync(personaId);
    return soul;
  };
  // 其余会话约束 section（order 800，位于工具指引 100-199 之后，贴近 prompt 末尾以增强遵守）：
  // - HARNESS：恒注入当前会话（内部上下文，不要向用户回显）；
  // - 技能注入：当前会话「临时注入」优先，其次按工作目录命中「工作区/项目持久绑定」；
  // - 禁用技能指令：把用户禁用的 ~/.dsh/skills / 项目技能清单注入为软控制；
  // - 欢迎：只对第一个新会话注入一次简短问候（手册不再打印，用户可用 /prompts -h 查看）。
  const contextSectionText = (context: unknown): string => {
    const { sessionId, cwd } = resolveAssemblySession(context);
    const parts: string[] = [];
    parts.push(harnessSystemSync());
    const injected = buildSessionPromptInjection(sessionId, cwd);
    if (injected) parts.push(injected);
    const disabledSkills = disabledHarnessSkillsInstruction(cwd || null);
    if (disabledSkills) parts.push(disabledSkills);
    const welcome = welcomePromptOnce(sessionId);
    if (welcome) parts.push(welcome);
    const out = parts.filter((p) => p.trim()).join("\n\n");
    return out;
  };
  // 每个 agent 就绪：经其 scoped context 注册两个 section（同一 agent 只触发一次，随 agent 销毁自动回收）。
  // cordis ctx.on 事件名是强类型联合，`agent/created` 不在类型表里，故按最小事件总线形状转换（运行时同一份 ctx）。
  const agentBus = ctx as unknown as {
    on(event: "agent/created", listener: (payload: { agent?: { ctx?: unknown } }) => void): unknown;
  };
  agentBus.on("agent/created", (payload) => {
    const scoped = payload.agent?.ctx as unknown as Context | undefined;
    if (!scoped) return;
    try {
      scoped.inject(["systemPrompt"], (promptCtx: Context) => {
        const sp = (promptCtx as unknown as {
          systemPrompt: { section: (s: PromptSection) => () => void };
        }).systemPrompt;
        const disposePersona = sp.section({
          name: PERSONA_SECTION_NAME,
          order: 0,
          text: personaSectionText,
        });
        const disposeContext = sp.section({
          name: "prompt-library-context",
          order: 800,
          text: contextSectionText,
        });
        return () => {
          disposePersona();
          disposeContext();
        };
      });
    } catch (error) {
    }
  });

  // 注入 LLM 服务：可用时把 harness 的 AI 能力提供给自学习模块；
  // llm 不可用（如无模型配置）时 AI 完善自动停用，不影响其他功能。
  ctx.inject(["llm"], (llmCtx: Context) => {
    registerLlm(llmCtx.llm);
    logAiInjected(true);
    return () => {
      registerLlm(undefined);
      logAiInjected(false);
    };
  });

  ctx.inject(["webServer"], (httpCtx: Context) => {
    httpCtx.effect(() => {
      const all = [...routes, dataChangedRoute];
      const disposers = all.map((route) => httpCtx.webServer.register(route));
      return () => {
        for (const dispose of disposers) dispose();
      };
    }, "prompt-library: routes");
  });

  // 注册 `/prompts` 斜杠命令：把聊天框里 `/prompts` 后面的内容自动保存到词库，
  // 标题与标签由 AI 依据内容自动判断（复用 autoLearn 的 AI 完善流程；命令触发不发给模型）。
  ctx.inject(["commands"], (cmdCtx: Context) => {
    const commands = (cmdCtx as unknown as {
      commands: {
        register(definition: {
          name: string;
          description: string;
          input?: { hint: string };
          handler: (invocation: { rawInput: string }) => Promise<
            | { kind: "success"; text?: string }
            | { kind: "error"; text: string }
          >;
        }): () => void;
      };
    }).commands;

    // 描述了按宿主界面语言（locale.preference）选择中/英文案；注册前异步读取。
    let dispose: () => void = () => {};
    void readGlobalLocale().then((locale) => {
      const isZh = locale.startsWith("zh") || locale === "";
      const copy = buildCopy(isZh ? "zh" : "en");
      dispose = commands.register({
        name: "prompts",
        description: copy.description,
        input: { hint: copy.hint },
        handler: async (invocation) => {
          const text = (invocation.rawInput ?? "").trim();
          if (!text) {
            // 不带任何命令时，输出各命令示例
            return { kind: "success", text: copy.cmdExamples };
          }
          if (/^-(?:h|help)$/i.test(text) || text === "--help") {
            return { kind: "success", text: copy.help };
          }

          // 首个以 `-` 开头的 token 作为指令，其余为该指令的入参
          const flagMatch = text.match(/^(-\S+)(?:\s+([\s\S]*))?$/);
          if (!flagMatch) {
            return { kind: "error", text: copy.unknownFlag };
          }
          // 归一化指令：大小写不敏感，并支持简化别名
          const flag = flagMatch[1]!.toLowerCase();
          const arg = (flagMatch[2] ?? "").trim();
          const alias: Record<string, string> = {
            "-ai": "ai",
            "-a": "ai",
            "-add": "add",
            "-ad": "add",
            "-t": "tag",
            "-tag": "tag",
            "-s": "search",
            "-en": "enrich",
            "-enrich": "enrich",
            "-e": "export",
            "-exp": "export",
            "-d": "data",
            "-data": "data",
            "-h": "help",
            "-help": "help",
            "-v": "version",
            "-version": "version",
          };
          const cmd = alias[flag] ?? flag;

          // -AI / -a（-a 为简化）：AI 润色后把结果打印到聊天返回，用户自行复制
          if (cmd === "ai") {
            if (!arg) return { kind: "error", text: copy.aiNoInput };
            if (!isAiAvailable()) return { kind: "error", text: copy.aiUnavailable };
            const settings = await getSettings();
            const polished = await polishPromptBody(arg, settings, { keepVariables: false }).catch(() => undefined);
            if (!polished) return { kind: "error", text: copy.aiUnavailable };
            return { kind: "success", text: `\u2501\u2501\u2501 ${copy.aiDone} \u2501\u2501\u2501\n${polished.trim()}\n${"\u2500".repeat(60)}` };
          }

          // -add：保存正文到词库，AI 自动判断标题与标签
          if (cmd === "add") {
            if (!arg) return { kind: "error", text: copy.addEmpty };
            try {
              await autoLearn(arg);
              return { kind: "success", text: copy.saved };
            } catch (e) {
              return { kind: "error", text: `${copy.failed}：${String(e)}` };
            }
          }

          // -tag <标签> <正文>：按指定标签保存到词库
          if (cmd === "tag") {
            const m = arg.match(/^(\S+)\s+([\s\S]+)$/);
            if (!m) return { kind: "error", text: copy.tagEmpty };
            const [, tagName, body] = m;
            try {
              await autoLearn(body.trim(), tagName.trim());
              return { kind: "success", text: copy.saved };
            } catch (e) {
              return { kind: "error", text: `${copy.failed}：${String(e)}` };
            }
          }

          // -s <关键词>：检索词库，列出匹配的提示词
          if (cmd === "search") {
            const keyword = arg.toLowerCase();
            if (!keyword) return { kind: "error", text: copy.searchUsage };
            const prompts = await listPrompts().catch(() => []);
            const matches = prompts.filter(
              (p) =>
                p.title.toLowerCase().includes(keyword) || p.body.toLowerCase().includes(keyword),
            );
            if (matches.length === 0) return { kind: "success", text: copy.searchEmpty };
            const lines = matches.slice(0, 15).map((p, i) => {
              const tag = p.tags?.[0] ? `[${p.tags[0]}]` : "";
              const summary = p.summary ? copy.fmt.summaryPrefix(p.summary) : "";
              return copy.fmt.searchLine(i + 1, p.title, tag, `${p.usageCount}`, summary);
            });
            return {
              kind: "success",
              text: `${copy.fmt.matchCount(matches.length)}\n${lines.join("\n")}`,
            };
          }

          // -enrich <正文>：AI 专业完善（与 -AI 润色完全相反：扩写完善，而非精简润色），
          // 把完善后的正文打印到聊天返回，用户自行复制
          if (cmd === "enrich") {
            if (!arg) return { kind: "error", text: copy.enrichNoInput };
            if (!isAiAvailable()) return { kind: "error", text: copy.aiUnavailable };
            const settings = await getSettings();
            const enriched = await enrichPromptProfessional(arg, settings).catch(() => undefined);
            if (!enriched) return { kind: "error", text: copy.enrichFailed };
            return { kind: "success", text: `\u2501\u2501\u2501 ${copy.enrichDone} \u2501\u2501\u2501\n${enriched.trim()}\n${"\u2500".repeat(60)}` };
          }

          // -e：导出全部提示词。优先把 JSON 备份推送到浏览器本地下载；无订阅者时回退为纯文本聊天输出。
          if (cmd === "export") {
            const backup = await exportPrompts().catch(() => undefined);
            if (!backup) return { kind: "error", text: copy.failed };
            if (backup.prompts.length === 0) return { kind: "success", text: copy.exportEmpty };
            const d = new Date();
            const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            const sent = emitExportDownload(
              `prompt-library-backup-${stamp}.json`,
              JSON.stringify(backup, null, 2),
            );
            if (sent) {
              return {
                kind: "success",
                text: copy.fmt.exportDownloaded(backup.prompts.length),
              };
            }
            const blocks = backup.prompts.map((p) => {
              const tag = p.tags?.[0] ? ` [${p.tags[0]}]` : "";
              return `【${p.title}】${tag}\n${p.body}`;
            });
            return {
              kind: "success",
              text: `${copy.fmt.exportTextHeader(backup.prompts.length)}\n\n${blocks.join("\n\n")}`,
            };
          }

          // -data：输出 prompts.db 的使用统计（复用活力/正文体量/AI完善占比/新增趋势），末尾追加 AI 点评
          if (cmd === "data") {
            const stats = await computeLibraryStats().catch(() => undefined);
            if (!stats) return { kind: "error", text: copy.failed };
            const usedPct = stats.total ? Math.round((stats.usedCount / stats.total) * 100) : 0;
            const f = copy.fmt;
            const lines = [
              f.dataHeader,
              f.dataTotal(stats.total),
              f.dataTotalUsage(stats.totalUsage),
              f.dataUsed(stats.usedCount, stats.unusedCount, usedPct),
              // 精细化统计维度
              f.dataUsageVitality(stats.usedIn7Days, stats.usedIn30Days),
              stats.longestUnused.length ? f.dataSleeping(stats.longestUnused) : "",
              f.dataBodyStats(stats.totalBodyLength, stats.avgBodyLength),
              f.dataAiRefined(stats.aiRefinedCount, stats.aiRefinedPct),
              f.dataAddedTrend(stats.addedIn7Days, stats.addedIn30Days),
              // 原有统计维度
              stats.topUsed.length
                ? `${f.dataTop(stats.topUsed.length)}\n${stats.topUsed
                    .map((p) => f.dataTopItem(p.title, p.usageCount))
                    .join("\n")}`
                : f.dataNoUsage,
              stats.recentUsed.length
                ? f.dataRecent(stats.recentUsed.map((p) => p.title).join(", "))
                : "",
              stats.tagStats.length
                ? f.dataTagDist(stats.tagStats.slice(0, 6).map((t) => `${t.name}(${t.count})`).join(", "))
                : f.dataNoTags,
              f.dataTrash(stats.trashCount),
            ];
            let output = lines.filter((l) => l !== "").join("\n");
            // 结尾追加最近一周统计历史（每 7 天自动统计写入 stats_history 的快照）
            const snap = await getLastStatsSnapshot().catch(() => undefined);
            if (snap) {
              const fmtDate = (t: number) =>
                `${new Date(t).getFullYear()}-${String(new Date(t).getMonth() + 1).padStart(2, "0")}-${String(new Date(t).getDate()).padStart(2, "0")}`;
              const s = snap.stats;
              const his: string[] = [
                `\n${f.historyHeader(fmtDate(snap.createdAt))}`,
                f.historyRange(fmtDate(s.rangeStart), fmtDate(s.rangeEnd)),
                f.historyAdded(s.addedCount),
              ];
              if (s.addedTitles.length) his.push(f.historyAddedTitles(s.addedTitles.join("、")));
              his.push(f.historyUsage(s.usageCount, s.usedPromptCount));
              if (s.topUsed.length) {
                his.push(f.historyTop(s.topUsed.length));
                for (const t of s.topUsed) his.push(f.historyTopItem(t.title, t.count));
              }
              his.push(f.historyAiRefined(s.aiRefinedCount));
              output += his.join("\n");
            } else {
              output += `\n\n${f.historyHeader("")}\n${f.historyNone}`;
            }
            if (isAiAvailable()) {
              const settings = await getSettings();
              const comment = await commentOnStats(output, settings).catch(() => "");
              if (comment) output += `\n\n${f.aiComment}\n${comment}`;
            }
            return { kind: "success", text: output };
          }

          // -v：输出全部历史版本更新说明（按宿主界面语言，最新的在上）
          if (cmd === "version") {
            const notes = getAllVersionNotes(isZh ? "zh" : "en");
            const lines = [
              copy.versionHeader,
              ...notes.map((n) => {
                const date = n.date ? `（${n.date}）` : "";
                const itemLines = n.items.map((item) => `  - ${item}`).join("\n");
                return `\n${n.version}${date} ${n.title}\n${itemLines}`;
              }),
            ];
            return { kind: "success", text: lines.join("\n") };
          }

          return { kind: "error", text: copy.unknownFlag };
        },
      });
    });
    return () => dispose();
  });

  // —— 版本更新检查：服务启动即查一次，此后每 24 小时复查 ——
  // 正式版（npm）有更新则后台静默升级；测试版（GitHub 领先）只提示用户手动点击更新。
  // 定时器随 disposer 在插件卸载时清理，避免残留。
  void autoUpdateDaily();
  const versionTimer = setInterval(() => {
    void autoUpdateDaily();
  }, 24 * 60 * 60 * 1000);

  // —— 每周自动统计：每 7 天生成一次「近 7 天」统计快照写入 stats_history ——
  // 统计的只是近 7 天的增量数据（新增/使用/AI 完善），避免把历史累计反复重复统计；
  // 快照生成时若 AI 可用，会由 AI 生成一段简短的运营点评写入 comment 字段。
  // 在插件启动时立即检查一次；此后每 24 小时复查一次，距上次快照满 7 天即生成新快照。
  // 定时器随 apply 返回的 disposer 在插件卸载时清理，避免残留。
  const weeklySnapshotTimer = setInterval(() => {
    void checkAndGenerateWeeklySnapshot();
  }, 24 * 60 * 60 * 1000);
  void checkAndGenerateWeeklySnapshot();

  // —— 自动备份：启动时检查一次，此后每 24 小时复查 ——
  // 按用户设置（开启状态 / 周期 / 保留份数）判断是否到期执行；
  // 未开启或未到期时静默跳过，超出保留份数自动清理最旧备份。失败静默降级。
  // 定时器随 apply 返回的 disposer 在插件卸载时清理，避免残留。
  const backupTimer = setInterval(() => {
    void autoBackup();
  }, 24 * 60 * 60 * 1000);
  void autoBackup();

  return () => {
    disposeActivity?.();
    bus.off("session/event", onSessionScope);
    if (weeklySnapshotTimer) clearInterval(weeklySnapshotTimer);
    if (versionTimer) clearInterval(versionTimer);
    if (backupTimer) clearInterval(backupTimer);
  };
}

/** 一周的毫秒数（与 store 内常量保持一致）。 */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 把「近 7 天」每周统计快照转成适合 AI 点评的纯文本（按宿主界面语言）。
 */
function formatWeeklyStatsText(stats: WeeklyStats, isZh: boolean): string {
  const fmtDate = (t: number) =>
    `${new Date(t).getFullYear()}-${String(new Date(t).getMonth() + 1).padStart(2, "0")}-${String(new Date(t).getDate()).padStart(2, "0")}`;
  const lines: string[] = [];
  if (isZh) {
    lines.push(`【最近 7 天统计 · ${fmtDate(stats.rangeStart)} ~ ${fmtDate(stats.rangeEnd)}】`);
    lines.push(`- 新增提示词：${stats.addedCount} 条`);
    if (stats.addedTitles.length) lines.push(`    新增：${stats.addedTitles.join("、")}`);
    lines.push(`- 使用次数：${stats.usageCount} 次（覆盖 ${stats.usedPromptCount} 条）`);
    if (stats.topUsed.length) {
      lines.push(`- 近 7 天最常用 Top ${stats.topUsed.length}：`);
      for (const t of stats.topUsed) lines.push(`    ${t.title}（${t.count}次）`);
    }
    lines.push(`- AI 完善：${stats.aiRefinedCount} 条`);
  } else {
    lines.push(`[Last 7 days stats · ${fmtDate(stats.rangeStart)} ~ ${fmtDate(stats.rangeEnd)}]`);
    lines.push(`- Added: ${stats.addedCount}`);
    if (stats.addedTitles.length) lines.push(`    New: ${stats.addedTitles.join(", ")}`);
    lines.push(`- Used: ${stats.usageCount} times (${stats.usedPromptCount} prompts)`);
    if (stats.topUsed.length) {
      lines.push(`- Top ${stats.topUsed.length} used this week:`);
      for (const t of stats.topUsed) lines.push(`    ${t.title} (${t.count} times)`);
    }
    lines.push(`- AI-refined: ${stats.aiRefinedCount}`);
  }
  return lines.join("\n");
}

/**
 * 每 7 天自动统计门控：距上次快照不足 7 天时跳过；
 * 满 7 天（或尚无快照）则生成「近 7 天」统计快照写入 stats_history 表。
 * 快照生成时若 AI 可用，由 AI 生成一段简短点评写入 comment 字段（失败或不可用则为空串）。
 * 任何失败都静默降级，不影响主流程。
 */
async function checkAndGenerateWeeklySnapshot(): Promise<void> {
  try {
    const lastAt = await getLastSnapshotAt().catch(() => 0);
    if (lastAt > 0 && Date.now() - lastAt < WEEK_MS) return;
    const stats = await computeWeeklyStats();
    let comment = "";
    if (isAiAvailable()) {
      const settings = await getSettings();
      const locale = await readGlobalLocale();
      const isZh = locale.startsWith("zh") || locale === "";
      comment = await commentOnStats(formatWeeklyStatsText(stats, isZh), settings).catch(() => "");
    }
    await saveStatsSnapshot(stats, comment);
  } catch {
    /* 快照失败静默，不影响主流程 */
  }
}