#!/usr/bin/env node
/**
 * 发布脚本：根据 package.json 的 version 自动打 tag 并推送，触发 GitHub Actions 自动建 Release。
 *
 * 用法：
 *   npm run release
 *
 * 约定：
 *   - 正式版 version 形如 0.8.9        → tag = v0.8.9
 *   - 测试版 version 形如 0.9.0-beta1  → tag = v0.9.0-beta1（workflow 自动标记为预发布）
 *   - 发版前需已 build 并把 lib 提交（lib 已纳入版本管理，tag 自带编译产物）；
 *     git 方式安装的插件（dsh plugin add github:...#<tag>）直接用到 tag 里的 lib。
 *   - 该版本若走 npm 通道仍需另 publish 到 npm。
 *
 * 安全校验：工作区必须干净；tag 已存在（本地或远端）时不重复创建/推送。
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const version = pkg.version;

// 校验版本号：主.次.补丁，可带 -预发布串（如 0.9.0-beta1）
const semver = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
if (!semver.test(version)) {
  console.error(`[release] 无效版本号：${version}（应为形如 0.8.9 或 0.9.0-beta1）`);
  process.exit(1);
}
const tag = `v${version}`;

function sh(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
}
function shSafe(cmd) {
  try {
    return sh(cmd);
  } catch {
    return "";
  }
}

// 1) 检查工作区是否干净，避免把未提交的改动随发布带出
const status = shSafe("git status --porcelain");
if (status) {
  console.error("[release] 工作区有未提交改动，请先提交再发布：\n" + status);
  process.exit(1);
}

// 2) 检查 tag 是否已存在（本地或远端）
if (shSafe(`git rev-parse -q --verify "refs/tags/${tag}"`)) {
  console.error(`[release] tag ${tag} 已存在于本地，无需重复创建`);
  process.exit(1);
}
if (shSafe(`git ls-remote --tags origin "${tag}"`)) {
  console.error(`[release] tag ${tag} 已存在于远端 origin，避免重复 push`);
  process.exit(1);
}

// 3) 打 tag 并推送，触发 GitHub 自动建 Release
console.log(`[release] 打 tag ${tag}`);
sh(`git tag "${tag}"`);
console.log(`[release] 推送 origin/${tag}`);
sh(`git push origin "${tag}"`);
console.log(`[release] 完成：GitHub 将自动创建 Release（含 beta/rc/alpha 会标记为预发布）`);