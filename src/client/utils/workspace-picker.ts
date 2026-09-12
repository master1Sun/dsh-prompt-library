/**
 * 目录选择能力访问器 — 宿主原生选择器 / 宿主浏览能力 / 插件自建后端 三级回退。
 *
 * dsh 客户端运行时在 apply 阶段可能把 WorkspaceRuntime 挂到 ctx.workspaces，
 * 但新版宿主不再稳定提供 `pickDirectory` / `listDirectory`（运行时 bundle 中已无该实现），
 * 因此宿主能力缺失时回退到插件自建的 `/fs/list`、`/fs/mkdir` 路由，
 * 保证「选择目录 / 扫描文件夹」始终可用。
 */
import { createFsDirectory, type DirListing, listFsDirectory } from "./api.js";

/** 目录选择所需的最小结构（与宿主 IWorkspaces 对齐，字段可能缺失）。 */
interface WorkspacesHost {
  pickDirectory?: () => Promise<string | null>;
  listDirectory?: (path?: string, signal?: AbortSignal) => Promise<DirListing>;
  createDirectory?: (path: string, name: string) => Promise<string>;
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

/**
 * 浏览式目录选择是否可用。
 * 宿主 browse 能力缺失时仍有插件自建后端兜底，故恒为 true。
 */
export function isDirectoryBrowserAvailable(): boolean {
  return true;
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
export async function listExportDirectory(
  path?: string,
  signal?: AbortSignal,
): Promise<DirListing> {
  if (workspaces && typeof workspaces.listDirectory === "function") {
    try {
      return await workspaces.listDirectory(path, signal);
    } catch {
      // 宿主 browse 能力不可用 → 回退插件自建后端
    }
  }
  return listFsDirectory(path);
}

/** 在指定父目录下新建子目录，返回新目录的绝对路径。 */
export async function createExportDirectory(path: string, name: string): Promise<string> {
  if (workspaces && typeof workspaces.createDirectory === "function") {
    try {
      return await workspaces.createDirectory(path, name);
    } catch {
      // 宿主 browse 能力不可用 → 回退插件自建后端
    }
  }
  const created = await createFsDirectory(path, name);
  return created.path;
}
