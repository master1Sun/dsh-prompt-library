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
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { load } from "js-yaml";
import {
  createPrompt,
  getPromptIdBySkillName,
  getSkillNameForPrompt,
  setSkillNameForPrompt,
  updatePrompt,
} from "../data/store.js";
import { dshHome } from "../../utils/paths.js";

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

/** 提取正文中出现的模板变量名（{{变量}} 内去空白、去重、按出现顺序）。 */
function extractVars(body: string): string[] {
  const vars: string[] = [];
  const seen = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
    const v = m[1]!.trim();
    if (v && !seen.has(v)) {
      seen.add(v);
      vars.push(v);
    }
  }
  return vars;
}

/** 技能正文：正文若含 {{}} 占位符，则在其后追加「运行时按语义自动补全」的注意提示事项（保留生成 SKILL.md 时的说明）。 */
function buildSkillBody(body: string): string {
  const content = body.trim();
  const vars = extractVars(content);
  if (vars.length === 0) return content;
  const list = vars.map((v) => `{{${v}}}`).join("、");
  const note =
    `\n\n## 模板变量自动补全\n` +
    `正文包含以下模板变量：${list}。` +
    `使用时请依据用户的当前语义场景，结合上下文自动推断并补全每个 {{变量名}} 的实际内容，` +
    `直接用补全后的结果执行本技能流程；除非变量语义确实不明确，否则不要询问用户，也不要保留空占位符。`;
  return `${content}${note}`;
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
  /** 成功处理的技能清单。 */
  items: { title: string; name: string }[];
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
    const body = parsed.body.trim();
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

/** 解析一段 md 原始文本（frontmatter + 正文）为可编辑条目（供「选择本地 md 文件」导入）。 */
export function parseSkillRaw(raw: string): {
  title: string;
  body: string;
  summary: string;
} {
  const parsed = parseSkillFile(raw);
  return {
    title: toReadableTitle(parsed.name || ""),
    body: parsed.body.trim(),
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
  const items: { title: string; name: string }[] = [];
  const errors: { name: string; reason: string }[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const body = entry.body.trim();
    if (!body) {
      skipped++;
      continue;
    }
    // 标题由前端保证非空（本地化兜底）；这里仅去掉首尾空白
    const title = entry.title.trim();
    const skillName = (entry.name ? toKebab(entry.name) : toKebab(title)) || `skill-${i + 1}`;
    const summary = entry.summary?.trim() || "";
    try {
      const existingId = getPromptIdBySkillName(skillName);
      if (existingId) {
        await updatePrompt(existingId, { title, body, summary, tags: ["skill"] });
        updated++;
      } else {
        const prompt = await createPrompt({ title, body, tags: ["skill"], summary });
        setSkillNameForPrompt(prompt.id, skillName);
        imported++;
      }
      items.push({ title, name: skillName });
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
  /** 成功写盘的技能清单。 */
  items: { title: string; name: string }[];
  /** 失败清单（正文为空 / 写盘失败等）。 */
  errors: { title: string; reason: string }[];
}

/**
 * 批量把用户编辑后的技能条目写盘为 DSH 技能（~/.dsh/skills/<name>/SKILL.md）。
 * - name 为小写 kebab-case；缺省由标题生成；若该提示词已关联过技能名则优先复用，
 *   避免同一提示词二次导出时新建目录；
 * - frontmatter 记录 name / description（取摘要）；
 * - 正文即条目正文；正文含 {{变量名}} 时在底部追加「模板变量自动补全」注意提示事项，
 *   与批量生成 SKILL.md 时的说明保持一致（无模板变量则原样写入）。
 * 逐个处理，任何单条失败都不中断其余条目。
 */
export async function exportPromptsAsSkills(entries: SkillEntry[]): Promise<SkillExportResult> {
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
    // 复用提示词已关联的技能名：二次导出时覆盖写盘，不会无限新增目录
    const linked = entry.promptId ? getSkillNameForPrompt(entry.promptId) : undefined;
    const name =
      linked ||
      toKebab(entry.name || "") ||
      toKebab(title) ||
      `prompt-skill-${i + 1}`;
    const description = entry.summary?.trim() || "";
    try {
      const dir = join(skillsRoot(), name);
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

  return { exported: items.length, items, errors };
}