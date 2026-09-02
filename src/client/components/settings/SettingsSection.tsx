/**
 * 词库设置面板 — 注册到 harness 的 settings.section 插槽。
 *
 * 在 DSH 设置界面中显示插件的所有配置项：
 * - 自动学习开关 + 标签/最小长度 + AI 智能完善（含 Provider/模型）
 * - 面板宽度/高度自定义
 * - 右侧侧边栏模式开关
 * - # 键触发词库选择开关
 * - 鼠标移入显示详情开关
 * - 提示词最大存储数量
 * - 底部署名
 *
 * 修改后立即生效，无需保存按钮。
 */
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PluginSettings } from "../../../types.js";
import { DEFAULT_SETTINGS } from "../../../types.js";
import {
  applyUpdate,
  getAiSelectables,
  getSettings,
  getUpdate,
  getUpdateProgress,
  getVersion,
  updateSettings as apiUpdateSettings,
  type ClientAiSelectable,
  type UpdateInfo,
  type UpdateProgress,
} from "../../utils/api.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../utils/button-style.js";
import { type PLTranslate, usePLT } from "../../utils/i18n.js";
import { BackupModule } from "./BackupModule.js";

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
  success: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)",
} as const;

/** 分类模块卡片样式（与「词库管理」保持一致）。 */
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

/** 可折叠分类模块（手风琴）。 */
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
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {open && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      )}
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
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          flex: 1,
          opacity: dim,
        }}
      >
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

/** 数字输入行组件。标签旁显示最小-最大范围，超出范围自动限制回限制值内。 */
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
  // 把数值限制回 [min, max] 区间
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
        <span style={{ fontSize: 11, color: TONE.quiet }}>
          {min}-{max}
        </span>
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
            // 清空时回退到默认值/最小值，避免输入框留空
            onChange(defaultValue ?? min);
            return;
          }
          const num = Number(raw);
          if (Number.isNaN(num)) return; // 非法输入不更新
          // 超过上限立即修正；低于下限留待失焦时修正（避免打断输入）
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

/** 文本输入行组件。 */
function TextRow({
  label,
  value,
  placeholder,
  desc,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  desc?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** 输入框类型：敏感字段（如 API Key）用 password。 */
  type?: "text" | "password";
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
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            if (!disabled) onChange(e.target.value);
          }}
          style={{
            width: 120,
            padding: "4px 6px",
            color: TONE.text,
            background: TONE.row,
            border: `1px solid ${TONE.border}`,
            borderRadius: 5,
            fontFamily: MONO,
            fontSize: 12,
            outline: "none",
            cursor: disabled ? "not-allowed" : "text",
          }}
        />
      </label>
      {desc && (
        <div
          style={{
            fontSize: 11,
            color: TONE.quiet,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {desc}
        </div>
      )}
    </div>
  );
}

/** 下拉选择行组件（选项 value 与显示名可为不同值）。 */
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
        <div
          style={{
            fontSize: 11,
            color: TONE.quiet,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {desc}
        </div>
      )}
    </div>
  );
}

/** 设置面板组件，修改后立即生效。 */
export function SettingsSection(props?: { t?: PLTranslate }): ReactNode {
  const { t } = props ?? {};
  // 统一取翻译函数：优先框架注入的 t（跟随系统语言），否则回退中文
  const T = usePLT(t);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<PluginSettings>(DEFAULT_SETTINGS);
  // 分类模块手风琴折叠状态（默认折叠，与「词库管理」保持一致）
  const [openDeepseek, setOpenDeepseek] = useState(false);
  const [openAiModel, setOpenAiModel] = useState(false);
  const [openPanel, setOpenPanel] = useState(false);
  const [openDisplay, setOpenDisplay] = useState(false);
  const [openUpdate, setOpenUpdate] = useState(false);
  // 系统中可用的 AI provider 及模型列表（来自 harness LLM 服务，设置界面下拉选择用）
  const [aiSelectables, setAiSelectables] = useState<ClientAiSelectable[]>([]);
  // 更新提醒状态：updateInfo 为 null 表示尚未检查/检查失败
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  // 当前已安装版本号（从 /version 轻量读取，用于「更新提醒」标题后展示，如 v0.9.5）
  const [installedVer, setInstalledVer] = useState("");
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  // 手动升级实时进度（驱动进度条）与升级完成后的「需重启服务」标记
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(
    null,
  );
  const [needsRestart, setNeedsRestart] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 记录已保存的 DeepSeek API Key：保存成功后若发生变化，再通知小助手刷新余额
  const lastDeepseekKeyRef = useRef<string>("");

  useEffect(() => {
    getSettings()
      .then((s) => setDraft(s))
      .catch(() => {
        /* 使用默认值 */
      })
      .finally(() => setLoading(false));
  }, []);

  // 拉取系统中可用的 AI provider 及模型列表（供「默认模型」下拉选择）
  useEffect(() => {
    getAiSelectables()
      .then((list) => setAiSelectables(list))
      .catch(() => {
        /* LLM 服务未注入或网络失败：下拉仅显示「自动选择」 */
      });
  }, []);

  // 拉取当前已安装版本号，供「更新提醒」标题后展示（轻量本地接口，不触发网络检查）
  useEffect(() => {
    getVersion()
      .then((v) => setInstalledVer(v.installed || ""))
      .catch(() => {
        /* 忽略 */
      });
  }, []);

  // 保存设置到后台并通知其他组件
  const saveSettings = useCallback((next: PluginSettings) => {
    // 防抖：避免频繁写入
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      apiUpdateSettings(next)
        .then(() => {
          window.dispatchEvent(
            new CustomEvent("pl:settings-changed", { detail: next }),
          );
          // 保存成功后若 DeepSeek API Key 发生变化（含清空），通知小助手立即刷新余额，
          // 避免残留旧 Key 查询到的余额角标
          if (next.deepseekApiKey !== lastDeepseekKeyRef.current) {
            lastDeepseekKeyRef.current = next.deepseekApiKey;
            window.dispatchEvent(
              new CustomEvent("pl:deepseek-balance-refresh", {
                detail: next.deepseekApiKey,
              }),
            );
          }
        })
        .catch(() => {});
    }, 300);
  }, []);

  // 通用更新函数：更新本地状态 + 自动保存
  const updateAndSave = useCallback(
    (patch: Partial<PluginSettings>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        saveSettings(next);
        return next;
      });
    },
    [saveSettings],
  );

  // 手动检查更新（强制刷新 host 缓存）
  const handleCheckUpdate = useCallback(async () => {
    setChecking(true);
    setUpdateMsg(null);
    try {
      const info = await getUpdate();
      setUpdateInfo(info);
      // 已是最新时不再额外弹「已是最新版本」——版本信息行已固定展示该状态，避免重复/误导提示
    } catch {
      setUpdateMsg({ ok: false, text: T("pl.set.updateFail") });
    } finally {
      setChecking(false);
    }
  }, [T]);

  // 立即更新：启动后台升级，并轮询实时进度驱动进度条；完成后提示重启服务才生效
  const handleApplyUpdate = useCallback(async () => {
    setUpdating(true);
    setUpdateMsg(null);
    setUpdateProgress(null);
    setNeedsRestart(false);
    try {
      const res = await applyUpdate();
      if (!res.ok || !res.started) {
        setUpdateMsg({ ok: false, text: T("pl.set.updateFail") });
        setUpdating(false);
        return;
      }
      // 后台升级已启动：每 500ms 轮询一次进度，直到结束（done/failed）或超时
      const deadline = Date.now() + 120_000;
      let finalProg: UpdateProgress | null = null;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 500));
        let prog: UpdateProgress | null = null;
        try {
          prog = await getUpdateProgress();
        } catch {
          /* 单次轮询失败可忽略，下一轮重试 */
        }
        if (prog) {
          setUpdateProgress(prog);
          if (!prog.active) {
            finalProg = prog;
            break;
          }
        }
      }
      if (finalProg) {
        if (finalProg.stage === "done") {
          setNeedsRestart(true);
        } else if (finalProg.stage === "failed") {
          setUpdateMsg({ ok: false, text: T("pl.set.updateFail") });
        }
      } else {
        // 轮询未在超时内观测到结束，视为失败
        setUpdateMsg({ ok: false, text: T("pl.set.updateFail") });
      }
      // 更新成功后刷新版本信息
      try {
        const info = await getUpdate();
        setUpdateInfo(info);
      } catch {
        /* 忽略 */
      }
    } catch {
      setUpdateMsg({ ok: false, text: T("pl.set.updateFail") });
    } finally {
      setUpdating(false);
    }
  }, [T]);

  // 更新进度条阶段文案：按 stage 返回对应国际化描述
  const stageLabel = (p: UpdateProgress | null): string => {
    if (!p || p.stage === "idle") return T("pl.set.updating");
    switch (p.stage) {
      case "checking":
        return T("pl.set.updateStageChecking");
      case "downloading":
        return T("pl.set.updateStageDownloading");
      case "installing":
        return T("pl.set.updateStageInstalling");
      case "done":
        return T("pl.set.updateStageDone");
      case "failed":
        return T("pl.set.updateStageFailed");
      default:
        return T("pl.set.updating");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 16,
          color: TONE.quiet,
          fontFamily: MONO,
          fontSize: 13,
        }}
      >
        {T("pl.loading")}
      </div>
    );
  }

  return (
    <div
      style={{
        color: TONE.text,
        fontFamily: MONO,
        maxWidth: 520,
      }}
    >
      {/* 面板顶部标题（与「词库管理」一致） */}
      <div
        style={{
          padding: "2px 0 4px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 1,
            color: TONE.text,
            lineHeight: 1.2,
          }}
        >
          {T("pl.setSectionTitle")}
        </div>
        <span style={{ fontSize: 12, color: TONE.quiet, lineHeight: 1.5 }}>
          {T("pl.set.setSectionDesc")}
        </span>
      </div>
      {/* 分类模块一：DeepSeek 余额 */}
      <ModuleCard
        title={T("pl.setModuleDeepseek")}
        desc={T("pl.setModuleDeepseekDesc")}
        open={openDeepseek}
        onToggle={() => setOpenDeepseek((v) => !v)}
      >
        {/* DeepSeek API Key：为 DeepSeek 余额实时推送提供鉴权（可选，密码输入框） */}
        <TextRow
          label={T("pl.set.deepseekApiKey")}
          value={draft.deepseekApiKey ?? ""}
          type="password"
          placeholder="sk-..."
          desc={T("pl.set.deepseekApiKeyDesc")}
          onChange={(v) => {
            updateAndSave({ deepseekApiKey: v });
          }}
        />
      </ModuleCard>

      {/* 分类模块二：AI 模型（词库 AI 润色/完善的默认模型选择） */}
      <ModuleCard
        title={T("pl.setModuleAiModel")}
        desc={T("pl.setModuleAiModelDesc")}
        open={openAiModel}
        onToggle={() => setOpenAiModel((v) => !v)}
      >
        {(() => {
          // 当前选中 provider 的模型列表；未配置或未知 provider 时仅「自动选择」
          const curSel = aiSelectables.find(
            (s) => s.provider === draft.aiProvider,
          );
          const providerOptions = [
            { value: "", label: T("pl.set.aiModelAuto") },
            ...aiSelectables.map((s) => ({
              value: s.provider,
              label: s.name || s.provider,
            })),
          ];
          // 若已配置的 provider 不在下拉列表中（如列表加载前），附加一项以便回显当前值
          if (
            draft.aiProvider &&
            !aiSelectables.some((s) => s.provider === draft.aiProvider)
          ) {
            providerOptions.push({
              value: draft.aiProvider,
              label: draft.aiProvider,
            });
          }
          const modelOptions = [
            { value: "", label: T("pl.set.aiModelAuto") },
            ...(curSel?.models.map((m) => ({
              value: m.id,
              label: m.name || m.id,
            })) ?? []),
          ];
          return (
            <>
              <SelectRow
                label={T("pl.set.aiModelProvider")}
                value={draft.aiProvider}
                onChange={(v) =>
                  updateAndSave({
                    aiProvider: v,
                    aiModel: "", // 切换调用方后不沿用旧模型的模型 id
                  })
                }
                options={providerOptions}
                disabled={aiSelectables.length === 0}
              />
              <SelectRow
                label={T("pl.set.aiDefaultModel")}
                value={draft.aiModel}
                onChange={(v) => updateAndSave({ aiModel: v })}
                options={modelOptions}
                disabled={!draft.aiProvider}
              />
            </>
          );
        })()}
      </ModuleCard>

      {/* 分类模块三：面板显示 */}
      <ModuleCard
        title={T("pl.setModulePanel")}
        desc={T("pl.setModulePanelDesc")}
        open={openPanel}
        onToggle={() => setOpenPanel((v) => !v)}
      >
        <NumberRow
          label={T("pl.set.panelWidth")}
          value={draft.panelWidth}
          min={300}
          max={700}
          step={10}
          onChange={(v) => updateAndSave({ panelWidth: v })}
        />
        <NumberRow
          label={T("pl.set.panelHeight")}
          value={draft.panelHeight}
          min={300}
          max={800}
          step={10}
          onChange={(v) => updateAndSave({ panelHeight: v })}
        />
        <NumberRow
          label={T("pl.set.maxCount")}
          value={draft.maxPromptCount}
          min={10}
          max={10000}
          step={10}
          defaultValue={DEFAULT_SETTINGS.maxPromptCount}
          onChange={(v) => updateAndSave({ maxPromptCount: v })}
        />
      </ModuleCard>

      {/* 分类模块三：显示与交互 */}
      <ModuleCard
        title={T("pl.setModuleDisplay")}
        desc={T("pl.setModuleDisplayDesc")}
        open={openDisplay}
        onToggle={() => setOpenDisplay((v) => !v)}
      >
        {/* 词库助手显隐（主开关）：关闭后不再显示词库助手与其气泡；主开关关闭时子项一并置灰（仅灰显，不改动保存值），词库助手显示时始终可配置 */}
        <ToggleRow
          label={T("pl.set.assistant")}
          desc={T("pl.set.assistantDesc")}
          checked={draft.assistantEnabled}
          onChange={(v) => updateAndSave({ assistantEnabled: v })}
        />
        {/* 词库助手子项：主开关关闭时置灰，词库助手显示时始终可配置；通过缩进呈现父子层级 */}
        <div
          style={{
            marginLeft: 22,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 助手形象：鲸鱼款（静态）/ 鲸鱼款（dsh-pet 动效）；仅当词库助手显示时可配置 */}
          <SelectRow
            label={T("pl.set.character")}
            desc={T("pl.set.characterDesc")}
            value={draft.assistantCharacter}
            disabled={!draft.assistantEnabled}
            onChange={(v) =>
              updateAndSave({
                assistantCharacter: v === "dshpet" ? "dshpet" : "whale",
              })
            }
            options={[
              { value: "whale", label: T("pl.set.characterWhale") },
              { value: "dshpet", label: T("pl.set.characterDshpet") },
            ]}
          />
        </div>
        <ToggleRow
          label={T("pl.set.settingsAboveMenu")}
          desc={T("pl.set.settingsAboveMenuDesc")}
          checked={draft.settingsAboveMenuEnabled}
          onChange={(v) => updateAndSave({ settingsAboveMenuEnabled: v })}
        />
        <ToggleRow
          label={T("pl.set.showComposerBtn")}
          desc={T("pl.set.showComposerBtnDesc")}
          checked={draft.showComposerButton}
          onChange={(v) => updateAndSave({ showComposerButton: v })}
        />
        {/* 词库按钮纯图标 / 图标+文字 切换（仅在显示词库按钮时可配置）；缩进从属于「聊天框显示词库按钮」 */}
        <div
          style={{
            paddingLeft: 14,
            borderLeft: `1px solid ${TONE.border}`,
            marginLeft: 6,
          }}
        >
          <ToggleRow
            label={T("pl.set.composerBtnIconOnly")}
            desc={T("pl.set.composerBtnIconOnlyDesc")}
            checked={draft.composerButtonIconOnly}
            disabled={!draft.showComposerButton}
            onChange={(v) => updateAndSave({ composerButtonIconOnly: v })}
          />
        </div>
        <ToggleRow
          label={T("pl.set.showPolishBtn")}
          desc={T("pl.set.showPolishBtnDesc")}
          checked={draft.showAIPolishButton}
          onChange={(v) => updateAndSave({ showAIPolishButton: v })}
        />
        {/* AI 优化按钮纯图标 / 图标+文字 切换（仅在显示 AI 优化按钮时可配置）；缩进从属于「聊天框显示 AI 优化按钮」 */}
        <div
          style={{
            paddingLeft: 14,
            borderLeft: `1px solid ${TONE.border}`,
            marginLeft: 6,
          }}
        >
          <ToggleRow
            label={T("pl.set.polishBtnIconOnly")}
            desc={T("pl.set.polishBtnIconOnlyDesc")}
            checked={draft.aiPolishButtonIconOnly}
            disabled={!draft.showAIPolishButton}
            onChange={(v) => updateAndSave({ aiPolishButtonIconOnly: v })}
          />
        </div>
        <ToggleRow
          label={T("pl.set.tildaTrigger")}
          desc={T("pl.set.tildaTriggerDesc")}
          checked={draft.tildaTriggerEnabled}
          onChange={(v) => updateAndSave({ tildaTriggerEnabled: v })}
        />
        <ToggleRow
          label={T("pl.set.selectionAdd")}
          desc={T("pl.set.selectionAddDesc")}
          checked={draft.selectionAddEnabled}
          onChange={(v) => updateAndSave({ selectionAddEnabled: v })}
        />
        <ToggleRow
          label={T("pl.set.contextRecommend")}
          desc={T("pl.set.contextRecommendDesc")}
          checked={draft.contextRecommendEnabled}
          onChange={(v) => updateAndSave({ contextRecommendEnabled: v })}
        />
        {/* 会话监控 / 会话预览 视图标签显隐 */}
        {/* <ToggleRow
         label={T("pl.set.monitorEnabled")}
         desc={T("pl.set.monitorEnabledDesc")}
         checked={draft.monitorEnabled}
         onChange={(v) => updateAndSave({ monitorEnabled: v })}
       />
      <ToggleRow
         label={T("pl.set.previewEnabled")}
         desc={T("pl.set.previewEnabledDesc")}
         checked={draft.previewEnabled}
         onChange={(v) => updateAndSave({ previewEnabled: v })}
       /> */}
      </ModuleCard>

      {/* 备份管理（独立卡片）：从「词库管理」面板迁移至此，集中管理自动备份设置/手动备份/备份文件恢复 */}
      <BackupModule t={t} />

      {/* 分类模块四：关于与更新 */}
      <ModuleCard
        title={T("pl.setModuleAboutUpdate")}
        desc={T("pl.setModuleAboutUpdateDesc")}
        open={openUpdate}
        onToggle={() => setOpenUpdate((v) => !v)}
      >
        <ToggleRow
          label={T("pl.set.autoUpdate")}
          desc={T("pl.set.autoUpdateDesc")}
          checked={draft.autoUpdateEnabled}
          onChange={(v) => updateAndSave({ autoUpdateEnabled: v })}
        />

        {/* 更新提醒：显示当前/最新版本，提供检查更新与立即更新 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "8px 0",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 13 }}>
                {T("pl.set.currentVersion")}
                {installedVer ? `（v${installedVer}）` : ""}
              </span>
              <button
                type="button"
                onClick={handleCheckUpdate}
                disabled={checking || updating}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  color: checking || updating ? TONE.quiet : TONE.text,
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 5,
                  cursor: checking || updating ? "default" : "pointer",
                }}
              >
                {checking
                  ? T("pl.set.updateChecking")
                  : T("pl.set.checkUpdate")}
              </button>
            </div>
          </div>

          {/* 版本信息状态行 */}
          {checking ? (
            <div style={{ fontSize: 11, color: TONE.quiet }}>
              {T("pl.set.updateChecking")}
            </div>
          ) : updating ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 11, color: TONE.accent }}>
                  {stageLabel(updateProgress)}
                </span>
                <span style={{ fontSize: 11, color: TONE.quiet }}>
                  {updateProgress ? `${updateProgress.percent}%` : ""}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${updateProgress?.percent ?? 0}%`,
                    background: TONE.accent,
                    borderRadius: 3,
                    transition: "width .24s cubic-bezier(.22,1,.36,1)",
                  }}
                />
              </div>
            </div>
          ) : updateInfo ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, color: TONE.quiet }}>
                {updateInfo.hasUpdate ? (
                  <span style={{ color: TONE.accent }}>
                    {T("pl.set.updateAvailable", {
                      version: updateInfo.latest,
                    })}
                  </span>
                ) : (
                  T("pl.set.updateLatest")
                )}
              </div>
              {updateInfo.hasUpdate && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className={plBtn("primary", "sm")}
                      onClick={handleApplyUpdate}
                      disabled={updating}
                    >
                      {updating ? T("pl.set.updating") : T("pl.set.updateNow")}
                    </Button>
                  </div>
                  {/* 更新前置提醒：更新安装后必须重启 dsh web 才会加载新版本 */}
                  <div
                    role="note"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                      padding: "6px 9px",
                      borderRadius: 5,
                      background: "rgba(245, 158, 11, 0.1)",
                      border: `1px solid ${TONE.border}`,
                      color: TONE.muted,
                      fontSize: 11,
                      lineHeight: 1.55,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      style={{
                        flexShrink: 0,
                        marginTop: 1,
                        color:
                          "var(--dsw-alias-state-warning-primary, #f59e0b)",
                      }}
                      aria-hidden="true"
                    >
                      <path
                        d="M8 2L1.5 13h13L8 2zM8 7v3M8 12.5v.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{T("pl.set.updateRequireRestartHint")}</span>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* 操作结果提示：持久显示，直到下次点击检查/更新 */}
          {updateMsg && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  color: updateMsg.ok ? TONE.success : TONE.red,
                  lineHeight: 1.5,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  style={{ flexShrink: 0 }}
                  aria-hidden="true"
                >
                  {updateMsg.ok ? (
                    <path
                      d="M3 8.5l3.2 3.2L13 4.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M8 4v5M8 11.5v.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <span>{updateMsg.text}</span>
              </div>
            </div>
          )}

          {/* 升级完成后提示：新代码已装，需重启服务才能生效（仅手动升级成功且尚未重启时显示） */}
          {needsRestart && (
            <div
              role="alert"
              style={{
                width: "100%",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 7,
                background:
                  "linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)",
                border:
                  "1px solid var(--dsw-alias-state-info-primary, rgba(59, 130, 246, 0.35))",
                color: TONE.text,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <strong style={{ fontSize: 12, fontWeight: 600 }}>
                  {T("pl.set.updateSuccessRestartTitle")}
                </strong>
                <span style={{ color: TONE.muted, fontSize: 11.5 }}>
                  {T("pl.set.updateSuccessRestartHint")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 分隔线 */}
        <div style={{ height: 1, background: TONE.border }} />

        {/* 关于信息：信息行、开源地址、版权注释 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            paddingTop: 2,
          }}
        >
          {/* 信息行（标签: 值，分隔布局） */}
          {(
            [
              [T("pl.about.author"), "master1Sun"],
              [T("pl.about.license"), "MIT"],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "6px 2px",
                borderBottom: `1px solid ${TONE.border}`,
              }}
            >
              <span style={{ fontSize: 12.5, color: TONE.quiet }}>{label}</span>
              <span style={{ fontSize: 12.5, color: TONE.text }}>{value}</span>
            </div>
          ))}
          {/* 开源地址行：右侧为可点击链接 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "6px 2px",
            }}
          >
            <span style={{ fontSize: 12.5, color: TONE.quiet }}>
              {T("pl.about.repo")}
            </span>
            <a
              href="https://github.com/master1Sun/dsh-prompt-library"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                color: TONE.accent,
                textDecoration: "none",
                fontSize: 12.5,
                opacity: 0.9,
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.9")}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0C5.37 0 0 5.4 0 12.06c0 5.33 3.44 9.84 8.21 11.43.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.53.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.25 2.88.12 3.18.77.84 1.23 1.92 1.23 3.23 0 4.62-2.81 5.64-5.49 5.94.43.38.81 1.12.81 2.26 0 1.63-.02 2.94-.02 3.34 0 .32.22.7.83.58A12.4 12.4 0 0 0 24 12.06C24 5.4 18.63 0 12 0z" />
              </svg>
              <span>github.com/master1Sun/dsh-prompt-library</span>
            </a>
          </div>

          {/* 版权注释（华为格式：版权所有 © 年份 作者 保留一切权利） */}
          <div
            aria-label="版权注释"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px dashed ${TONE.border}`,
              color: TONE.quiet,
              fontSize: 11,
              lineHeight: 1.55,
              textAlign: "center",
            }}
          >
            <span>
              {T("pl.about.copyright", {
                year: new Date().getFullYear(),
                author: "master1Sun",
              })}
            </span>
            <span>{T("pl.footer.disclaimer")}</span>
          </div>
        </div>
      </ModuleCard>
    </div>
  );
}
