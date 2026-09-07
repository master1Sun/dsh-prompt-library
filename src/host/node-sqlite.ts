import { createRequire } from "node:module";
import type { DatabaseSync } from "node:sqlite";

/**
 * 屏蔽 Node 内置 `node:sqlite` 的实验特性警告，并提供惰性同步加载。
 *
 * 该警告（ExperimentalWarning: SQLite is an experimental feature...）在首次加载
 * node:sqlite 模块时经 process.emitWarning 输出一次。既然产物是 ESM，静态
 * `import ... from "node:sqlite"` 会被提升到模块体之前求值，从而先于任何静音
 * 代码触发警告。因此这里改用 `createRequire` 在运行时惰性加载 node:sqlite：
 * 先安装静音拦截，真正调用加载时警告已被过滤掉，其余警告一切照旧。
 */
// 保留原始 emitWarning，仅拦截 SQLite 这一条警告
const origEmitWarning = process.emitWarning.bind(process);

process.emitWarning = ((...args: unknown[]) => {
  const warning = args[0];
  // warning 可能是字符串，也可能是带 .message 的 Error 对象
  const message =
    typeof warning === "string" ? warning : warning instanceof Error ? warning.message : "";
  if (typeof message === "string" && message.includes("SQLite is an experimental feature")) {
    return;
  }
  return (origEmitWarning as (...a: unknown[]) => unknown)(...args);
}) as typeof process.emitWarning;

// 在 ESM 产物中同步 require 内置模块：createRequire 以本文件为基准解析
const requireBuiltin = createRequire(import.meta.url);

/** node:sqlite 模块中 DatabaseSync 构造函数的类型。 */
type SqliteModule = { DatabaseSync: typeof DatabaseSync };

let sqliteMod: SqliteModule | undefined;

/** 惰性获取 node:sqlite 模块（首次调用时才真正加载，其警告已被上方拦截）。 */
function loadSqlite(): SqliteModule {
  return (sqliteMod ??= requireBuiltin("node:sqlite") as SqliteModule);
}

/** 打开一个 SQLite 数据库连接实例。 */
export function createDatabase(path: string): DatabaseSync {
  return new (loadSqlite().DatabaseSync)(path);
}