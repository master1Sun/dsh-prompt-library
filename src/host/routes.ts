/**
 * 词库的 HTTP 路由。
 *
 * 一个 `/api/prompt-library` 的 `prefix` 路由分发所有子路径：
 *   GET    /prompts         列表
 *   POST   /prompts         创建
 *   PUT    /prompts/:id     更新
 *   DELETE /prompts/:id     删除
 *
 * 所有响应使用 ApiResponse 信封。
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { existsSync, statSync } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

import type { WebRoute } from "@deepseek-ai/dsh-host-webserver";
import type { ApiResponse, PluginSettings, Prompt, PromptInput, PromptPatch } from "../types.js";
import { generateDraft, generateIntro, generateSkillDescriptor, listAiSelectables, polishPromptBody, polishPromptBodyWithSummary } from "./ai.js";
import {
  exportPromptsAsSkills,
  importSkillEntries,
  importSkillsFromDisk,
  listAvailableSkills,
  listHarnessSkillToggles,
  listSkillsFromDir,
  parseSkillRaw,
  setHarnessSkillToggle,
  deleteHarnessSkill,
} from "./skills.js";
import {
  createPrompt,
  createTag,
  deletePrompt,
  deleteTag,
  deleteTrash,
  emptyTrash,
  exportPrompts,
  getMetaValue,
  getPersona,
  getSettings,
  importPrompts,
  listPrompts,
  listTags,
  setMetaValue,
  listTrash,
  recordUsage,
  renameTag,
  restorePrompts,
  updatePrompt,
  updateSettings,
} from "./store.js";
import {
  clearAllSkillBindings,
  clearScopePromptBinding,
  clearSessionBinding,
  createSessionPrompt,
  deleteSessionPrompt,
  getCurrentSessionScope,
  getScopeBoundPromptIds,
  getSessionActivePromptIds,
  getSessionPromptsByIds,
  listScopePromptBindings,
  listSessionPrompts,
  resolveSessionPromptBindingIds,
  setScopePromptBinding,
  setSessionActivePrompts,
  setSessionPersonaBindingForSession,
  setSessionPromptBindingForSession,
  updateSessionPrompt,
} from "./session-prompts.js";
import {
  bindPersonaToScope,
  createPersonaWithSoul,
  deletePersonaWithSoul,
  getPersonaForScopePath,
  getPersonaForSession,
  listPersonaViews,
  listScopeTree,
  resolvePersonaForPath,
  resolvePersonaForSession,
  updatePersonaWithContent,
} from "./persona-service.js";
import { clearAllPersonaBindings } from "./session-prompts.js";
import { getActiveSessionCwd, listSessionRecords, listSessionScopeTree } from "./session-scope.js";
import { getVersionInfo } from "./update.js";
import { downloadDir } from "./paths.js";

const PREFIX = "/api/prompt-library";

function json<T>(res: ServerResponse, status: number, body: ApiResponse<T>): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

/** 后端导出序列化：与前端 serializeExport 保持一致的输出，供导出写盘使用。 */
function buildExportFile(
  format: string,
  prompts: Array<{ title: string; body: string; tags?: string[]; summary?: string }>,
): { fileName: string; content: string } | null {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const base = `prompt-library-${stamp}`;
  const csvEscape = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  if (format === "json") {
    // JSON 备份格式：有条目有摘要时写入 summary 字段（缺省省略，保持结构简洁）
    return {
      fileName: `${base}.json`,
      content: JSON.stringify(
        {
          version: 1,
          exportedAt: Date.now(),
          prompts: prompts.map((p) => ({
            title: p.title,
            body: p.body,
            tags: p.tags,
            ...(p.summary ? { summary: p.summary } : {}),
          })),
        },
        null,
        2,
      ),
    };
  }
  if (format === "csv") {
    // CSV：新增 summary 列（有摘要的条目填值，无摘要留空）
    const lines = ["title,body,tags,summary"];
    for (const p of prompts) {
      lines.push(
        `${csvEscape(p.title)},${csvEscape(p.body)},${csvEscape((p.tags ?? []).join("|"))},${csvEscape(p.summary ?? "")}`,
      );
    }
    // 前置 UTF-8 BOM（\uFEFF），避免 Excel 打开中文 CSV 时乱码
    return { fileName: `${base}.csv`, content: "\uFEFF" + lines.join("\r\n") };
  }
  if (format === "md") {
    const parts: string[] = [];
    for (const p of prompts) {
      const tagsLine = p.tags && p.tags.length ? `\n\n标签：${p.tags.join("、")}` : "";
      const summaryLine = p.summary?.trim() ? `\n\n摘要：${p.summary.trim()}` : "";
      parts.push(`# ${p.title}${tagsLine}${summaryLine}\n\n${(p.body ?? "").trim()}`);
    }
    return { fileName: `${base}.md`, content: parts.join("\n\n---\n\n") + "\n" };
  }
  if (format === "txt") {
    const parts: string[] = [];
    for (const p of prompts) {
      const tagsLine = p.tags && p.tags.length ? `\n\n标签：${p.tags.join("、")}` : "";
      const summaryLine = p.summary?.trim() ? `\n\n摘要：${p.summary.trim()}` : "";
      parts.push(`【${p.title}】${tagsLine}${summaryLine}\n\n${(p.body ?? "").trim()}`);
    }
    return { fileName: `${base}.txt`, content: parts.join("\n\n" + "-".repeat(24) + "\n\n") };
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
 * 解析当前工作目录（会话列表提供器 + 最近活跃会话 scope）。
 * 项目级技能导出据此写盘到 <cwd>/.dsh/skills；尚未有任何会话时为 null。
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

/**
 * 目录浏览（自建后端能力）。
 *
 * 新版 DSH 运行时不再稳定提供 `ctx.workspaces` 的 browse / native 能力，
 * 插件的「选择目录」（技能导出路径、扫描文件夹等）因此会判定为不可用。
 * 这里在插件自己的 HTTP 路由上补一套最小目录浏览：列出一层子目录 + 面包屑 + 新建目录。
 */

/** 目录浏览的单条结果。 */
interface DirEntry {
  name: string;
  path: string;
  hidden: boolean;
}

/** 目录浏览结果：当前路径、宿主 home、祖先链与一层子目录。 */
interface DirListing {
  path: string;
  home: string;
  crumbs: DirEntry[];
  entries: DirEntry[];
  truncated: boolean;
}

/** 单次列举的目录上限，超出标记 truncated（防止超大目录拖慢 UI）。 */
const DIR_LIST_LIMIT = 500;

/** Windows 盘符根（C:\）或 POSIX 根（/）。 */
function rootOf(abs: string): string {
  const m = /^([A-Za-z]:[\\/])/.exec(abs);
  if (m) return m[1];
  return "/";
}

/** 把绝对路径拆成祖先链（含根与自身）。 */
function crumbsOf(abs: string): DirEntry[] {
  const root = rootOf(abs);
  // 分隔符跟随根形态：POSIX 用 "/"，Windows 盘符根用 "\"
  const sep = root === "/" ? "/" : "\\";
  const joinSeg = (base: string, part: string): string =>
    /[\\/]$/.test(base) ? `${base}${part}` : `${base}${sep}${part}`;
  const out: DirEntry[] = [{ name: root, path: root, hidden: false }];
  const rest = abs.slice(root.length).replace(/[\\/]+$/, "");
  if (!rest) return out;
  let cur = root;
  for (const part of rest.split(/[\\/]+/)) {
    if (!part) continue;
    cur = joinSeg(cur, part);
    out.push({ name: part, path: cur, hidden: part.startsWith(".") });
  }
  return out;
}

/** 规范化用户传入的路径：相对路径基于 home 解析。 */
function resolveDirInput(input: string | undefined, home: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return home;
  return isAbsolute(raw) ? resolve(raw) : resolve(home, raw);
}

/** 列出指定目录（缺省为 home）的一层子目录，带面包屑。 */
async function listFsDirectory(input?: string): Promise<DirListing> {
  const home = homedir();
  const dir = resolveDirInput(input, home);
  const st = await stat(dir);
  if (!st.isDirectory()) throw new Error(`not a directory: ${dir}`);
  const all = await readdir(dir, { withFileTypes: true });
  const dirs = all
    .filter((d) => {
      if (d.isDirectory()) return true;
      // 符号链接：按目标是否为目录判定（无法判定时不列出）
      if (d.isSymbolicLink()) {
        try {
          return statSync(join(dir, d.name)).isDirectory();
        } catch {
          return false;
        }
      }
      return false;
    })
    .map<DirEntry>((d) => ({
      name: d.name,
      path: join(dir, d.name),
      hidden: d.name.startsWith("."),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return {
    path: dir,
    home,
    crumbs: crumbsOf(dir),
    entries: dirs.slice(0, DIR_LIST_LIMIT),
    truncated: dirs.length > DIR_LIST_LIMIT,
  };
}

/** 在指定父目录下新建子目录，返回新目录绝对路径。 */
async function createFsDirectory(parent: string, name: string): Promise<string> {
  const home = homedir();
  const base = resolveDirInput(parent, home);
  const clean = name.trim().replace(/[\\/]+/g, "");
  if (!clean) throw new Error("invalid directory name");
  const target = join(base, clean);
  await mkdir(target, { recursive: false });
  return target;
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

      // POST /prompts/:id — 记录使用次数
      if (method === "POST" && promptId) {
        const updated = await recordUsage(promptId);
        if (!updated) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: updated });
      }

      // GET /meta/:key — 读取插件级元数据
      if (method === "GET" && segments[0] === "meta" && segments.length === 2) {
        const value = getMetaValue(segments[1] ?? "");
        return json(res, 200, { ok: true, data: { key: segments[1], value } });
      }

      // PUT /meta/:key — 覆写插件级元数据（body: { value }）
      if (method === "PUT" && segments[0] === "meta" && segments.length === 2) {
        const body = await readJsonBody(req);
        const obj = (typeof body === "object" && body !== null ? body : {}) as { value?: unknown };
        const value = typeof obj.value === "string" ? obj.value : "";
        setMetaValue(segments[1] ?? "", value);
        return json(res, 200, { ok: true, data: { key: segments[1], value } });
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
        const obj = (typeof body === "object" && body !== null ? body : {}) as {
          ids?: unknown;
          format?: unknown;
          /** 目标目录；缺省写入系统「下载」目录。由前端目录选择器给出。 */
          dir?: unknown;
        };
        const ids = Array.isArray(obj.ids) ? obj.ids.filter((x): x is string => typeof x === "string") : undefined;
        const format = typeof obj.format === "string" ? obj.format : "json";
        const data = await exportPrompts(ids && ids.length > 0 ? ids : undefined);
        const file = buildExportFile(
          format,
          data.prompts.map((p) => ({ title: p.title, body: p.body, tags: p.tags, summary: p.summary })),
        );
        if (!file) return json(res, 400, { ok: false, error: "bad request" });
        // 目标目录：前端传入的用户选择目录优先，否则回落系统下载目录
        const requested = typeof obj.dir === "string" ? obj.dir.trim() : "";
        const dir = requested ? requested : downloadDir();
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
        try {
          await mkdir(dir, { recursive: true });
          await writeFile(target, file.content, "utf8");
        } catch (e) {
          // 目标目录不可写 / 路径非法时给出明确错误，前端直接提示
          return json(res, 400, {
            ok: false,
            error: `write failed: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
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

      // GET /fs/list?path= — 目录浏览：列出一层子目录 + 面包屑（自建能力，不依赖宿主 workspaces）
      if (method === "GET" && tail === "/fs/list") {
        const path = new URL(req.url ?? "/", "http://localhost").searchParams.get("path") ?? "";
        try {
          return json(res, 200, { ok: true, data: await listFsDirectory(path || undefined) });
        } catch (e) {
          return json(res, 400, {
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // POST /fs/mkdir — 在指定父目录下新建子目录（目录选择弹窗「新建文件夹」）
      if (method === "POST" && tail === "/fs/mkdir") {
        const b = await readJsonBody(req);
        const parent =
          typeof b === "object" && b !== null && typeof (b as { path?: unknown }).path === "string"
            ? (b as { path: string }).path
            : "";
        const name =
          typeof b === "object" && b !== null && typeof (b as { name?: unknown }).name === "string"
            ? (b as { name: string }).name
            : "";
        if (!name.trim()) return json(res, 400, { ok: false, error: "invalid body: {path, name}" });
        try {
          const data = await createFsDirectory(parent, name);
          return json(res, 200, { ok: true, data: { path: data } });
        } catch (e) {
          return json(res, 400, {
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          });
        }
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
      //     body.rootPath 为用户手动填写的项目路径（未自动解析到当前项目时由前端传入）。
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
            : "global";
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
        const result = await exportPromptsAsSkills(entries, exportRoot);
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

      // POST /skills/harness/delete — 删除某个 harness 技能（删除其技能根目录下的整个目录）。
      if (method === "POST" && tail === "/skills/harness/delete") {
        const body = await readJsonBody(req);
        const id =
          typeof body === "object" &&
          body !== null &&
          typeof (body as { id?: unknown }).id === "string"
            ? (body as { id: string }).id.trim()
            : "";
        if (!id) return json(res, 400, { ok: false, error: "invalid body: {id: string}" });
        try {
          const deleted = await deleteHarnessSkill(id);
          if (!deleted) return json(res, 404, { ok: false, error: "skill not found" });
          return json(res, 200, { ok: true, data: { id } });
        } catch (e) {
          return json(res, 400, { ok: false, error: e instanceof Error ? e.message : String(e) });
        }
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
      // withSummary：是否同时生成用途摘要（AI 优化后显示摘要时开启）
      if (method === "POST" && tail === "/ai/polish") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null || typeof (raw as { body: string }).body !== "string") {
          return json(res, 400, { ok: false, error: "invalid body: {body: string}" });
        }
        const body = (raw as { body: string }).body;
        if (!body.trim()) return json(res, 400, { ok: false, error: "body empty" });
        const keepVariables = (raw as { keepVariables?: boolean }).keepVariables !== false;
        const withSummary = (raw as { withSummary?: boolean }).withSummary === true;
        const settings = await getSettings();
        if (withSummary) {
          const result = await polishPromptBodyWithSummary(body, settings, { keepVariables });
          if (result === undefined) {
            return json(res, 503, { ok: false, error: "AI 不可用或优化失败，请确认已连接 LLM 服务" });
          }
          return json(res, 200, { ok: true, data: result });
        }
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
        if ((kind !== "skill" && kind !== "soul") || typeof title !== "string" || !title.trim()) {
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

      // GET /version — 服务端/客户端版本比对信息（运行版本 + 磁盘已安装版本）
      if (method === "GET" && tail === "/version") {
        return json(res, 200, { ok: true, data: getVersionInfo() });
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

      // ── 多人格（自定义 SOUL，按工作区/项目/会话切换）──────────────────────

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
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
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

      // DELETE /personas/scopes/bindings/all — 一键清空人格绑定（所有路径 + 会话的人格绑定，技能不受影响）
      if (method === "DELETE" && segments[0] === "personas" && segments[1] === "scopes" && segments[2] === "bindings" && segments[3] === "all" && segments.length === 4) {
        clearAllPersonaBindings();
        return json(res, 200, { ok: true, data: { cleared: true } });
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
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
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

      // DELETE /session-prompts/bindings/all — 一键清空技能绑定（所有路径 + 会话的技能绑定，人格不受影响）
      if (method === "DELETE" && segments[0] === "session-prompts" && segments[1] === "bindings" && segments[2] === "all" && segments.length === 3) {
        clearAllSkillBindings();
        return json(res, 200, { ok: true, data: { cleared: true } });
      }

      // DELETE /session-prompts/bindings?path= — 清除某路径的绑定
      if (method === "DELETE" && segments[0] === "session-prompts" && segments[1] === "bindings" && segments.length === 2) {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
        const path = q.get("path") ?? "";
        if (!path) return json(res, 400, { ok: false, error: "invalid query: path" });
        clearScopePromptBinding(path);
        return json(res, 200, { ok: true, data: { cleared: true } });
      }

      // GET /session-prompts/current-scope — 读取最近活跃的会话 scope（「当前会话」Tab 用）
      if (method === "GET" && segments[0] === "session-prompts" && segments[1] === "current-scope" && segments.length === 2) {
        return json(res, 200, { ok: true, data: { scope: getCurrentSessionScope() } });
      }

      // GET /session-prompts/diag?sessid= — 会话解析诊断（排查「设了技能却没按设置生效」用）。
      // 复现组装端同一套解析逻辑，展示该会话当前会命中哪一层（会话绑定/工作区/项目/默认）：
      // 后端可从 registerSessionListProvider 缓存拿到每个会话的 header.cwd，无需注入宿主的 sessionQuery。
      if (method === "GET" && segments[0] === "session-prompts" && segments[1] === "diag" && segments.length === 2) {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
        const sessid = (q.get("sessid") ?? "").trim() || getCurrentSessionScope() || "";
        const records = await listSessionRecords();
        const rec = records.find((r) => r.id === sessid);
        // 优先用组装端记录的运行时 cwd（与解析同一来源），避免依赖 sessionQuery 未注入导致误判「无 cwd」
        const cwd = getActiveSessionCwd(sessid) || rec?.cwd || "";
        // 人格（只读展示）：会话绑定 → 工作区/项目路径（最深祖先）→ 默认
        const sessionPersona = sessid ? getPersonaForSession(sessid) : "";
        const pathPersona = resolvePersonaForPath(cwd || null);
        const personaId = resolvePersonaForSession(sessid || null, cwd || null);
        const personaSource = sessionPersona ? "session" : pathPersona ? "path" : "default";
        const personaName =
          (personaId && getPersona(personaId)?.name) ||
          (personaSource === "default" ? "默认人格（default）" : "");
        // 技能：临时注入优先 + 持久绑定（会话优先、路径回退），合并去重
        const activeIds = sessid ? getSessionActivePromptIds(sessid) : [];
        const persistentIds = resolveSessionPromptBindingIds(sessid || null, cwd || null);
        const seen = new Set<string>();
        const promptIds: string[] = [];
        for (const id of [...activeIds, ...persistentIds]) {
          if (!seen.has(id)) {
            seen.add(id);
            promptIds.push(id);
          }
        }
        const promptTitles = getSessionPromptsByIds(promptIds).map((p) => p.title);
        // 解析用的 cwd 上溯链路（展示「当前工作目录是否命中绑定」的依据）
        const checkedPaths: string[] = [];
        if (cwd) {
          let cur = cwd.replace(/\\/g, "/").trim();
          while (cur.length > 1 && cur.endsWith("/")) cur = cur.slice(0, -1);
          if (process.platform === "win32") cur = cur.toLowerCase();
          for (;;) {
            checkedPaths.push(cur);
            const idx = cur.lastIndexOf("/");
            if (idx <= 0) break;
            cur = cur.slice(0, idx);
          }
          if (!checkedPaths.includes("/")) checkedPaths.push("/");
        }
        return json(res, 200, {
          ok: true,
          data: {
            sessid,
            cwd,
            personaId: personaId ?? "",
            personaName,
            personaSource,
            promptIds,
            promptTitles,
            activeCount: activeIds.length,
            checkedPaths,
          },
        });
      }

      // GET /session-prompts/active?scope= — 读取某会话 scope 的临时注入技能 id 列表
      if (method === "GET" && segments[0] === "session-prompts" && segments[1] === "active" && segments.length === 2) {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
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

      // PUT /session-prompts/session/persona {sessionId, personaId} — 设置某会话持久绑定的人格
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
        // 注意：tail 已在 parseTail 中去掉了 query（仅保留 pathname），此处需从原始 req.url 解析查询参。
        const raw = req.url ?? "";
        const q = new URLSearchParams(raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "");
        const sessionId = q.get("sessionId") ?? "";
        if (!sessionId) return json(res, 400, { ok: false, error: "invalid query: sessionId" });
        clearSessionBinding(sessionId);
        return json(res, 200, { ok: true, data: { cleared: true } });
      }

      return json(res, 404, { ok: false, error: `no route ${method} ${tail}` });
    } catch (err) {
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