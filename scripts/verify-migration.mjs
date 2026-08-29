// 临时验证脚本：在临时 DSH_HOME 中验证会话级词条「元信息存库 + 正文存 MD」的 CRUD 往返。
// 通过 esbuild 打包 session-prompts 模块（@deepseek-ai/dsh-llm 用本地桩替代），解决 .js 扩展名解析问题。
import { mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";

const SRC = "C:/Users/sunjuntao/.dsh/prompt-library/session-prompts";
const HOME = join(tmpdir(), `pl-migrate-test-${Date.now()}`);
const DST = join(HOME, "prompt-library", "session-prompts");
mkdirSync(DST, { recursive: true });
for (const f of readdirSync(SRC)) {
  if (f.toLowerCase().endsWith(".md")) copyFileSync(join(SRC, f), join(DST, f));
}
process.env.DSH_HOME = HOME;
// console.log("HOME=", HOME);

// 打包目标模块到临时目录
const OUT = join(tmpdir(), `pl-sessprompts-bundle-${Date.now()}.mjs`);
// @deepseek-ai/dsh-llm 为宿主可选 peer 依赖，本地未安装，用桩模块替代（验证路径不会调用其真实实现）
const STUB = join(tmpdir(), `pl-llm-stub-${Date.now()}.mjs`);
writeFileSync(
  STUB,
  "export const BlockAssembler = class {};\nexport function createUserMessage() { return {}; }\n",
  "utf8",
);
await build({
  entryPoints: ["src/host/session-prompts.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  alias: { "@deepseek-ai/dsh-llm": STUB },
  outfile: OUT,
  logLevel: "silent",
});

const m = await import(pathToFileURL(OUT).href);

// 校验新建 + 读取 + 更新 + 删除 往返，且正文写进 MD 文件（纯正文，无 frontmatter）
const created = m.createSessionPrompt({ title: "测试词条", body: "测试正文内容", tags: ["测试"] });
// console.log("created:", created.title, "body:", created.body);
const bodyFile = readFileSync(join(DST, `${created.id}.md`), "utf8");
// console.log("body file is pure text:", bodyFile.trim() === "测试正文内容" && !bodyFile.startsWith("---"));

const got = m.getSessionPromptsByIds([created.id]);
// console.log("getByIds:", got.length === 1 && got[0].title === "测试词条" && got[0].body === "测试正文内容");
const upd = m.updateSessionPrompt(created.id, { title: "改名", body: "新正文", tags: ["新标签"], enabled: false });
// console.log("updated:", upd?.title === "改名" && upd?.enabled === false && upd?.body === "新正文");
const updBody = readFileSync(join(DST, `${created.id}.md`), "utf8");
// console.log("body file updated:", updBody.trim() === "新正文");
m.deleteSessionPrompt(created.id);
// console.log("after delete count:", m.listSessionPrompts().length);

// 清理（SQLite 连接可能仍占用 db 文件，失败仅静默）
try {
  m.closeDb?.();
} catch { /* 忽略 */ }
try {
  rmSync(HOME, { recursive: true, force: true });
} catch { /* 忽略 */ }
rmSync(OUT, { force: true });
rmSync(STUB, { force: true });
