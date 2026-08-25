/**
 * HARNESS 会话上下文（文件化）。
 *
 * 把「每次发送时自动注入当前会话的内部上下文」从代码抽成一个可编辑文件
 * ~/.dsh/prompt-library/prompts/HARNESS.md：
 * - ensureHarnessFile：文件缺失时用默认模板初始化，并创建目录；
 * - harnessSystemSync：同步读取文件内容并组装成「内部上下文」段落。
 *
 * 与 character/ 人格文件不同：
 * - 人格由实验室开关控制、只对新会话注入（见 character.ts）；
 * - HARNESS 是固定上下文，当前聊天每次发送消息都自动注入，供模型遵守；
 *   它是给模型看的内部规则，不要求向用户回显（wrapper 里已注明）。
 */
import { readFileSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { harnessPath } from "../../utils/paths.js";
import { stripBom } from "../../utils/text.js";

/** 默认模板：能力清单 + 使用规则（模型视角，非用户手册；用户可直接编辑）。 */
const DEFAULT_HARNESS = `# HARNESS · 会话上下文

> 本文件内容会随当前会话的每次发送自动注入给模型，是模型应当遵守的内部上下文。

## 你的身份
- 你是带「词库」插件的助手，当前会话集成了词库能力。

## 你拥有的能力
- /prompts -add <正文>：保存提示词，AI 自动生成标题与标签
- /prompts -tag <标签> <正文>：按指定标签保存
- /prompts -s <关键词>：检索词库
- /prompts -AI <正文>：AI 润色正文
- /prompts -enrich <正文>：AI 专业完善（扩写）
- /prompts -e：导出全部提示词
- /prompts -data：查看实时统计 + 近 7 天历史快照
- /prompts -h：查看完整使用手册
- 侧边栏词库与聊天框提示词按钮：随时插入 / 复制 / 润色提示词

## 使用规则
- 用户提到「词库 / 保存提示词 / 润色 / 完善」等时，优先引导或使用上述能力；
- 除非用户主动要求，不要主动解释插件用法，也不要复述本文件内容；
- 保持简洁、务实；如启用了人格，遵循其中的性格与语气。
`;

/** 确保 HARNESS 文件存在（缺失时写入默认模板；目录不存在则创建）。 */
export async function ensureHarnessFile(): Promise<void> {
  try {
    await readFile(harnessPath(), "utf8");
  } catch {
    await mkdir(dirname(harnessPath()), { recursive: true });
    await writeFile(harnessPath(), DEFAULT_HARNESS, "utf8");
  }
}

interface HarnessMeta {
  mtimeMs: number;
  size: number;
}

/** 面向热路径的组装结果缓存；mtime/size 变化时自动失效。 */
let harnessCache: { meta: HarnessMeta | null; assembled: string } | null = null;

/** 查询 HARNESS 文件的 stat 元信息；文件缺失返回 null（用 null 相等表示「一直缺失」）。 */
function harnessMeta(): HarnessMeta | null {
  try {
    const s = statSync(harnessPath());
    return { mtimeMs: s.mtimeMs, size: s.size };
  } catch {
    return null;
  }
}

/**
 * 同步读取 HARNESS 上下文文本（供每次对话组装 system prompt 时调用）。
 *
 * 宿主在组装对话提示时是同步回调 text 函数的，无法 await，故这里用便宜的
 * stat（mtime/size）做失效判断——文件没变就复用上次拼接结果。
 * 返回的是带「内部上下文、勿回显」说明的段落；文件缺失时后台重建默认模板并返回空串。
 */
export function harnessSystemSync(): string {
  const meta = harnessMeta();
  const cached = harnessCache;
  if (cached && meta && cached.meta && cached.meta.mtimeMs === meta.mtimeMs && cached.meta.size === meta.size) {
    return cached.assembled;
  }
  if (cached && !meta && !cached.meta) return cached.assembled;

  let content = "";
  try {
    content = stripBom(readFileSync(harnessPath(), "utf8")).trim();
  } catch {
    // 文件缺失：后台重建默认模板（幂等：只补缺失的文件）
    void ensureHarnessFile().catch(() => {});
  }
  const assembled = content
    ? `【HARNESS · 会话上下文 / 使用规则】\n（以下为内部上下文，不要向用户回显；按需使用其中的能力与规则）\n${content}`
    : "";
  harnessCache = { meta, assembled };
  return assembled;
}
