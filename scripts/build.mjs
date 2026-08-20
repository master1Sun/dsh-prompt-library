// 使用 esbuild 构建 dsh-prompt-library。
//
// 生成两个产物：
//   lib/index.js   — host 入口（Node ESM）；@deepseek-ai/* 保持 external。
//   lib/client.js  — 浏览器入口，DSH 客户端模块格式：
//                    window.__ModuleLoader__.load({ id, factory: (require) => {...} })
//                    react + react/jsx-runtime + @deepseek-ai/* 在运行时通过
//                    factory 的 `require` 解析（即不打入 bundle）。
import { build as esbuildBuild } from "esbuild";
import { rm, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// 客户端模块 id 必须与 DSH 加载器校验的 id 一致：loader entry 用的是无 scope 的
// 短名（如 dsh-prompt-library），无论包名是否带 scope（@scope/name 也只取 name）。
// 从 package.json 的 name 派生短名（唯一事实来源），避免硬编码导致包名变更后
// 产物与运行时漂移（历史 bug：取完整包名注册，导致 __ModuleLoader__.load 未注册
// 短名而报 "loaded without registering"）。
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const PLUGIN_ID = pkg.name.split("/").pop();

const libDir = join(root, "lib");
await rm(libDir, { recursive: true, force: true });
await mkdir(libDir, { recursive: true });

// External：React 和 @deepseek-ai/* 运行时包由 DSH host / 模块加载器
// 在运行时解析——绝不打包。
const external = [
  "react",
  "react/jsx-runtime",
  "@deepseek-ai/cordis",
  "@deepseek-ai/dsh-host-webserver",
  "@deepseek-ai/dsh-llm",
  "@deepseek-ai/dsh-client-runtime",
  "@deepseek-ai/dsh-client-runtime/client",
  "@deepseek-ai/dsh-client-locale",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-ui-conversation",
  "@deepseek-ai/dsh-client-ui-primitives",
];

// --- 1) host 入口：lib/index.js（Node ESM）-------------------------------
await esbuildBuild({
  entryPoints: [join(root, "src/index.ts")],
  outfile: join(libDir, "index.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  external,
  sourcemap: true,
  logLevel: "info",
});

// --- 2) client 入口：lib/client.js（DSH __ModuleLoader__ 格式）----------
// bundle 是 CJS：它的 `require("react")` / `require("@deepseek-ai/...")`
// 和 `module.exports = ...` 变成对包装器提供的 `require` / `module` / `exports`
// 局部变量的引用——这正是 DSH 模块加载器传递给 factory 的东西。
const clientBanner = [
  `window.__ModuleLoader__.load({`,
  `\tid: ${JSON.stringify(PLUGIN_ID)},`,
  `\tfactory: (require) => {`,
  `\t\tvar module = { exports: {} };`,
  `\t\tvar exports = module.exports;`,
].join("\n");

// esbuild 的 CJS ESM-interop 构建了一个带有 getter 的 `__toCommonJS` 对象；
// 我们需要一个纯 `module.exports`，其 `apply`/`inject` 是直接值
//（DSH 模块加载器读取的形状）。bundle 在同一个 factory 作用域中声明了
// `function apply` 和 `var inject`，因此在 footer 中重新赋值可以得到
// 一个干净的纯对象。
const clientFooter = [
  "\t\tmodule.exports = { apply, inject };",
  "\t\treturn module.exports;",
  "\t}",
  "});",
  "",
].join("\n");

await esbuildBuild({
  entryPoints: [join(root, "src/client/index.ts")],
  outfile: join(libDir, "client.js"),
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  external,
  banner: { js: clientBanner },
  footer: { js: clientFooter },
  sourcemap: true,
  logLevel: "info",
});

// 一个小标记，让 `dsh --dump-config` 的消费者知道这是构建过的。
await writeFile(
  join(libDir, ".build-meta.json"),
  JSON.stringify(
    { id: PLUGIN_ID, builtAt: new Date().toISOString() },
    null,
    2,
  ) + "\n",
);

console.log("build: done (lib/index.js, lib/client.js)");