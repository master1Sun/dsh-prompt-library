/**
 * 宿主工作区运行时访问器 — 提供原生目录选择与浏览式目录列表能力。
 *
 * dsh 客户端运行时在 apply 阶段把 WorkspaceRuntime 挂到 ctx.workspaces。
 * 桌面端（web 平台）通常只提供 `browse` 能力（listDirectory / createDirectory），
 * 原生 `native` 能力的 pickDirectory 会抛错；调用方应先尝试原生选择器，
 * 失败时回退到内置的浏览式目录选择弹窗。
 */
import type { DirectoryListing } from "@deepseek-ai/dsh-client-runtime/client";

/** 目录选择所需的最小结构（与宿主 IWorkspaces 对齐）。 */
interface WorkspacesHost {
  pickDirectory(): Promise<string | null>;
  listDirectory(path?: string, signal?: AbortSignal): Promise<DirectoryListing>;
  createDirectory(path: string, name: string): Promise<string>;
}

let workspaces: WorkspacesHost | null = null;

/** 在插件入口 apply 阶段注册宿主工作区运行时。 */
export function registerWorkspaces(ws: WorkspacesHost | null): void {
  workspaces = ws;
}

/** 宿主原生目录选择器（native capability）是否可用。 */
export function isDirectoryPickerAvailable(): boolean {
  return !!workspaces && typeof workspaces.pickDirectory === "function";
}

/** 宿主浏览式目录列表（browse capability）是否可用。 */
export function isDirectoryBrowserAvailable(): boolean {
  return !!workspaces && typeof workspaces.listDirectory === "function";
}

/**
 * 打开宿主原生目录选择器。
 * @returns 选中目录的绝对路径；用户取消返回 null；能力不可用或调用失败时抛错。
 */
export async function pickExportDirectory(): Promise<string | null> {
  if (!workspaces || typeof workspaces.pickDirectory !== "function") {
    throw new Error("native picker unavailable");
  }
  return workspaces.pickDirectory();
}

/** 列出指定目录（缺省为宿主 home）的一层子目录与面包屑。 */
export function listExportDirectory(
  path?: string,
  signal?: AbortSignal,
): Promise<DirectoryListing> {
  if (!workspaces || typeof workspaces.listDirectory !== "function") {
    return Promise.reject(new Error("browse capability unavailable"));
  }
  return workspaces.listDirectory(path, signal);
}

/** 在指定父目录下新建子目录，返回新目录的绝对路径。 */
export async function createExportDirectory(path: string, name: string): Promise<string> {
  if (!workspaces || typeof workspaces.createDirectory !== "function") {
    throw new Error("browse capability unavailable");
  }
  return workspaces.createDirectory(path, name);
}
