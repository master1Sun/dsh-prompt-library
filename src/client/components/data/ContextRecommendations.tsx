/**
 * 基于聊天上下文的提示词推荐。
 *
 * 注册到 `conversation.input.dock` 插槽：该插槽是宿主预留的「输入框上方整行座位」
 * （见 dsh-client-ui-conversation slots 声明），与词库按钮（input.left）互不干扰。
 *
 * 原理：
 * - 通过插槽注入的 `useSession` 读取当前会话的 `chat.legacy.nodes`（宿主 StatsLine
 *   组件读取聊天历史的公开途径），取最近几条用户消息作为上下文；
 * - 对上下文做中文二元组 + 英文单词的关键词抽取，与词库每条提示词的标题/标签/正文
 *   做词频加权匹配，按得分排序取前 3 条；
 * - 渲染为输入框上方的横条，点击任意推荐即插入到输入框草稿。
 *
 * 触发条件：
 * - 仅在输入框有内容（正在输入）时，按输入内容（叠加最近聊天上下文）实时匹配；
 * - 输入框为空 / 新建会话、或没有任何提示词匹配时均不渲染。
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ConversationNode, ConversationSnapshot, UserMessageNode } from "@deepseek-ai/dsh-client-runtime/client";
import type { PluginSettings, Prompt } from "../../../types.js";
import { clampTitle } from "../../../types.js";
import {
  getSettings as apiGetSettings,
  listPrompts as apiList,
  usePrompt as apiUse,
} from "../../utils/api.js";
import { useDataChanged } from "../../utils/data-sync.js";
import { type PLTranslate, usePLT } from "../../utils/i18n.js";
import {
  applyVariables,
  extractVariables,
  hasVariables,
  TemplateFillModal,
} from "./TemplateVariables.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
} as const;

/** 推荐条数上限（保持最多 5 条推荐）。 */
const LIMIT = 5;
/** 取最近几条用户消息作为上下文。 */
const CONTEXT_USER_COUNT = 3;
/** 30 天的毫秒数：新鲜度窗口，近期使用过的提示词更可能是用户想要的。 */
const FRESH_MS = 30 * 24 * 60 * 60 * 1000;

/** 常见中文停用词（二元组），避免「我们/可以/什么」这类词导致误匹配。
 * 额外收录高频口语虚词（帮我/我想/麻烦等），减少噪声、让推荐不显得「随便」。 */
const STOP_BIGRAMS = new Set([
  "我们", "你们", "他们", "她们", "它们", "可以", "什么", "怎么", "为什么", "这个", "那个",
  "一个", "不是", "没有", "就是", "但是", "因为", "所以", "如果", "然后", "这样", "那样",
  "已经", "还是", "自己", "现在", "时候", "问题", "知道", "感觉", "觉得", "东西", "事情",
  "一下", "真的", "可能", "应该", "需要", "希望", "请问", "谢谢", "关于", "对于", "对于",
  "帮我", "我想", "我要", "麻烦", "你好", "您好", "如何", "怎样", "给我",
]);

/**
 * 从用户消息的正文块中提取可见文本。
 * `ContentBlock` 是判别联合，仅 `text` 块携带可见正文；其他块（reasoning/image/tool）忽略。
 */
function textOf(content: readonly { type: string; text?: string }[]): string {
  let out = "";
  for (const b of content) {
    if (b.type === "text" && typeof b.text === "string") out += `${b.text}\n`;
  }
  return out.trim();
}

/** 中文二元组 + 英文单词的关键词抽取（无分词器，滑动二元组近似中文关键词）。 */
function extractKeywords(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  const add = (raw: string) => {
    const k = raw.toLowerCase();
    if (!k || k.length < 2 || STOP_BIGRAMS.has(k)) return;
    freq.set(k, (freq.get(k) ?? 0) + 1);
  };
  // 英文单词 / 数字串
  for (const m of text.matchAll(/[a-zA-Z][a-zA-Z0-9_-]{1,}/g)) add(m[0]);
  // 中文：整段切分为长度 2 的滑动窗口（长句以窗口近似关键词）
  const cjk = text.match(/[\u4e00-\u9fa5]{2,}/g) ?? [];
  for (const seg of cjk) {
    for (let i = 0; i < seg.length - 1; i++) add(seg.slice(i, i + 2));
  }
  return freq;
}

/** 词长加权：英文词/长词更具体，匹配时贡献更大（中文二元组恒为 1，避免过度放大）。 */
function termWeight(k: string): number {
  if (/[\u4e00-\u9fa5]/.test(k)) return 1;
  return 1 + Math.min(2, Math.log2(k.length) / 2);
}

/**
 * 综合匹配得分（智能化计算，不是随便推荐）：
 *  - 先算「上下文相关度」：标题/标签命中权重 2、正文命中权重 1，按词频 × 词长加权；
 *  - 相关度为 0（与上下文完全无关）的提示词直接不推荐；
 *  - 命中后再叠加「使用智能」：常用度（对数归一化，约 10 次接近满值）＋近 30 天新鲜度，
 *    让既相关又常用的提示词排在最前。
 */
function scorePrompt(p: Prompt, kw: Map<string, number>, now: number): number {
  const head = `${p.title} ${p.tags?.join(" ") ?? ""}`.toLowerCase();
  const body = p.body.toLowerCase();
  let relevance = 0;
  for (const [k, f] of kw) {
    const w = termWeight(k);
    if (head.includes(k)) relevance += f * 2 * w;
    else if (body.includes(k)) relevance += f * w;
  }
  if (relevance <= 0) return 0;

  // 使用智能：常用度 0..1（对数缩放，冷门/热门差距不过大）+ 近 30 天使用过加新鲜度分
  const freq = p.usageCount > 0 ? Math.log(1 + p.usageCount) / Math.log(11) : 0;
  const fresh = p.lastUsedAt > 0 && now - p.lastUsedAt < FRESH_MS ? 1 : 0;
  const usage = Math.min(1, freq * 0.6 + fresh * 0.4);

  return relevance * (1 + usage);
}

/** 读取「上下文提示词推荐」开关：初始加载设置并监听设置变更事件实时生效。 */
function useRecommendEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    apiGetSettings()
      .then((s) => setEnabled(!!s.contextRecommendEnabled))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<PluginSettings | undefined>).detail;
      if (detail) setEnabled(!!detail.contextRecommendEnabled);
    };
    window.addEventListener("pl:settings-changed", onChanged);
    return () => window.removeEventListener("pl:settings-changed", onChanged);
  }, []);
  return enabled;
}

/** `conversation.input.dock` 的最小属性合约（宿主角色的标准运行时套件）。 */
interface DockProps {
  /** 会话快照选择器钩子（session-scope 插槽标准套件，宿主必定注入）。 */
  useSession?: <T>(selector: (s: ConversationSnapshot) => T) => T;
  /** 输入状态选择器钩子（读取当前草稿）。 */
  useInput?: <T>(selector: (s: { draft: string }) => T) => T;
  /** 输入框动作：插入推荐到草稿。 */
  inputActions?: { setDraft: (text: string) => void };
  t?: PLTranslate;
}

/** 仅在功能开关开启时挂载。 */
export function ContextRecommendations(props: DockProps): ReactNode {
  const T = usePLT(props?.t);
  const enabled = useRecommendEnabled();
  const useSession = props.useSession;
  const useInput = props.useInput;
  const inputActions = props.inputActions;

  // 宿主注入的钩子必须在组件顶层调用（不能放进 useMemo）；会话存在时必定注入，
  // 缺失时（理论上不会发生）整个组件不渲染
  const nodes = useSession?.((s) =>
    (s as unknown as { chat?: { legacy?: { nodes?: readonly ConversationNode[] } } } | undefined)
      ?.chat?.legacy?.nodes,
  );
  const draft = useInput?.((s) => s.draft) ?? "";

  // 会话上下文：最近几条用户消息的文本（宿主 StatsLine 读取聊天历史的同一途径）
  const userText = useMemo(() => {
    if (!nodes) return "";
    const users = nodes.filter((n): n is UserMessageNode => n.kind === "user");
    return users
      .slice(-CONTEXT_USER_COUNT)
      .map((n) => textOf(n.content))
      .join("\n")
      .trim();
  }, [nodes]);

  // 词库提示词：挂载时加载，并在词库数据变化时刷新
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const refresh = useCallback(() => {
    apiList()
      .then(setPrompts)
      .catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useDataChanged(refresh);

  // 推荐关键词来源（按优先级叠加）：
  // 输入框有内容时以输入内容为主，其次叠加最近聊天上下文，实时匹配用户正在输入的内容
  const keywordText = useMemo(() => {
    const parts: string[] = [];
    if (draft.trim()) parts.push(draft);
    if (userText) parts.push(userText);
    return parts.join("\n").trim();
  }, [draft, userText]);

  // 依据关键词给每条提示词智能打分，取前 LIMIT 条（最多 5 条；综合相关度 + 使用智能）。
  // 输入框无内容（含新建会话）时不推荐；无任何匹配（相关度为 0）时同样不渲染。
  const hits = useMemo(() => {
    if (!enabled) return [] as Prompt[];
    // 输入框为空（尚未开始输入或新建会话）时不显示推荐
    if (!draft.trim()) return [] as Prompt[];
    const now = Date.now();
    const kw = extractKeywords(keywordText);
    if (kw.size === 0) return [] as Prompt[];
    return prompts
      .map((p) => ({ p, score: scorePrompt(p, kw, now) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, LIMIT)
      .map((x) => x.p);
  }, [enabled, draft, keywordText, prompts]);

  // 推荐命中含 {{变量}} 的提示词时，记录待填充的模板（变量填充弹窗状态）
  const [template, setTemplate] = useState<{ p: Prompt } | null>(null);

  // 未开启 / 输入框无内容 / 无匹配时都不渲染；输入内容时保持显示，随输入实时更新
  if (!enabled || !useSession || !useInput || !inputActions || hits.length === 0) {
    return null;
  }

  // 点击推荐：含 {{变量}} 时先弹变量填充框，否则统计使用并插入到输入框草稿（草稿为空时直接替换，非空时追加）
  const insert = (p: Prompt) => {
    if (hasVariables(p.body)) {
      setTemplate({ p });
      return;
    }
    apiUse(p.id).catch(() => {});
    inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${p.body}` : p.body);
  };

  // 变量填充确认：用填充后的正文替换占位符后写入草稿（草稿为空时直接替换，非空时追加）
  const applyTpl = (values: Record<string, string>) => {
    if (!template) return;
    const filled = applyVariables(template.p.body, values);
    apiUse(template.p.id).catch(() => {});
    inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${filled}` : filled);
    setTemplate(null);
  };

  return (
    <>
    {/* 外框镜像宿主 InputBar 的居中布局：左右留白 + 内容整体居中（聊天输入框卡片在中间显示）。
        内层盒子 max-width 与聊天输入卡片（--dsh-composer-card-max-width）一致，
        从而保证推荐与聊天框左边缘对齐，而不是贴着整行最左边 */}
    <div
      style={{
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 var(--dsh-composer-side-clearance, 16px)",
      }}
    >
    <div
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "var(--dsh-composer-card-max-width, 780px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 6,
        padding: "0 2px",
        fontFamily: MONO,
        fontSize: 12,
        color: TONE.muted,
        overflow: "hidden",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, color: TONE.quiet }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: TONE.accent }}>
          <path
            d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        {T("pl.recommend")}
      </span>
      {hits.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => insert(p)}
          data-tip={p.body}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            maxWidth: 220,
            height: 26,
            padding: "0 10px",
            border: `1px solid ${TONE.border}`,
            borderRadius: 13,
            background: "var(--dsw-alias-bg-layer-2, #ffffff)",
            color: TONE.text,
            fontSize: 12,
            cursor: "pointer",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover, rgba(128,160,200,0.1))";
            e.currentTarget.style.borderColor = "var(--dsw-alias-border-l3, rgba(196,211,232,0.31))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--dsw-alias-bg-layer-2, #ffffff)";
            e.currentTarget.style.borderColor = TONE.border;
          }}
        >
          <span style={{ flexShrink: 0, color: TONE.accent, display: "inline-flex" }} aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h9v4H4V6Zm0 8h9v4H4v-4ZM17 6h3M17 12h3M17 18h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{clampTitle(p.title)}</span>
        </button>
      ))}
    </div>
    </div>
    {/* 变量填充弹窗：推荐命中含 {{变量}} 的提示词时弹出（居中遮罩，仅可手动关闭） */}
    <TemplateFillModal
      open={template !== null}
      variables={template ? extractVariables(template.p.body) : []}
      body={template ? template.p.body : ""}
      onCancel={() => setTemplate(null)}
      onConfirm={applyTpl}
      confirmLabel={T("pl.insert")}
      showInsertAndSend={false}
      draftEmpty={!draft.trim()}
      t={T}
    />
    </>
  );
}
