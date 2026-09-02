/**
 * 全局主题自适应提示（Tooltip）。
 *
 * 取代浏览器原生 title 提示：原生提示跟随操作系统主题，无法匹配应用的黑夜/白天模式。
 * 这里改为在目标元素上声明 `data-tip="提示文本"`，由全局监听在光标移入时显示、
 * 移出时自动隐藏，并使用主题 CSS 变量渲染，自动适配黑夜/白天模式。
 *
 * 优点：
 * - 无需逐个组件维护悬停状态；目标元素（含 disabled 按钮、SVG 元素、截断文本）都能生效；
 * - 光标移动时提示跟随鼠标，并自动钳制在视口内；
 * - 目标被卸载或光标离开时自动隐藏，不会残留。
 *
 * 用法：把需要提示的元素上的 `title={...}` 换成 `data-tip={...}` 即可。
 * 本模块需在入口（index.ts）以副作用方式引入一次，确保全局监听已注册。
 */

/** 全局提示元素（惰性创建并挂到 body）。 */
let tipEl: HTMLDivElement | null = null;
/** 当前已显示的提示文本，避免每次移动都重复测量宽度。 */
let tipText = "";
/** 当前提示文本的渲染宽度（测量一次后缓存）。 */
let tipW = 0;
/** 全局监听是否已注册（幂等，防重复注册）。 */
let attached = false;

/** 确保全局提示元素存在；不存在时创建并挂到 body。 */
function ensureTipEl(): HTMLDivElement {
  if (tipEl && document.body.contains(tipEl)) return tipEl;
  tipEl = document.createElement("div");
  tipEl.setAttribute("role", "tooltip");
  tipEl.style.cssText = [
    "position: fixed",
    // 与 # 浮层等 max z-index（2147483647）同级，靠「显示时移到 body 末尾」的 DOM 顺序保证绘制在最上层
    "z-index: 2147483647",
    "box-sizing: border-box",
    "max-width: 320px",
    "padding: 3px 8px",
    "border-radius: 6px",
    "font-size: 11px",
    "line-height: 1.5",
    "white-space: nowrap",
    "overflow: hidden",
    "text-overflow: ellipsis",
    "pointer-events: none",
    "color: var(--dsw-alias-label-primary, #f2f6fc)",
    "background: var(--dsw-alias-bg-layer-1, #171f2b)",
    "border: 1px solid var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
    "box-shadow: 0 2px 10px rgba(15, 23, 42, 0.18)",
    "font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif)",
    "visibility: hidden",
  ].join(";");
  document.body.appendChild(tipEl);
  return tipEl;
}

/** 隐藏提示。 */
function hideTip(): void {
  if (tipEl) tipEl.style.visibility = "hidden";
}

/** 全局 mousemove 监听：光标位于带 data-tip 的元素上时显示提示，否则隐藏。 */
function onDocMove(e: MouseEvent): void {
  const at = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
  const tip = at?.closest?.("[data-tip]") as HTMLElement | null;
  if (!tip) {
    hideTip();
    return;
  }
  const text = tip.getAttribute("data-tip") ?? "";
  if (!text) {
    hideTip();
    return;
  }
  const el = ensureTipEl();
  // 显示前把提示移到 body 末尾：与浮层同为 max z-index 时，靠 DOM 顺序让提示绘制在最上层，避免被遮挡
  document.body.appendChild(el);
  if (tipText !== text) {
    // 文本变化时才重新测量宽度；先隐藏避免显示旧位置，测完再按新位置显示
    tipText = text;
    el.textContent = text;
    el.style.visibility = "hidden";
    el.style.left = "0px";
    el.style.top = "0px";
    tipW = el.offsetWidth;
  }
  el.style.visibility = "visible";
  el.style.left = `${Math.max(8, Math.min(e.clientX + 12, window.innerWidth - tipW - 8))}px`;
  el.style.top = `${Math.min(e.clientY + 18, window.innerHeight - 24)}px`;
}

/** 注册全局监听（幂等）：mousemove 驱动显示/跟随，滚动与按键时及时隐藏防残留。 */
function init(): void {
  if (attached) return;
  attached = true;
  document.addEventListener("mousemove", onDocMove, true);
  document.addEventListener("scroll", hideTip, true);
  document.addEventListener("keydown", hideTip, true);
}

init();
