/**
 * DSH 技能生成模块。
 *
 * 把勾选的提示词批量封装成 DSH 技能，写入
 * ~/.dsh/skills/<name>/SKILL.md：
 * - name 为小写 kebab-case 英文（AI 依据内容生成，作为目录名 & 聊天框 /触发名）；
 * - description / whenToUse 由 AI 依据提示词内容生成（描述含触发场景）；
 * - 技能正文（body）即 SKILL.md 的正文内容。
 *
 * 逐个处理，任何单条失败都不中断其余条目，返回成功/失败汇总。
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getSettings, listPrompts, getSkillNameForPrompt, setSkillNameForPrompt } from "./store.js";
import { isAiAvailable, generateSkillDescriptor } from "./ai.js";
import { dshHome } from "../utils/paths.js";

/** 技能根目录：~/.dsh/skills/ */
export function skillsRoot(): string {
  return join(dshHome(), "skills");
}

/** 单个生成结果。 */
export interface GeneratedSkill {
  title: string;
  name: string;
}

/** 批量生成结果：成功条数 + 成功清单 + 失败清单。 */
export interface GenerateSkillsResult {
  generated: number;
  items: GeneratedSkill[];
  errors: { title: string; reason: string }[];
  /** 是否为「AI 不可用」整体失败（此时未生成任何技能）。 */
  aiUnavailable: boolean;
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

/** 依据提示词标题生成的 kebab-case 兜底名；为空（如纯中文标题）时用固定名，保证兜底名合法唯一。 */
function fallbackName(title: string, index: number): string {
  const slug = toKebab(title || "");
  return slug || `prompt-skill-${index + 1}`;
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

/** 技能正文：正文若含 {{}} 占位符，则在其后追加「运行时按语义自动补全」的说明段落。 */
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

/**
 * 批量把指定提示词生成为 DSH 技能并写入磁盘。
 * 逐条调用 AI 生成技能名/描述，串行执行（复用 llm 串行锁）。
 * 任一提示词 AI 失败则跳过并计入 errors，不中断其余条目。
 */
export async function generateSkillsFromPrompts(ids: string[]): Promise<GenerateSkillsResult> {
  if (ids.length === 0) return { generated: 0, items: [], errors: [], aiUnavailable: false };
  if (!isAiAvailable()) {
    return {
      generated: 0,
      items: [],
      errors: ids.map(() => ({ title: "", reason: "AI 服务不可用" })),
      aiUnavailable: true,
    };
  }

  const all = await listPrompts();
  const targets = all.filter((p) => ids.includes(p.id));
  const settings = await getSettings();

  const items: GeneratedSkill[] = [];
  const errors: { title: string; reason: string }[] = [];

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i]!;
    const title = p.title || "(未命名)";
    try {
      const desc = await generateSkillDescriptor(
        { title: p.title, body: p.body, summary: p.summary, tags: p.tags },
        settings,
      );
      // 优先复用该提示词上次已关联的技能名：二次生成时覆盖写盘，不会无限新增目录；
      // 仅当未关联过（首次生成）才采用本次 AI 生成的名字并持久化关联。
      const linked = getSkillNameForPrompt(p.id);
      const name = linked
        ? linked
        : toKebab(desc?.name ?? "") || fallbackName(title, i);
      const description = desc?.description?.trim() || p.summary?.trim() || "";
      const whenToUse = desc?.whenToUse?.trim() || "";

      setSkillNameForPrompt(p.id, name);

      const dir = join(skillsRoot(), name);
      await mkdir(dir, { recursive: true });

      const fm: string[] = ["---", `name: ${name}`];
      if (description) fm.push(foldDescription(description));
      else fm.push('description: ""');
      if (whenToUse) fm.push(`whenToUse: ${JSON.stringify(whenToUse)}`);
      fm.push("---");

      const md = [...fm, "", buildSkillBody(p.body), ""].join("\n");
      await writeFile(join(dir, "SKILL.md"), md, "utf8");

      items.push({ title, name });
    } catch (e) {
      errors.push({ title, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  return { generated: items.length, items, errors, aiUnavailable: false };
}