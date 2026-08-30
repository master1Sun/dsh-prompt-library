/**
 * 聊天结果 → 预览面板 的跳转接线。
 *
 * 官方交付物包（dsh-client-ui-deliverables）会在每条聊天回合尾部渲染一排"产物文件"
 * 卡片：每个文件是一个 `<button>`（class 形如 `.P4kPIW_file`，stabled）放在
 * `[data-produced-files-row]` 容器内，按钮的 `title` 属性保存该文件的完整路径，
 * 点击默认调用官方 `openFile(path)` 打开宿主文件视图。
 *
 * 本模块提供一个"自研跳转"方案：
 *  1. 用 document 捕获阶段监听点击，拦截产物文件卡片（不触发官方 openFile）；
 *  2. 记录目标路径（模块级信号 + window 事件，供预览面板解析其父目录）；
 *  3. 通过 DOM 模拟点击激活「预览」视图标签（role=tab，文本匹配当前语言标签）；
 *  4. 预览面板挂载时消费该信号，以目标文件父目录为根扫描并定位打开该文件。
 *
 * 说明：宿主 slider 系统没有供插件程序化切换 conversation.view 的官方 API，
 * 标签切换依赖对宿主标签按钮派发 click（与项目已有的 DOM 操作宿主 UI 先例一致）。
 */
import { en, zh } from "./i18n.js";

/** 「预览」视图标签在宿主标签栏中渲染的按钮标识（文本 = 当前语言标签文案）。 */
const PREVIEW_TAB_KEY = "pl.view.preview";

/** 预览面板消费目标路径用的 window 事件名。 */
const PREVIEW_OPEN_EVENT = "pl:preview-open";

/** 模块级待消费信号：最近一次要打开的目标文件（完整绝对路径），供预览面板挂载后读取。 */
let pendingPreviewPath: string | null = null;

/** 记录最近一次要打开的目标文件，并广播给已挂载的预览面板。 */
function remember(path: string): void {
  pendingPreviewPath = path;
  try {
    window.dispatchEvent(new CustomEvent(PREVIEW_OPEN_EVENT, { detail: { path } }));
  } catch {
    /* 事件派发失败时，信号仍保留在模块级变量，预览面板挂载后取用 */
  }
}

/** 预览面板挂载时读取待消费的目标路径；读取后清空，避免重复定位。 */
export function consumePendingPreviewPath(): string | null {
  const path = pendingPreviewPath;
  pendingPreviewPath = null;
  return path;
}

/** 推断当前宿主界面语言（优先 <html lang>，其次浏览器语言）。 */
function currentLang(): "zh" | "en" {
  const raw = (
    document.documentElement.lang ||
    navigator.language ||
    navigator.languages?.[0] ||
    ""
  ).toLowerCase();
  return raw.startsWith("en") ? "en" : "zh";
}

/** 根据当前语言解析「预览」标签的文案，用于匹配宿主标签按钮。 */
function previewTabLabel(): string {
  const dict = currentLang() === "en" ? en : zh;
  return dict[PREVIEW_TAB_KEY as keyof typeof dict] ?? "预览";
}

/**
 * 激活「预览」视图标签：在宿主 `role=tablist` 里找到文本为「预览」的标签按钮并点击。
 * 找不到（预览标签尚未注册）时静默忽略，避免影响其它交互。
 */
function activatePreviewView(): void {
  const label = previewTabLabel();
  const tab = Array.from(document.querySelectorAll<HTMLButtonElement>('button[role="tab"]')).find(
    (b) => b.textContent?.trim() === label,
  );
  tab?.click();
}

/** 从事件目标向上查找"产物文件"卡片按钮，返回其 title 路径；非产物卡片返回空。 */
function resolveProducedFilePath(target: EventTarget | null): string | null {
  const el = target instanceof Element ? target : null;
  if (!el) return null;
  const btn = el.closest<HTMLButtonElement>('button[title]');
  if (!btn) return null;
  // 仅拦截「产物文件」行内的卡片，避免误伤其它带 title 的按钮
  if (!btn.closest('[data-produced-files-row]')) return null;
  const path = btn.title?.trim() ?? "";
  return path ? path : null;
}

/**
 * 注册"产物文件卡片点击"拦截器：
 * - 捕获阶段监听，先于官方 React 冒泡处理；
 * - 命中产物文件卡片时阻止默认行为与冒泡（截断官方 openFile）；
 * - 记录目标路径并激活预览标签，实现"聊天结果内点文件 → 自研预览面板打开"。
 */
export function registerProducedFileIntercept(): () => void {
  if (typeof document === "undefined") return () => {};
  const onCapture = (ev: MouseEvent) => {
    const path = resolveProducedFilePath(ev.target);
    if (!path) return;
    // 拦截卡片点击：不交给官方打开，改跳自研预览面板
    ev.preventDefault();
    ev.stopImmediatePropagation();
    remember(path);
    activatePreviewView();
  };
  document.addEventListener("click", onCapture, true);
  return () => document.removeEventListener("click", onCapture, true);
}

/** 供需要时可用的目标路径事件名（预览面板订阅用）。 */
export const PREVIEW_OPEN_EVENT_NAME = PREVIEW_OPEN_EVENT;