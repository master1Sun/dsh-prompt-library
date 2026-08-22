/**
 * AI 完善结果的纯解析模块 —— 零依赖（不 import LLM / DB / 文件系统 / 宿主包）。
 *
 * 把「模型输出文本 → AI 完善结果」这条 /prompts -enrich 的核心处理路径单独抽出，
 * 使其可以在「未接入真实 AI」的情况下，用模拟的模型输出文本直接做单元测试
 * （见 refine.test.ts）。host 的 ai.ts 复用本模块完成同一段 JSON 解析逻辑。
 */

/** AI 完善结果：AI 生成的标题/标签/摘要/正文。 */
export interface AiRefineResult {
  title: string;
  tags: string[];
  summary: string;
  body: string;
}

/**
 * 从模型输出文本中容错解析出完善结果（/prompts -enrich 的最终形态）：
 * - 剥离 Markdown 代码围栏（```json ... ```），截取首个 JSON 对象；
 * - 正文必填，缺失/为空返回 undefined（对应命令输出「AI 完善失败」）；
 * - 标签只保留单个（与词库「单个标签」约定一致），去空去空格；
 * - 标题/摘要/正文按原样 trim，不修改正文中的任何 {{变量}}。
 *
 * @param text 模拟或真实模型返回的原始输出文本。
 * @returns 解析成功返回完善结果；非 JSON / 无正文 / 解析异常返回 undefined。
 */
export function parseRefineResult(text: string): AiRefineResult | undefined {
  let json = text.trim();
  const fence = json.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) json = fence[1]!.trim();
  const start = json.indexOf("{");
  const end = json.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return undefined;
  try {
    const parsed = JSON.parse(json.slice(start, end + 1)) as Partial<AiRefineResult>;
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    if (!body) return undefined;
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags
          .filter((t): t is string => typeof t === "string" && !!t.trim())
          .map((t) => t.trim())
      : [];
    return {
      title: typeof parsed.title === "string" ? parsed.title.trim() : "",
      // 词库只支持单个标签，这里直接归一为单个，避免调用方各自处理
      tags: tags.slice(0, 1),
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      body,
    };
  } catch {
    return undefined;
  }
}