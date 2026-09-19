/**
 * dsh-prompt-library — host 入口。
 *
 * 在 /api/prompt-library 下注册 HTTP 路由（提示词 CRUD 等），并把人格、
 * HARNESS 与工作区技能注入组装进会话 systemPrompt。路由注册依赖于 webServer
 * 是否可用（无头 profile 得到一个空操作插件——那里没有 UI 来驱动）。
 */
import type { Context } from "@deepseek-ai/cordis";
import { makePromptRoutes } from "./host/routes.js";
import { dataChangedUpgradeRoute } from "./host/events.js";
import { welcomePromptOnce } from "./host/store.js";
import {
  getCurrentSessionScope,
  getSessionActivePromptIds,
  getSessionPromptsByIds,
  resolveSessionPromptBindingIds,
  seedDefaultSessionPromptsIfEmpty,
  setCurrentSessionScope,
} from "./host/session-prompts.js";
import { logAiInjected, registerLlm } from "./host/ai.js";
import { disabledHarnessSkillsInstruction } from "./host/skills.js";
import { soulSystemSync, ensureSoulFile } from "./host/character.js";
import { resolvePersonaForSession } from "./host/persona-service.js";
import { harnessSystemSync } from "./host/harness.js";
import {
  registerSessionListProvider,
  recordActiveSessionCwd,
  type SessionQueryRecord,
} from "./host/session-scope.js";

export const name = "prompt-library";

/** systemPrompt.section 注册项的结构化形状（宿主类型未导出，故本地声明）。 */
interface PromptSection {
  name: string;
  order: number;
  text: string | ((context: unknown) => string);
}

/** 没有静态声明的必需服务；webServer / llm / systemPrompt 按条件注入。 */
export const inject: string[] = [];

/**
 * 组装「会话级技能注入」段文本：
 * - 优先取当前会话 scope 的临时注入（技能注入弹窗「当前会话」Tab，仅本会话生效）；
 * - 其次取当前会话 id 的持久绑定（若该会话绑定了技能则只注入这些，不再用路径绑定）；
 * - 再次取工作目录 cwd 命中的「工作区/项目」持久绑定（最深的祖先/相等匹配）。
 * 按序累积、按 id 去重、临时注入优先。无任何命中返回空串（不注入额外段落）。
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

export function apply(ctx: Context) {
  const routes = makePromptRoutes();

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
    ctx.inject(["sessionQuery"], (sessionCtx: unknown) => {
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
  // 人格 section 正文（order 0）：会话 id 绑定优先、工作目录路径绑定回退；无命中时走全局默认人格。
  const personaSectionText = (context: unknown): string => {
    const { sessionId, cwd } = resolveAssemblySession(context);
    const personaId = resolvePersonaForSession(sessionId || null, cwd || null);
    return soulSystemSync(personaId);
  };
  // 其余会话约束 section（order 800，位于工具指引 100-199 之后，贴近 prompt 末尾以增强遵守）：
  // - HARNESS：恒注入当前会话（内部上下文，不要向用户回显）；
  // - 技能注入：当前会话「临时注入」优先，其次会话 id 持久绑定，再次工作目录路径绑定；
  // - 禁用技能指令：把用户禁用的 ~/.dsh/skills / 项目技能清单注入为软控制；
  // - 欢迎：只对第一个新会话注入一次简短问候。
  const workspaceSectionText = (context: unknown): string => {
    const { sessionId, cwd } = resolveAssemblySession(context);
    const parts: string[] = [];
    parts.push(harnessSystemSync());
    const injected = buildSessionPromptInjection(sessionId, cwd);
    if (injected) parts.push(injected);
    const disabledSkills = disabledHarnessSkillsInstruction(cwd || null);
    if (disabledSkills) parts.push(disabledSkills);
    const welcome = welcomePromptOnce(sessionId);
    if (welcome) parts.push(welcome);
    return parts.filter((p) => p.trim()).join("\n\n");
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
          text: workspaceSectionText,
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
      const disposers = routes.map((route) => httpCtx.webServer.register(route));
      // 全插件只有一条 WS 连接（/api/prompt-library/events），承载数据变更广播
      // 与词库助手状态流；注册在 upgrade 表。宿主版本没有 registerUpgrade 时
      // 静默跳过（仅丢实时推送，不影响其余 HTTP 路由）。
      const server = httpCtx.webServer as unknown as {
        registerUpgrade?: (route: unknown) => () => void;
      };
      if (typeof server.registerUpgrade === "function") {
        disposers.push(server.registerUpgrade(dataChangedUpgradeRoute));
      }
      return () => {
        for (const dispose of disposers) dispose();
      };
    }, "prompt-library: routes");
  });

  // 插件销毁时解除会话事件监听（bus 与 ctx 同一份运行时对象）。
  return () => {
    bus.off("session/event", onSessionScope);
  };
}
