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
.pl-dialog{box-sizing:border-box;display:flex;flex-direction:column;border-radius:24px;background:var(--dsw-specific-sidebar-fill,#f5f6f7);border:1px solid var(--dsw-alias-border-l2,rgba(17,24,39,.14));box-shadow:0 10px 32px rgba(2,6,23,.2),0 2px 8px rgba(2,6,23,.1),inset 0 1px 0 rgba(255,255,255,.55);padding:18px 7px 18px 10px;color:var(--dsw-alias-label-primary,#f2f6fc);font-family:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Helvetica Neue",Helvetica,Arial,sans-serif)}
.pl-dialog-overlay{position:fixed;inset:0;z-index:2147483647;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.35)}
`;