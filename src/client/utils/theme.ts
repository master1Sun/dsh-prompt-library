/**
 * 主题工具：运行时探测宿主当前是否为黑夜模式，并为润色稿等输入区提供可靠的背景色。
 *
 * 背景：宿主把黑夜模式标记在 `body[data-ds-dark-theme]` 上。但部分皮肤/自定义主题
 * 会在某些容器里把 `--dsw-alias-bg-layer-3` 覆盖成偏浅色，导致润色稿输入区在
 * 黑夜模式下仍然渲染成白色背景。这里做运行时兜底：黑夜模式直接返回与宿主一致的
 * 深色（官方 dark `--dsw-static-neutral-bluish-800` = #353638），白天模式继续跟随宿主 token。
 */
import { useEffect, useState } from "react";

/** 当前是否为黑夜模式（宿主属性优先，缺失时跟随系统偏好）。 */
export function isDarkMode(): boolean {
  const body = typeof document !== "undefined" ? document.body : null;
  if (body && body.hasAttribute("data-ds-dark-theme")) return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/** 主题色 token 集合（用于统计看板 / 公告弹窗等浮层，保证白天/黑夜都清晰）。 */
export interface ThemeTone {
  text: string;
  muted: string;
  quiet: string;
  panel: string;
  row: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentSoft: string;
  mint: string;
  red: string;
}

/**
 * 获取当前主题色 token：宿主定义了 `--dsw-alias-*` 变量时优先宿主值；
 * 宿主未定义（部分皮肤白天模式下不注入这些变量）时按当前主题使用深浅两套 fallback，
 * 避免出现「白天模式深底浅字 / 黑夜模式浅底深字」看不清的问题。
 */
export function getTone(): ThemeTone {
  const d = isDarkMode();
  return {
    text: d
      ? "var(--dsw-alias-label-primary, #f2f6fc)"
      : "var(--dsw-alias-label-primary, #1f2937)",
    muted: d
      ? "var(--dsw-alias-label-secondary, #9daabd)"
      : "var(--dsw-alias-label-secondary, #64748b)",
    quiet: d
      ? "var(--dsw-alias-label-tertiary, #718096)"
      : "var(--dsw-alias-label-tertiary, #94a3b8)",
    panel: d
      ? "var(--dsw-alias-bg-layer-1, #171f2b)"
      : "var(--dsw-alias-bg-layer-1, #ffffff)",
    row: d
      ? "var(--dsw-alias-bg-layer-3, #1d2735)"
      : "var(--dsw-alias-bg-layer-3, #f2f4f7)",
    border: d
      ? "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))"
      : "var(--dsw-alias-border-l2, rgba(15, 23, 42, 0.12))",
    borderStrong: d
      ? "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))"
      : "var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.2))",
    accent: d
      ? "var(--dsw-alias-brand-primary, #8ec5ff)"
      : "var(--dsw-alias-brand-primary, #2563eb)",
    accentSoft: d
      ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 18%, transparent)"
      : "color-mix(in srgb, var(--dsw-alias-brand-primary, #2563eb) 12%, transparent)",
    mint: d
      ? "var(--dsw-alias-state-success-primary, #78dda0)"
      : "var(--dsw-alias-state-success-primary, #16a34a)",
    red: d
      ? "var(--dsw-alias-state-error-primary, #ff8592)"
      : "var(--dsw-alias-state-error-primary, #dc2626)",
  };
}

/** 主题订阅者集合：宿主切换白天/黑夜时触发各组件重渲染以刷新主题色。 */
const themeListeners = new Set<() => void>();
let themeWatching = false;

function refreshTheme(): void {
  for (const l of themeListeners) l();
}

function ensureThemeWatch(): void {
  if (themeWatching || typeof window === "undefined") return;
  themeWatching = true;
  const mo = new MutationObserver(refreshTheme);
  const watch = () => {
    if (document.body)
      mo.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
  };
  if (document.body) watch();
  else document.addEventListener("DOMContentLoaded", watch);
  window.matchMedia?.("(prefers-color-scheme: dark)")?.addEventListener?.("change", refreshTheme);
}

/** 订阅宿主主题变化：返回当前是否黑夜模式，主题切换时触发组件重渲染。 */
export function useThemeSync(): boolean {
  const [dark, setDark] = useState(isDarkMode());
  useEffect(() => {
    ensureThemeWatch();
    const listener = () => setDark(isDarkMode());
    themeListeners.add(listener);
    listener(); // 挂载时校正一次
    return () => {
      themeListeners.delete(listener);
    };
  }, []);
  return dark;
}

/** 解析颜色为 [r,g,b]。支持 hex(#rgb/#rrggbb)、rgb()，以及 var(--变量[, 回退])（读取宿主运行时变量，缺失用回退值）。 */
export function parseColor(input: string): [number, number, number] | null {
  if (typeof window === "undefined") return null;
  let s = (input ?? "").trim();
  const varm = s.match(/^var\((--[\w-]+)(?:\s*,\s*(.+))?\)$/);
  if (varm) {
    let val = "";
    try {
      val = window.getComputedStyle(document.documentElement).getPropertyValue(varm[1]).trim();
    } catch {
      val = "";
    }
    return parseColor(val || (varm[2] || "#000000"));
  }
  s = s.replace(/\s/g, "");
  let m = s.match(/^#([0-9a-fA-F]{6})$/);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = s.match(/^#([0-9a-fA-F]{3})$/);
  if (m) {
    const x = m[1][0].repeat(2) + m[1][1].repeat(2) + m[1][2].repeat(2);
    const n = parseInt(x, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = s.match(/^rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}

/**
 * 依据背景色亮度返回可读的前景色（亮底返回深色、暗底返回白色）。
 * 主要解决：宿主部分自定义黑夜皮肤会把 `--dsw-alias-brand-primary` / `--dsw-alias-bg-layer-3`
 * 覆盖成偏白色，导致「白底白字」按钮看不清。这里按运行时真实颜色算亮度来选前景色，保证始终可读。
 */
export function contrastFg(bg: string): string {
  const rgb = parseColor(bg);
  if (!rgb) return "#ffffff";
  const lin = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return lum > 0.35 ? "#0e1526" : "#ffffff";
}

/** 润色稿输入区背景色：黑夜模式用与宿主一致的深色兜底，白天跟随宿主 token。 */
export function rowBackground(): string {
  return isDarkMode()
    ? "#353638"
    : "var(--dsw-alias-bg-layer-3, #ffffff)";
}
