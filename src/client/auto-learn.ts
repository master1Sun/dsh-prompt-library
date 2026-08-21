/**
 * AI 自记录算法 — 独立模块。
 *
 * 负责判断输入文本是否值得自动学习，并封装自动学习的防抖钩子：
 * - isLearnWorthy：启发式规则判断（长度 / 句子结构 / 换行 / 占位符）
 * - useAutoLearn：React 钩子，输入停顿约 3 秒后自动保存到词库并双侧去重
 *
 * 与 UI 解耦，方便复用与单独测试算法逻辑。
 */
import { useEffect, useRef } from "react";
import type { PluginSettings, Prompt } from "../types.js";
import { learnPrompt as apiLearn } from "./api.js";
import { markRecent } from "./recent-created.js";

/** 自动学习的防抖延迟（毫秒）：停止输入多久后触发保存。 */
export const AUTO_LEARN_DEBOUNCE_MS = 3000;

/** 自动学习成功 toast 的展示时长（毫秒）。 */
export const AUTO_LEARN_TOAST_MS = 2500;

/** 明显无意义的客套语 / 问候 / 单字应答（紧凑命中即视为低质量）。 */
const LOW_QUALITY_PATTERNS = [
  /^(好的|好|嗯|嗯嗯|噢|ok|okay|收到|谢谢|感谢|辛苦了|了解|明白了|可以|没问题|行|赞|666|厉害|不错|牛|绝了|好的收到|谢谢您)$/i,
  /^(你好|哈喽|hello|hi|嗨|早上好|中午好|下午好|晚上好|在吗)$/i,
];

/** 纯表情 / 符号 / 标点 / 空白组成的字符流（学习价值低）。 */
const EMOJI_OR_SYMBOL_RE = /^[\p{So}\p{Po}\p{Pi}\p{Pf}\p{Ps}\p{Pe}\p{Sc}…~！?。，；：、\s]+$/u;

/** 句子边界：句末标点或换行（多一句提示更有结构、更值得复用）。 */
const CLAUSE_BOUNDARY_RE = /[。！？!?；;…]|[\r\n]/g;

/** 结构化线索：列表项、占位符、层级标记等，多为可复用提示词特征。 */
const STRUCTURE_HINT_RE = /[#*\-•1-9]\.|【|】|\[|\]|<|>|：|、/;

/**
 * 低质量内容检测：
 * - 空白 / 纯表情 / 纯符号 → 低质量；
 * - 客套语、问候、单字应答 → 低质量。
 */
export function isLowQuality(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (EMOJI_OR_SYMBOL_RE.test(t)) return true;
  const compact = t.replace(/\s+/g, "");
  return LOW_QUALITY_PATTERNS.some((re) => re.test(compact));
}

/**
 * 信息密度 / 可复用价值判断。
 *
 * 在「有效字符数达标」基础上叠加结构启发式：
 * - 低于最小学习长度的碎片直接不学；
 * - 命中多句结构或列表/占位符等可复用特征 → 达标即可学；
 * - 没有明显结构的单句短文本，需要达到 2 倍最小长度才学（避免一次性聊天碎片）。
 */
export function isLearnWorthy(text: string, minLength: number): boolean {
  const t = text.trim();
  if (isLowQuality(t)) return false;
  const meaningful = t.replace(/[\s\p{P}\p{S}]/gu, "").length;
  if (meaningful < minLength) return false;
  const clauseCount = (t.match(CLAUSE_BOUNDARY_RE) ?? []).length;
  const hasStructure = STRUCTURE_HINT_RE.test(t);
  if (clauseCount >= 1 || hasStructure) return true;
  return meaningful >= Math.max(minLength * 2, 20);
}

/**
 * 粗略文本相似度（0~1）：对字符二元组做 Jaccard 相似度。
 * 忽略空格与大小写，用于判断「高度重复」的新文本。
 */
export function similarity(a: string, b: string): number {
  const grams = (s: string): Set<string> => {
    const set = new Set<string>();
    const t = s.toLowerCase().replace(/\s+/g, "");
    for (let i = 0; i < t.length; i++) set.add(t.slice(i, i + 2));
    if (!t) set.add("");
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  const union = A.size + B.size;
  if (union === 0) return 1;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (union - inter);
}

/**
 * 判断文本是否与词库中的某条高度重复（近似去重）。
 * 长度差异过大的两条直接跳过，避免长文误伤短文。
 */
export function isNearDuplicate(text: string, existingPrompts: Prompt[], threshold = 0.8): boolean {
  const t = text.trim();
  if (!t) return false;
  for (const p of existingPrompts) {
    const b = p.body.trim();
    if (!b) continue;
    const ratio = Math.min(t.length, b.length) / Math.max(t.length, b.length);
    if (ratio < 0.5) continue;
    if (similarity(t, b) >= threshold) return true;
  }
  return false;
}

/**
 * 自动学习钩子：草稿文本满足条件且停顿足够时长后，把文本交给回调处理。
 * 支持两种模式：
 * - 自动入库：直接调用 /learn 保存到词库（客户端与 host 双侧去重）。
 * - 手动确认：不自动保存，把文本交给 onManual，由界面弹出保存/取消；
 *   是否在保存后再调后台 AI 完善，由界面按用户是否点过「AI 润色」决定。
 */
export function useAutoLearn(
  draft: string,
  existingPrompts: Prompt[],
  settings: PluginSettings,
  onLearned: (learned: Prompt) => void,
  onManual?: (text: string) => void,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef<Set<string>>(new Set());
  // 手动确认：只要开启手动确认就生效（无论是否开启 AI 智能完善）。
  // 是否在保存后继续调后台 AI 完善，由界面在确认保存时按用户是否点过「AI 润色」决定。
  const manualActive = !!onManual && settings.autoLearnManualConfirm;

  useEffect(() => {
    if (!settings.autoLearnEnabled) return;
    const text = draft.trim();
    if (!text) return;
    if (!isLearnWorthy(text, settings.autoLearnMinLength)) return;

    const normalized = text.toLowerCase();
    if (submittedRef.current.has(normalized)) return;
    // 先精确去重，再做近似去重（命中高度重复的相似文本也不再入库）
    if (existingPrompts.some((p) => p.body.trim().toLowerCase() === normalized)) return;
    if (isNearDuplicate(text, existingPrompts)) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      submittedRef.current.add(normalized);
      // 手动确认模式：不自动保存，交由界面处理
      if (manualActive) {
        onManual?.(text);
        return;
      }
      try {
        const learned = await apiLearn(text, settings.autoLearnTag);
        markRecent(learned.id);
        onLearned(learned);
      } catch {
        // 静默失败
      }
    }, AUTO_LEARN_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draft, existingPrompts, settings.autoLearnEnabled, settings.autoLearnMinLength, settings.autoLearnTag, manualActive, onLearned, onManual]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
