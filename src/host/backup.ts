/**
 * 词库数据库自动备份 / 恢复模块。
 *
 * 把数据备份到 ~/.dsh/prompt-library/backup/，文件名带时间戳：
 * - db 格式：复制 SQLite 主库文件（prompts-YYYYMMDD-HHmmss.db）；
 * - json 格式：导出词库全部提示词为 JSON（prompts-YYYYMMDD-HHmmss.json）。
 *
 * - 备份前先对 WAL 执行 TRUNCATE checkpoint，保证复制出的库文件完整、一致；
 * - 按用户配置的保留份数自动清理最旧的备份（超出即删）；
 * - 周期（daily / weekly / monthly）通过 meta 表记录的 lastBackupAt 判断是否到期；
 * - 恢复时按备份文件扩展名区分处理：db 覆盖主库文件后重开连接，json 清空后重建。
 */
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { backupDir, dbPath } from "./paths.js";
import { emitDataChanged } from "./events.js";
import {
  checkpointDb,
  closeDb,
  exportPrompts,
  getMetaValue,
  getSettings,
  listPrompts,
  reopenDb,
  restoreFromJson,
  setMetaValue,
} from "./store.js";

/** 备份文件名格式：prompts-YYYYMMDD-HHmmss.db 或 prompts-YYYYMMDD-HHmmss.json */
const FILE_RE = /^prompts-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.(db|json)$/;

/** 一天的毫秒数。 */
const DAY_MS = 24 * 60 * 60 * 1000;

/** 备份文件格式：db（数据库文件）/ json（JSON 导出）。 */
export type BackupFormat = "db" | "json";

/** 备份目录下的单条备份文件信息。 */
export interface BackupEntry {
  name: string;
  size: number;
  createdAt: number;
  format: BackupFormat;
}

/** 依据备份周期返回两次备份的最小间隔（毫秒）。 */
function intervalOf(schedule: string): number {
  switch (schedule) {
    case "weekly":
      return 7 * DAY_MS;
    case "monthly":
      return 30 * DAY_MS;
    default:
      return DAY_MS;
  }
}

/** 生成时间戳段：YYYYMMDD-HHmmss。 */
function stampOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** 解析备份文件名中的时间戳为毫秒时间；不匹配返回 0。 */
function createdAtOf(name: string): number {
  const m = name.match(FILE_RE);
  if (!m) return 0;
  return new Date(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!).getTime();
}

/**
 * 判断文件名是否可作为备份文件识别（按内容而非固定命名）：
 * 只要以 .db / .json 结尾即认可，文件名可随意重命名；同时拒绝路径分隔符与
 * 遍历字符，杜绝路径穿越。默认命名仍可解析出时间戳，无时间戳时回退到文件 mtime。
 */
function isSafeBackupName(name: string): boolean {
  if (!name) return false;
  if (!(name.endsWith(".db") || name.endsWith(".json"))) return false;
  if (name.includes("/") || name.includes("\\") || name.includes("..")) return false;
  return true;
}

/** 依据备份文件名后缀判断格式（.json → json，否则 db）。 */
function formatOf(name: string): BackupFormat {
  return name.endsWith(".json") ? "json" : "db";
}

/** 列出备份目录中的全部备份文件（按时间倒序，最新在前）。 */
export async function listBackups(): Promise<BackupEntry[]> {
  const dir = backupDir();
  let names: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    names = entries.filter((e) => e.isFile() && isSafeBackupName(e.name)).map((e) => e.name);
  } catch {
    // 目录不存在或不可读：视为暂无备份
    return [];
  }
  const list: BackupEntry[] = [];
  for (const name of names) {
    try {
      const s = await stat(join(dir, name));
      list.push({ name, size: s.size, createdAt: createdAtOf(name) || s.mtimeMs, format: formatOf(name) });
    } catch {
      /* 单条读取失败忽略，不阻塞其余 */
    }
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

/** 清理最旧的备份，只保留最近 retention 份（至少保留 1 份）。 */
export async function pruneBackups(retention: number): Promise<void> {
  const keep = Math.max(1, Math.floor(retention) || 1);
  const list = await listBackups();
  if (list.length <= keep) return;
  const dir = backupDir();
  for (const b of list.slice(keep)) {
    try {
      await rm(join(dir, b.name), { force: true });
    } catch {
      /* 删除失败忽略 */
    }
  }
}

/**
 * 立即执行一次备份：
 * 1. 确保备份目录存在；
 * 2. 按格式生成带时间戳的备份文件（db 先 checkpoint 再复制主库文件；json 导出全部提示词）；
 * 3. 若传入了保留份数则清理最旧的。
 * 返回生成的备份文件名与大小。
 */
export async function runBackup(
  retention?: number,
  format: BackupFormat = "db",
): Promise<{ name: string; size: number }> {
  const dir = backupDir();
  await mkdir(dir, { recursive: true });
  const stamp = stampOf(new Date());
  const name = format === "json" ? `prompts-${stamp}.json` : `prompts-${stamp}.db`;
  const target = join(dir, name);
  if (format === "json") {
    // JSON 备份：导出词库全部提示词，写入备份目录
    const data = await exportPrompts();
    await writeFile(target, JSON.stringify(data, null, 2), "utf8");
  } else {
    // db 备份：先合并 WAL，保证复制出的库文件包含所有已提交数据、且自洽一致。
    checkpointDb();
    await copyFile(dbPath(), target);
  }
  const s = await stat(target);
  if (retention && retention > 0) {
    await pruneBackups(retention);
  }
  return { name, size: s.size };
}

/**
 * 从指定备份文件恢复词库（按扩展名区分处理）：
 * - db：先 checkpoint 合并 WAL，关闭连接，用备份文件覆盖主库文件，清掉残留 WAL/SHM 后重开连接；
 * - json：读取并解析备份内容，清空现有词库后整体重建。
 * 恢复成功后广播数据变化，让各面板自动刷新。
 * 返回 { format, count }：db 的 count 为恢复后提示词总数，json 的 count 为重建条数。
 */
export async function restoreBackup(
  name: string,
): Promise<{ format: BackupFormat; count: number }> {
  if (!isSafeBackupName(name)) {
    throw new Error("invalid backup name");
  }
  const file = join(backupDir(), name);
  const st = await stat(file).catch(() => null);
  if (!st || !st.isFile()) {
    throw new Error("backup file not found");
  }
  const format = formatOf(name);
  let count = 0;
  if (format === "db") {
    // 先合并 WAL 并关闭连接，释放文件句柄，确保备份文件可覆盖主库文件
    checkpointDb();
    closeDb();
    await copyFile(file, dbPath());
    // 清掉旧连接残留的 WAL/SHM，避免新库文件被旧日志污染
    await rm(`${dbPath()}-wal`, { force: true }).catch(() => {});
    await rm(`${dbPath()}-shm`, { force: true }).catch(() => {});
    reopenDb();
    count = (await listPrompts()).length;
  } else {
    const raw = JSON.parse(await readFile(file, "utf8")) as unknown;
    const res = await restoreFromJson(raw);
    count = res.imported;
  }
  emitDataChanged();
  return { format, count };
}

/**
 * 删除指定的备份文件（校验文件名格式，避免路径穿越）。
 * 文件不存在时视为已删除；删除失败抛出异常供上层提示。
 */
export async function deleteBackup(name: string): Promise<boolean> {
  if (!isSafeBackupName(name)) {
    throw new Error("invalid backup name");
  }
  await rm(join(backupDir(), name), { force: true });
  return true;
}

/**
 * 自动备份入口（启动时 / 每日定时调用）：
 * - 未开启自动备份 → 跳过；
 * - 距上次备份未满所选周期 → 跳过；
 * - 否则执行备份并记录 lastBackupAt。
 * 任何失败都静默降级，不影响主流程。
 */
export async function autoBackup(): Promise<{ ran: boolean; name?: string; reason?: string }> {
  try {
    const settings = await getSettings();
    if (!settings.backupEnabled) return { ran: false, reason: "disabled" };
    const lastAt = Number(getMetaValue("lastBackupAt")) || 0;
    if (lastAt > 0 && Date.now() - lastAt < intervalOf(settings.backupSchedule)) {
      return { ran: false, reason: "not-due" };
    }
    const res = await runBackup(settings.backupRetention, settings.backupFormat);
    setMetaValue("lastBackupAt", String(Date.now()));
    return { ran: true, name: res.name };
  } catch {
    return { ran: false, reason: "error" };
  }
}
