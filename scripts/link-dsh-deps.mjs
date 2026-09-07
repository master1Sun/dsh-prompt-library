// Link @deepseek-ai/* type packages from the local DSH profile into this
// project's node_modules so `tsc --noEmit` (typecheck) can resolve them.
// The build itself (esbuild) needs none of these — they are external.
//
// Source: the shared profile deps at <DSH_HOME>/profiles/node_modules/@deepseek-ai
// (present once any profile has been booted).
import { mkdir, symlink, lstat, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nmAt = join(root, "node_modules", "@deepseek-ai");

const dshHome = process.env.DSH_HOME || join(process.env.HOME || process.env.USERPROFILE, ".dsh");
const src = join(dshHome, "profiles", "node_modules", "@deepseek-ai");

let entries = [];
try {
  entries = await readdir(src);
} catch {
  process.exit(1);
}

await mkdir(dirname(nmAt), { recursive: true });
await rm(nmAt, { recursive: true, force: true });
await mkdir(nmAt, { recursive: true });

let linked = 0;
for (const name of entries) {
  const target = join(src, name);
  const link = join(nmAt, name);
  // junction falls back to copy-free directory symlink on Windows.
  await symlink(target, link, "junction");
  linked++;
}

// react types: link from the profile if present, otherwise leave to npm install.
// console.log(`link-dsh-deps: linked ${linked} @deepseek-ai/* packages from ${src}`);
