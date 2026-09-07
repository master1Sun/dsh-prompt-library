/**
 * 自动备份模块 — 词库「词库管理」面板内的独立模块卡片（自包含）。
 *
 * 集中管理自动备份相关设置与操作：
 * - 自动备份开关 / 频率 / 保留数量 / 备份格式（db / json）
 * - 「立即备份」手动生成备份文件
 * - 备份文件列表：格式徽标 / 大小 / 时间，支持「恢复」按钮覆盖恢复词库
 *
 * 本模块自持设置草稿（仅读写备份相关字段），修改后防抖自动保存并广播
 * pl:settings-changed 事件，与设置面板其余模块互不干扰。
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { PluginSettings } from "../../../types.js";
import { DEFAULT_SETTINGS } from "../../../types.js";
import {
  deleteBackup,
  getSettings,
  listBackups,
  restoreBackup,
  runBackup,
  updateSettings as apiUpdateSettings,
  type BackupEntry,
} from "../../utils/api.js";
import { notifyDataChanged } from "../../utils/data-sync.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../utils/button-style.js";
import { ConfirmDialog } from "../common/ConfirmDialog.js";
import { type PLTranslate, usePLT } from "../../utils/i18n.js";

const MONO =
  '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", "黑体", sans-serif';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)",
} as const;

/** 内联模块卡片样式。 */
const moduleStyle: CSSProperties = {
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  background: TONE.panel,
  border: `1px solid ${TONE.border}`,
  borderRadius: 10,
  padding: "14px 16px",
  marginTop: 12,
};

const moduleTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 560,
  color: TONE.text,
};

const moduleDescStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: TONE.quiet,
};

/** 文件大小格式化：B / KB / MB。 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** 格式化备份时间：YYYY-MM-DD HH:mm。 */
function formatBackupTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 可折叠模块卡片（手风琴），与「词库管理」其余模块一致。 */
function ModuleCard(props: {
  title: ReactNode;
  desc?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}): ReactNode {
  const { title, desc, open, onToggle, children } = props;
  return (
    <section style={moduleStyle}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={moduleTitleStyle}>{title}</div>
          {desc && <div style={moduleDescStyle}>{desc}</div>}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          style={{
            flexShrink: 0,
            color: TONE.muted,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .24s cubic-bezier(.22,1,.36,1)",
          }}
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {open && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>}
    </section>
  );
}

/** 开关行组件。 */
function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}): ReactNode {
  const dim = disabled ? 0.45 : 1;
  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        padding: "8px 0",
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, opacity: dim }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <span style={{ fontSize: 11, color: TONE.quiet }}>{desc}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: 16,
          height: 16,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: dim,
          accentColor: TONE.accent,
        }}
      />
    </label>
  );
}

/** 数字输入行组件：标签旁显示最小-最大范围，超出范围自动修正。 */
function NumberRow({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}): ReactNode {
  const clamp = (v: number): number => {
    if (Number.isNaN(v)) return defaultValue ?? min;
    if (v < min) return min;
    if (v > max) return max;
    return v;
  };
  const dim = disabled ? 0.45 : 1;
  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "8px 0",
        cursor: disabled ? "not-allowed" : "default",
        opacity: dim,
      }}
    >
      <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <span style={{ fontSize: 11, color: TONE.quiet }}>{min}-{max}</span>
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          if (disabled) return;
          const raw = e.target.value;
          if (raw === "") {
            onChange(defaultValue ?? min);
            return;
          }
          const num = Number(raw);
          if (Number.isNaN(num)) return;
          onChange(num > max ? max : num);
        }}
        onBlur={() => {
          if (!disabled) onChange(clamp(value));
        }}
        style={{
          width: 80,
          padding: "4px 6px",
          color: TONE.text,
          background: TONE.row,
          border: `1px solid ${TONE.border}`,
          borderRadius: 5,
          fontFamily: MONO,
          fontSize: 12,
          textAlign: "center",
          outline: "none",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </label>
  );
}

/** 下拉选择行组件。 */
function SelectRow({
  label,
  value,
  options,
  onChange,
  desc,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  desc?: string;
  disabled?: boolean;
}): ReactNode {
  const dim = disabled ? 0.45 : 1;
  return (
    <div style={{ padding: "8px 0", opacity: dim }}>
      <label
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          cursor: disabled ? "not-allowed" : "default",
        }}
      >
        <span style={{ fontSize: 13 }}>{label}</span>
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => {
            if (!disabled) onChange(e.target.value);
          }}
          style={{
            width: 180,
            padding: "4px 6px",
            color: TONE.text,
            background: TONE.row,
            border: `1px solid ${TONE.border}`,
            borderRadius: 5,
            fontFamily: MONO,
            fontSize: 12,
            outline: "none",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      {desc && (
        <div style={{ fontSize: 11, color: TONE.quiet, marginTop: 4, lineHeight: 1.5 }}>
          {desc}
        </div>
      )}
    </div>
  );
}

/** 自动备份模块组件（在「词库管理」面板内渲染）。 */
export function BackupModule(props?: { t?: PLTranslate }): ReactNode {
  const { t } = props ?? {};
  const T = usePLT(t);
  const [draft, setDraft] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [open, setOpen] = useState(false);
  // 备份文件列表 / 手动备份状态 / 操作反馈 / 待恢复的备份文件
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [backuping, setBackuping] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupEntry | null>(null);
  const [restoring, setRestoring] = useState(false);
  // 待删除的备份文件 / 删除中标记
  const [deleteTarget, setDeleteTarget] = useState<BackupEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载设置草稿（仅备份相关字段参与渲染与保存）
  useEffect(() => {
    getSettings()
      .then((s) => setDraft(s))
      .catch(() => { /* 使用默认值 */ });
  }, []);

  // 保存设置到后台并广播变更事件（防抖，与设置面板其余模块一致）
  const saveSettings = useCallback((next: PluginSettings) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      apiUpdateSettings(next).then(() => {
        window.dispatchEvent(new CustomEvent("pl:settings-changed", { detail: next }));
      }).catch(() => {});
    }, 300);
  }, []);

  // 通用更新函数：更新本地状态 + 自动保存
  const updateAndSave = useCallback((patch: Partial<PluginSettings>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, [saveSettings]);

  // 拉取备份文件列表（模块展开时刷新）
  const refreshBackups = useCallback(() => {
    listBackups().then(
      (list) => setBackups(list),
      () => setBackups([]),
    );
  }, []);

  useEffect(() => {
    if (open) refreshBackups();
  }, [open, refreshBackups]);

  // 手动立即备份：按当前所选格式执行，成功后刷新列表并提示，失败提示错误
  const handleBackupNow = useCallback(async () => {
    setBackuping(true);
    setBackupMsg(null);
    try {
      const res = await runBackup(draft.backupFormat);
      setBackupMsg({ text: T("pl.set.backupDone", { name: res.name }) });
      refreshBackups();
    } catch {
      setBackupMsg({ text: T("pl.set.backupFail"), error: true });
    } finally {
      setBackuping(false);
    }
  }, [T, refreshBackups, draft.backupFormat]);

  // 从指定备份文件恢复词库：覆盖当前数据，需先经确认弹窗，成功/失败后关闭弹窗并提示
  const handleRestore = useCallback(async () => {
    if (!restoreTarget || restoring) return;
    setRestoring(true);
    setBackupMsg(null);
    try {
      const res = await restoreBackup(restoreTarget.name);
      setRestoreTarget(null);
      setBackupMsg({ text: T("pl.set.restoreDone", { count: res.count, format: res.format }) });
      refreshBackups();
      notifyDataChanged();
    } catch (e) {
      setRestoreTarget(null);
      setBackupMsg({
        text: e instanceof Error ? e.message : T("pl.set.restoreFail"),
        error: true,
      });
    } finally {
      setRestoring(false);
    }
  }, [restoreTarget, restoring, T, refreshBackups]);

  // 删除指定备份文件：先经确认弹窗，成功/失败后关闭弹窗并提示
  const handleDelete = useCallback(async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setBackupMsg(null);
    try {
      await deleteBackup(deleteTarget.name);
      setDeleteTarget(null);
      setBackupMsg({ text: T("pl.set.backupDeleteDone", { name: deleteTarget.name }) });
      refreshBackups();
    } catch (e) {
      setDeleteTarget(null);
      setBackupMsg({
        text: T("pl.set.backupDeleteFail", {
          err: e instanceof Error ? e.message : String(e),
        }),
        error: true,
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, T, refreshBackups]);

  return (
    <>
      <ModuleCard
        title={T("pl.setModuleBackup")}
        desc={T("pl.setModuleBackupDesc")}
        open={open}
        onToggle={() => setOpen((v) => !v)}
      >
        <ToggleRow
          label={T("pl.set.backupEnabled")}
          desc={T("pl.set.backupEnabledDesc")}
          checked={draft.backupEnabled}
          onChange={(v) => updateAndSave({ backupEnabled: v })}
        />

        {/* 自动备份子项：保持缩进呈现父子层级；主开关关闭时只置灰，不改动真实保存值 */}
        <div
          style={{
            marginLeft: 22,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <SelectRow
            label={T("pl.set.backupSchedule")}
            value={draft.backupSchedule}
            options={[
              { value: "daily", label: T("pl.set.backupScheduleDaily") },
              { value: "weekly", label: T("pl.set.backupScheduleWeekly") },
              { value: "monthly", label: T("pl.set.backupScheduleMonthly") },
            ]}
            desc={T("pl.set.backupScheduleDesc")}
            disabled={!draft.backupEnabled}
            onChange={(v) =>
              updateAndSave({ backupSchedule: v as PluginSettings["backupSchedule"] })
            }
          />
          <NumberRow
            label={T("pl.set.backupRetention")}
            value={draft.backupRetention}
            min={1}
            max={30}
            step={1}
            defaultValue={DEFAULT_SETTINGS.backupRetention}
            disabled={!draft.backupEnabled}
            onChange={(v) => updateAndSave({ backupRetention: v })}
          />
          <SelectRow
            label={T("pl.set.backupFormat")}
            value={draft.backupFormat}
            options={[
              { value: "db", label: T("pl.set.backupFormatDb") },
              { value: "json", label: T("pl.set.backupFormatJson") },
            ]}
            desc={T("pl.set.backupFormatDesc")}
            disabled={!draft.backupEnabled}
            onChange={(v) =>
              updateAndSave({ backupFormat: v as PluginSettings["backupFormat"] })
            }
          />
        </div>

        {/* 手动立即备份 + 备份文件列表 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "8px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 13 }}>{T("pl.set.backupListTitle")}</span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className={plBtn("primary", "sm")}
              onClick={handleBackupNow}
              disabled={backuping}
            >
              {backuping ? T("pl.set.backupBacking") : T("pl.set.backupNow")}
            </Button>
          </div>

          {/* 操作反馈 */}
          {backupMsg && (
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.5,
                color: backupMsg.error ? TONE.red : TONE.text,
              }}
            >
              {backupMsg.text}
            </div>
          )}

          {/* 备份列表（限高滚动） */}
          {backups.length === 0 ? (
            <div style={{ fontSize: 11, color: TONE.quiet }}>{T("pl.set.backupEmpty")}</div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                maxHeight: 200,
                overflow: "auto",
              }}
            >
              {backups.map((b) => (
                <div
                  key={b.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 9px",
                    background: TONE.row,
                    border: `1px solid ${TONE.border}`,
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    data-tip={b.name}
                  >
                    {b.name}
                  </span>
                  {/* 格式徽标：区分 db（数据库文件）/ json（JSON 导出） */}
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 10,
                      lineHeight: 1,
                      color: b.format === "json" ? TONE.accent : TONE.muted,
                      border: `1px solid ${
                        b.format === "json"
                          ? "var(--dsw-alias-brand-primary, #8ec5ff)"
                          : TONE.border
                      }`,
                      borderRadius: 4,
                      padding: "2px 5px",
                    }}
                  >
                    {b.format}
                  </span>
                  <span style={{ fontSize: 11, color: TONE.quiet, flexShrink: 0 }}>
                    {formatSize(b.size)}
                  </span>
                  <span style={{ fontSize: 11, color: TONE.quiet, flexShrink: 0 }}>
                    {formatBackupTime(b.createdAt)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={plBtn("ghost", "sm")}
                    onClick={() => setRestoreTarget(b)}
                    data-tip={T("pl.set.restoreTitle", { name: b.name })}
                  >
                    {T("pl.set.restore")}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(b)}
                    data-tip={T("pl.set.backupDeleteTitle")}
                    style={{
                      flexShrink: 0,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: TONE.quiet,
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: MONO,
                      padding: "2px 4px",
                      borderRadius: 4,
                      transition: "color .18s, background-color .18s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = TONE.red;
                      e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = TONE.quiet;
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {T("pl.set.backupDelete")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModuleCard>

      {/* 恢复确认弹窗：恢复会用备份内容覆盖当前词库，需显式确认后才能执行 */}
      <ConfirmDialog
        open={restoreTarget !== null}
        danger
        message={restoreTarget ? T("pl.set.restoreConfirm", { name: restoreTarget.name }) : ""}
        confirmLabel={T("pl.set.restore")}
        cancelLabel={T("pl.cancel")}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
      />

      {/* 删除确认弹窗：删除备份文件后不可恢复，需显式确认后才能执行 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        danger
        message={deleteTarget ? T("pl.set.backupDeleteConfirm", { name: deleteTarget.name }) : ""}
        confirmLabel={T("pl.set.backupDelete")}
        cancelLabel={T("pl.cancel")}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
