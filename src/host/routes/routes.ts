/**
 * 词库的 HTTP 路由。
 *
 * 一个 `/api/prompt-library` 的 `prefix` 路由分发所有子路径：
 *   GET    /prompts         列表
 *   POST   /prompts         创建
 *   POST   /learn           自动学习
 *   PUT    /prompts/:id     更新
 *   DELETE /prompts/:id     删除
 *
 * 所有响应使用 ApiResponse 信封。
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { WebRoute } from "@deepseek-ai/dsh-host-webserver";
import type { ApiResponse, PluginSettings, Prompt, PromptInput, PromptPatch } from "../../types.js";
import { commentOnStats, generateIntro, generateSkillDescriptor, listAiSelectables, polishPromptBody } from "../services/ai/ai.js";
import {
  exportPromptsAsSkills,
  importSkillEntries,
  importSkillsFromDisk,
  listAvailableSkills,
  parseSkillRaw,
} from "../services/ai/skills.js";
import {
  autoLearn,
  computeHeatmap,
  computeLibraryStats,
  computeInactiveDays,
  computeStreak,
  createPrompt,
  createTag,
  deletePrompt,
  deleteTag,
  deleteTrash,
  emptyTrash,
  exportPrompts,
  getSettings,
  importPrompts,
  listPrompts,
  listStatsSnapshots,
  listTags,
  listTrash,
  recordUsage,
  refinePrompt,
  renameTag,
  restorePrompts,
  updatePrompt,
  updateSettings,
} from "../services/data/store.js";
import { checkUpdate, getVersionInfo, restartService, upgradePlugin } from "../services/update/update.js";
import { getActivity } from "../services/assistant/activity.js";
import { buildAssistantStatus } from "../services/assistant/gamification.js";
import { getAnnouncement } from "../services/update/announcement.js";
import { deleteBackup, listBackups, restoreBackup, runBackup, type BackupFormat } from "../services/data/backup.js";
import {
  bindPersonaToScope,
  createPersonaWithSoul,
  deletePersonaWithSoul,
  getPersonaForScopePath,
  listPersonaViews,
  listScopeTree,
  updatePersonaWithContent,
} from "../services/persona/persona-service.js";

const PREFIX = "/api/prompt-library";

function json<T>(res: ServerResponse, status: number, body: ApiResponse<T>): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const CAP = 1 << 20; // 1 MiB 上限；提示词是短文本。
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > CAP) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

/** 将 `req.url` 拆分为路径段（相对于 PREFIX）。 */
function parseTail(url: string | undefined): { tail: string; segments: string[] } {
  const full = url ?? "";
  const pathname = full.split("?", 1)[0] ?? "";
  const tail = pathname.startsWith(PREFIX) ? pathname.slice(PREFIX.length) : pathname;
  const segments = tail.split("/").filter(Boolean);
  return { tail, segments };
}

function isInput(value: unknown): value is PromptInput {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PromptInput).title === "string" &&
    typeof (value as PromptInput).body === "string"
  );
}

function isPatch(value: unknown): value is PromptPatch {
  return typeof value === "object" && value !== null;
}

/** 是否为可入库/可写盘的技能条目（title/body 必填，name/summary/promptId 可选）。 */
function isSkillEntry(
  value: unknown,
): value is { title: string; body: string; name?: string; summary?: string; promptId?: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { title?: unknown }).title === "string" &&
    typeof (value as { body?: unknown }).body === "string"
  );
}

/** 从请求体中提取字符串数组（{ ids: string[] } 或直接数组）。 */
function extractIds(body: unknown): string[] {
  const list =
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { ids?: unknown }).ids)
      ? (body as { ids: unknown[] }).ids
      : Array.isArray(body)
        ? body
        : [];
  return list.filter((x): x is string => typeof x === "string");
}

export function makePromptRoutes(): WebRoute[] {
  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    const method = (req.method ?? "GET").toUpperCase();
    const { tail, segments } = parseTail(req.url);
    const promptId = segments[0] === "prompts" && segments.length === 2 ? segments[1] : undefined;

    try {
      // GET / 或 /prompts — 列表（"/" 视为列出集合根）
      if (
        method === "GET" &&
        (segments.length === 0 || (segments[0] === "prompts" && segments.length === 1))
      ) {
        const prompts = await listPrompts();
        return json(res, 200, { ok: true, data: prompts });
      }

      // POST /prompts — 创建
      if (method === "POST" && segments[0] === "prompts" && segments.length === 1) {
        const body = await readJsonBody(req);
        if (!isInput(body)) return json(res, 400, { ok: false, error: "invalid body: {title, body}" });
        const prompt: Prompt = await createPrompt(body);
        return json(res, 201, { ok: true, data: prompt });
      }

      // POST /learn — 从草稿正文自动学习（AI 自学习持久化）
      if (method === "POST" && tail === "/learn") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null || typeof (raw as { body: string }).body !== "string") {
          return json(res, 400, { ok: false, error: "invalid body: {body: string}" });
        }
        const body = raw as { body: string; tag?: string; skipEnrich?: boolean };
        const text = body.body.trim();
        if (text.length < 20) {
          return json(res, 400, { ok: false, error: "body too short" });
        }
        const prompt = await autoLearn(text, body.tag, body.skipEnrich);
        return json(res, 200, { ok: true, data: prompt });
      }

      // PUT /prompts/:id — 更新
      if (method === "PUT" && promptId) {
        const body = await readJsonBody(req);
        if (!isPatch(body)) return json(res, 400, { ok: false, error: "invalid body" });
        const updated = await updatePrompt(promptId, body);
        if (!updated) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: updated });
      }

      // DELETE /prompts/:id — 删除
      if (method === "DELETE" && promptId) {
        const removed = await deletePrompt(promptId);
        if (!removed) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: { id: promptId } });
      }

      // POST /prompts/:id/refine — 重新触发某条提示词的 AI 完善（查看详情「重新完善」入口）
      if (method === "POST" && segments[0] === "prompts" && segments[2] === "refine" && segments.length === 3) {
        const ok = await refinePrompt(segments[1] ?? "");
        return json(res, ok ? 200 : 404, { ok, data: { ok } });
      }

      // POST /prompts/:id — 记录使用次数
      if (method === "POST" && promptId) {
        const updated = await recordUsage(promptId);
        if (!updated) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: updated });
      }

      // GET /export — 导出全部提示词（备份内容，含 schema 版本）
      if (method === "GET" && segments[0] === "export" && segments.length === 1) {
        const data = await exportPrompts();
        return json(res, 200, { ok: true, data });
      }

      // POST /export — 导出勾选的提示词（body: { ids?: string[] }，缺省导出全部）
      if (method === "POST" && segments[0] === "export" && segments.length === 1) {
        const body = await readJsonBody(req);
        const ids =
          typeof body === "object" &&
          body !== null &&
          Array.isArray((body as { ids?: unknown }).ids)
            ? (body as { ids: unknown[] }).ids.filter((x): x is string => typeof x === "string")
            : undefined;
        const data = await exportPrompts(ids && ids.length > 0 ? ids : undefined);
        return json(res, 200, { ok: true, data });
      }

      // POST /import — 从备份内容导入（合并式：同 id 覆盖，其余新增）
      if (method === "POST" && segments[0] === "import" && segments.length === 1) {
        const body = await readJsonBody(req);
        const result = await importPrompts(body);
        return json(res, 200, { ok: true, data: result });
      }

      // GET /tags — 标签汇总（名称 + 使用次数）
      if (method === "GET" && segments[0] === "tags" && segments.length === 1) {
        const data = await listTags();
        return json(res, 200, { ok: true, data });
      }

      // PUT /tags/:name — 重命名标签（合并到新标签）
      if (method === "PUT" && segments[0] === "tags" && segments.length === 2) {
        const from = decodeURIComponent(segments[1] ?? "");
        const body = await readJsonBody(req);
        const to =
          typeof body === "object" &&
          body !== null &&
          typeof (body as { to?: unknown }).to === "string"
            ? (body as { to: string }).to
            : "";
        const changed = await renameTag(from, to);
        return json(res, 200, { ok: true, data: { changed } });
      }

      // DELETE /tags/:name — 删除标签（从所有提示词中移除，内容变为未命名/未分类）
      if (method === "DELETE" && segments[0] === "tags" && segments.length === 2) {
        const name = decodeURIComponent(segments[1] ?? "");
        const changed = await deleteTag(name);
        return json(res, 200, { ok: true, data: { changed } });
      }

      // POST /tags — 新建标签（已存在则忽略）
      if (method === "POST" && segments[0] === "tags" && segments.length === 1) {
        const body = await readJsonBody(req);
        const name =
          typeof body === "object" &&
          body !== null &&
          typeof (body as { name?: unknown }).name === "string"
            ? (body as { name: string }).name
            : "";
        const created = await createTag(name);
        return json(res, 201, { ok: true, data: { name: created } });
      }

      // GET /trash — 列出回收站内容
      if (method === "GET" && segments[0] === "trash" && segments.length === 1) {
        const data = await listTrash();
        return json(res, 200, { ok: true, data });
      }

      // POST /skills/import — 逆向导入：读取 ~/.dsh/skills/<name>/SKILL.md 批量生成为提示词入库
      if (method === "POST" && tail === "/skills/import") {
        const result = await importSkillsFromDisk();
        return json(res, 200, { ok: true, data: result });
      }

      // GET /skills/available — 列出 ~/.dsh/skills 下可导入的技能（解析为可编辑条目，供导入弹窗勾选）
      if (method === "GET" && tail === "/skills/available") {
        const data = await listAvailableSkills();
        return json(res, 200, { ok: true, data });
      }

      // POST /skills/parse — 解析一段 md 原始文本（frontmatter + 正文）为可编辑条目（供「选择本地 md 文件」导入）
      if (method === "POST" && tail === "/skills/parse") {
        const raw = await readJsonBody(req);
        const text =
          typeof raw === "object" &&
          raw !== null &&
          typeof (raw as { raw?: unknown }).raw === "string"
            ? (raw as { raw: string }).raw
            : "";
        if (!text) return json(res, 400, { ok: false, error: "invalid body: {raw}" });
        return json(res, 200, { ok: true, data: parseSkillRaw(text) });
      }

      // POST /skills/import/entries — 保存用户在弹窗中编辑后的技能条目（逆向导入入库）
      if (method === "POST" && tail === "/skills/import/entries") {
        const raw = await readJsonBody(req);
        const list =
          typeof raw === "object" &&
          raw !== null &&
          Array.isArray((raw as { entries?: unknown }).entries)
            ? (raw as { entries: unknown[] }).entries
            : [];
        const entries = list.filter(isSkillEntry);
        if (entries.length === 0) {
          return json(res, 400, { ok: false, error: "invalid body: {entries: SkillEntry[]}" });
        }
        const result = await importSkillEntries(entries);
        return json(res, 200, { ok: true, data: result });
      }

      // POST /skills/export/entries — 把用户在弹窗中编辑后的技能条目写盘为 DSH 技能
      if (method === "POST" && tail === "/skills/export/entries") {
        const raw = await readJsonBody(req);
        const list =
          typeof raw === "object" &&
          raw !== null &&
          Array.isArray((raw as { entries?: unknown }).entries)
            ? (raw as { entries: unknown[] }).entries
            : [];
        const entries = list.filter(isSkillEntry);
        if (entries.length === 0) {
          return json(res, 400, { ok: false, error: "invalid body: {entries: SkillEntry[]}" });
        }
        const result = await exportPromptsAsSkills(entries);
        return json(res, 200, { ok: true, data: result });
      }

      // POST /skills/ai-describe — AI 依据提示词内容生成技能名与描述（导出弹窗校验通过后自动调用）
      if (method === "POST" && tail === "/skills/ai-describe") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null) {
          return json(res, 400, { ok: false, error: "invalid body: {title, body}" });
        }
        const { title, body, summary, tags } = raw as {
          title?: unknown;
          body?: unknown;
          summary?: unknown;
          tags?: unknown;
        };
        if (typeof title !== "string" || typeof body !== "string" || !title.trim() || !body.trim()) {
          return json(res, 400, { ok: false, error: "invalid body: {title, body}" });
        }
        const settings = await getSettings();
        const result = await generateSkillDescriptor(
          {
            title: title.trim(),
            body: body.trim(),
            summary: typeof summary === "string" && summary.trim() ? summary.trim() : undefined,
            tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === "string") : undefined,
          },
          settings,
        );
        return json(res, 200, { ok: true, data: result });
      }

      // POST /trash/restore — 从回收站恢复一批提示词
      if (method === "POST" && tail === "/trash/restore") {
        const body = await readJsonBody(req);
        const ids = extractIds(body);
        const restored = await restorePrompts(ids);
        return json(res, 200, { ok: true, data: { restored } });
      }

      // POST /trash/delete — 从回收站永久删除一批提示词
      if (method === "POST" && tail === "/trash/delete") {
        const body = await readJsonBody(req);
        const ids = extractIds(body);
        const deleted = await deleteTrash(ids);
        return json(res, 200, { ok: true, data: { deleted } });
      }

      // POST /trash/empty — 清空回收站
      if (method === "POST" && tail === "/trash/empty") {
        const deleted = await emptyTrash();
        return json(res, 200, { ok: true, data: { deleted } });
      }

      // GET /ai/providers — 获取系统中可用的 AI provider 及模型列表（设置界面下拉选择）
      if (method === "GET" && tail === "/ai/providers") {
        const data = await listAiSelectables();
        return json(res, 200, { ok: true, data });
      }

      // POST /ai/polish — AI 润色提示词正文（只返回结果，不写回、不学习）
      // keepVariables：是否启用「{{}} 模板变量保留/新增」能力（默认开启；聊天框按钮润色关闭）
      if (method === "POST" && tail === "/ai/polish") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null || typeof (raw as { body: string }).body !== "string") {
          return json(res, 400, { ok: false, error: "invalid body: {body: string}" });
        }
        const body = (raw as { body: string }).body;
        if (!body.trim()) return json(res, 400, { ok: false, error: "body empty" });
        const keepVariables = (raw as { keepVariables?: boolean }).keepVariables !== false;
        const settings = await getSettings();
        const polished = await polishPromptBody(body, settings, { keepVariables });
        if (polished === undefined) {
          return json(res, 503, { ok: false, error: "AI 不可用或优化失败，请确认已连接 LLM 服务" });
        }
        return json(res, 200, { ok: true, data: { polished } });
      }

      // POST /ai/intro — AI 生成词库功能简介（5 句，供悬浮助手气泡轮询；失败时前端回退内置简介）
      if (method === "POST" && tail === "/ai/intro") {
        const raw = await readJsonBody(req);
        const lang = (raw as { lang?: string })?.lang === "en" ? "en" : "zh";
        const settings = await getSettings();
        const lines = await generateIntro(lang, settings);
        if (!lines || lines.length === 0) {
          return json(res, 503, { ok: false, error: "AI 不可用或生成简介失败" });
        }
        return json(res, 200, { ok: true, data: { lines } });
      }

      // POST /ai/suggest — 依据词库当前统计生成「AI 建议」点评（公告看板 AI 建议卡片；
      // 失败时返回空串，前端显示 AI 不可用提示）
      if (method === "POST" && tail === "/ai/suggest") {
        const raw = await readJsonBody(req);
        const lang = (raw as { lang?: string })?.lang === "en" ? "en" : "zh";
        const settings = await getSettings();
        const stats = await computeLibraryStats().catch(() => undefined);
        if (!stats) return json(res, 503, { ok: false, error: "统计不可用" });
        const lines: string[] = [
          `词库共 ${stats.total} 条提示词，累计使用 ${stats.totalUsage} 次，使用率 ${stats.total ? Math.round((stats.usedCount / stats.total) * 100) : 0}%；`,
          `近 7 天使用 ${stats.usedIn7Days} 条、新增 ${stats.addedIn7Days} 条、AI 完善 ${stats.aiRefinedIn7} 条；近 30 天使用 ${stats.usedIn30Days} 条、新增 ${stats.addedIn30Days} 条。`,
        ];
        if (stats.topUsed.length) {
          lines.push(`最常用：${stats.topUsed.slice(0, 3).map((p) => `${p.title}（${p.usageCount}次）`).join("、")}。`);
        }
        if (stats.tagStats.length) {
          lines.push(`标签分布：${stats.tagStats.slice(0, 5).map((t) => `${t.name}(${t.count})`).join("、")}。`);
        }
        if (stats.trashCount) lines.push(`回收站有 ${stats.trashCount} 条待清理。`);
        const suggestion = await commentOnStats(lines.join("\n"), settings, lang).catch(() => "");
        return json(res, 200, { ok: true, data: { suggestion } });
      }

      // GET /settings — 获取设置
      if (method === "GET" && tail === "/settings") {
        const settings = await getSettings();
        return json(res, 200, { ok: true, data: settings });
      }

      // GET /update — 检查插件是否有新版本（前端手动检查：强制刷新，绕过 24h 缓存并落日志）
      if (method === "GET" && tail === "/update") {
        const info = await checkUpdate(true);
        return json(res, 200, { ok: true, data: info });
      }

      // POST /update/apply — 点击气泡「更新」按钮后执行安装命令升级插件到最新版
      if (method === "POST" && tail === "/update/apply") {
        const result = await upgradePlugin();
        return json(res, 200, { ok: result.ok, data: result });
      }

      // GET /version — 服务端/客户端版本比对信息（运行版本 + 磁盘已安装版本）
      if (method === "GET" && tail === "/version") {
        return json(res, 200, { ok: true, data: getVersionInfo() });
      }

      // POST /restart — 重启本地 dsh web 服务（重启后当前连接会短暂断开）
      if (method === "POST" && tail === "/restart") {
        const result = await restartService();
        return json(res, 200, { ok: result.ok, data: result });
      }

      // PUT /settings — 更新设置
      if (method === "PUT" && tail === "/settings") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null) {
          return json(res, 400, { ok: false, error: "invalid body" });
        }
        const settings = await updateSettings(raw as Partial<PluginSettings>);
        return json(res, 200, { ok: true, data: settings });
      }

      // GET /activity — 词库助手活动状态机快照（idle/waiting/thinking/tool/review/done/failed），
      // 驱动助手动画；支持 lang 查询参数，host 按语言返回匹配主题+阶段的文案
      if (method === "GET" && tail === "/activity") {
        let lang = "zh";
        try {
          const raw = req.url ?? "";
          const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
          const lv = new URLSearchParams(q).get("lang");
          if (lv) lang = lv;
        } catch {
          /* 解析失败用默认 zh */
        }
        const settings = await getSettings();
        const langNorm = lang.toLowerCase().startsWith("en") ? "en" : "zh";
        const char = settings.assistantCharacter ?? "classic";
        const data = getActivity(langNorm, char);
        return json(res, 200, { ok: true, data });
      }

      // GET /assistant/status — 词库助手游戏化快照：等级 + 成就 + 时间/节日彩蛋，
      // 驱动助手等级徽章、成就解锁气泡与应景彩蛋；支持 lang 查询参数
      if (method === "GET" && tail === "/assistant/status") {
        let lang = "zh";
        try {
          const raw = req.url ?? "";
          const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
          const lv = new URLSearchParams(q).get("lang");
          if (lv) lang = lv;
        } catch {
          /* 解析失败用默认 zh */
        }
        const [stats, streak, inactiveDays] = await Promise.all([
          computeLibraryStats().catch(() => undefined),
          computeStreak().catch(() => 0),
          computeInactiveDays().catch(() => 0),
        ]);
        const data = buildAssistantStatus(stats, streak, inactiveDays, lang.toLowerCase().startsWith("en") ? "en" : "zh");
        return json(res, 200, { ok: true, data });
      }

      // GET /announcement — 公告通告（词库助手右键菜单「公告」弹窗读取；本地多语言，支持 lang 查询参数）
      if (method === "GET" && tail === "/announcement") {
        let lang = "zh";
        try {
          const raw = req.url ?? "";
          const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
          const params = new URLSearchParams(q);
          const lv = params.get("lang");
          if (lv) lang = lv;
        } catch {
          /* 解析失败忽略，默认 zh */
        }
        const data = getAnnouncement(lang);
        return json(res, 200, { ok: true, data });
      }

      // GET /stats — 词库统计（供统计可视化面板展示）
      if (method === "GET" && tail === "/stats") {
        const [stats, snapshots, heatmap] = await Promise.all([
          computeLibraryStats(),
          listStatsSnapshots(12),
          computeHeatmap(),
        ]);
        return json(res, 200, { ok: true, data: { stats, snapshots, heatmap } });
      }

      // GET /backups — 列出自动备份目录中的备份文件（按时间倒序）
      if (method === "GET" && tail === "/backups") {
        const data = await listBackups();
        return json(res, 200, { ok: true, data });
      }

      // POST /backups/run — 立即执行一次备份（body.format 可选 db/json，按当前保留份数清理最旧的）
      if (method === "POST" && tail === "/backups/run") {
        const settings = await getSettings();
        const raw = await readJsonBody(req);
        const f =
          typeof raw === "object" &&
          raw !== null &&
          ((raw as { format?: unknown }).format === "db" ||
            (raw as { format?: unknown }).format === "json")
            ? (raw as { format: BackupFormat }).format
            : "db";
        const data = await runBackup(settings.backupRetention, f);
        return json(res, 200, { ok: true, data });
      }

      // POST /backups/restore — 从指定备份文件恢复词库（db 覆盖主库重开连接；json 清空后重建）
      if (method === "POST" && tail === "/backups/restore") {
        const raw = await readJsonBody(req);
        const name =
          typeof raw === "object" &&
          raw !== null &&
          typeof (raw as { name?: unknown }).name === "string"
            ? (raw as { name: string }).name
            : "";
        if (!name) return json(res, 400, { ok: false, error: "invalid body: {name}" });
        try {
          const data = await restoreBackup(name);
          return json(res, 200, { ok: true, data });
        } catch (err) {
          // 文件名非法 / 备份文件不存在 / json 解析失败等，返回具体原因供界面提示
          return json(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : "restore failed",
          });
        }
      }

      // POST /backups/delete — 删除指定的备份文件（删除后不可恢复）
      if (method === "POST" && tail === "/backups/delete") {
        const raw = await readJsonBody(req);
        const name =
          typeof raw === "object" &&
          raw !== null &&
          typeof (raw as { name?: unknown }).name === "string"
            ? (raw as { name: string }).name
            : "";
        if (!name) return json(res, 400, { ok: false, error: "invalid body: {name}" });
        try {
          await deleteBackup(name);
          return json(res, 200, { ok: true, data: { deleted: true } });
        } catch (err) {
          // 文件名非法 / 删除失败等，返回具体原因供界面提示
          return json(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : "delete failed",
          });
        }
      }

      // ── 多人格（自定义 SOUL，按工作区/项目切换） ─────────────────────────

      // GET /personas — 列出全部人格（含内置默认人格，排最前）
      if (method === "GET" && segments[0] === "personas" && segments.length === 1) {
        const data = await listPersonaViews();
        return json(res, 200, { ok: true, data });
      }

      // GET /personas/scopes — 列出工作区/项目树（节点自带精确绑定的人格 id）
      if (method === "GET" && segments[0] === "personas" && segments[1] === "scopes" && segments.length === 2) {
        return json(res, 200, { ok: true, data: listScopeTree() });
      }

      // GET /personas/scopes/binding?path= — 读取某路径的精确绑定（无绑定返回空串）
      if (method === "GET" && segments[0] === "personas" && segments[1] === "scopes" && segments[2] === "binding") {
        const q = new URLSearchParams(tail.includes("?") ? tail.slice(tail.indexOf("?") + 1) : "");
        const path = q.get("path") ?? "";
        return json(res, 200, { ok: true, data: { personaId: getPersonaForScopePath(path) } });
      }

      // PUT /personas/scopes/binding {path, personaId} — 设置某路径绑定（'default'/空 → 回落默认/上层）
      if (method === "PUT" && segments[0] === "personas" && segments[1] === "scopes" && segments[2] === "binding") {
        const raw = await readJsonBody(req);
        const path =
          typeof raw === "object" && raw !== null && typeof (raw as { path?: unknown }).path === "string"
            ? (raw as { path: string }).path
            : "";
        const personaId =
          typeof raw === "object" && raw !== null && typeof (raw as { personaId?: unknown }).personaId === "string"
            ? (raw as { personaId: string }).personaId
            : "";
        if (!path) return json(res, 400, { ok: false, error: "invalid body: {path, personaId}" });
        const bound = bindPersonaToScope(path, personaId);
        return json(res, 200, { ok: true, data: { personaId: bound } });
      }

      // POST /personas {name} — 新建自定义人格
      if (method === "POST" && segments[0] === "personas" && segments.length === 1) {
        const raw = await readJsonBody(req);
        const name =
          typeof raw === "object" &&
          raw !== null &&
          typeof (raw as { name?: unknown }).name === "string"
            ? (raw as { name: string }).name
            : "";
        if (!name.trim()) return json(res, 400, { ok: false, error: "invalid body: {name}" });
        const data = await createPersonaWithSoul(name);
        return json(res, 201, { ok: true, data });
      }

      // PUT /personas/:id {name?, enabled?, content?} — 更新人格元信息 / SOUL 正文
      if (
        method === "PUT" &&
        segments[0] === "personas" &&
        segments.length === 2 &&
        segments[1] !== "binding" &&
        segments[1] !== "scopes"
      ) {
        const id = segments[1] ?? "";
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null) {
          return json(res, 400, { ok: false, error: "invalid body" });
        }
        const b = raw as { name?: unknown; enabled?: unknown; content?: unknown };
        if (id === "default") return json(res, 400, { ok: false, error: "cannot update built-in default persona" });
        const updated = await updatePersonaWithContent(id, {
          name: typeof b.name === "string" ? b.name : undefined,
          enabled: typeof b.enabled === "boolean" ? b.enabled : undefined,
          content: typeof b.content === "string" ? b.content : undefined,
        });
        if (!updated) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: updated });
      }

      // DELETE /personas/:id — 删除自定义人格（默认人格不可删）
      if (method === "DELETE" && segments[0] === "personas" && segments.length === 2 && segments[1] !== "binding" && segments[1] !== "scopes") {
        const removed = await deletePersonaWithSoul(segments[1] ?? "");
        if (!removed) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: { id: segments[1] } });
      }

      // GET /assets/whale — 返回词库助手「鲸鱼款」助手的雪碧图（image/webp 字节），
      // 素材随插件构建产物随包分发（lib/assets/whale-spritesheet.webp）。
      if (method === "GET" && segments[0] === "assets" && segments[1] === "whale" && segments.length === 2) {
        try {
          const fileUrl = new URL("./assets/whale-spritesheet.webp", import.meta.url);
          const buf = await readFile(fileURLToPath(fileUrl));
          res.writeHead(200, {
            "content-type": "image/webp",
            "content-length": String(buf.byteLength),
            "cache-control": "public, max-age=604800",
          });
          res.end(buf);
          return;
        } catch (err) {
          return json(res, 404, {
            ok: false,
            error: err instanceof Error ? err.message : "asset not found",
          });
        }
      }

      return json(res, 404, { ok: false, error: `no route ${method} ${tail}` });
    } catch (err) {
      // 错误详情（含本地路径/堆栈）仅记录日志，不原样返回给客户端，避免信息泄露
      console.error("[prompt-library] 请求处理失败:", err instanceof Error ? err.stack || err.message : err);
      return json(res, 500, { ok: false, error: "internal error" });
    }
  };

  return [
    {
      kind: "prefix",
      path: PREFIX,
      handler,
    },
  ];
}