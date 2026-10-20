// 运行时 `react-dom/client` 由 DSH host 提供（构建时作为 external，不打包），
// 但本项目未安装 @types/react-dom。这里仅补最小类型声明，供 tsc 类型检查通过。
declare module "react-dom/client" {
  import type { ReactNode } from "react";

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  export function createRoot(
    container: Element | DocumentFragment,
    options?: {
      identifierPrefix?: string;
      onRecoverableError?: (error: unknown) => void;
    },
  ): Root;
}
