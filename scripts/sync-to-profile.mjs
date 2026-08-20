// 一键把本地构建产物同步到 dsh profile 的插件安装目录，避免手动复制 lib 文件。
//
// 用法：
//   node scripts/sync-to-profile.mjs [profileName]
//   npm run sync                # 默认同步到 web profile
//   npm run deploy              # build + sync
//
// 说明：
// - 源：本项目 lib/（需先执行 `npm run build` 生成）。
// - 目标：<DSH_HOME>/profiles/<profileName>/node_modules/<包名>/。
// - 同步内容：lib/ 全部产物 + package.json（让运行环境版本号与本地一致）。
// - 同步完成后需重启 `dsh web` 才能生效。
import { cp, mkdir, readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const profileName = process.argv[2] ?? "web";

const dshHome = process.env.DSH_HOME || join(process.env.HOME || process.env.USERPROFILE, ".dsh");
const pkgName = JSON.parse(await readFile(join(root, "package.json"), "utf8")).name;
// 包名形如 "@scope/name"，node_modules 下按作用域分目录。
const pkgPath = pkgName.startsWith("@") ? pkgName.split("/") : [pkgName];

const srcLib = join(root, "lib");
const dstRoot = join(dshHome, "profiles", profileName, "node_modules", ...pkgPath);
const dstLib = join(dstRoot, "lib");

// 1) 校验源构建产物存在
try {
  await stat(srcLib);
} catch {
  console.error(`sync-to-profile: 未找到 ${srcLib}，请先运行 \`npm run build\``);
  process.exit(1);
}

// 2) 校验目标插件已安装
try {
  await stat(dstRoot);
} catch {
  console.error(`sync-to-profile: 目标插件目录不存在：${dstRoot}`);
  console.error(`请确认 profile "${profileName}" 已安装 ${pkgName}（如 \`dsh web\` 启动过）`);
  process.exit(1);
}

// 3) 同步 lib/ 全部产物
await mkdir(dstLib, { recursive: true });
const files = await readdir(srcLib);
let copied = 0;
for (const f of files) {
  await cp(join(srcLib, f), join(dstLib, f), { force: true });
  copied++;
}

// 4) 同步 package.json，让运行环境版本号与本地一致（避免版本困惑）
await cp(join(root, "package.json"), join(dstRoot, "package.json"), { force: true });

const localPkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
console.log(`sync-to-profile: 已同步 ${copied} 个文件`);
console.log(`  lib/ → ${dstLib}`);
console.log(`  package.json → ${dstRoot}\\package.json`);
console.log(`  版本：${pkgName}@${localPkg.version}`);
console.log(`完成！请重启 \`dsh web\` 使新版本生效。`);
