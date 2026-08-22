/**
 * 宿主运行时依赖的类型垫片（ambient declaration）。
 *
 * `@deepseek-ai/dsh-client-ui-primitives` 与 `@deepseek-ai/dsh-client-ui-slots`
 * 由宿主（dsh web）在运行时注入，本插件 node_modules 中并无可链接的类型声明
 *（profile node_modules 里的同名目录为空、无 package.json / 类型）。这里以松散
 * 声明补全它们，仅用于让 `tsc --noEmit` 通过；运行时类型与构建产物不受影响。
 * 具体组件/类型能力属于宿主运行时契约，不在此展开。
 */
declare module "@deepseek-ai/dsh-client-ui-primitives" {
  /** host 提供的基础 Button，宽泛声明以兼容各调用处传入的 props。 */
  export const Button: any;
}

declare module "@deepseek-ai/dsh-client-ui-slots" {
  /** 命名空间翻译函数类型（host 注入的 `t` 座位）。 */
  export type TranslateNS<S extends string> = any;
  /** 供 i18n.ts 内部的 module augmentation 合并使用的类型表。 */
  interface LocaleNamespaceMap {}
}