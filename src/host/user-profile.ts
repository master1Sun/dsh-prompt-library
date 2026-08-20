/**
 * Host 侧用户画像持久化。
 *
 * 在 DSH_HOME（默认 ~/.dsh）下读写独立的用户画像文件
 *（prompt-library-user.md，Markdown 形式，便于人工阅读与编辑）。
 * 画像随每次 AI 自学习持续累积，实现「越学越聪明」：
 * - 累积写作风格/领域/偏好摘要
 * - 统计高频主题（标签频次）
 * - 记录最近学习的提示词样本（供后续 AI 调用参考）
 *
 * 旧版 JSON 迁移逻辑已移除，仅保留 Markdown 实现。
 * 与提示词存储一样，通过单管道读-修改-写队列串行化访问。
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { UserProfile } from "../types.js";

const DEFAULT_DSH_HOME = join(homedir(), ".dsh");

/** 摘要最长字符数，超出时裁剪最旧的行。 */
const MAX_SUMMARY_CHARS = 1500;
/** 摘要最多保留的行数（只保留核心重点，防止无意义累积）。 */
const MAX_SUMMARY_LINES = 8;
/** 画像保留的主题数量上限（按频次）。 */
const MAX_TOPICS = 50;
/** 画像保留的最近样本数量上限。 */
const MAX_SAMPLES = 8;
/** 样本正文的存储截断长度：只保留开头的主旨作为记忆锚点，不存大段内容。 */
const SAMPLE_BODY_CAP = 120;

// ── Markdown 结构常量 ────────────────────────────────────────────────────────
const H1 = "# 用户画像";
const H2_SUMMARY = "## 摘要";
const H2_TOPICS = "## 高频主题";
const H2_SAMPLES = "## 最近学习的提示词";
const P_VERSION = "- 版本：";
const P_LEARN_COUNT = "- 累计学习次数：";
const P_UPDATED_AT = "- 更新时间：";
const P_TAGS = "- 标签：";
const P_BODY = "- 正文：";
const PLACEHOLDER = "（暂无）";

function dshHome(): string {
  return process.env.DSH_HOME || DEFAULT_DSH_HOME;
}

/** 当前用户画像文件（Markdown）。 */
function profilePath(): string {
  return join(dshHome(), "prompt-library-user.md");
}

/** 空画像工厂：每次返回全新对象，避免共享可变引用。 */
function emptyProfile(): UserProfile {
  return { version: 1, summary: "", topics: {}, recentSamples: [], learnCount: 0, updatedAt: 0 };
}

/** 单管道读-修改-写队列。 */
let chain: Promise<unknown> = Promise.resolve();

// ── Markdown 序列化 / 解析 ──────────────────────────────────────────────────

/** 把画像序列化为可读的 Markdown 文本。 */
function serializeProfile(p: UserProfile): string {
  const lines: string[] = [
    H1,
    "",
    `${P_VERSION}${p.version}`,
    `${P_LEARN_COUNT}${p.learnCount}`,
    `${P_UPDATED_AT}${new Date(p.updatedAt).toISOString()}`,
    "",
  ];

  // 摘要（内存中已是「- 」开头的行，直接原样写出）
  lines.push(H2_SUMMARY, "");
  const summaryLines = p.summary.split("\n").map((s) => s.trim()).filter(Boolean);
  lines.push(...(summaryLines.length ? summaryLines : [PLACEHOLDER]), "");

  // 高频主题（按频次降序）
  lines.push(H2_TOPICS, "");
  const topics = Object.entries(p.topics).sort((a, b) => b[1] - a[1]);
  lines.push(...(topics.length ? topics.map(([name, count]) => `- ${name}：${count}`) : [PLACEHOLDER]), "");

  // 最近学习的提示词
  lines.push(H2_SAMPLES, "");
  if (!p.recentSamples.length) {
    lines.push(PLACEHOLDER, "");
  } else {
    for (const s of p.recentSamples) {
      lines.push(`### ${s.title}`, "", `${P_TAGS}${s.tags.join(", ")}`, P_BODY, "");
      for (const bodyLine of s.body.split("\n")) {
        lines.push(`> ${bodyLine}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

/** 解析 Markdown 用户画像文件。解析失败时返回默认空画像。 */
function parseProfile(text: string): UserProfile {
  const profile = emptyProfile();
  const lines = text.split(/\r?\n/);
  let section: "meta" | "summary" | "topics" | "samples" | "none" = "none";
  // 当前样本的临时状态（在循环体内直接赋值，避免闭包收窄问题）
  let sampleTitle: string | null = null;
  let sampleTags: string[] = [];
  const bodyParts: string[] = [];

  const pushSample = (): void => {
    if (sampleTitle !== null) {
      profile.recentSamples.push({ title: sampleTitle, body: bodyParts.join("\n"), tags: sampleTags });
      sampleTitle = null;
      sampleTags = [];
      bodyParts.length = 0;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      if (line === H2_SUMMARY) section = "summary";
      else if (line === H2_TOPICS) { pushSample(); section = "topics"; }
      else if (line === H2_SAMPLES) { pushSample(); section = "samples"; }
      else section = "none";
      continue;
    }
    if (line === H1) { section = "meta"; continue; }
    if (line.startsWith("### ")) {
      pushSample();
      sampleTitle = line.slice(4).trim();
      sampleTags = [];
      bodyParts.length = 0;
      section = "samples";
      continue;
    }

    if (section === "meta") {
      if (line.startsWith(P_VERSION)) {
        const v = Number(line.slice(P_VERSION.length));
        if (v === 1) profile.version = 1;
      } else if (line.startsWith(P_LEARN_COUNT)) {
        const v = Number(line.slice(P_LEARN_COUNT.length));
        if (Number.isFinite(v)) profile.learnCount = v;
      } else if (line.startsWith(P_UPDATED_AT)) {
        const t = Date.parse(line.slice(P_UPDATED_AT.length));
        if (Number.isFinite(t)) profile.updatedAt = t;
      }
      continue;
    }
    if (section === "summary") {
      if (line && line !== PLACEHOLDER) {
        profile.summary = profile.summary ? `${profile.summary.trim()}\n${line}` : line;
      }
      continue;
    }
    if (section === "topics") {
      if (line !== PLACEHOLDER && line.startsWith("- ")) {
        const idx = line.indexOf("：", 2);
        if (idx > 2) {
          const name = line.slice(2, idx).trim();
          const countText = line.slice(idx + 1).trim();
          const count = Number(countText);
          if (name && countText && Number.isFinite(count)) profile.topics[name] = count;
        }
      }
      continue;
    }
    if (section === "samples") {
      if (line.startsWith(P_TAGS)) {
        sampleTags = line.slice(P_TAGS.length).split(",").map((t) => t.trim()).filter(Boolean);
      } else if (line.startsWith("> ")) {
        bodyParts.push(line.slice(2));
      }
      // 空行、"- 正文：" 标记等忽略
    }
  }
  pushSample();
  return profile;
}

/** 去掉 UTF-8 BOM（Windows 工具写入时可能带），避免解析首行失败。 */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function readRaw(): Promise<UserProfile> {
  return readFile(profilePath(), "utf8")
    .then((text) => parseProfile(stripBom(text)))
    .catch((err) => {
      if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
      // Markdown 文件不存在：返回空画像（仅保留 Markdown 实现）
      return emptyProfile();
    });
}

async function writeRaw(profile: UserProfile): Promise<void> {
  await mkdir(dirname(profilePath()), { recursive: true });
  await writeFile(profilePath(), serializeProfile(profile), "utf8");
}

/** 串行化一个读-修改-写事务。 */
function transaction<T>(fn: (profile: UserProfile) => Promise<T> | T): Promise<T> {
  const run = chain.then(() => readRaw().then(fn));
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * 确保用户画像文件存在（~/.dsh/prompt-library-user.md）。
 * 文件缺失时创建一份空画像 Markdown，
 * 让用户随时能看到画像的落盘位置与结构，便于确认功能生效。
 */
export function ensureProfileFile(): Promise<void> {
  return transaction(async (profile) => {
    const isEmpty =
      profile.learnCount === 0 &&
      !profile.summary &&
      profile.recentSamples.length === 0 &&
      Object.keys(profile.topics).length === 0;
    if (isEmpty) await writeRaw(profile);
    return profile;
  }).then(() => undefined);
}

/** 读取用户画像（返回一个深拷贝，避免调用方误改共享状态）。 */
export function readProfile(): Promise<UserProfile> {
  return transaction(async (profile) => ({
    ...profile,
    topics: { ...profile.topics },
    recentSamples: profile.recentSamples.map((s) => ({ ...s, tags: [...s.tags] })),
  }));
}

/**
 * 把一次 AI 完善的结果合并进用户画像。
 * 画像定位是「AI 自学习的记忆与个性配置文件」，所有字段都有固定上限，
 * 只存核心记忆要点，绝不无休止堆积内容：
 * - 摘要：仅追加一句话洞察（去重，最多 MAX_SUMMARY_LINES 行 / MAX_SUMMARY_CHARS 字符）；
 * - 主题：累加标签频次（裁剪到 MAX_TOPICS）；
 * - 样本：去重后置顶最近学习的提示词（保留 MAX_SAMPLES 条，正文截断到 SAMPLE_BODY_CAP）；
 * - 统计：自增学习次数并更新时间戳。
 */
export function updateProfileWith(
  sample: { title: string; body: string; tags: string[] },
  insight: string,
): Promise<UserProfile> {
  return transaction(async (profile) => {
    const next: UserProfile = {
      ...profile,
      topics: { ...profile.topics },
      recentSamples: profile.recentSamples.map((s) => ({ ...s, tags: [...s.tags] })),
    };

    // 1) 累积摘要：只写入核心重点 —— 先去重（大小写不敏感），再按条数/字符双上限裁剪，
    //    避免无意义的重复与堆积稀释掉画像的核心用途。
    const line = insight.trim();
    if (line) {
      const normalized = line.toLowerCase();
      const existing = next.summary
        .split("\n")
        .map((s) => s.trim().replace(/^- /, ""))
        .filter(Boolean)
        .map((s) => s.toLowerCase());
      if (!existing.includes(normalized)) {
        next.summary = next.summary ? `${next.summary.trim()}\n- ${line}` : `- ${line}`;
      }
      // 只保留最近 MAX_SUMMARY_LINES 行（最新最能反映用户当前风格）
      const summaryLines = next.summary.split("\n").filter(Boolean);
      if (summaryLines.length > MAX_SUMMARY_LINES) {
        next.summary = summaryLines.slice(-MAX_SUMMARY_LINES).join("\n");
      }
      // 超长时裁剪最旧的行，保留最新
      if (next.summary.length > MAX_SUMMARY_CHARS) {
        const lines = next.summary.split("\n");
        let out = lines[lines.length - 1] ?? "";
        for (let i = lines.length - 2; i >= 0 && out.length + lines[i]!.length + 1 <= MAX_SUMMARY_CHARS; i--) {
          out = `${lines[i]}\n${out}`;
        }
        next.summary = out;
      }
    }

    // 2) 主题频次
    for (const tag of sample.tags) {
      const t = tag.trim();
      if (!t) continue;
      next.topics[t] = (next.topics[t] ?? 0) + 1;
    }
    const entries = Object.entries(next.topics).sort((a, b) => b[1] - a[1]);
    if (entries.length > MAX_TOPICS) {
      next.topics = Object.fromEntries(entries.slice(0, MAX_TOPICS));
    }

    // 3) 最近样本（按标题去重后置顶）
    const bodyCap =
      sample.body.length > SAMPLE_BODY_CAP ? `${sample.body.slice(0, SAMPLE_BODY_CAP)}…` : sample.body;
    next.recentSamples = [
      { title: sample.title, body: bodyCap, tags: [...sample.tags] },
      ...next.recentSamples
        .filter((s) => s.title !== sample.title)
        .map((s) =>
          s.body.length > SAMPLE_BODY_CAP ? { ...s, body: `${s.body.slice(0, SAMPLE_BODY_CAP)}…` } : s,
        ),
    ].slice(0, MAX_SAMPLES);

    // 4) 统计
    next.learnCount += 1;
    next.updatedAt = Date.now();

    await writeRaw(next);
    return next;
  });
}
