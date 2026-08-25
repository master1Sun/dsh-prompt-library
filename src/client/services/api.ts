/**
 * /api/prompt-library 的浏览器端 fetch 封装。
 *
 * host 路由的薄封装层；每个函数在成功时返回 `data` 字段，
 * 在非 ok 信封或传输失败时抛出异常。
 */
import type { PluginSettings, Prompt, PromptInput, PromptPatch, TrashItem } from "../../types.js";

const BASE = "/api/prompt-library/prompts";

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, headers: {} };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(path, init);
  let payload: ApiResponse<T>;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`prompt-library: bad response (${res.status})`);
  }
  if (!payload.ok || payload.data === undefined) {
    throw new Error(payload.error || `prompt-library: ${res.status}`);
  }
  return payload.data;
}

export function listPrompts(): Promise<Prompt[]> {
  return send<Prompt[]>("GET", BASE);
}

export function createPrompt(input: PromptInput): Promise<Prompt> {
  return send<Prompt>("POST", BASE, input);
}

export function updatePrompt(id: string, patch: PromptPatch): Promise<Prompt> {
  return send<Prompt>("PUT", `${BASE}/${encodeURIComponent(id)}`, patch);
}

export function deletePrompt(id: string): Promise<{ id: string }> {
  return send<{ id: string }>("DELETE", `${BASE}/${encodeURIComponent(id)}`);
}

/** 从原始草稿正文自动学习提示词（去重在 host 侧完成）。
 * skipEnrich：true 表示正文已在界面完成 AI 润色，不再触发后台 AI 完善。 */
export function learnPrompt(body: string, tag?: string, skipEnrich?: boolean): Promise<Prompt> {
  return send<Prompt>("POST", "/api/prompt-library/learn", { body, tag, skipEnrich });
}

/** 记录提示词的使用（点击插入时调用）。 */
export function usePrompt(id: string): Promise<Prompt> {
  return send<Prompt>("POST", `${BASE}/${encodeURIComponent(id)}`);
}

/** 导出全部提示词（备份内容，含 schema 版本与导出时间）。 */
export interface PromptBackup {
  version: 1;
  exportedAt: number;
  prompts: Prompt[];
}

/**
 * 导出提示词（备份内容，含 schema 版本与导出时间）。
 * 传入 ids 时仅导出勾选的提示词；缺省导出全部。
 */
export function exportPrompts(ids?: string[]): Promise<PromptBackup> {
  if (ids && ids.length > 0) {
    return send<PromptBackup>("POST", "/api/prompt-library/export", { ids });
  }
  return send<PromptBackup>("GET", "/api/prompt-library/export");
}

/** 从备份内容导入提示词（合并式），返回导入/更新/跳过条数。 */
export function importPrompts(
  data: unknown,
): Promise<{ imported: number; updated: number; skipped: number }> {
  return send<{ imported: number; updated: number; skipped: number }>(
    "POST",
    "/api/prompt-library/import",
    data,
  );
}

/** 标签汇总（名称 + 使用次数）。 */
export function listTags(): Promise<Array<{ name: string; count: number }>> {
  return send<Array<{ name: string; count: number }>>("GET", "/api/prompt-library/tags");
}

/** 重命名标签（合并到新标签），返回受影响条数。 */
export function renameTag(from: string, to: string): Promise<{ changed: number }> {
  return send<{ changed: number }>(
    "PUT",
    `/api/prompt-library/tags/${encodeURIComponent(from)}`,
    { to },
  );
}

/** 删除标签（从所有提示词中移除，内容变为未命名/未分类），返回受影响条数。 */
export function deleteTag(name: string): Promise<{ changed: number }> {
  return send<{ changed: number }>(
    "DELETE",
    `/api/prompt-library/tags/${encodeURIComponent(name)}`,
  );
}

/** 新建标签（已存在则忽略），返回规范化后的标签名。 */
export function createTag(name: string): Promise<{ name: string }> {
  return send<{ name: string }>("POST", "/api/prompt-library/tags", { name });
}

/** 逆向导入技能的结果结构。 */
export interface SkillImportResult {
  imported: number;
  updated: number;
  skipped: number;
  items: { title: string; name: string }[];
  errors: { name: string; reason: string }[];
}

/** 逆向导入：读取 ~/.dsh/skills/<name>/SKILL.md 批量生成为提示词入库。 */
export function importSkills(): Promise<SkillImportResult> {
  return send<SkillImportResult>("POST", "/api/prompt-library/skills/import");
}

/** 待逆向导入的单条技能条目（用户在弹窗中编辑后提交保存）。 */
export interface SkillEntry {
  /** 技能名（kebab-case），用于与 prompt_skill_links 关联；缺省由标题生成。 */
  name?: string;
  title: string;
  body: string;
  summary?: string;
}

/** 可供选择导入的技能来源：已解析为可编辑内容的条目 + 是否已入库。 */
export interface SkillSource {
  name: string;
  title: string;
  body: string;
  summary: string;
  /** 是否已入库（同名技能已关联过提示词 → 再次导入为覆盖更新）。 */
  exists: boolean;
}

/** 列出 ~/.dsh/skills 下可导入的技能（解析为可编辑条目，供导入弹窗勾选）。 */
export function listAvailableSkills(): Promise<SkillSource[]> {
  return send<SkillSource[]>("GET", "/api/prompt-library/skills/available");
}

/** 解析一段 md 原始文本（frontmatter + 正文）为可编辑条目（供「选择本地 md 文件」导入）。 */
export function parseSkillRaw(raw: string): Promise<{ title: string; body: string; summary: string }> {
  return send<{ title: string; body: string; summary: string }>(
    "POST",
    "/api/prompt-library/skills/parse",
    { raw },
  );
}

/** 保存用户在弹窗中编辑后的技能条目入库（带「skill」标签，同名技能覆盖更新）。 */
export function importSkillEntries(entries: SkillEntry[]): Promise<SkillImportResult> {
  return send<SkillImportResult>("POST", "/api/prompt-library/skills/import/entries", { entries });
}

/** 批量导出技能的结果：成功条数 + 成功清单 + 失败清单。 */
export interface SkillExportResult {
  exported: number;
  items: { title: string; name: string }[];
  errors: { title: string; reason: string }[];
}

/** 把用户在弹窗中编辑后的技能条目写盘为 DSH 技能（~/.dsh/skills/<name>/SKILL.md）。 */
export function exportSkillEntries(entries: SkillEntry[]): Promise<SkillExportResult> {
  return send<SkillExportResult>("POST", "/api/prompt-library/skills/export/entries", { entries });
}

/** AI 依据提示词内容生成的技能描述符（导出弹窗「校验并 AI 生成」用）。 */
export interface SkillDescriptor {
  name: string;
  description: string;
  whenToUse?: string;
}

/** 技能描述符生成失败原因码（与 host 端 SkillDescribeFail 保持一致）。 */
export type SkillDescribeFail = "no-llm" | "route" | "empty" | "parse";

/** AI 生成结果：{ desc } 成功；{ fail } 失败并给出原因码。 */
export interface SkillDescribeResult {
  desc?: SkillDescriptor;
  fail?: SkillDescribeFail;
}

/** 用 AI 依据提示词内容生成技能名与描述（不改写正文，保留 {{变量名}}）。 */
export function describeSkill(payload: {
  title: string;
  body: string;
  summary?: string;
  tags?: string[];
}): Promise<SkillDescribeResult> {
  return send<SkillDescribeResult>("POST", "/api/prompt-library/skills/ai-describe", payload);
}

// ── 回收站管理 ────────────────────────────────────────────────────────────

/** 列出回收站中的全部提示词（按删除时间降序）。 */
export function listTrash(): Promise<TrashItem[]> {
  return send<TrashItem[]>("GET", "/api/prompt-library/trash");
}

/** 从回收站恢复一批提示词到词库。 */
export function restoreTrash(ids: string[]): Promise<{ restored: number }> {
  return send<{ restored: number }>("POST", "/api/prompt-library/trash/restore", { ids });
}

/** 从回收站永久删除一批提示词。 */
export function deleteTrash(ids: string[]): Promise<{ deleted: number }> {
  return send<{ deleted: number }>("POST", "/api/prompt-library/trash/delete", { ids });
}

/** 清空回收站（全部永久删除）。 */
export function emptyTrash(): Promise<{ deleted: number }> {
  return send<{ deleted: number }>("POST", "/api/prompt-library/trash/empty");
}

/**
 * 调用 harness AI 润色提示词正文，返回润色后的文本。
 * keepVariables 控制是否启用「{{}} 模板变量保留/新增」能力（默认开启）；
 * 聊天框按钮的 AI 润色传 false 关闭该能力。
 */
export function polishPrompt(
  body: string,
  opts?: { keepVariables?: boolean },
): Promise<{ polished: string }> {
  return send<{ polished: string }>("POST", "/api/prompt-library/ai/polish", {
    body,
    keepVariables: opts?.keepVariables ?? true,
  });
}

/** 设置界面用：单个提供方及其模型列表。 */
export interface ClientAiSelectable {
  provider: string;
  name: string;
  models: { id: string; name: string }[];
}

/** 读取系统中可用的 AI provider 及模型列表（设置界面下拉选择）。 */
export function getAiSelectables(): Promise<ClientAiSelectable[]> {
  return send<ClientAiSelectable[]>("GET", "/api/prompt-library/ai/providers");
}

/** 请求 AI 生成词库功能简介（5 句，供浮动小人气泡轮询）；失败时调用方回退到内置简介。 */
export function genIntro(lang: "zh" | "en"): Promise<{ lines: string[] }> {
  return send<{ lines: string[] }>("POST", "/api/prompt-library/ai/intro", { lang });
}

/** 版本检查结果：当前版本、最新可更新版本、是否有更新及来源。 */
export interface UpdateInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  /** 该更新来源：npm（优先，默认）或 github（npm 不可达时的兜底）。 */
  source: "npm" | "github";
  /** github 来源对应的 release tag（如 v0.9.0）；npm 来源为空串。 */
  gitTag: string;
}

/** 检查插件是否有新版本（host 侧含缓存；双源都失败时 hasUpdate 为 false）。 */
export function getUpdate(): Promise<UpdateInfo> {
  return send<UpdateInfo>("GET", "/api/prompt-library/update");
}

/** 执行安装命令，把插件升级到最新版；返回是否成功及命令输出。 */
export function applyUpdate(): Promise<{ ok: boolean; output: string }> {
  return send<{ ok: boolean; output: string }>("POST", "/api/prompt-library/update/apply");
}

const SETTINGS_BASE = "/api/prompt-library/settings";

/** 获取插件设置。 */
export function getSettings(): Promise<PluginSettings> {
  return send<PluginSettings>("GET", SETTINGS_BASE);
}

/** 更新插件设置（部分更新）。 */
export function updateSettings(patch: Partial<PluginSettings>): Promise<PluginSettings> {
  return send<PluginSettings>("PUT", SETTINGS_BASE, patch);
}

// ── 词库助手活动状态 ────────────────────────────────────────────────────

/** 词库助手活动阶段（与 host activity.ts 保持一致）。 */
export type ActivityPhase =
  | "idle"
  | "waiting"
  | "thinking"
  | "tool"
  | "review"
  | "done"
  | "failed";

/** 词库助手活动快照。 */
export interface ActivitySnapshot {
  phase: ActivityPhase;
  sessionActive: boolean;
}

/** 读取词库助手当前活动阶段（host 状态机投影官方会话事件，驱动小人动画）。 */
export function getActivity(): Promise<ActivitySnapshot> {
  return send<ActivitySnapshot>("GET", "/api/prompt-library/activity");
}

// ── 公告通告 ────────────────────────────────────────────────────────────

/** 单版本更新条目（由 host 的 VERSION_NOTES 生成，按语言填充）。 */
export interface VersionEntry {
  /** 版本号。 */
  version: string;
  /** 发布日期 YYYY-MM-DD，可选。 */
  date?: string;
  /** 版本标题。 */
  title: string;
  /** 版本更新要点列表。 */
  items: string[];
}

/** 公告通告内容（全部为本地多语言数据，不再读取网络 JSON）。 */
export interface AnnouncementData {
  source: "local";
  /** 生效语言（zh / en）。 */
  lang: "zh" | "en";
  /** 使用手册条目（key 对应 i18n 键，text 已按当前语言填充）。 */
  manual: { key: string; text: string }[];
  /** 版本更新说明（按版本倒序）。 */
  versions: VersionEntry[];
}

/** 拉取公告通告（双击词库助手弹窗时调用；lang 传入浏览器/系统语言，内部归一化）。 */
export function getAnnouncement(lang?: string): Promise<AnnouncementData> {
  const url = lang
    ? `/api/prompt-library/announcement?lang=${encodeURIComponent(lang)}`
    : "/api/prompt-library/announcement";
  return send<AnnouncementData>("GET", url);
}

// ── 词库统计（供统计可视化面板）────────────────────────────────────────

/** 词库使用统计（与 host store.computeLibraryStats 对齐）。 */
export interface LibraryStats {
  /** 提示词总数。 */
  total: number;
  /** 累计使用次数。 */
  totalUsage: number;
  /** 曾使用过的提示词数量。 */
  usedCount: number;
  /** 从未使用过的提示词数量。 */
  unusedCount: number;
  /** 最常用的前 5 条（按使用次数降序）。 */
  topUsed: Array<{ title: string; usageCount: number; lastUsedAt: number }>;
  /** 最近使用的前 5 条（按最后使用时间降序）。 */
  recentUsed: Array<{ title: string; lastUsedAt: number }>;
  /** 标签及其被引用次数。 */
  tagStats: Array<{ name: string; count: number }>;
  /** 回收站条数。 */
  trashCount: number;
  /** 复用活力：近 7 天曾被使用的提示词数量。 */
  usedIn7Days: number;
  /** 复用活力：近 30 天曾被使用的提示词数量。 */
  usedIn30Days: number;
  /** 沉睡提示词：创建超 30 天且从未使用的最久前 3 条。 */
  longestUnused: Array<{ title: string; days: number }>;
  /** 正文总字数。 */
  totalBodyLength: number;
  /** 平均每条正文字数。 */
  avgBodyLength: number;
  /** 已由 AI 完善的提示词数量。 */
  aiRefinedCount: number;
  /** AI 完善占比（0-100）。 */
  aiRefinedPct: number;
  /** 近 7 天新增提示词数量。 */
  addedIn7Days: number;
  /** 近 30 天新增提示词数量。 */
  addedIn30Days: number;
  /** 近 7 天最常用的前 5 条（按近 7 天使用次数降序）。 */
  topUsed7: Array<{ title: string; count: number }>;
  /** 近 7 天经 AI 完善的提示词数量。 */
  aiRefinedIn7: number;
}

/** 每周增量统计（近 7 天：新增/使用/AI 完善）。 */
export interface WeeklyStats {
  rangeStart: number;
  rangeEnd: number;
  addedCount: number;
  addedTitles: string[];
  usedPromptCount: number;
  usageCount: number;
  topUsed: Array<{ title: string; count: number }>;
  aiRefinedCount: number;
}

/** 一次统计历史快照。 */
export interface StatsSnapshot {
  id: number;
  stats: WeeklyStats;
  comment: string;
  createdAt: number;
}

/** 统计接口返回：当前实时统计 + 历史快照序列（时间正序，供趋势图）。 */
export interface PromptStatsData {
  stats: LibraryStats;
  snapshots: StatsSnapshot[];
}

/** 获取词库统计（当前统计 + 近 12 周快照）。 */
export function getStats(): Promise<PromptStatsData> {
  return send<PromptStatsData>("GET", "/api/prompt-library/stats");
}

// ── 自动备份 ──────────────────────────────────────────────────────────────

/** 自动备份目录下的单条备份文件信息。 */
export interface BackupEntry {
  name: string;
  size: number;
  createdAt: number;
  /** 备份文件格式：db（数据库文件）/ json（JSON 导出）。 */
  format: "db" | "json";
}

/** 列出自动备份目录中的备份文件（按时间倒序，最新在前）。 */
export function listBackups(): Promise<BackupEntry[]> {
  return send<BackupEntry[]>("GET", "/api/prompt-library/backups");
}

/** 立即执行一次备份，返回生成的备份文件名与大小。format 缺省 db（复制数据库文件）；json 导出为 JSON 备份。 */
export function runBackup(format: "db" | "json" = "db"): Promise<{ name: string; size: number }> {
  return send<{ name: string; size: number }>("POST", "/api/prompt-library/backups/run", { format });
}

/** 从指定备份文件恢复词库（db 覆盖主库重开连接；json 清空后重建）。返回格式与恢复后条数。 */
export function restoreBackup(
  name: string,
): Promise<{ format: "db" | "json"; count: number }> {
  return send<{ format: "db" | "json"; count: number }>(
    "POST",
    "/api/prompt-library/backups/restore",
    { name },
  );
}

/** 删除指定的备份文件（删除后不可恢复）。 */
export function deleteBackup(name: string): Promise<{ deleted: boolean }> {
  return send<{ deleted: boolean }>("POST", "/api/prompt-library/backups/delete", { name });
}