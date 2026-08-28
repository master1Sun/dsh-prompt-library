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
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { fileURLToPath } from "node:url";
import type { WebRoute } from "@deepseek-ai/dsh-host-webserver";
import type { ApiResponse, PluginSettings, Prompt, PromptInput, PromptPatch } from "../../types.js";
import { commentOnStats, generateDraft, generateIntro, generateSkillDescriptor, listAiSelectables, polishPromptBody, todayLocalDate } from "../services/ai/ai.js";
import {
  exportAsSessionPrompts,
  exportPromptsAsSkills,
  importSkillEntries,
  importSkillsFromDisk,
  listAvailableSkills,
  listHarnessSkillToggles,
  listSkillsFromDir,
  parseSkillRaw,
  setHarnessSkillToggle,
} from "../services/ai/skills.js";
import {
  autoLearn,
  computeHeatmap,
  computeLibraryStats,
  computePoints,
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
import {
  clearScopePromptBinding,
  createSessionPrompt,
  deleteSessionPrompt,
  getCurrentSessionScope,
  getScopeBoundPromptIds,
  getSessionActivePromptIds,
  listScopePromptBindings,
  listSessionPrompts,
  setScopePromptBinding,
  setSessionActivePrompts,
  updateSessionPrompt,
} from "../services/session-prompts/session-prompts.js";
import {
  clearSessionBinding,
  setSessionPersonaBindingForSession,
  setSessionPromptBindingForSession,
} from "../services/session-prompts/session-prompts.js";
import { checkUpdate, getVersionInfo, restartService, upgradePlugin } from "../services/update/update.js";
import { getActivity } from "../services/assistant/activity.js";
import { buildAssistantStatus } from "../services/assistant/gamification.js";
import { getAnnouncement } from "../services/update/announcement.js";
import { getIssue, listIssueDates } from "../services/update/daily.js";
import { deleteBackup, listBackups, restoreBackup, runBackup, type BackupFormat } from "../services/data/backup.js";
import {
  bindPersonaToScope,
  createPersonaWithSoul,
  deletePersonaWithSoul,
  getPersonaForScopePath,
  getPersonaForSession,
  listPersonaViews,
  listScopeTree,
  updatePersonaWithContent,
} from "../services/persona/persona-service.js";
import { listSessionScopeTree } from "../services/session-scope/session-scope.js";
import { listSessionRecords } from "../services/session-scope/session-scope.js";
import { downloadDir } from "../utils/paths.js";

const PREFIX = "/api/prompt-library";

function json<T>(res: ServerResponse, status: number, body: ApiResponse<T>): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

/** 后端导出序列化：与前端 serializeExport 保持一致的输出，供导出写盘使用。 */
function buildExportFile(
  format: string,
  prompts: Array<{ title: string; body: string; tags?: string[] }>,
): { fileName: string; content: string } | null {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const base = `prompt-library-${stamp}`;
  const csvEscape = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  if (format === "json") {
    return {
      fileName: `${base}.json`,
      content: JSON.stringify({ version: 1, exportedAt: Date.now(), prompts }, null, 2),
    };
  }
  if (format === "csv") {
    const lines = ["title,body,tags"];
    for (const p of prompts) {
      lines.push(`${csvEscape(p.title)},${csvEscape(p.body)},${csvEscape((p.tags ?? []).join("|"))}`);
    }
    return { fileName: `${base}.csv`, content: lines.join("\r\n") };
  }
  if (format === "md") {
    const parts: string[] = [];
    for (const p of prompts) {
      const tagsLine = p.tags && p.tags.length ? `\n\n标签：${p.tags.join("、")}` : "";
      parts.push(`# ${p.title}${tagsLine}\n\n${(p.body ?? "").trim()}`);
    }
    return { fileName: `${base}.md`, content: parts.join("\n\n---\n\n") + "\n" };
  }
  return null;
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

/** 从请求体中提取字符串数组（{ ids: string[] }、{ promptIds: string[] } 或直接数组）。 */
function extractIds(body: unknown): string[] {
  const obj =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  const list = obj
    ? Array.isArray(obj.promptIds)
      ? obj.promptIds
      : Array.isArray(obj.ids)
        ? obj.ids
        : []
    : Array.isArray(body)
      ? body
      : [];
  return list.filter((x): x is string => typeof x === "string");
}

/**
 * 解析最近活跃会话的项目路径（agent.session.header.cwd）。
 * 项目级技能导出据此写盘到 <cwd>/.dsh/skills；无活跃会话或会话查询不可用时返回 null。
 */
async function resolveCurrentProjectCwd(): Promise<string | null> {
  let records: Array<{ id: string; cwd: string | null }> = [];
  try {
    records = await listSessionRecords();
  } catch {
    records = [];
  }
  // 优先取最近活跃会话的 cwd；若其 id 匹配不到或无活跃会话，回退到任一会话的 cwd，
  // 避免返回 null 导致项目技能（<cwd>/.dsh/skills）扫描被跳过。
  const scope = getCurrentSessionScope();
  if (scope) {
    const byScope = records.find((r) => r.id === scope)?.cwd;
    if (byScope) return byScope;
  }
  return records.find((r) => r.cwd)?.cwd || null;
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

      // POST /export/save — 由后端按勾选 ids 与格式组织数据，并写入系统「下载」目录，返回保存路径。
      // 前端只传递 ids + format，避免大数据量（提示词正文）往返；
      // 写盘由后端完成，桌面端不弹「选择保存路径」对话框，且写完后才响应，前端随之提示成功。
      if (method === "POST" && segments[0] === "export" && segments[1] === "save") {
        const body = await readJsonBody(req);
        const obj = (typeof body === "object" && body !== null ? body : {}) as { ids?: unknown; format?: unknown };
        const ids = Array.isArray(obj.ids) ? obj.ids.filter((x): x is string => typeof x === "string") : undefined;
        const format = typeof obj.format === "string" ? obj.format : "json";
        const data = await exportPrompts(ids && ids.length > 0 ? ids : undefined);
        const file = buildExportFile(
          format,
          data.prompts.map((p) => ({ title: p.title, body: p.body, tags: p.tags })),
        );
        if (!file) return json(res, 400, { ok: false, error: "bad request" });
        const dir = downloadDir();
        await mkdir(dir, { recursive: true });
        // 同名处理：下载目录已有同名文件时，按 Windows 风格追加序号 `name (n).ext`，避免覆盖
        const ext = file.fileName.match(/\.([^.]*)$/)?.[1] ?? "";
        const base = ext ? file.fileName.slice(0, -(ext.length + 1)) : file.fileName;
        let finalName = file.fileName;
        let n = 1;
        while (existsSync(join(dir, finalName))) {
          finalName = ext ? `${base} (${n}).${ext}` : `${base} (${n})`;
          n++;
        }
        const target = join(dir, finalName);
        await writeFile(target, file.content, "utf8");
        return json(res, 200, { ok: true, data: { count: data.prompts.length, filePath: target } });
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

      // POST /skills/scan-dir — 递归扫描任意指定目录下的 md 文件为可导入技能条目（「扫描文件夹」导入）
      if (method === "POST" && tail === "/skills/scan-dir") {
        const raw = await readJsonBody(req);
        const dir =
          typeof raw === "object" &&
          raw !== null &&
          typeof (raw as { dir?: unknown }).dir === "string"
            ? (raw as { dir: string }).dir.trim()
            : "";
        if (!dir) return json(res, 400, { ok: false, error: "invalid body: {dir}" });
        const data = await listSkillsFromDir(dir);
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

      // GET /skills/export/project-cwd — 解析当前项目路径（导出弹窗「项目技能」范围用，用于展示保存位置）
      if (method === "GET" && tail === "/skills/export/project-cwd") {
        const cwd = await resolveCurrentProjectCwd();
        return json(res, 200, { ok: true, data: { cwd } });
      }

      // POST /skills/export/entries — 把用户在弹窗中编辑后的技能条目导出为 DSH 技能。
      // body.scope 控制导出范围：
      //   global（缺省）→ 写盘到 ~/.dsh/skills/<name>/SKILL.md（通用技能）；
      //   project → 写盘到 <项目路径>/.dsh/skills/<name>/SKILL.md（项目技能）；
      //     body.rootPath 为用户手动填写的项目路径（未自动解析到当前项目时由前端传入）；
      //   private → 创建为会话级技能并绑定当前会话（私有技能，仅本会话注入）。
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
        const scope =
          typeof raw === "object" && raw !== null && (raw as { scope?: unknown }).scope === "project"
            ? "project"
            : typeof raw === "object" && raw !== null && (raw as { scope?: unknown }).scope === "private"
              ? "private"
              : "global";
        let result;
        if (scope === "private") {
          // 私有：转会话级技能入库并绑定最近活跃会话
          result = await exportAsSessionPrompts(entries, getCurrentSessionScope());
        } else {
          // project 作用域：优先用用户手动填写的导出路径 rootPath（项目路径），
          // 否则自动解析当前项目路径；技能写盘为 <项目路径>/<name>/SKILL.md
          const manualRoot =
            typeof raw === "object" &&
            raw !== null &&
            typeof (raw as { rootPath?: unknown }).rootPath === "string"
              ? (raw as { rootPath: string }).rootPath.trim()
              : "";
          const projectRoot = scope === "project" ? manualRoot || (await resolveCurrentProjectCwd()) : null;
          if (scope === "project" && !projectRoot) {
            return json(res, 400, {
              ok: false,
              error: "未指定导出路径，且无法确定当前项目路径，请填写项目路径后重试",
            });
          }
          // project 作用域：写盘到 <项目>/.dsh/skills/<name>/SKILL.md（项目级技能根目录）
          const exportRoot = scope === "project" ? join(projectRoot!, ".dsh", "skills") : undefined;
          result = await exportPromptsAsSkills(entries, exportRoot);
        }
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

      // GET /skills/harness/list — 列出 system（~/.dsh/skills）与当前项目（<项目>/.dsh/skills）的
      //   harness 技能及其开关状态（供「技能管理」里的软控制开关弹窗展示/勾选）。
      if (method === "GET" && tail === "/skills/harness/list") {
        const projectRoot = await resolveCurrentProjectCwd();
        const items = await listHarnessSkillToggles(projectRoot);
        return json(res, 200, { ok: true, data: { items, projectRoot } });
      }

      // POST /skills/harness/toggle — 更新某 harness 技能的开关（软控制：禁用清单注入系统提示）。
      if (method === "POST" && tail === "/skills/harness/toggle") {
        const raw = await readJsonBody(req);
        const id =
          typeof raw === "object" &&
          raw !== null &&
          typeof (raw as { id?: unknown }).id === "string"
            ? (raw as { id: string }).id.trim()
            : "";
        const enabled = typeof raw === "object" && raw !== null ? (raw as { enabled?: unknown }).enabled : undefined;
        if (!id) return json(res, 400, { ok: false, error: "invalid body: {id: string, enabled: boolean}" });
        setHarnessSkillToggle(id, typeof enabled === "boolean" ? enabled : true);
        return json(res, 200, { ok: true, data: { id, enabled: typeof enabled === "boolean" ? enabled : true } });
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

      // POST /ai/draft — 依据「标题 + 已有内容」用 AI 生成技能 / 人格正文草稿
      // （人格管理 / 技能管理编辑区「AI 生成」按钮：只返回文本，不落盘、不写回）
      if (method === "POST" && tail === "/ai/draft") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null) {
          return json(res, 400, { ok: false, error: "invalid body: {kind, title, input}" });
        }
        const { kind, title, input, lang } = raw as {
          kind?: unknown;
          title?: unknown;
          input?: unknown;
          lang?: unknown;
        };
        if ((kind !== "soul" && kind !== "skill") || typeof title !== "string" || !title.trim()) {
          return json(res, 400, { ok: false, error: "invalid body: {kind: 'soul'|'skill', title: string}" });
        }
        const settings = await getSettings();
        const result = await generateDraft(
          kind,
          title.trim(),
          typeof input === "string" ? input.trim() : "",
          settings,
          lang === "en" ? "en" : "zh",
        );
        if (!result.content) {
          return json(res, 503, { ok: false, error: "AI 不可用或生成失败，请确认已连接 LLM 服务" });
        }
        return json(res, 200, { ok: true, data: { content: result.content } });
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
        const [stats, streak, points] = await Promise.all([
          computeLibraryStats().catch(() => undefined),
          computeStreak().catch(() => 0),
          computePoints().catch(() => ({
            gross: 0,
            decay: 0,
            net: 0,
            inactiveDays: 0,
            lastActiveAt: 0,
          })),
        ]);
        const data = buildAssistantStatus(stats, streak, lang.toLowerCase().startsWith("en") ? "en" : "zh", points);
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

      // GET /announcement/daily — 公告报纸「今日/历史」动态。
      // 每日日报由 AI 依据当日词库统计生成（中英各一版）；成就速报为本地成就进度。
      // ?date=YYYY-MM-DD 指定某一期；缺省取今天。每期以 Markdown（中英双语）落盘 newspapers/，支持历史翻页。
      if (method === "GET" && tail === "/announcement/daily") {
        let lang = "zh";
        let date: string | undefined;
        try {
          const raw = req.url ?? "";
          const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
          const params = new URLSearchParams(q);
          const lv = params.get("lang");
          if (lv) lang = lv;
          const dv = params.get("date");
          if (dv && /^\d{4}-\d{2}-\d{2}$/.test(dv)) date = dv;
        } catch {
          /* 解析失败忽略，默认 zh / 今天 */
        }
        const settings = await getSettings();
        const issue = await getIssue(date ?? todayLocalDate(), lang, settings);
        const availableDates = listIssueDates();
        return json(res, 200, {
          ok: true,
          data: {
            ...issue,
            availableDates,
            isToday: issue.date === todayLocalDate(),
          },
        });
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

      // GET /personas/scopes/sessions — 列出「工作区 → 项目 → 会话」树（节点自带会话绑定）
      if (method === "GET" && segments[0] === "personas" && segments[1] === "scopes" && segments[2] === "sessions") {
        return json(res, 200, { ok: true, data: await listSessionScopeTree() });
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

      // ── 会话级技能（session-prompts）与技能注入 ────────────────────────────

      // GET /session-prompts — 列出全部会话级技能
      if (method === "GET" && segments[0] === "session-prompts" && segments.length === 1) {
        return json(res, 200, { ok: true, data: listSessionPrompts() });
      }

      // POST /session-prompts — 新建会话级技能
      if (method === "POST" && segments[0] === "session-prompts" && segments.length === 1) {
        const body = await readJsonBody(req);
        if (!isInput(body)) return json(res, 400, { ok: false, error: "invalid body: {title, body}" });
        const prompt = createSessionPrompt(body);
        return json(res, 201, { ok: true, data: prompt });
      }

      // PUT /session-prompts/:id — 更新会话级技能
      if (method === "PUT" && segments[0] === "session-prompts" && segments.length === 2 && segments[1] !== "bindings" && segments[1] !== "active") {
        const body = await readJsonBody(req);
        if (!isPatch(body)) return json(res, 400, { ok: false, error: "invalid body" });
        const updated = updateSessionPrompt(segments[1] ?? "", {
          title: body.title,
          body: body.body,
          tags: body.tags,
          enabled: (body as { enabled?: boolean }).enabled,
        });
        if (!updated) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: updated });
      }

      // DELETE /session-prompts/:id — 删除会话级技能（同时清理绑定与临时注入引用）
      if (method === "DELETE" && segments[0] === "session-prompts" && segments.length === 2 && segments[1] !== "bindings" && segments[1] !== "active" && segments[1] !== "session") {
        const removed = deleteSessionPrompt(segments[1] ?? "");
        if (!removed) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: { id: segments[1] } });
      }

      // GET /session-prompts/bindings — 列出全部路径绑定（工作区/项目绑定 Tab 用）
      if (method === "GET" && segments[0] === "session-prompts" && segments[1] === "bindings" && segments.length === 2) {
        return json(res, 200, { ok: true, data: listScopePromptBindings() });
      }

      // GET /session-prompts/bindings/path?path= — 读取某路径精确绑定的技能 id 列表
      if (method === "GET" && segments[0] === "session-prompts" && segments[1] === "bindings" && segments[2] === "path" && segments.length === 3) {
        const q = new URLSearchParams(tail.includes("?") ? tail.slice(tail.indexOf("?") + 1) : "");
        const path = q.get("path") ?? "";
        return json(res, 200, { ok: true, data: { promptIds: getScopeBoundPromptIds(path) } });
      }

      // PUT /session-prompts/bindings {path, promptIds} — 设置某路径绑定的技能 id 列表
      if (method === "PUT" && segments[0] === "session-prompts" && segments[1] === "bindings" && segments.length === 2) {
        const raw = await readJsonBody(req);
        const path =
          typeof raw === "object" && raw !== null && typeof (raw as { path?: unknown }).path === "string"
            ? (raw as { path: string }).path
            : "";
        const promptIds = extractIds(raw);
        if (!path) return json(res, 400, { ok: false, error: "invalid body: {path, promptIds}" });
        setScopePromptBinding(path, promptIds);
        return json(res, 200, { ok: true, data: { promptIds } });
      }

      // DELETE /session-prompts/bindings?path= — 清除某路径的绑定
      if (method === "DELETE" && segments[0] === "session-prompts" && segments[1] === "bindings" && segments.length === 2) {
        const q = new URLSearchParams(tail.includes("?") ? tail.slice(tail.indexOf("?") + 1) : "");
        const path = q.get("path") ?? "";
        if (!path) return json(res, 400, { ok: false, error: "invalid query: path" });
        clearScopePromptBinding(path);
        return json(res, 200, { ok: true, data: { cleared: true } });
      }

      // GET /session-prompts/current-scope — 读取最近活跃的会话 scope（「当前会话」Tab 用）
      if (method === "GET" && segments[0] === "session-prompts" && segments[1] === "current-scope" && segments.length === 2) {
        return json(res, 200, { ok: true, data: { scope: getCurrentSessionScope() } });
      }

      // GET /session-prompts/active?scope= — 读取某会话 scope 的临时注入技能 id 列表
      if (method === "GET" && segments[0] === "session-prompts" && segments[1] === "active" && segments.length === 2) {
        const q = new URLSearchParams(tail.includes("?") ? tail.slice(tail.indexOf("?") + 1) : "");
        const scope = q.get("scope") ?? "";
        return json(res, 200, { ok: true, data: { promptIds: getSessionActivePromptIds(scope) } });
      }

      // PUT /session-prompts/active {scope, promptIds} — 设置某会话 scope 的临时注入技能 id 列表
      if (method === "PUT" && segments[0] === "session-prompts" && segments[1] === "active" && segments.length === 2) {
        const raw = await readJsonBody(req);
        const scope =
          typeof raw === "object" && raw !== null && typeof (raw as { scope?: unknown }).scope === "string"
            ? (raw as { scope: string }).scope
            : "";
        const promptIds = extractIds(raw);
        if (!scope) return json(res, 400, { ok: false, error: "invalid body: {scope, promptIds}" });
        setSessionActivePrompts(scope, promptIds);
        return json(res, 200, { ok: true, data: { promptIds } });
      }

      // PUT /session-prompts/session/persona {sessionId, personaId} — 设置某会话绑定的人格（默认/空 → 回落）
      if (method === "PUT" && segments[0] === "session-prompts" && segments[1] === "session" && segments[2] === "persona") {
        const raw = await readJsonBody(req);
        const sessionId =
          typeof raw === "object" && raw !== null && typeof (raw as { sessionId?: unknown }).sessionId === "string"
            ? (raw as { sessionId: string }).sessionId
            : "";
        const personaId =
          typeof raw === "object" && raw !== null && typeof (raw as { personaId?: unknown }).personaId === "string"
            ? (raw as { personaId: string }).personaId
            : "";
        if (!sessionId) return json(res, 400, { ok: false, error: "invalid body: {sessionId, personaId}" });
        setSessionPersonaBindingForSession(sessionId, personaId || null);
        return json(res, 200, { ok: true, data: { personaId: getPersonaForSession(sessionId) } });
      }

      // PUT /session-prompts/session/prompts {sessionId, promptIds} — 设置某会话持久绑定的技能 id 列表
      if (method === "PUT" && segments[0] === "session-prompts" && segments[1] === "session" && segments[2] === "prompts") {
        const raw = await readJsonBody(req);
        const sessionId =
          typeof raw === "object" && raw !== null && typeof (raw as { sessionId?: unknown }).sessionId === "string"
            ? (raw as { sessionId: string }).sessionId
            : "";
        const promptIds = extractIds(raw);
        if (!sessionId) return json(res, 400, { ok: false, error: "invalid body: {sessionId, promptIds}" });
        setSessionPromptBindingForSession(sessionId, promptIds);
        return json(res, 200, { ok: true, data: { promptIds } });
      }

      // DELETE /session-prompts/session?sessionId= — 清除某会话的全部绑定（人格回落默认、技能不再注入）
      if (method === "DELETE" && segments[0] === "session-prompts" && segments[1] === "session" && segments.length === 2) {
        const q = new URLSearchParams(tail.includes("?") ? tail.slice(tail.indexOf("?") + 1) : "");
        const sessionId = q.get("sessionId") ?? "";
        if (!sessionId) return json(res, 400, { ok: false, error: "invalid query: sessionId" });
        clearSessionBinding(sessionId);
        return json(res, 200, { ok: true, data: { cleared: true } });
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

      // GET /assets/whale-webm/:name.webm — 词库助手「鲸鱼款·动效」的 webm 动画（随插件自带，不依赖 dsh-pet）。
      // 素材随插件构建产物随包分发（lib/assets/whale-webm/*.webm），WhaleStage 用 base 路由 + 编码名 + ".webm" 拼接。
      if (method === "GET" && segments[0] === "assets" && segments[1] === "whale-webm" && segments.length === 3 && (segments[2] ?? "").endsWith(".webm")) {
        try {
          const name = decodeURIComponent(segments[2] ?? "");
          const fileUrl = new URL("./assets/whale-webm/" + name, import.meta.url);
          const buf = await readFile(fileURLToPath(fileUrl));
          res.writeHead(200, {
            "content-type": "video/webm",
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