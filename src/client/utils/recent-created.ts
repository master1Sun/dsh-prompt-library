/**
 * 共享的「最近创建」提示词 id 集合。
 *
 * 聊天面板与侧边栏共用此模块：新建/自动学习成功的提示词会被标记，
 * 渲染时若命中则使用高亮色显示。
 */

const recentIds = new Set<string>();
const MAX_RECENT = 50;

/** 标记某个提示词为最近创建（用于高亮显示）。 */
export function markRecent(id: string): void {
  recentIds.add(id);
  // 限制集合大小，防止无限增长
  if (recentIds.size > MAX_RECENT) {
    const first = recentIds.values().next().value;
    if (first !== undefined) recentIds.delete(first);
  }
}

/** 判断某个提示词是否属于最近创建。 */
export function isRecent(id: string): boolean {
  return recentIds.has(id);
}
