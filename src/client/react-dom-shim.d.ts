/**
 * react-dom 运行时由 DSH 模块加载器注入（官方 client 组件同样 require("react-dom")），
 * 但本插件未安装 @types/react-dom，这里提供仅本插件用到的 createPortal 类型，
 * 用于把词库助手小人渲染到 document.body（既显示在最上层，又保留 React 合成事件）。
 */
declare module "react-dom" {
  import type { ReactNode, ReactPortal } from "react";

  /** 把 children 渲染到指定容器，但保持其在 React 组件树中的位置（事件不丢失）。 */
  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment | null,
  ): ReactPortal;
}