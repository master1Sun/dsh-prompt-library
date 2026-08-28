/**
 * DSH 技能导入 / 导出模块（不依赖 AI）。
 *
 * - 导入：扫描 ~/.dsh/skills/<name>/SKILL.md 或本地 md 文件，
 *   解析为可编辑条目，用户编辑校验后生成为提示词入库（逆向导入）；
 * - 导出：把用户编辑后的技能条目写盘为 DSH 技能
 *   ~/.dsh/skills/<name>/SKILL.md（name 为小写 kebab-case，缺省由标题生成）。
 *
 * 逐个处理，任何单条失败都不中断其余条目，返回成功/失败汇总。
 */
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { load } from "js-yaml";
import {
  createPrompt,
  getMetaValue,
  getPromptIdBySkillName,
  getSkillNameForPrompt,
  setMetaValue,
  setSkillNameForPrompt,
  updatePrompt,
} from "./store.js";
import {
  createSessionPrompt,
  getSessionBoundPromptIds,
  setSessionPromptBindingForSession,
} from "./session-prompts.js";
import { dshHome } from "./paths.js";
import { mdToPlainText } from "../md-text.js";

/** 技能根目录：~/.dsh/skills/ */
export function skillsRoot(): string {
  return join(dshHome(), "skills");
}

/** 把任意字符串收敛为合法的小写 kebab-case（仅字母/数字/连字符）；结果为空时返回空串。 */
function toKebab(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** 把多行描述折叠为 YAML `>` 块（延续行加两个空格缩进）；空文本返回双引号空字符串。 */
function foldDescription(desc: string): string {
  const trimmed = desc.trim();
  if (!trimmed) return 'description: ""';
  const lines = trimmed.split("\n").map((l) => `  ${l}`);
  return `description: >\n${lines.join("\n")}`;
}

/** 技能正文：原样写入，不含「模板变量自动补全」等附加说明（技能内不携带变量占位符描述）。 */
function buildSkillBody(body: string): string {
  return body.trim();
}

// ── Skill → 提示词 逆向导入 ────────────────────────────────────────────────

/** 逆向导入的汇总结果。 */
export interface SkillImportResult {
  /** 新增入库的提示词数量。 */
  imported: number;
  /** 更新已有提示词的数量（同名技能已存在时覆盖正文/摘要）。 */
  updated: number;
  /** 因缺少正文而跳过的技能数量。 */
  skipped: number;
  /** 成功 / 跳过的技能清单（status：imported 新增 / updated 覆盖 / skipped 正文为空跳过）。 */
  items: { title: string; name: string; status: "imported" | "updated" | "skipped" }[];
  /** 失败清单（目录不存在、SKILL.md 缺失、读取失败等）。 */
  errors: { name: string; reason: string }[];
}

/** 把 kebab-case / snake_case 技能名转成可读标题（如 prompt-writing → Prompt Writing）；空名返回空串，由前端按语言兜底。 */
function toReadableTitle(name: string): string {
  const words = name
    .trim()
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean);
  if (words.length === 0) return "";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/**
 * 解析 SKILL.md：剥离 `---` frontmatter（name/description/whenToUse）+ 正文。
 * 文件不以 `---` 开头时把整篇当作正文处理，保证任意 Markdown 都能导入。
 */
function parseSkillFile(raw: string): {
  name?: string;
  description?: string;
  whenToUse?: string;
  body: string;
} {
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text.split("\n");
  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
    if (end > 0) {
      const fmText = lines.slice(1, end).join("\n");
      const body = lines.slice(end + 1).join("\n").trim();
      let fm: Record<string, unknown> = {};
      try {
        const parsed = load(fmText);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          fm = parsed as Record<string, unknown>;
        }
      } catch {
        fm = {};
      }
      return {
        name: typeof fm.name === "string" ? fm.name.trim() : undefined,
        description: typeof fm.description === "string" ? fm.description.trim() : undefined,
        whenToUse: typeof fm.whenToUse === "string" ? fm.whenToUse.trim() : undefined,
        body,
      };
    }
  }
  return { body: text.trim() };
}

/** 待逆向导入的单条技能条目（用户在弹窗中勾选、可编辑后提交保存）。 */
export interface SkillEntry {
  /** 技能名（kebab-case），用于与 prompt_skill_links 关联；缺省由标题生成。 */
  name?: string;
  title: string;
  body: string;
  summary?: string;
  /** 来源提示词 id（导出技能写盘时存在，用于复用已关联的技能名）。 */
  promptId?: string;
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

/** 扫描技能目录，解析每个 SKILL.md 为可编辑条目（只读，不写库）。 */
export async function listAvailableSkills(): Promise<SkillSource[]> {
  const dir = skillsRoot();
  let names: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    names = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
  const out: SkillSource[] = [];
  for (const name of names) {
    const skillName = toKebab(name) || name;
    const skillFile = join(dir, name, "SKILL.md");
    let raw: string;
    try {
      raw = await readFile(skillFile, "utf8");
    } catch {
      continue;
    }
    const parsed = parseSkillFile(raw);
    const body = mdToPlainText(parsed.body);
    if (!body) continue;
    out.push({
      name: skillName,
      title: toReadableTitle(parsed.name || name),
      body,
      summary: parsed.description || "",
      exists: Boolean(getPromptIdBySkillName(skillName)),
    });
  }
  return out;
}

/** 递归扫描任意指定目录下的 *.md 文件，解析为可导入的技能条目（只读，不写库）。
 * 单目录 / 单文件读取失败时跳过，不中断整体扫描；目录不存在 / 无权限返回空数组。 */
export async function listSkillsFromDir(dir: string): Promise<SkillSource[]> {
  const out: SkillSource[] = [];
  const walk = async (d: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    if (!entries) return;
    for (const ent of entries) {
      if (ent.isDirectory()) {
        await walk(join(d, ent.name));
      } else if (ent.isFile() && /\.md$/i.test(ent.name)) {
        const base = ent.name.replace(/\.md$/i, "");
        try {
          const raw = await readFile(join(d, ent.name), "utf8");
          const parsed = parseSkillFile(raw);
          const body = mdToPlainText(parsed.body);
          if (!body) continue;
          const skillName = toKebab(parsed.name || base) || toKebab(base);
          out.push({
            name: skillName,
            title: toReadableTitle(parsed.name || base),
            body,
            summary: parsed.description || "",
            exists: Boolean(getPromptIdBySkillName(skillName)),
          });
        } catch {
          /* 单个文件读取失败跳过 */
        }
      }
    }
  };
  await walk(dir);
  return out;
}

/** 解析一段 md 原始文本（frontmatter + 正文）为可编辑条目（供「选择本地 md 文件」导入）。 */
export function parseSkillRaw(raw: string): {
  title: string;
  body: string;
  summary: string;
} {
  const parsed = parseSkillFile(raw);
  return {
    title: toReadableTitle(parsed.name || ""),
    body: mdToPlainText(parsed.body),
    summary: parsed.description || "",
  };
}

/**
 * 批量把用户编辑后的技能条目生成为提示词入库（逆向导入保存入口）。
 * - 标题取条目标题；正文即条目正文；摘要取条目摘要；
 * - 带固定标签「skill」便于筛选；
 * - 同名技能（已通过 prompt_skill_links 关联）重复导入时覆盖更新，不重复新增。
 * 逐个处理，任何单条失败都不中断其余条目。
 */
export async function importSkillEntries(entries: SkillEntry[]): Promise<SkillImportResult> {
  const items: { title: string; name: string; status: "imported" | "updated" | "skipped" }[] = [];
  const errors: { name: string; reason: string }[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const body = entry.body.trim();
    // 标题由前端保证非空（本地化兜底）；这里仅去掉首尾空白
    const title = entry.title.trim();
    const skillName = (entry.name ? toKebab(entry.name) : toKebab(title)) || `skill-${i + 1}`;
    if (!body) {
      skipped++;
      items.push({ title: title || "(未命名)", name: skillName, status: "skipped" });
      continue;
    }
    const summary = entry.summary?.trim() || "";
    try {
      const existingId = getPromptIdBySkillName(skillName);
      if (existingId) {
        await updatePrompt(existingId, { title, body, summary, tags: ["skill"] });
        updated++;
        items.push({ title, name: skillName, status: "updated" });
      } else {
        const prompt = await createPrompt({ title, body, tags: ["skill"], summary });
        setSkillNameForPrompt(prompt.id, skillName);
        imported++;
        items.push({ title, name: skillName, status: "imported" });
      }
    } catch (e) {
      errors.push({ name: title, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  return { imported, updated, skipped, items, errors };
}

/**
 * 逆向导入：读取 ~/.dsh/skills/<name>/SKILL.md，把每个技能生成为一条提示词入库。
 * 等价于「扫描全部可导入条目后直接 importSkillEntries」；
 * 弹窗导入走 listAvailableSkills + 用户编辑 + importSkillEntries，本函数供一键导入兜底。
 */
export async function importSkillsFromDisk(): Promise<SkillImportResult> {
  const sources = await listAvailableSkills();
  if (sources.length === 0) {
    return { imported: 0, updated: 0, skipped: 0, items: [], errors: [] };
  }
  return importSkillEntries(
    sources.map((s) => ({ name: s.name, title: s.title, body: s.body, summary: s.summary })),
  );
}

// ── 提示词 → 技能 导出写盘 ──────────────────────────────────────────────

/** 批量导出技能的结果：成功条数 + 成功清单 + 失败清单。 */
export interface SkillExportResult {
  /** 成功写盘的技能数量。 */
  exported: number;
  /** 实际导出位置（目录），供前端结果通知展示导出路径。 */
  root: string;
  /** 成功写盘的技能清单。 */
  items: { title: string; name: string }[];
  /** 失败清单（正文为空 / 写盘失败等）。 */
  errors: { title: string; reason: string }[];
}

/**
 * 批量把用户编辑后的技能条目写盘为 DSH 技能（root 缺省为 ~/.dsh/skills/<name>/SKILL.md）。
 * - name 为小写 kebab-case；缺省由标题生成；若该提示词已关联过技能名则优先复用，
 *   避免同一提示词二次导出时新建目录；
 * - frontmatter 记录 name / description（取摘要）；
 * - 正文即条目正文，原样写入（不附加「模板变量自动补全」等说明）；
 * 逐个处理，任何单条失败都不中断其余条目。
 */
export async function exportPromptsAsSkills(entries: SkillEntry[], root?: string): Promise<SkillExportResult> {
  const items: { title: string; name: string }[] = [];
  const errors: { title: string; reason: string }[] = [];
  const dirRoot = root ?? skillsRoot();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const title = entry.title.trim() || "(未命名)";
    const body = entry.body.trim();
    if (!body) {
      errors.push({ title, reason: "正文为空，无法导出技能" });
      continue;
    }
    // 复用提示词已关联的技能名：二次导出时覆盖写盘，不会无限新增目录
    const linked = entry.promptId ? getSkillNameForPrompt(entry.promptId) : undefined;
    const name =
      linked ||
      toKebab(entry.name || "") ||
      toKebab(title) ||
      `prompt-skill-${i + 1}`;
    const description = entry.summary?.trim() || "";
    try {
      const dir = join(dirRoot, name);
      await mkdir(dir, { recursive: true });
      const fm: string[] = ["---", `name: ${name}`];
      fm.push(foldDescription(description));
      fm.push("---");
      const md = [...fm, "", buildSkillBody(body), ""].join("\n");
      await writeFile(join(dir, "SKILL.md"), md, "utf8");
      if (entry.promptId) setSkillNameForPrompt(entry.promptId, name);
      items.push({ title, name });
    } catch (e) {
      errors.push({ title, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  return { exported: items.length, items, errors, root: dirRoot };
}

/**
 * 私有导出：把条目创建为「会话级技能」（元信息 + 正文均入库，自动绑定到指定会话 id），
 * 并自动绑定到指定会话 id（若提供），实现仅该会话注入的私有效果。
 * 不写盘任何文件，返回结构中的 root 为空串（前端据此不展示导出位置）。
 * 返回结构与写盘导出一致（name 存会话级技能的 id，供前端展示定位）。
 */
export async function exportAsSessionPrompts(
  entries: SkillEntry[],
  sessionId: string | null | undefined,
): Promise<SkillExportResult> {
  const items: { title: string; name: string }[] = [];
  const errors: { title: string; reason: string }[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const title = entry.title.trim() || "(未命名)";
    const body = entry.body.trim();
    if (!body) {
      errors.push({ title, reason: "正文为空，无法导出技能" });
      continue;
    }
    try {
      const prompt = createSessionPrompt({ title, body });
      // 绑定到当前会话：追加 id 并去重（保留既有绑定）
      if (typeof sessionId === "string" && sessionId) {
        const next = [...new Set([...getSessionBoundPromptIds(sessionId), prompt.id])];
        setSessionPromptBindingForSession(sessionId, next);
      }
      items.push({ title, name: prompt.id });
    } catch (e) {
      errors.push({ title, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  return { exported: items.length, items, errors, root: "" };
}

// ── Harness 技能软控制（~/.dsh/skills 系统技能 + 项目 .dsh/skills 技能）──────
//
// 这些技能由 harness 在会话开头自动注入，插件无法硬性移除，只能做「软控制」：
// - 每项技能记录「启用开关」（默认启用，仅持久化被关闭的项）；
// - 把已禁用的技能清单作为一条指令注入系统提示，靠模型遵循「别自动使用它们」。
// 开关存于数据库 meta 表（key = pl:harness-skill-toggles，值 = {<技能目录>: false}）。

/** meta 表中存储 harness 技能开关 map 的键（值：技能目录绝对路径 → enabled，仅保留 false）。 */
const HARNESS_SKILL_TOGGLE_KEY = "pl:harness-skill-toggles";

/** 读取全部 harness 技能开关 map（失败返回空对象，视为全部默认启用）。 */
function readSkillToggles(): Record<string, boolean> {
  const raw = getMetaValue(HARNESS_SKILL_TOGGLE_KEY);
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/** 持久化完整开关 map（幂等覆盖；与控制逻辑解耦，操作失败静默）。 */
function writeSkillToggles(map: Record<string, boolean>): void {
  setMetaValue(HARNESS_SKILL_TOGGLE_KEY, JSON.stringify(map));
}

/** 目录是否存在且为文件夹。 */
async function dirExists(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

/** 扫描某个技能根目录下的目录型技能（<name>/SKILL.md），返回可开关的条目。 */
interface ScanSkillDirEntry {
  /** 技能目录绝对路径（作为开关的唯一 id，也用于按归属前缀过滤）。 */
  id: string;
  name: string;
  title: string;
  summary: string;
}
async function scanSkillRootForToggles(root: string): Promise<ScanSkillDirEntry[]> {
  let names: string[] = [];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    names = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
  const out: ScanSkillDirEntry[] = [];
  for (const name of names) {
    const skillName = toKebab(name) || name;
    let raw: string;
    try {
      raw = await readFile(join(root, name, "SKILL.md"), "utf8");
    } catch {
      continue;
    }
    const parsed = parseSkillFile(raw);
    if (!parsed.body.trim()) continue;
    out.push({
      id: join(root, name),
      name: skillName,
      title: toReadableTitle(parsed.name || name),
      summary: parsed.description || "",
    });
  }
  return out;
}

/** 单条 harness 技能及其开关状态（供前端开关弹窗展示/勾选）。 */
export interface HarnessSkillItem {
  /** 技能目录绝对路径（唯一 id，开关回写时原样返回）。 */
  id: string;
  /** 归属：system（~/.dsh/skills）/ project（<项目>/.dsh/skills）。 */
  scope: "system" | "project";
  /** kebab-case 技能名。 */
  name: string;
  /** 可读标题。 */
  title: string;
  /** 摘要（description），可能为空。 */
  summary: string;
  /** 技能根目录（~/.dsh/skills 或 <项目>/.dsh/skills）。 */
  root: string;
  /** 当前是否启用。 */
  enabled: boolean;
}

/**
 * 列出 system（~/.dsh/skills）与当前项目（<projectRoot>/.dsh/skills）的 harness 技能及其开关状态。
 * 项目技能根目录不存在时该项目清单为空；projectRoot 为空时只列系统技能。
 */
export async function listHarnessSkillToggles(projectRoot: string | null | undefined): Promise<HarnessSkillItem[]> {
  const toggles = readSkillToggles();
  const items: HarnessSkillItem[] = [];
  const pushEntries = async (root: string, scope: "system" | "project"): Promise<void> => {
    if (!(await dirExists(root))) return;
    for (const e of await scanSkillRootForToggles(root)) {
      items.push({
        id: e.id,
        scope,
        name: e.name,
        title: e.title,
        summary: e.summary,
        root,
        enabled: toggles[e.id] !== false,
      });
    }
  };
  await pushEntries(skillsRoot(), "system");
  if (projectRoot) {
    await pushEntries(join(projectRoot, ".dsh", "skills"), "project");
  }
  return items;
}

/** 更新某 harness 技能的开关（enabled=true 移除记录还原默认，false 记录为禁用）。 */
export function setHarnessSkillToggle(id: string, enabled: boolean): void {
  const map = readSkillToggles();
  if (enabled) delete map[id];
  else map[id] = false;
  writeSkillToggles(map);
}

/** 路径归一化（用于归属前缀匹配：正斜杠 + 小写）。 */
function normalizeForInjection(p: string): string {
  return p.replace(/\\/g, "/").toLowerCase();
}

/**
 * 组装「已禁用的 harness 技能」指令段落（软控制）：
 * - 系统技能（~/.dsh/skills 下）全程适用，一律罗列；
 * - 项目技能仅在当前工作目录 cwd 命中其 `cwd/.dsh/skills` 时才罗列；
 * - 没有任何禁用技能时返回空串（不注入）。
 * 仅罗列名称，不写任何 {{}} 占位符（避免宿主模板校验）。
 */
export function disabledHarnessSkillsInstruction(cwd: string | null | undefined): string {
  const map = readSkillToggles();
  const disabled = Object.keys(map).filter((id) => map[id] === false);
  if (disabled.length === 0) return "";
  const sysPrefix = normalizeForInjection(skillsRoot()) + "/";
  const projPrefix = cwd ? normalizeForInjection(join(cwd, ".dsh", "skills")) + "/" : "";
  const rel: string[] = [];
  for (const id of disabled) {
    const norm = normalizeForInjection(id);
    if (norm.startsWith(sysPrefix)) {
      rel.push(basename(norm));
    } else if (projPrefix && norm.startsWith(projPrefix)) {
      rel.push(`${basename(norm)}（项目技能）`);
    }
  }
  if (rel.length === 0) return "";
  return [
    "【技能软控制 · 用户已禁用的技能】以下技能当前被用户禁用，除非用户明确要求，否则不要调用或使用它们：",
    rel.map((n) => `· ${n}`).join("\n"),
  ].join("\n");
}