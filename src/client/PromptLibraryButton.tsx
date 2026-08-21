/**
 * 提示词库 composer 按钮控件。
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
  type ReactNode,
} from "react";
import type { PluginSettings, Prompt } from "../types.js";
import { clampTitle, DEFAULT_SETTINGS } from "../types.js";
import {
  createPrompt as apiCreate,
  deletePrompt as apiDelete,
  getSettings as apiGetSettings,
  listPrompts as apiList,
  updatePrompt as apiUpdate,
  usePrompt as apiUse,
  learnPrompt as apiLearn,
  polishPrompt as apiPolish,
} from "./api.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { PL_BUTTON_CSS, plBtn } from "./button-style.js";
import { SidebarPromptLibrary } from "./SidebarPromptLibrary.js";
import { useHoverDetail } from "./HoverDetail.js";
import { AUTO_LEARN_TOAST_MS, useAutoLearn } from "./auto-learn.js";
import { isRecent, markRecent } from "./recent-created.js";
import { notifyDataChanged, useDataChanged } from "./data-sync.js";


/**
 * `conversation.input.left` 的最小属性合约。
 */
interface ButtonProps {
  useInput: <T>(selector: (s: { draft: string }) => T) => T;
  inputActions: {
    setDraft: (text: string) => void;
  };
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

function useTildaTrigger(
  settings: PluginSettings,
  prompts: Prompt[],
  inputActions: { setDraft: (text: string) => void },
  draft: string,
): void {
  const activeRef = useRef(false);
  // 触发浮层时「#」在正文中的位置；用于计算「#」之后的实时筛选内容
  const triggerIdxRef = useRef(-1);
  const draftRef = useRef(draft);
  const inputActionsRef = useRef(inputActions);
  draftRef.current = draft;
  inputActionsRef.current = inputActions;
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
      showOverlay(el, lastPromptsForSelect, inputActionsRef.current, draftRef.current, "");
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
            applyPrompt(selected, inputActionsRef.current, draftRef.current);
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
          showOverlay(el, lastPromptsForSelect, inputActionsRef.current, draftRef.current, query);
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
  }, [settings.tildaTriggerEnabled]);
}

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
): void {
  removeOverlay();
  if (prompts.length === 0) return;

  // 按「#」之后的筛选内容实时过滤（标题/正文/标签任意包含）
  const q = query.trim().toLowerCase();
  const filtered = q
    ? prompts.filter((p) =>
        `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase().includes(q),
      )
    : prompts;

  const rect = target.getBoundingClientRect();
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
    "overflow-y: auto",
    `background: ${TONE.panel}`,
    `border: 1px solid ${TONE.borderStrong}`,
    "border-radius: 8px",
    "box-shadow: 0 8px 24px rgba(3, 8, 18, 0.38)",
    `font-family: ${MONO}`,
    "font-size: 12px",
    "padding: 4px",
  ].join(";");

  /** 清除所有行的高亮背景。 */
  const clearHighlight = () => {
    for (const child of overlay.children) {
      (child as HTMLElement).style.background = "transparent";
    }
  };

  /** 高亮指定行并同步键盘选中项（Enter 确认时使用该项）。 */
  const highlightItem = (index: number) => {
    clearHighlight();
    highlightIndex = index;
    const item = overlay.children[index] as HTMLElement | undefined;
    if (item) {
      item.style.background = TONE.accentSoft;
      item.scrollIntoView({ block: "nearest" });
    }
  };

  // 无匹配结果时仍保留浮层，提示用户继续输入或输入空格结束筛选
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = q ? `无匹配“${q}”` : "暂无提示词";
    empty.style.cssText = [
      "padding: 10px",
      "font-size: 12px",
      `color: ${TONE.quiet}`,
    ].join(";");
    overlay.appendChild(empty);
  }

  filtered.forEach((p, i) => {
    const item = document.createElement("div");
    item.dataset.promptLibraryItem = "";
    item.dataset.index = String(i);
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
    title.title = p.title;
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
      applyPrompt(p, inputActions, draft);
      removeOverlay();
    };
    // 鼠标移入 → 高亮该行（同时成为键盘 Enter 的确认项）
    item.onmouseenter = () => highlightItem(i);
    item.onmouseleave = () => {
      if (highlightIndex === i) item.style.background = "transparent";
    };

    overlay.appendChild(item);
  });

  // 底部快捷键提示（筛选模式下展示当前筛选词）
  const hint = document.createElement("div");
  hint.textContent = q
    ? `筛选“${q}” · ↑↓选择 · Enter确认 · 空格 结束 · Esc 关闭`
    : "↑↓ 选择 · Enter 确认 · 继续输入筛选 · 空格 结束 · Esc 关闭";
  hint.style.cssText = [
    "padding: 6px 10px 3px",
    "font-size: 10px",
    `color: ${TONE.quiet}`,
    "border-top: 1px solid " + TONE.border,
    "margin-top: 2px",
    "user-select: none",
  ].join(";");
  overlay.appendChild(hint);

  highlightIndex = 0;
  document.body.appendChild(overlay);

  // 智能定位：下方空间不足时翻转到输入框上方，避免弹窗被推出屏幕底部
  const spaceBelow = window.innerHeight - rect.bottom - 4;
  const overlayHeight = overlay.offsetHeight;
  if (spaceBelow < overlayHeight) {
    const aboveTop = rect.top - overlayHeight - 4;
    if (aboveTop >= 4) {
      overlay.style.top = `${aboveTop}px`;
    } else {
      // 上下空间都不足：贴顶部显示，并收缩最大高度保证可见
      overlay.style.top = "4px";
      overlay.style.maxHeight = `${Math.max(120, rect.top - 8)}px`;
    }
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
  if (items.length === 0 || highlightIndex >= items.length) return null;
  const item = items[highlightIndex];
  const index = Number(item.dataset.index);
  return lastPromptsForSelect[index] ?? null;
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
  const { inputActions, useInput } = props;
  const draft = useInput((s) => s.draft);

  const [open, setOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{ mode: "none" | "create" | "edit"; id?: string; title: string; body: string; tags: string }>({
    mode: "none", title: "", body: "", tags: ""
  });
  const [toast, setToast] = useState<{ visible: boolean }>({ visible: false });
  // 手动确认模式：记录待确认入库的正文，聊天框弹出保存/取消
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  // 确认卡片内的 AI 润色加载状态
  const [polishConfirmLoading, setPolishConfirmLoading] = useState(false);

  const [settings] = useSettings();
  const panelId = useId();
  const refreshController = useRef<AbortController | null>(null);
  // 提示词行悬停详情（由设置控制，默认关闭）
  const hover = useHoverDetail();
  const hoverEnabled = settings.hoverDetailEnabled;

  const showToast = useCallback(() => {
    setToast({ visible: true });
    setTimeout(() => setToast({ visible: false }), AUTO_LEARN_TOAST_MS);
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
        setPhase("ready");
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      });
  }, []);

  // 订阅数据变化：侧边栏新增/修改/删除时同步刷新本面板
  useDataChanged(refresh);

  // 自动学习
  useAutoLearn(draft, prompts, settings, useCallback((learned: Prompt) => {
    // 通知两侧面板重新加载，展示自动学习结果（此刻可能还未被 AI 完善）
    notifyDataChanged();
    showToast();
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
    setPendingConfirm(text);
  }, []));

  // ~ 键触发
  useTildaTrigger(settings, prompts, inputActions, draft);

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
    if (!q) return prompts;
    return prompts.filter((p) => {
      const hay = `${p.title} ${p.body} ${(p.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [prompts, query]);

  const insert = useCallback(
    async (prompt: Prompt) => {
      // 记录使用次数
      apiUse(prompt.id).catch(() => {});
      const body = prompt.body;
      inputActions.setDraft(draft && draft.trim() ? `${draft}\n\n${body}` : body);
      setOpen(false);
    },
    [draft, inputActions],
  );

  // 用提示词正文覆盖当前输入框内容
  const overwrite = useCallback(
    async (prompt: Prompt) => {
      apiUse(prompt.id).catch(() => {});
      inputActions.setDraft(prompt.body);
      setOpen(false);
    },
    [inputActions],
  );

  const editing = editor.mode !== "none";

  const NO_EDITOR = { mode: "none" as const, title: "", body: "", tags: "" };

  const startCreate = () => setEditor({ mode: "create", title: "", body: "", tags: "" });

  const startEdit = (p: Prompt) => setEditor({
    mode: "edit", id: p.id,
    title: p.title, body: p.body,
    tags: (p.tags ?? []).join(", "),
  });

  const saveEditor = () => {
    const title = editor.title.trim();
    const body = editor.body;
    if (!title || !body) {
      setError("标题和正文为必填项");
      return;
    }
    const tags = editor.tags.split(",").map((t) => t.trim()).filter(Boolean);
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
    if (!confirm(`删除 "${p.title}"？`)) return;
    apiDelete(p.id).then(notifyDataChanged, (e: unknown) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  };

  // 按钮点击：始终弹出面板，与侧边栏独立显示
  const handleButtonClick = () => {
    hover.hide();
    setOpen((v) => !v);
  };

  // 手动确认：保存选中正文到词库
  const confirmLearn = useCallback(async () => {
    const text = pendingConfirm;
    if (!text) return;
    setPendingConfirm(null);
    try {
      const learned = await apiLearn(text, settings.autoLearnTag);
      markRecent(learned.id);
      notifyDataChanged();
      showToast();
    } catch {
      /* 静默失败 */
    }
  }, [pendingConfirm, settings.autoLearnTag, showToast]);

  // 手动确认：放弃保存
  const cancelLearn = useCallback(() => {
    setPendingConfirm(null);
    setPolishConfirmLoading(false);
  }, []);

  // 手动确认卡片：AI 润色确认中的正文，完成后直接把润色结果填充回卡片预览
  const polishLearnText = useCallback(async () => {
    if (!pendingConfirm || polishConfirmLoading) return;
    setPolishConfirmLoading(true);
    try {
      const res = await apiPolish(pendingConfirm);
      // 润色完直接填充到框内（预览与待保存正文一起更新）
      setPendingConfirm(res.polished);
    } catch {
      /* 静默失败 */
    } finally {
      setPolishConfirmLoading(false);
    }
  }, [pendingConfirm, polishConfirmLoading]);

  const containerStyle: CSSProperties = {
    display: "inline-flex",
    position: "relative",
    fontFamily: MONO,
  };

  const panelStyle: CSSProperties = {
    position: "absolute",
    right: 0,
    bottom: "calc(100% + 4px)",
    zIndex: 1000,
    width: Math.max(300, Math.min(700, settings.panelWidth)),
    maxWidth: "calc(100vw - 24px)",
    maxHeight: `${settings.panelHeight}px`,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    color: TONE.text,
    background: TONE.panel,
    border: `1px solid ${TONE.borderStrong}`,
    borderRadius: 12,
    boxShadow: "0 1px 4px rgba(3, 8, 18, 0.1)",
    fontFamily: MONO,
  };

  // 聊天框按钮显隐（由设置控制，默认显示；隐藏时仅移除按钮与面板，
  // 侧边栏、自动学习、# 触发等后台能力不受影响）
  const showComposerButton = settings.showComposerButton;

  return (
    <span data-prompt-library style={containerStyle}>
      <style>{`@keyframes pl-refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <style>{PL_BUTTON_CSS}</style>
      {showComposerButton && (
        <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={plBtn("ghost", "sm")}
        onClick={handleButtonClick}
        title="提示词库"
        aria-label="提示词库"
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
        提示词库
        {/* 上下展开/折叠指示箭头：随开关旋转，颜色随按钮文本（官方 currentColor） */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{
          marginLeft: 2,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
        }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>

      {/* toast */}
      {toast.visible && (
        <span
          role="status" aria-live="polite"
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            right: 0,
            padding: "4px 10px",
            color: TONE.panel,
            background: TONE.mint,
            borderRadius: 6,
            fontSize: 11,
            fontFamily: MONO,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            opacity: 0.92,
            zIndex: 1001,
          }}
        >
          &#10003; 已自动学习
        </span>
      )}

      {/* 手动确认卡片：学习到提示词后在聊天框弹出保存/取消 */}
      {pendingConfirm !== null && (
        <span
          role="dialog"
          aria-label="确认保存提示词"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            right: 0,
            zIndex: 1002,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            width: 280,
            boxSizing: "border-box",
            padding: "10px 12px",
            color: TONE.text,
            background: TONE.panel,
            border: `1px solid ${TONE.borderStrong}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(3, 8, 18, 0.4)",
            fontFamily: MONO,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600 }}>检测到可学习提示词</div>
          <div
            style={{
              maxHeight: 96,
              overflowY: "auto",
              padding: "6px 8px",
              fontSize: 11,
              lineHeight: 1.5,
              color: TONE.muted,
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              borderRadius: 6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {pendingConfirm}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={plBtn("ghost", "sm")}
              onClick={polishLearnText}
              disabled={polishConfirmLoading}
              title={polishConfirmLoading ? "AI 润色中…" : "调用 AI 润色正文"}
            >
              {polishConfirmLoading ? "润色中…" : "AI 润色"}
            </Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={plBtn("ghost", "sm")}
                onClick={cancelLearn}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={plBtn("primary", "sm")}
                onClick={confirmLearn}
              >
                保存
              </Button>
            </div>
          </div>
        </span>
      )}

      {open && (
        <>
          <div
            onClick={() => { setEditor(NO_EDITOR); setOpen(false); }}
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
          />
          <section id={panelId} role="dialog" aria-label="提示词库" style={panelStyle}>
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
              <strong style={{ fontSize: 14, fontWeight: 470 }}>提示词库</strong>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={plBtn("ghost", "sm")}
                  onClick={refresh}
                  disabled={phase === "loading"}
                  title={phase === "loading" ? "刷新中…" : "刷新提示词列表"}
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
                  {phase === "loading" ? "刷新中…" : "刷新"}
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
                  + 新建
                </Button>
              </div>
            </header>

            {!editing && (
              <div style={{ padding: "10px 16px", flexShrink: 0 }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索…"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "7px 9px",
                    color: TONE.text,
                    background: TONE.row,
                    border: `1px solid ${TONE.border}`,
                    borderRadius: 7,
                    fontFamily: MONO,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>
            )}

            <div style={{ flex: 1, overflow: "auto" }}>
              {phase === "loading" && (
                <div style={{ padding: "20px 16px", color: TONE.muted, fontSize: 13, textAlign: "center" }}>
                  加载中…
                </div>
              )}
              {phase === "error" && (
                <div style={{ padding: "12px 16px", color: TONE.red, fontSize: 13 }}>{error}</div>
              )}

              {editing ? (
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                    标题
                    <input
                      value={editor.title}
                      onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                    正文
                    <textarea
                      value={editor.body}
                      onChange={(e) => setEditor({ ...editor, body: e.target.value })}
                      rows={6}
                      style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: TONE.muted }}>
                    标签（逗号分隔）
                    <input
                      value={editor.tags}
                      onChange={(e) => setEditor({ ...editor, tags: e.target.value })}
                      style={inputStyle}
                    />
                  </label>
                  {error && <div style={{ color: TONE.red, fontSize: 12 }}>{error}</div>}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => { setEditor(NO_EDITOR); setError(null); }}>
                      取消
                    </Button>
                    <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={saveEditor}>
                      保存
                    </Button>
                  </div>
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {phase === "ready" && filtered.length === 0 && (
                    <li style={{ padding: "16px", color: TONE.muted, fontSize: 13, textAlign: "center" }}>
                      暂无提示词
                    </li>
                  )}
                  {filtered.map((p) => (
                    <li
                      key={p.id}
                      style={{
                        padding: "10px 16px",
                        borderBottom: `1px solid ${TONE.border}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        ...(isRecent(p.id)
                          ? { background: "rgba(142, 197, 255, 0.10)", borderLeft: `3px solid ${TONE.accent}` }
                          : {}),
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                        <strong style={{
                          fontSize: 13,
                          fontWeight: 460,
                          ...(isRecent(p.id) ? { color: TONE.accent } : {}),
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 220,
                        }} title={p.title}>{clampTitle(p.title)}</strong>
                        {isRecent(p.id) && (
                          <span
                            title="新增"
                            style={{ width: 8, height: 8, borderRadius: "50%", background: TONE.mint, display: "inline-block", flexShrink: 0 }}
                          />
                        )}
                      </div>
                      <pre
                        onMouseEnter={hoverEnabled ? (e) => { e.currentTarget.style.background = "rgba(142, 197, 255, 0.08)"; hover.show(p, e.clientX, e.clientY); } : undefined}
                        onMouseMove={hoverEnabled ? (e) => hover.show(p, e.clientX, e.clientY) : undefined}
                        onMouseLeave={hoverEnabled ? (e) => { e.currentTarget.style.background = "transparent"; hover.leave(); } : undefined}
                        onClick={hoverEnabled ? hover.hide : undefined}
                        style={{
                          margin: 0,
                          color: TONE.muted,
                          fontSize: 12,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontFamily: MONO,
                          maxHeight: 54,
                          overflow: "hidden",
                          borderRadius: 6,
                          cursor: hoverEnabled ? "pointer" : "default",
                          transition: "background 0.15s ease",
                        }}
                      >
                        {p.body}
                      </pre>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button type="button" variant="primary" size="sm" className={plBtn("primary", "sm")} onClick={() => insert(p)}>插入</Button>
                        <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => overwrite(p)}>覆盖</Button>
                        <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => startEdit(p)}>编辑</Button>
                        <Button type="button" variant="ghost" size="sm" className={plBtn("ghost", "sm")} onClick={() => remove(p)}>删除</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
      </>
      )}
      {hoverEnabled && hover.overlay}
      <SidebarPromptLibrary inputActions={inputActions} draft={draft} />
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