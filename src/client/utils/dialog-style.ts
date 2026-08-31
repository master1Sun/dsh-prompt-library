/**
 * 弹窗统一样式 — 弹窗表面直接继承官方浮层，不重新定义圆角 / 阴影 / 底色。
 *
 * 说明：宿主在设计上通过 `--dsw-alias-*` 语义化令牌驱动颜色，圆角 / 阴影为 CSS
 * Modules 内的固定像素值（运行时被宿主剥离，不暴露令牌）。因此这里把官方浮层表面
 * （词库助手右键菜单 `.pl-ctx-menu` 已与官方对齐版）原样抽成 `.pl-dialog` 类，
 * 逐字继承其圆角 / 底色 / 边框 / 投影，弹窗组件只挂类名，不再各自内联重写表面样式。
 *
 * `.pl-dialog` 圆角按官方浮层弹窗的圆角（24px），底色 / 边框 / 投影取自官方浮层表面：
 * - 圆角 24px（官方）
 * - 底色 `--dsw-specific-sidebar-fill`
 * - 边框 `--dsw-alias-border-l2`
 * - 投影：官方深色投影（含内侧高光）
 */
/** 官方浮层表面对应的弹窗类名（圆角 / 底色 / 边框 / 投影与官方逐字一致）。 */
export const PL_DIALOG = "pl-dialog";
/** 弹窗遮罩容器类名（固定居中 + 半透明遮罩）。 */
export const PL_DIALOG_OVERLAY = "pl-dialog-overlay";

/** 全项目统一的弹窗表面 + 遮罩 CSS（组件内 `<style>` 注入，遵循按钮样式注入约定）。 */
export const PL_DIALOG_CSS = `
.pl-dialog{box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;border-radius:24px;background:var(--dsw-specific-sidebar-fill,#f5f6f7);padding:18px 7px 18px 10px;color:var(--dsw-alias-label-primary,#f2f6fc);font-family:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Helvetica Neue",Helvetica,Arial,sans-serif)}
.pl-dialog-overlay{position:fixed;inset:0;z-index:2147483647;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden;background:rgba(0,0,0,.35)}
/* 解锁塔罗牌：卡片表面流动高光扫光 */
.pl-card-sheen{position:absolute;inset:0;border-radius:11px;pointer-events:none;overflow:hidden;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.5) 50%,transparent 60%);background-size:250% 250%;animation:plCardSheen 4.2s ease-in-out infinite;z-index:3}
@keyframes plCardSheen{0%{background-position:130% 0}62%{background-position:-130% 0}100%{background-position:-130% 0}}
/* 史诗及以上：炫彩流动金边（遮罩抽成细环） */
.pl-card-gold{position:absolute;inset:-2px;border-radius:14px;padding:2px;pointer-events:none;background:linear-gradient(120deg,#ffd700 0%,#ff9d00 16%,#ff2ed1 34%,#7a5cff 52%,#00d9ff 70%,#ffd700 100%);background-size:280% 100%;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:plGoldShimmer 4.5s linear infinite;z-index:2}
@keyframes plGoldShimmer{0%{background-position:0% 50%}100%{background-position:280% 50%}}
/* 等级详情（QQ 式等级介绍）：每行一条横向扫光，从低级到高级逐行错峰点亮 */
.pl-lv-row{position:relative;border-radius:8px;overflow:hidden}
.pl-lv-row::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.16) 50%,transparent 58%);background-size:250% 250%;animation:plLvRowSweep 2.6s ease-in-out infinite;pointer-events:none}
@keyframes plLvRowSweep{0%{background-position:130% 0}60%{background-position:-130% 0}100%{background-position:-130% 0}}
/* 等级详情：当前等级徽章脉冲光环（模仿 QQ 点亮呼吸） */
.pl-lv-cur{animation:plLvPulse 2.1s ease-out infinite}
@keyframes plLvPulse{0%{box-shadow:0 0 0 0 var(--pl-lv-glow,#ffb428a0)}75%{box-shadow:0 0 0 7px transparent}100%{box-shadow:0 0 0 0 transparent}}
/* 等级详情：等级进度条由左向右生长填充 */
.pl-lv-fill{transform-origin:left;animation:plLvFillGrow .65s cubic-bezier(.2,.7,.3,1) both}
@keyframes plLvFillGrow{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
/* 弹窗内滚动条稳定占位：滚动条出现/隐藏不改变内容宽度，消除重排闪烁 */
.pl-dialog,.pl-dialog *{scrollbar-gutter:stable}
/* 弹窗内滚动条统一细窄圆角半透明，减少突兀、与占位宽度一致 */
.pl-dialog ::-webkit-scrollbar{width:8px;height:8px}
.pl-dialog ::-webkit-scrollbar-thumb{background:rgba(128,134,148,.30);border-radius:4px;border:2px solid transparent;background-clip:padding-box}
.pl-dialog ::-webkit-scrollbar-thumb:hover{background-color:rgba(128,134,148,.5)}
.pl-dialog ::-webkit-scrollbar-track{background:transparent}
`;