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

/**
 * 判断文本是否适合自动学习。
 * 依据设置的最小学习长度（有效字符数量）：先过滤空白、标点、符号等，
 * 剩余有效字符数达到数量才触发。
 */
export function isLearnWorthy(text: string, minLength: number): boolean {
  const meaningful = text.replace(/[\s\p{P}\p{S}]/gu, "").length;
  return meaningful >= minLength;
}

/**
 * 自动学习钩子：草稿文本满足条件且停顿足够时长后，把文本交给回调处理。
 * 支持两种模式：
 * - 自动入库：直接调用 /learn 保存到词库（客户端与 host 双侧去重）。
 * - 手动确认：不自动保存，把文本交给 onManual，由界面弹出保存/取消（AI 智能完善开启时忽略此模式，行为同自动入库）。
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
  // 手动确认仅在未开启 AI 智能完善时生效（开启时保持原自动入库逻辑）
  const manualActive = !!onManual && settings.autoLearnManualConfirm && !settings.aiEnrichEnabled;

  useEffect(() => {
    if (!settings.autoLearnEnabled) return;
    const text = draft.trim();
    if (!text) return;
    if (!isLearnWorthy(text, settings.autoLearnMinLength)) return;

    const normalized = text.toLowerCase();
    if (existingPrompts.some((p) => p.body.trim().toLowerCase() === normalized)) return;
    if (submittedRef.current.has(normalized)) return;

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
