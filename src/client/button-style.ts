/**
 * 官方 Button 样式。
 *
 * 运行时 @deepseek-ai/dsh-client-ui-primitives 的 CSS Modules 被宿主占位为空，
 * <Button variant/size> 不会产出任何样式，默认渲染成浏览器原始 <button>。
 * 这里对照官方 dsh-web-frontend 内 Button.module.css 的规则注入等价 CSS，
 * 让按钮「默认无背景、鼠标移入才出现背景」与官方一致：
 * - ghost：默认透明，hover 出现交互背景
 * - primary：品牌填充背景，hover 加深
 * 所有色值走 --dsw-alias-* 语义化 token，运行时随主题自动生效。
 */
export const PL_BUTTON_CSS = `
.pl-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;border:none;border-radius:18px;cursor:pointer;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary,#f2f6fc);background:transparent;padding:0 14px;font-family:inherit;white-space:nowrap}
.pl-btn:disabled{cursor:not-allowed;opacity:.4}
.pl-btn--md{height:36px}
.pl-btn--sm{height:28px;font-size:12px;line-height:18px;padding:0 10px;border-radius:14px}
.pl-btn--primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.pl-btn--primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.pl-btn--ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.pl-btn--ghost:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.pl-btn--outline{border:1px solid var(--dsw-alias-border-l2)}
.pl-btn--outline:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.pl-btn--outline:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
`;

/** 生成官方按钮的组合样式类名。size 默认 sm。 */
export const plBtn = (variant: "primary" | "ghost" | "outline", size: "sm" | "md" = "sm") =>
  `pl-btn pl-btn--${variant} pl-btn--${size}`;