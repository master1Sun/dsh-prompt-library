/**
 * 词库 composer 按钮控件。
 *
 * 注册到 `conversation.input.left` 插槽：composer 工具栏中的一个小按钮。
 * 点击弹出面板，管理可复用的提示词片段。
 * 与右侧侧边栏独立显示，互不影响。
 * 点击提示词通过 `inputActions.setDraft` 将其正文插入当前草稿。
 */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import type { PluginSettings, Prompt } from "../../../types.js";
import { clampTitle, DEFAULT_SETTINGS } from "../../../types.js";
import {
  createPrompt as apiCreate,
  deletePrompt as apiDelete,
  getSettings as apiGetSettings,
  listPrompts as apiList,
  listTags as apiListTags,
  updatePrompt as apiUpdate,
  usePrompt as apiUse,
  learnPrompt as apiLearn,
  polishPrompt as apiPolish,
} from "../../services/api.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { PL_BUTTON_CSS, plBtn } from "../../utils/button-style.js";
import { SidebarPromptLibrary } from "../sidebar/SidebarPromptLibrary.js";
import { SelectionAddPrompt } from "../selection/SelectionAddPrompt.js";
import { Pagination } from "../common/Pagination.js";
import { TagInput } from "../common/TagInput.js";
import { ConfirmDialog } from "../common/ConfirmDialog.js";
import { AUTO_LEARN_TOAST_MS, AUTO_LEARN_UNDO_MS, useAutoLearn } from "../../utils/auto-learn.js";
import { isRecent, markRecent } from "../../utils/recent-created.js";
import { rowBackground } from "../../utils/theme.js";
import { notifyDataChanged, useDataChanged, useExportDownloaded, useFillDraft } from "../../services/data-sync.js";
import { type PLT, type PLTranslate, usePLT } from "../../i18n/i18n.js";
import { SearchBox, TagFilterBar } from "../common/SearchBox.js";
import {
  applyVariables,
  extractVariables,
  hasVariables,
  insertVariableAt,
  TemplateFillModal,
} from "../common/TemplateVariables.js";


/**
 * `conversation.input.left` 的最小属性合约。
 */
interface ButtonProps {
  useInput: <T>(selector: (s: { draft: string }) => T) => T;
  inputActions: {
    setDraft: (text: string) => void;
    submit?: () => void;
  };
  t?: PLTranslate;
}

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 20%, transparent)",
  mint: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff8592)",
} as const;

// ── # 键触发 ────────────────────────────────────────────────────────────────

let lastPromptsForSelect: Prompt[] = [];

/**
 * 获取可编辑元素的当前文本。
 * 兼容 textarea / input（取 value）与 contenteditable（取 textContent）。
 */
function getEditableText(el: HTMLElement): string | null {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value;
  }
  if (el.isContentEditable) {
    return el.textContent ?? "";
  }
  return null;
}

/**
 * 获取光标在文本中的位置。
 * textarea / input 用 selectionStart；contenteditable 用 Selection + Range 计算。
 */
function getCaretPosition(el: HTMLElement): number {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const text = getEditableText(el);
    return el.selectionStart ?? text?.length ?? 0;
  }
  if (el.isContentEditable) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().length;
  }
  return 0;
}

/**
 * 获取光标（或选中区）在视口内的矩形，用于浮层定位。
 * contenteditable 用 Selection 的 Range；textarea/input 用镜像元素测量光标行。
 * 相比直接用整个输入框的矩形，可避免内容过多时输入框超出视口导致的定位错位/跳顶。
 */
function getCaretRect(el: HTMLElement): DOMRect {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return measureFieldCaretRect(el);
  }
  if (el.isContentEditable) {
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    if (range) {
      // 优先取多行/选区的第一个光标矩形；为空时退回选区整体矩形
      const r = range.cloneRange();
      const rects = r.getClientRects();
      if (rects.length > 0) return rects.item(0)!;
      const br = r.getBoundingClientRect();
      if (br.width > 0 || br.height > 0) return br;
    }
  }
  return el.getBoundingClientRect();
}

/**
 * 用镜像元素测量 textarea/input 光标所在行的视口坐标。
 * 文本过多时元素自身矩形可能超出视口，直接用它会错位/跳顶。
 */
function measureFieldCaretRect(el: HTMLTextAreaElement | HTMLInputElement): DOMRect {
  const value = getEditableText(el) ?? "";
  const pos = Math.min(el.selectionStart ?? value.length, value.length);
  const style = window.getComputedStyle(el);
  const elRect = el.getBoundingClientRect();

  // 复制关键文本/盒模型样式，确保镜像排布与输入框一致
  const mirror = document.createElement("div");
  mirror.style.cssText = [
    "position: fixed",
    "left: 0",
    "top: 0",
    "visibility: hidden",
    "pointer-events: none",
    "white-space: pre-wrap",
    "word-break: break-word",
    "overflow-wrap: break-word",
    // 盒模型关键项
    `box-sizing: ${style.boxSizing}`,
    `width: ${elRect.width}px`,
    `padding-top: ${style.paddingTop}`,
    `padding-right: ${style.paddingRight}`,
    `padding-bottom: ${style.paddingBottom}`,
    `padding-left: ${style.paddingLeft}`,
    `border-top-width: ${style.borderTopWidth}`,
    `border-bottom-width: ${style.borderBottomWidth}`,
    `border-right-width: ${style.borderRightWidth}`,
    `border-left-width: ${style.borderLeftWidth}`,
    // 文本样式
    `font: ${style.font}`,
    `letter-spacing: ${style.letterSpacing}`,
    `line-height: ${style.lineHeight}`,
    `text-align: ${style.textAlign}`,
    `text-indent: ${style.textIndent}`,
  ].join(";");
  const before = document.createElement("span");
  before.textContent = value.slice(0, pos);
  const caret = document.createElement("span");
  caret.textContent = " ";
  mirror.appendChild(before);
  mirror.appendChild(caret);
  document.body.appendChild(mirror);
  const caretRect = caret.getBoundingClientRect();
  document.body.removeChild(mirror);

  // 文本框内部滚动后，光标行在可见区域内的实际坐标：
  // 水平 = 镜像测量值 + 元素左偏移 - 横向滚动；垂直同理减去纵向滚动。
  const scrollTop = el.scrollTop ?? 0;
  const scrollLeft = el.scrollLeft ?? 0;
  return new DOMRect(
    caretRect.left + elRect.left - scrollLeft,
    caretRect.top + elRect.top - scrollTop,
    caretRect.width,
    caretRect.height,
  );
}

function useTildaTrigger(
  settings: PluginSettings,
  prompts: Prompt[],
  inputActions: { setDraft: (text: string) => void },
  draft: string,
  t: PLT,
  onSelect?: (p: Prompt) => void,
): void {
  const activeRef = useRef(false);
  // 触发浮层时「#」在正文中的位置；用于计算「#」之后的实时筛选内容
  const triggerIdxRef = useRef(-1);
  const draftRef = useRef(draft);
  const inputActionsRef = useRef(inputActions);
  const onSelectRef = useRef(onSelect);
  draftRef.current = draft;
  inputActionsRef.current = inputActions;
  onSelectRef.current = onSelect;
  lastPromptsForSelect = prompts;

  useEffect(() => {
    if (!settings.tildaTriggerEnabled) return;

    // 检测光标前一个字符是否为「#」（且前面是空格/换行/开头），是则弹出词库选择
    const tryShowOverlay = (target: EventTarget | null): void => {
      if (activeRef.current) return;
      const el = target as HTMLElement | null;
      if (!el || !(el instanceof HTMLElement)) return;
      const value = getEditableText(el);
      if (value === null) return;
      const selStart = getCaretPosition(el);
      if (selStart <= 0) return;
      if (value[selStart - 1] !== "#") return;
      const prevChar = selStart > 1 ? value[selStart - 2] : " ";
      if (prevChar !== " " && prevChar !== "\n") return;
      activeRef.current = true;
      triggerIdxRef.current = selStart - 1;
      showOverlay(el, lastPromptsForSelect, inputActionsRef.current, draftRef.current, "", t, onSelectRef.current);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (activeRef.current) {
        if (e.key === "Escape") {
          // 阻止事件继续传播，避免与输入框自身按键处理冲突
          e.preventDefault();
          e.stopPropagation();
          activeRef.current = false;
          triggerIdxRef.current = -1;
          removeOverlay();
          return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          e.stopPropagation();
          highlightNext(e.key === "ArrowDown" ? 1 : -1);
          return;
        }
        if (e.key === "Enter") {
          // 捕获阶段拦截，阻止输入框的 Enter 发送消息
          e.preventDefault();
          e.stopPropagation();
          const selected = getSelectedPrompt();
          if (selected) {
            if (onSelectRef.current) onSelectRef.current(selected);
            else applyPrompt(selected, inputActionsRef.current, draftRef.current);
          }
          activeRef.current = false;
          triggerIdxRef.current = -1;
          removeOverlay();
          return;
        }
      }
    };

    // keyup 事件：按键抬起时内容已更新，IME（中文输入法）下比 input 更可靠
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "#" || e.key === "3" || e.key === "Dead" || e.key === "Process") {
        tryShowOverlay(e.target);
      }
    };

    // input 事件：正常输入时触发
    const onInput = (e: Event) => {
      // 已激活浮层时：把「#」之后、光标之前的文本作为实时筛选词，
      // 继续输入会刷新筛选结果；输入空格则结束筛选并关闭浮层。
      if (activeRef.current) {
        const el = e.target as HTMLElement | null;
        if (el instanceof HTMLElement) {
          const value = getEditableText(el);
          const selStart = getCaretPosition(el);
          const tri = triggerIdxRef.current;
          // 触发 # 被删除或光标位置异常 → 关闭浮层，允许下次再触发
          if (value === null || tri < 0 || tri >= value.length || value[tri] !== "#" || selStart < tri) {
            activeRef.current = false;
            triggerIdxRef.current = -1;
            removeOverlay();
            return;
          }
          const query = value.slice(tri + 1, selStart);
          // 筛选内容中出现空格 → 结束筛选（空格保留在正文中）
          if (query.includes(" ")) {
            activeRef.current = false;
            triggerIdxRef.current = -1;
            removeOverlay();
            return;
          }
          // 实时按筛选内容更新浮层
          showOverlay(el, lastPromptsForSelect, inputActionsRef.current, draftRef.current, query, t, onSelectRef.current);
        }
        return;
      }
      tryShowOverlay(e.target);
    };

    // compositionend 事件：中文输入法组合结束后内容才真正更新
    const onCompositionEnd = (e: Event) => tryShowOverlay(e.target);

    // 点击浮层外部空白处 → 隐藏浮层（捕获阶段，避免被 stopPropagation 拦截）
    const onDocClick = (e: MouseEvent) => {
      if (!activeRef.current) return;
      const target = e.target as HTMLElement | null;
      if (!(target instanceof HTMLElement)) return;
      const overlay = document.querySelector<HTMLDivElement>("[data-prompt-library-overlay]");
      // 点击浮层内部 → 不关闭（浮层内点击项自带处理）
      if (overlay && overlay.contains(target)) return;
      // 点击输入框本身 → 不关闭（保持浮层，方便继续操作）
      if (target.closest("textarea, input, [contenteditable='true']")) return;
      activeRef.current = false;
      removeOverlay();
    };

    // 捕获阶段监听：在输入框自身按键处理（如 Enter 发送）之前拦截，避免冲突
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("input", onInput);
    document.addEventListener("compositionend", onCompositionEnd);
    document.addEventListener("click", onDocClick, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("input", onInput);
      document.removeEventListener("compositionend", onCompositionEnd);
      document.removeEventListener("click", onDocClick, true);
      removeOverlay();
    };
  }, [settings.tildaTriggerEnabled, t]);
}

/** 未输入筛选词时，输入 # 浮层默认展示的提示词条数（按使用次数取前 N，不做分页）。 */
const INPUT_SELECT_PAGE_SIZE = 20;

let highlightIndex = 0;

function removeOverlay(): void {
  const overlay = document.querySelector<HTMLDivElement>("[data-prompt-library-overlay]");
  if (overlay) overlay.remove();
  highlightIndex = 0;
}

function showOverlay(
  target: HTMLElement,
  prompts: Prompt[],
  inputActions: { setDraft: (text: string) => void },
  draft: string,
  query = "",
  t: PLT,
  onSelect?: (p: Prompt) => void,
): void {
  removeOverlay();
  if (prompts.length === 0) return;

  // 按「#」之后的筛选内容准备数据：
  // - 未输入筛选词时，仅展示“使用最多”的前 INPUT_SELECT_PAGE_SIZE 条（按 usageCount 降序，不分页）；
  // - 输入筛选词时，从全部词库中实时过滤（标题/正文/标签任意包含），展示所有匹配项。
  const q = query.trim().toLowerCase();
  const source = q
    ? prompts.filter((p) =>
        `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase().includes(q),
      )
    : [...prompts]
        .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0))
        .slice(0, INPUT_SELECT_PAGE_SIZE);
  const filtered = source.map((p) => ({ p }));

  // 用光标（或选中区）在视口内的位置来定位浮层。
  // 输入框内容过多时其自身矩形可能远超视口（top 为负），用它定位会错位/跳顶。
  const rect = getCaretRect(target);
  const overlay = document.createElement("div");
  overlay.dataset.promptLibraryOverlay = "";
  overlay.style.cssText = [
    "position: fixed",
    `top: ${rect.bottom + 4}px`,
    `left: ${rect.left}px`,
    "z-index: 2147483647",
    "min-width: 280px",
    "max-width: 400px",
    "max-height: 300px",
    "display: flex",
    "flex-direction: column",
    `background: ${TONE.panel}`,
    `border: 1px solid ${TONE.borderStrong}`,
    "border-radius: 8px",
    `font-family: ${MONO}`,
    "font-size: 12px",
    "padding: 4px",
  ].join(";");
  // 候选列表的独立滚动容器：底部快捷键/翻页条不随列表滚动
  const listBox = document.createElement("div");
  listBox.style.cssText = ["overflow-y: auto", "flex: 1 1 auto", "min-height: 0"].join(";");
  overlay.appendChild(listBox);

  /** 清除所有行的高亮背景。 */
  const clearHighlight = () => {
    for (const child of listBox.children) {
      (child as HTMLElement).style.background = "transparent";
    }
  };

  /** 高亮指定行并同步键盘选中项（Enter 确认时使用该项）。 */
  const highlightItem = (index: number) => {
    clearHighlight();
    highlightIndex = index;
    const item = listBox.children[index] as HTMLElement | undefined;
    if (item) {
      item.style.background = TONE.accentSoft;
      item.scrollIntoView({ block: "nearest" });
    }
  };

  // 无匹配结果时仍保留浮层，提示用户继续输入或输入空格结束筛选
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = q ? t("pl.overlayNoMatch", { query: q }) : t("pl.empty");
    empty.style.cssText = [
      "padding: 10px",
      "font-size: 12px",
      `color: ${TONE.quiet}`,
    ].join(";");
    listBox.appendChild(empty);
  }

  filtered.forEach(({ p }, i) => {
    const item = document.createElement("div");
    item.dataset.promptLibraryItem = "";
    // 把 prompt 对象直接绑定到该行，避免用下标回查全局数组（筛选/排序后容易错位）
    (item as unknown as { _prompt: Prompt })._prompt = p;
    item.style.cssText = [
      "padding: 6px 10px",
      "cursor: pointer",
      "border-radius: 4px",
      "display: flex",
      "flex-direction: column",
      "gap: 2px",
      i === 0 ? `background: ${TONE.accentSoft}` : "",
    ].join(";");

    // 标题行：加粗、主色、单行省略（仅显示前 TITLE_MAX_LEN 字，避免手动改文件后超长）
    const title = document.createElement("div");
    title.textContent = clampTitle(p.title);
    // 动态创建的元素用 data-tip 而非原生 title，保证主题自适应（白天/黑夜）
    title.dataset.tip = p.title;
    title.style.cssText = [
      "font-size: 12px",
      "font-weight: 600",
      `color: ${TONE.text}`,
      "white-space: nowrap",
      "overflow: hidden",
      "text-overflow: ellipsis",
    ].join(";");

    // 正文预览行：次要色、小号、单行省略，与标题区分开
    const body = document.createElement("div");
    const preview = p.body.replace(/\s+/g, " ").trim();
    body.textContent = preview.length > 80 ? `${preview.slice(0, 80)}…` : preview;
    body.style.cssText = [
      "font-size: 11px",
      `color: ${TONE.muted}`,
      "white-space: nowrap",
      "overflow: hidden",
      "text-overflow: ellipsis",
    ].join(";");

    item.appendChild(title);
    item.appendChild(body);

    item.onclick = () => {
      // 有 onSelect（# 浮层选择）时交给调用方处理（含 {{}} 时弹变量填充窗口），否则直接插入
      if (onSelect) onSelect(p);
      else applyPrompt(p, inputActions, draft);
      removeOverlay();
    };
    // 鼠标移入 → 高亮该行（同时成为键盘 Enter 的确认项）
    item.onmouseenter = () => highlightItem(i);
    item.onmouseleave = () => {
      if (highlightIndex === i) item.style.background = "transparent";
    };

    listBox.appendChild(item);
  });

  // 底部快捷键提示（筛选模式下展示当前筛选词）
  const hint = document.createElement("div");
  hint.textContent = q
    ? t("pl.overlayHintFilter", { query: q })
    : t("pl.overlayHintDefault");
  hint.style.cssText = [
    "padding: 6px 10px 3px",
    "font-size: 10px",
    `color: ${TONE.quiet}`,
    "border-top: 1px solid " + TONE.border,
    "margin-top: 2px",
    "user-select: none",
    "flex-shrink: 0",
  ].join(";");
  overlay.appendChild(hint);

  highlightIndex = 0;
  document.body.appendChild(overlay);

  // 智能定位：让浮层始终贴合输入框。下方空间足够就在输入框下方显示；
  // 不足时翻转到输入框上方显示，上方也不够则收缩高度贴近输入框（靠内部滚动），不跳到远离输入框的视口顶部。
  const spaceBelow = window.innerHeight - (rect.bottom + 4);
  const overlayHeight = overlay.offsetHeight;
  if (spaceBelow < overlayHeight) {
    const spaceAbove = rect.top - 4;
    const usable = Math.min(overlayHeight, spaceAbove);
    overlay.style.maxHeight = `${Math.max(80, usable)}px`;
    overlay.style.top = `${Math.max(4, rect.top - Math.max(80, usable) - 4)}px`;
  }
}

/** 获取弹窗内所有提示词行（不含底部快捷键提示）。 */
function getOverlayItems(): HTMLElement[] {
  const overlay = document.querySelector<HTMLDivElement>("[data-prompt-library-overlay]");
  if (!overlay) return [];
  return Array.from(overlay.querySelectorAll<HTMLElement>("[data-prompt-library-item]"));
}

function highlightNext(dir: number): void {
  const items = getOverlayItems();
  if (items.length === 0) return;
  const current = items[highlightIndex];
  if (current) current.style.background = "transparent";
  highlightIndex = (highlightIndex + dir + items.length) % items.length;
  const next = items[highlightIndex];
  if (next) {
    next.style.background = TONE.accentSoft;
    next.scrollIntoView({ block: "nearest" });
  }
}

function getSelectedPrompt(): Prompt | null {
  const items = getOverlayItems();
  if (items.length === 0) return null;
  // 读高亮行上直接绑定的 prompt 对象（渲染时绑定），任何筛选/排序下都精确命中
  const idx = Math.min(highlightIndex, items.length - 1);
  return (items[idx] as unknown as { _prompt?: Prompt })._prompt ?? null;
}

function applyPrompt(prompt: Prompt, inputActions: { setDraft: (text: string) => void }, draft: string): void {
  const idx = draft.lastIndexOf("#");
  if (idx >= 0) {
    // 用提示词正文替换「#」及其后的筛选内容（直接替换整段筛选文本）
    inputActions.setDraft(`${draft.slice(0, idx)}${prompt.body}`);
  } else {
    inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${prompt.body}` : prompt.body);
  }
}

// ── 设置钩子 ─────────────────────────────────────────────────────────────

function useSettings(): [PluginSettings, boolean] {
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  const load = useCallback(() => {
    apiGetSettings().then((s) => {
      setSettings(s);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  // 监听设置变更事件，实现保存后立即生效
  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as PluginSettings | undefined;
      if (detail) setSettings(detail);
      else load();
    };
    window.addEventListener("pl:settings-changed", onChanged);
    return () => window.removeEventListener("pl:settings-changed", onChanged);
  }, [load]);

  return [settings, ready];
}

// ── 主组件 ───────────────────────────────────────────────────────────────

export function PromptLibraryButton(props: ButtonProps): ReactNode {
  const { inputActions, useInput, t } = props;
  const T = usePLT(t);
  const draft = useInput((s) => s.draft);

  const [open, setOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  // 待确认删除的提示词（自定义确认弹窗，替代系统 confirm）
  const [deleteConfirm, setDeleteConfirm] = useState<Prompt | null>(null);
  // 词库标签表标签名（与提示词标签合并，保证新建标签能同步到下拉候选）
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // 实时搜索：输入变化立即可用于过滤
  const clearSearch = useCallback(() => setQuery(""), []);
  // 标签过滤：选中后仅显示含该标签的提示词（与搜索词叠加）
  const [tagFilter, setTagFilter] = useState("");
  const [editor, setEditor] = useState<{ mode: "none" | "create" | "edit"; id?: string; title: string; body: string; tags: string }>({
    mode: "none", title: "", body: "", tags: ""
  });
  // 编辑表单正文输入框引用：供「插入变量 {{}}」定位光标
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [toast, setToast] = useState<{ visible: boolean; text?: string; undoId?: string }>({ visible: false });
  // 模板变量填充弹窗：插入含 {{变量}} 的提示词前弹出
  // fromOverlay：由 # 浮层触发，确认后需替换「#」及其后的筛选内容
  const [template, setTemplate] = useState<{ prompt: Prompt; mode: "insert" | "overwrite"; fromOverlay?: boolean } | null>(null);
  // 手动确认模式：记录待确认入库的正文，聊天框弹出保存/取消
  // text：当前待保存正文（可编辑）；original：首次学习到的原稿；showOriginal：对比视图，true 时展示原稿（只读）
  // 自动学习内容统一使用配置的自动学习标签（autoLearnTag），不做手动标签选择
  const [pendingConfirm, setPendingConfirm] = useState<{ text: string; original: string; showOriginal: boolean } | null>(null);
  // 手动确认里是否点过「AI 润色」：点过则保存后不再触发后台 AI 完善
  const [polishConfirmUsed, setPolishConfirmUsed] = useState(false);
  // 确认卡片内的 AI 润色加载状态
  const [polishConfirmLoading, setPolishConfirmLoading] = useState(false);
  // 确认卡片内 AI 润色失败提示（再次点击润色时清除）
  const [polishConfirmError, setPolishConfirmError] = useState<string | null>(null);
  // 查看弹层：点击列表项「查看」显示完整标题/标签/正文
  const [viewing, setViewing] = useState<Prompt | null>(null);
  // 查看详情「AI 优化」：润色状态、结果与原稿/润色稿切换
  const [viewPolish, setViewPolish] = useState<{ status: "idle" | "loading" | "done"; id: string }>({ status: "idle", id: "" });
  const [viewPolishText, setViewPolishText] = useState("");
  const [viewShowOriginal, setViewShowOriginal] = useState(false);
  // 查看详情「AI 优化」失败提示（再次点击优化时清除）
  const [viewPolishError, setViewPolishError] = useState<string | null>(null);

  // 关闭查看详情：清空查看状态与 AI 优化结果
  const closeView = useCallback(() => {
    setViewing(null);
    setViewPolish({ status: "idle", id: "" });
    setViewPolishText("");
    setViewShowOriginal(false);
    setViewPolishError(null);
  }, []);

  // 面板关闭时清理查看弹层，避免残留
  useEffect(() => {
    if (!open) closeView();
  }, [open, closeView]);

  const [settings] = useSettings();
  const panelId = useId();
  const refreshController = useRef<AbortController | null>(null);

  // 监听 host 推送的「填充草稿」事件（/prompts -AI 润色结果），填入当前聊天框
  useFillDraft((body) => {
    if (body) inputActions.setDraft(body);
  });

  const showToast = useCallback((text?: string, undoId?: string) => {
    setToast({ visible: true, text, undoId });
    // 带「撤销」的 toast 展示更久，留足操作时间；普通提示按默认时长
    setTimeout(() => setToast({ visible: false }), undoId ? AUTO_LEARN_UNDO_MS : AUTO_LEARN_TOAST_MS);
  }, []);

  const refresh = useCallback(() => {
    refreshController.current?.abort();
    const ctrl = new AbortController();
    refreshController.current = ctrl;
    setPhase("loading");
    setError(null);
    apiList()
      .then((list) => {
        if (ctrl.signal.aborted) return;
        setPrompts(list);
        // 查看详情时同步刷新当前条目：AI 完善回写完成后按钮/状态即时隐藏
        setViewing((cur) => {
          if (!cur) return cur;
          const updated = list.find((x) => x.id === cur.id);
          return updated ?? cur;
        });
        setPhase("ready");
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      });
    // 同步刷新标签表候选，保证新建标签能立刻出现在下拉框
    apiListTags()
      .then((tags) => {
        if (ctrl.signal.aborted) return;
        setTagNames(tags.map((x) => x.name));
      })
      .catch(() => {});
  }, []);

  // 订阅数据变化：侧边栏新增/修改/删除时同步刷新本面板
  useDataChanged(refresh);

  // `/prompts -e` JSON 备份下载完成后，在聊天框按钮上方弹成功提示
  useExportDownloaded(useCallback((count: number) => {
    showToast(T("pl.exported", { count }));
  }, [showToast, T]));

  // 自动学习
  useAutoLearn(draft, prompts, settings, useCallback((learned: Prompt) => {
    // 通知两侧面板重新加载，展示自动学习结果（此刻可能还未被 AI 完善）
    notifyDataChanged();
    // 自动学习 toast 附带「撤销」入口：撤销即删除刚入库的这条（移入回收站，可恢复）
    showToast(undefined, learned.id);
    // 若开启 AI 智能完善：AI 回写是异步的（约 10~30 秒）。
    // 轮询列表直到该条提示词完成 AI 完善（aiRefined === true），
    // 再刷新展示 AI 生成的标题/标签/摘要，避免前端一直停留在自动完善结果。
    if (!settings.aiEnrichEnabled) return;
    const started = Date.now();
    const maxWaitMs = 60_000;
    const timer = setInterval(async () => {
      if (Date.now() - started > maxWaitMs) {
        clearInterval(timer);
        return;
      }
      try {
        const list = await apiList();
        const updated = list.find((p) => p.id === learned.id);
        if (updated?.aiRefined) {
          clearInterval(timer);
          setPrompts(list);
          // AI 完善回写完成后，同样通知两侧面板同步刷新
          notifyDataChanged();
        }
      } catch {
        // 拉取失败忽略，等待下一轮
      }
    }, 4000);
  }, [showToast, settings.aiEnrichEnabled]),
  // 手动确认模式回调：学习到正文后不自动保存，交由界面弹出保存/取消
  useCallback((text: string) => {
    setPendingConfirm({ text, original: text, showOriginal: false });
    setPolishConfirmUsed(false);
  }, []));

  // 组件挂载即加载提示词列表（供 # 触发 / 自动学习使用，不依赖面板是否打开）
  useEffect(() => {
    if (phase === "idle") refresh();
  }, [phase, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editor.mode !== "none") {
          setEditor({ mode: "none", title: "", body: "", tags: "" });
        } else {
          setOpen(false);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, editor.mode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prompts.filter((p) => {
      // 标签过滤（与搜索词叠加）
      if (tagFilter && !(p.tags ?? []).includes(tagFilter)) return false;
      if (q) {
        const hay = `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [prompts, query, tagFilter]);

  // ── 翻页 ───────────────────────────────────────────────────────────────────
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // 搜索词/标签或数据变化时回到第 1 页
  useEffect(() => {
    setPage(1);
  }, [query, tagFilter, prompts]);
  // 当前页数据切片
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 已有标签候选（去重排序）：来自所有提示词 + 词库标签表，供标签输入下拉提示
  const allTags = useMemo(() => {
    const s = new Set<string>(tagNames);
    for (const p of prompts) for (const t of p.tags ?? []) s.add(t);
    return Array.from(s).sort();
  }, [prompts, tagNames]);

  const insert = useCallback(
    (prompt: Prompt) => {
      // 含模板变量占位符时先弹出填充窗口，确认后再插入
      if (hasVariables(prompt.body)) {
        setTemplate({ prompt, mode: "insert" });
        return;
      }
      // 记录使用次数
      apiUse(prompt.id).catch(() => {});
      const body = prompt.body;
      inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${body}` : body);
      setOpen(false);
    },
    [draft, inputActions],
  );

  // # 浮层选择：含模板变量占位符时弹出填充窗口（确认后用填充正文替换「#」及其后筛选内容），否则直接插入
  const selectFromOverlay = useCallback(
    (p: Prompt) => {
      if (hasVariables(p.body)) {
        setTemplate({ prompt: p, mode: "insert", fromOverlay: true });
        return;
      }
      apiUse(p.id).catch(() => {});
      applyPrompt(p, inputActions, draft);
    },
    [draft, inputActions],
  );

  // # 键触发浮层：必须位于 selectFromOverlay 定义之后（回调以引用方式传入）
  useTildaTrigger(settings, prompts, inputActions, draft, T, selectFromOverlay);

  // 用提示词正文覆盖当前输入框内容
  const overwrite = useCallback(
    (prompt: Prompt) => {
      if (hasVariables(prompt.body)) {
        setTemplate({ prompt, mode: "overwrite" });
        return;
      }
      apiUse(prompt.id).catch(() => {});
      inputActions.setDraft(prompt.body);
      setOpen(false);
    },
    [inputActions],
  );

  // 模板变量填充确认：用填充后的正文插入/覆盖，未提供的变量保留原占位符
  const applyTemplate = useCallback(
    (values: Record<string, string>) => {
      if (!template) return;
      const filled = applyVariables(template.prompt.body, values);
      apiUse(template.prompt.id).catch(() => {});
      if (template.fromOverlay) {
        // # 浮层选择：用填充后的正文替换「#」及其后的筛选内容
        const idx = draft.lastIndexOf("#");
        if (idx >= 0) inputActions.setDraft(`${draft.slice(0, idx)}${filled}`);
        else inputActions.setDraft(filled);
      } else if (template.mode === "insert") {
        inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${filled}` : filled);
      } else {
        inputActions.setDraft(filled);
      }
      setTemplate(null);
      setOpen(false);
    },
    [template, draft, inputActions],
  );

  // 模板变量「插入并发送」：填写变量后 setDraft + submit 直接发送。
  // # 浮层场景额外过滤掉「#」及其后的筛选内容，仅保留此前正文后连同提示词一起发，避免覆盖用户内容。
  const insertAndSend = useCallback(
    (values: Record<string, string>) => {
      if (!template) return;
      const filled = applyVariables(template.prompt.body, values);
      apiUse(template.prompt.id).catch(() => {});
      let send = filled;
      if (template.fromOverlay) {
        const idx = draft.lastIndexOf("#");
        const before = idx >= 0 ? draft.slice(0, idx) : "";
        send = before && before.trim() ? `${before}\n\n${filled}` : filled;
      }
      inputActions.setDraft(send);
      inputActions.submit?.();
      setTemplate(null);
      setOpen(false);
    },
    [template, draft, inputActions],
  );

  const editing = editor.mode !== "none";

  const NO_EDITOR = { mode: "none" as const, title: "", body: "", tags: "" };

  const startCreate = () => setEditor({ mode: "create", title: "", body: "", tags: "" });

  const startEdit = (p: Prompt) => setEditor({
    mode: "edit", id: p.id,
    title: p.title, body: p.body,
    tags: (p.tags ?? []).join("#"),
  });

  const saveEditor = () => {
    const title = editor.title.trim();
    const body = editor.body;
    if (!title || !body) {
      setError(T("pl.requireTitleBody"));
      return;
    }
    const tags = editor.tags.split("#").map((t) => t.trim()).filter(Boolean);
    const done = () => {
      setEditor(NO_EDITOR);
      // 通知两侧面板同步刷新（本面板通过事件统一重新加载）
      notifyDataChanged();
    };
    if (editor.mode === "create") {
      apiCreate({ title, body, tags }).then((p) => {
        markRecent(p.id);
        done();
      }, (e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
    } else if (editor.mode === "edit" && editor.id) {
      apiUpdate(editor.id, { title, body, tags }).then(done, (e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
    }
  };

  const remove = (p: Prompt) => {
    setDeleteConfirm(p);
  };

  /** 确认删除：从词库删除并移入回收站。 */
  const confirmRemove = () => {
    if (!deleteConfirm) return;
    apiDelete(deleteConfirm.id).then(notifyDataChanged, (e: unknown) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  };

  // 按钮点击：始终弹出面板，与侧边栏独立显示
  const handleButtonClick = () => {
    setOpen((v) => !v);
  };

  // 展开面板后，点击面板之外的其他区域 → 关闭面板
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!(t instanceof HTMLElement)) return;
      // 点击面板内部 → 不关闭
      const panel = document.getElementById(panelId);
      if (panel && panel.contains(t)) return;
      // 点击触发按钮 / 悬浮容器内部 → 不关闭（保留按钮自身的 toggle）
      if (t.closest("[data-prompt-library]")) return;
      // 编辑表单、待确认卡片或查看弹层正在操作 → 不强关，避免误丢内容/打断查看
      if (editing || pendingConfirm !== null || viewing) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () => document.removeEventListener("mousedown", onDocMouseDown, true);
  }, [open, editing, pendingConfirm, viewing, panelId]);

  // 手动确认：保存选中正文到词库（支持编辑正文，润色后可对比原稿；标签统一用自动学习标签）
  const confirmLearn = useCallback(async () => {
    const item = pendingConfirm;
    if (!item) return;
    setPendingConfirm(null);
    try {
      // 当前展示的是原稿则保存原稿；否则保存润色/编辑后的正文
      const text = (item.showOriginal ? item.original : item.text).trim();
      // 点过「AI 润色」则已是润色后的正文，保存时跳过后台 AI 完善
      // 自动学习内容统一使用配置的自动学习标签（autoLearnTag）
      const learned = await apiLearn(text, settings.autoLearnTag, polishConfirmUsed);
      setPolishConfirmUsed(false);
      markRecent(learned.id);
      notifyDataChanged();
      showToast();
    } catch {
      /* 静默失败 */
    }
  }, [pendingConfirm, settings.autoLearnTag, showToast, polishConfirmUsed]);

  // 手动确认：放弃保存
  const cancelLearn = useCallback(() => {
    setPendingConfirm(null);
    setPolishConfirmLoading(false);
    setPolishConfirmUsed(false);
  }, []);

  // 手动确认卡片：AI 润色确认中的正文，完成后直接把润色结果填充回卡片预览
  const polishLearnText = useCallback(async () => {
    if (!pendingConfirm || polishConfirmLoading) return;
    setPolishConfirmLoading(true);
    setPolishConfirmError(null);
    try {
      const res = await apiPolish(pendingConfirm.text);
      // 润色完填充为润色稿，并切回润色稿视图（保留原稿用于对比）
      setPendingConfirm((prev) => (prev ? { ...prev, text: res.polished, showOriginal: false } : prev));
      // 已在本卡片内完成 AI 润色，保存时不再重复触发后台 AI 完善
      setPolishConfirmUsed(true);
    } catch (e: unknown) {
      // 润色失败：卡片内给出错误提示，用户可再次点击重试
      setPolishConfirmError(e instanceof Error ? e.message : String(e));
    } finally {
      setPolishConfirmLoading(false);
    }
  }, [pendingConfirm, polishConfirmLoading]);

  // 自动学习 toast 的「撤销」：删除刚自动学习入库的那条（移入回收站，可恢复）
  const undoLearn = useCallback(async () => {
    const id = toast.undoId;
    setToast({ visible: false });
    if (!id) return;
    try {
      await apiDelete(id);
      notifyDataChanged();
    } catch {
      /* 静默失败 */
    }
  }, [toast.undoId]);

  // 查看详情「AI 优化」：对正文执行润色，成功后展示结果（可编辑/对比原稿/复制/插入/保存）
  const startViewPolish = useCallback(async () => {
    if (!viewing || viewPolish.status === "loading") return;
    setViewPolish({ status: "loading", id: viewing.id });
    setViewShowOriginal(false);
    setViewPolishError(null);
    try {
      const res = await apiPolish(viewing.body);
      setViewPolishText(res.polished);
      setViewPolish({ status: "done", id: viewing.id });
    } catch (e: unknown) {
      // 优化失败：回到空闲态并给出错误提示，按钮可再次点击重试
      setViewPolish({ status: "idle", id: "" });
      setViewPolishError(e instanceof Error ? e.message : String(e));
    }
  }, [viewing, viewPolish.status]);

  // 查看详情里把润色结果保存回词库（更新正文，保留原稿作对比，标记已 AI 完善）
  const saveViewPolish = useCallback(async () => {
    if (viewPolish.status !== "done" || !viewing) return;
    const body = viewPolishText.trim();
    if (!body) return;
    try {
      const updated = await apiUpdate(viewing.id, {
        body,
        sourceBody: viewing.body !== body ? viewing.body : undefined,
        aiRefined: true,
      });
      setViewing(updated);
      setPrompts((list) => list.map((p) => (p.id === updated.id ? updated : p)));
      setViewPolish({ status: "idle", id: "" });
      setViewPolishText("");
      setViewShowOriginal(false);
      notifyDataChanged();
    } catch {
      /* 静默失败 */
    }
  }, [viewPolish.status, viewPolishText, viewing]);

  const containerStyle: CSSProperties = {
    display: "inline-flex",
    position: "relative",
    fontFamily: MONO,
  };

  const panelStyle: CSSProperties = {
    position: "absolute",
    // 相对触发按钮水平居中
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "calc(100% + 4px)",
    zIndex: 1000,
    width: Math.max(300, Math.min(700, settings.panelWidth)),
    maxWidth: "calc(100vw - 24px)",
    // 固定高度：不随内容自动变化，列表在内部滚动（此前用 maxHeight 会随条目增多撑高）
    height: `${settings.panelHeight}px`,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    color: TONE.text,
    background: TONE.panel,
    border: `1px solid ${TONE.borderStrong}`,
    borderRadius: 12,
    fontFamily: MONO,
  };

  // 聊天框按钮显隐（由设置控制，默认显示；隐藏时仅移除按钮与面板，
  // 侧边栏、自动学习、# 触发等后台能力不受影响）
  const showComposerButton = settings.showComposerButton;

  return (
    <span data-prompt-library style={containerStyle}>
      <style>{`@keyframes pl-refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <style>{`@keyframes pl-progress { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }`}</style>
      <style>{PL_BUTTON_CSS}</style>
      {/* 词库聊天栏按钮：底色走层2以在工具栏上清晰可读，悬停/按下沿用官方交互高亮，
          与 AI 优化按钮一致的 hover 效果（放在 PL_BUTTON_CSS 之后，确保等同优先级时覆盖） */}
      <style>{`.pl-btn.pl-cbn-btn{border:none;background:var(--dsw-alias-bg-layer-2,#ffffff);box-shadow:none}.pl-btn.pl-cbn-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.pl-btn.pl-cbn-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}`}</style>
      {showComposerButton && (
        <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`${plBtn("ghost", "sm")} pl-cbn-btn`}
        onClick={handleButtonClick}
        data-tip={T("pl.title")}
        aria-label={T("pl.title")}
        aria-expanded={open}
        aria-controls={panelId}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z"
              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
            />
            <path d="M8 9h3M8 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        }
      >
        {!settings.composerButtonIconOnly && T("pl.title")}
        {/* 上下展开/折叠指示箭头：随开关旋转，颜色随按钮文本（官方 currentColor）；纯图标模式下隐藏以保持简洁 */}
        {!settings.composerButtonIconOnly && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{
            marginLeft: 2,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </Button>

      {/* toast（自动学习时附带「撤销」入口） */}
      {toast.visible && (
        <span
          role="status" aria-live="polite"
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            right: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px 4px 10px",
            color: TONE.panel,
            background: TONE.mint,
            borderRadius: 6,
            fontSize: 11,
            fontFamily: MONO,
            whiteSpace: "nowrap",
            // 有撤销按钮时需可点击；纯提示时穿透不挡点击
            pointerEvents: toast.undoId ? "auto" : "none",
            opacity: 0.94,
            zIndex: 1001,
          }}
        >
          &#10003; {toast.text || T("pl.learnedToast")}
          {toast.undoId && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={undoLearn}
              style={{
                cursor: "pointer",
                padding: "1px 8px",
                color: "inherit",
                background: "rgba(0,0,0,0.14)",
                border: "none",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: MONO,
                lineHeight: "16px",
              }}
            >
              {T("pl.undo")}
            </button>
          )}
        </span>
      )}

      {/* 手动确认卡片：学习到提示词后在聊天框弹出保存/取消；支持编辑正文/标签，润色后对比原稿 */}
      {pendingConfirm !== null && (
        <span
          role="dialog"
          aria-label={T("pl.confirmSave")}
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            right: 0,
            zIndex: 1002,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            width: 300,
            boxSizing: "border-box",
            padding: "10px 12px",
            color: TONE.text,
            background: TONE.panel,
            border: `1px solid ${TONE.borderStrong}`,
            borderRadius: 10,
            fontFamily: MONO,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600 }}>{T("pl.learnFound")}</div>

          {/* 原稿 / 润色稿对比切换：仅 AI 润色后出现 */}
          {pendingConfirm.original !== pendingConfirm.text && (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {([
                { value: false, label: T("pl.polished") },
                { value: true, label: T("pl.original") },
              ] as const).map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setPendingConfirm((prev) => (prev ? { ...prev, showOriginal: opt.value } : prev))}
                  style={{
                    cursor: "pointer",
                    padding: "2px 10px",
                    fontSize: 11,
                    fontFamily: MONO,
                    color: pendingConfirm.showOriginal === opt.value ? TONE.accent : TONE.muted,
                    background: pendingConfirm.showOriginal === opt.value ? TONE.accentSoft : "transparent",
                    border: `1px solid ${pendingConfirm.showOriginal === opt.value ? TONE.accent : TONE.border}`,
                    borderRadius: 999,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* 正文编辑区：对比原稿时只读展示原稿，避免误改；内容较长时自动撑高便于查看 */}
          <textarea
            value={pendingConfirm.showOriginal ? pendingConfirm.original : pendingConfirm.text}
            readOnly={pendingConfirm.showOriginal}
            onChange={(e) => setPendingConfirm((prev) => (prev ? { ...prev, text: e.target.value } : prev))}
            style={{
              maxHeight: 300,
              minHeight: 96,
              resize: "vertical",
              boxSizing: "border-box",
              padding: "6px 8px",
              fontSize: 11,
              lineHeight: 1.5,
              color: TONE.text,
              background: pendingConfirm.showOriginal ? TONE.panel : rowBackground(),
              border: `1px solid ${TONE.border}`,
              borderRadius: 6,
              fontFamily: MONO,
              outline: "none",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              opacity: pendingConfirm.showOriginal ? 0.75 : 1,
            }}
          />

          {polishConfirmError && (
            <div style={{ color: TONE.red, fontSize: 11, lineHeight: 1.5, wordBreak: "break-word" }}>
              {T("pl.polishFail")}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={plBtn("ghost", "sm")}
              onClick={polishLearnText}
              disabled={polishConfirmLoading}
              data-tip={polishConfirmLoading ? T("pl.polishLoadingTitle") : T("pl.polishBtnTitle")}
            >
              {polishConfirmLoading ? T("pl.polishing") : T("pl.polish")}
            </Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={plBtn("ghost", "sm")}
                onClick={cancelLearn}
              >
                {T("pl.cancel")}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={plBtn("primary", "sm")}
                onClick={confirmLearn}
              >
                {T("pl.save")}
              </Button>
            </div>
          </div>
        </span>
      )}

      {open && (
        <>
          <section id={panelId} role="dialog" aria-label={T("pl.title")} style={panelStyle}>
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "14px 16px 10px",
                borderBottom: `1px solid ${TONE.border}`,
                flexShrink: 0,
              }}
            >
              {/* 面板头部队列对齐：同款书本图标 + 词库名；图标与聊天栏按钮一致 */}
              <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M4 5h11a3 3 0 0 1 3 3v11l-3-2-3 2V8a3 3 0 0 0-3-3H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M8 9h3M8 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <strong style={{ fontSize: 14, fontWeight: 470, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{T("pl.title")}</strong>
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={plBtn("ghost", "sm")}
                  onClick={refresh}
                  disabled={phase === "loading"}
                  data-tip={phase === "loading" ? T("pl.refreshing") : T("pl.refreshTitle")}
                  icon={
                    <svg
                      width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ animation: phase === "loading" ? "pl-refresh-spin 0.9s linear infinite" : "none" }}
                    >
                      <path d="M23 4v6h-6M1 20v-6h6" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  }
                >
                  {phase === "loading" ? T("pl.refreshing") : T("pl.refresh")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={plBtn("ghost", "sm")}
                  onClick={startCreate}
                  disabled={editing}
                  style={{ color: "var(--dsw-alias-brand-primary, #8ec5ff)" }}
                >
                  {T("pl.new")}
                </Button>
                {/* 关闭按钮：一键隐藏面板（不保留折叠内容） */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`${plBtn("ghost", "sm")} pl-btn--no-border`}
                  onClick={() => setOpen(false)}
                  data-tip={T("pl.close")}
                  aria-label={T("pl.close")}
                  icon={
                    <svg
                      width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  }
                />
              </div>
            </header>

            {/* 搜索框 + 标签过滤：输入即时生效（实时过滤） */}
            {!editing && (
              <div style={{ padding: "10px 16px 4px", flexShrink: 0 }}>
                <SearchBox
                  value={query}
                  onChange={setQuery}
                  onSearch={() => setQuery(query)}
                  onClear={clearSearch}
                  placeholder={T("pl.search")}
                />
                <TagFilterBar
                  tags={allTags}
                  active={tagFilter}
                  onChange={setTagFilter}
                  allLabel={T("pl.tagFilterAll")}
                />
              </div>
            )}

            {/* 主列表区 */}
            <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
              {phase === "loading" && (
                <div style={{ padding: "20px 16px", color: TONE.muted, fontSize: 13, textAlign: "center" }}>
                  {T("pl.loading")}
                </div>
              )}
              {phase === "error" && (
                <div style={{ padding: "12px 16px", color: TONE.red, fontSize: 13 }}>{error}</div>
              )}

              {editing ? (
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                    {T("pl.titleField")}
                    <input
                      value={editor.title}
                      onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                      style={inputStyle}
                    />
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {T("pl.bodyField")}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={plBtn("ghost", "sm")}
                        style={{ flex: "0 0 auto" }}
                        onMouseDown={(e: ReactMouseEvent<HTMLButtonElement>) => e.preventDefault()}
                        onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                          // 阻止 mousedown 默认行为以免抢夺正文框焦点，确保光标位置有效、不会回滚到顶部。
                          // 仅点击「{{}}」按钮本身才插入，阻止 label/行内其他点击误触发
                          e.preventDefault();
                          e.stopPropagation();
                          insertVariableAt(bodyRef.current, editor.body, (v) => setEditor({ ...editor, body: v }), T("pl.insertVariableDefault"));
                        }}
                        data-tip={T("pl.insertVariableTitle")}
                      >
                        {`{{${T("pl.insertVariableDefault")}}}`}
                      </Button>
                    </span>
                    <textarea
                      ref={bodyRef}
                      value={editor.body}
                      onChange={(e) => setEditor({ ...editor, body: e.target.value })}
                      rows={6}
                      style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}
                    />
                  </div>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                    {T("pl.tagsField")}
                    <TagInput value={editor.tags} onChange={(v) => setEditor({ ...editor, tags: v })} suggestions={allTags} inputStyle={inputStyle} t={t} />
                  </label>
                  {error && <div style={{ color: TONE.red, fontSize: 12 }}>{error}</div>}
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: "4px 8px 8px" }}>
                  {phase === "ready" && filtered.length === 0 && (
                    <li style={{ padding: "18px 12px", color: TONE.muted, fontSize: 13, textAlign: "center" }}>
                      {T("pl.empty")}
                    </li>
                  )}
                  {pageItems.map((p) => (
                    <li
                      key={p.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        padding: "7px 10px",
                        marginBottom: 4,
                        borderRadius: 8,
                        background: TONE.row,
                        border: `1px solid ${TONE.border}`,
                        transition: "background-color .18s ease, border-color .18s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)";
                        e.currentTarget.style.borderColor = TONE.borderStrong;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = TONE.row;
                        e.currentTarget.style.borderColor = TONE.border;
                      }}
                    >
                      {/* 标题行：标题 + 最近标记（单行省略） */}
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", minWidth: 0 }}>
                        <strong
                          style={{
                            fontSize: 12.5,
                            fontWeight: 500,
                            flex: "1 1 auto",
                            minWidth: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          data-tip={p.title}
                        >
                          {clampTitle(p.title)}
                        </strong>
                        {isRecent(p.id) && (
                          <span
                            data-tip={T("pl.recentNew")}
                            style={{ width: 7, height: 7, borderRadius: "50%", background: TONE.mint, display: "inline-block", flexShrink: 0 }}
                          />
                        )}
                      </div>
                      {/* 正文预览：单行省略，节省垂直空间展示更多条目（完整内容用「查看」按钮打开） */}
                      <div
                        style={{
                          color: TONE.muted,
                          fontSize: 11.5,
                          lineHeight: 1.5,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.body.replace(/\s+/g, " ").trim()}
                      </div>
                      {/* 底行：标签胶囊（左侧，过长省略、悬停显示完整）+ 操作按钮（右侧） */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                        <span style={{ display: "flex", gap: 4, alignItems: "center", flex: "1 1 auto", minWidth: 0, overflow: "hidden" }}>
                          {(p.tags ?? []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              data-tip={tag}
                              style={{
                                flexShrink: 0,
                                fontSize: 10,
                                lineHeight: 1,
                                padding: "2px 6px",
                                borderRadius: 8,
                                color: TONE.quiet,
                                border: `1px solid ${TONE.border}`,
                                whiteSpace: "nowrap",
                                maxWidth: 96,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                        <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={() => insert(p)}>{T("pl.insert")}</Button>
                          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => overwrite(p)}>{T("pl.overwrite")}</Button>
                          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => setViewing(p)}>{T("pl.view")}</Button>
                          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => startEdit(p)}>{T("pl.edit")}</Button>
                          <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => remove(p)}>{T("pl.delete")}</Button>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* 编辑/新建模式：取消与保存按钮固定于面板底部（不随表单内容滚动） */}
            {editing && (
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  padding: "12px 16px",
                  borderTop: `1px solid ${TONE.border}`,
                }}
              >
                <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => { setEditor(NO_EDITOR); setError(null); }}>
                  {T("pl.cancel")}
                </Button>
                <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={saveEditor}>
                  {T("pl.save")}
                </Button>
              </div>
            )}
            {/* 翻页：按页展示，置于滚动区外、固定于面板底部 */}
            {!editing && phase === "ready" && (
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            )}
            {/* 查看弹层：覆盖整个面板展示完整标题/标签/正文，仅可通过关闭按钮关闭 */}
            {viewing && (
              <div role="dialog" aria-label={T("pl.view")} style={{
                position: "absolute",
                inset: 0,
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                background: TONE.panel,
              }}>
                {/* 头部：标题 + 关闭按钮 */}
                <div style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderBottom: `1px solid ${TONE.border}`,
                }}>
                  <strong style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }} data-tip={viewing.title}>{clampTitle(viewing.title)}</strong>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={plBtn("ghost", "sm")}
                    onClick={closeView}
                    data-tip={T("pl.close")}
                    style={{ flexShrink: 0 }}
                  >
                    ✕
                  </Button>
                </div>
                {/* 标签 */}
                {viewing.tags && viewing.tags.length > 0 && (
                  <div style={{ flexShrink: 0, display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 14px 0" }}>
                    {viewing.tags.map((tag) => (
                      <span key={tag} style={{
                        padding: "2px 8px",
                        borderRadius: 8,
                        fontSize: 11,
                        color: TONE.accent,
                        background: TONE.accentSoft,
                        whiteSpace: "nowrap",
                      }}>{tag}</span>
                    ))}
                  </div>
                )}
                {/* AI 优化结果：原稿/润色稿切换 + 可编辑正文；未优化时展示原正文（可滚动） */}
                {viewPolish.status === "done" ? (
                  <div style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "8px 14px 0",
                    boxSizing: "border-box",
                  }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                      {([
                        { value: false, label: T("pl.polished") },
                        { value: true, label: T("pl.original") },
                      ] as const).map((opt) => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => setViewShowOriginal(opt.value)}
                          style={{
                            cursor: "pointer",
                            padding: "2px 10px",
                            fontSize: 11,
                            fontFamily: MONO,
                            color: viewShowOriginal === opt.value ? TONE.accent : TONE.muted,
                            background: viewShowOriginal === opt.value ? TONE.accentSoft : "transparent",
                            border: `1px solid ${viewShowOriginal === opt.value ? TONE.accent : TONE.border}`,
                            borderRadius: 999,
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={viewShowOriginal ? viewing.body : viewPolishText}
                      readOnly={viewShowOriginal}
                      onChange={(e) => setViewPolishText(e.target.value)}
                      style={{
                        flex: 1,
                        minHeight: 0,
                        boxSizing: "border-box",
                        padding: "6px 8px",
                        fontSize: 12.5,
                        lineHeight: 1.7,
                        color: TONE.text,
                        background: viewShowOriginal ? TONE.panel : rowBackground(),
                        border: `1px solid ${TONE.border}`,
                        borderRadius: 6,
                        fontFamily: MONO,
                        outline: "none",
                        resize: "none",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        opacity: viewShowOriginal ? 0.75 : 1,
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    padding: "10px 14px 14px",
                    color: TONE.text,
                    fontSize: 12.5,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}>{viewing.body}</div>
                )}
                {/* AI 优化失败提示：显示在底部操作栏上方，重试前保持展示 */}
                {viewPolishError && (
                  <div style={{
                    flexShrink: 0,
                    padding: "4px 14px 0",
                    color: TONE.red,
                    fontSize: 11,
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}>
                    {T("pl.polishFail")}
                  </div>
                )}
                {/* 底部：AI 完善状态 + AI 优化入口（优化中显示进度，完成后展示结果操作） */}
                <div style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 14px 12px",
                  borderTop: `1px solid ${TONE.border}`,
                }}>
                  <span style={{ fontSize: 11, color: viewing.aiRefined ? TONE.mint : TONE.quiet, flexShrink: 0 }}>
                    {viewPolish.status === "loading"
                      ? T("pl.polishing")
                      : viewPolish.status === "done"
                        ? T("pl.polishResult")
                        : viewing.aiRefined
                          ? `${"✓"} ${T("pl.refinedDone")}`
                          : `${"…"} ${T("pl.refinePending")}`}
                  </span>
                  {viewPolish.status === "loading" ? (
                    // 优化中：不确定进度条动画
                    <div style={{ flex: 1, marginLeft: 8, height: 3, borderRadius: 2, overflow: "hidden", background: TONE.border }}>
                      <div style={{
                        height: "100%",
                        width: "40%",
                        borderRadius: 2,
                        background: TONE.accent,
                        animation: "pl-progress 1.2s ease-in-out infinite",
                      }} />
                    </div>
                  ) : viewPolish.status === "done" ? (
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => { navigator.clipboard.writeText(viewPolishText).catch(() => {}); }}>
                        {T("pl.copy")}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => {
                        if (!viewPolishText) return;
                        inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${viewPolishText}` : viewPolishText);
                        closeView();
                      }}>
                        {T("pl.insert")}
                      </Button>
                      <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={saveViewPolish}>
                        {T("pl.saveToLibrary")}
                      </Button>
                    </div>
                  ) : (
                    !viewing.aiRefined && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={plBtn("ghost", "sm")}
                        onClick={startViewPolish}
                        data-tip={T("pl.polishBtnTitle")}
                        style={{ flexShrink: 0 }}
                      >
                        {T("pl.polish")}
                      </Button>
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}
      </>
      )}
      <SidebarPromptLibrary inputActions={inputActions} draft={draft} t={t} />
      <SelectionAddPrompt t={t} enabled={settings.selectionAddEnabled} inputActions={inputActions} draft={draft} />
      {/* 模板变量填充弹窗：插入含 {{变量}} 的提示词前弹出 */}
      <TemplateFillModal
        open={template !== null}
        variables={template ? extractVariables(template.prompt.body) : []}
        body={template ? template.prompt.body : ""}
        onCancel={() => setTemplate(null)}
        onConfirm={applyTemplate}
        onInsertAndSend={insertAndSend}
        showInsertAndSend={template?.mode !== "overwrite"}
        confirmLabel={template?.mode === "overwrite" ? T("pl.overwrite") : T("pl.insert")}
        draftEmpty={template?.fromOverlay ? true : !(draft?.trim())}
        t={T}
      />
      {/* 删除确认弹窗（自定义，替代系统 confirm） */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        message={T("pl.confirmDelete", { title: deleteConfirm?.title ?? "" })}
        danger
        confirmLabel={T("pl.confirm")}
        cancelLabel={T("pl.cancel")}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          setDeleteConfirm(null);
          confirmRemove();
        }}
      />
    </span>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  color: "var(--dsw-alias-label-primary, #f2f6fc)",
  background: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "1px solid var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderRadius: 7,
  fontFamily: MONO,
  fontSize: 13,
  outline: "none",
};