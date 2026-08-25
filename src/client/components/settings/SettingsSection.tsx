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
import { type CSSProperties, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { PluginSettings } from "../../../types.js";
import { DEFAULT_SETTINGS } from "../../../types.js";
import {
  applyUpdate,
  getAiSelectables,
  getSettings,
  getUpdate,
  updateSettings as apiUpdateSettings,
  type ClientAiSelectable,
  type UpdateInfo,
} from "../../services/api.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../utils/button-style.js";
import { type PLTranslate, usePLT } from "../../i18n/i18n.js";

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
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {open && (
        <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
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
}: {
  label: string;
  value: string;
  placeholder?: string;
  desc?: string;
  onChange: (v: string) => void;
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
        <input
          type="text"
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
        <div style={{ fontSize: 11, color: TONE.quiet, marginTop: 4, lineHeight: 1.5 }}>
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
        <div style={{ fontSize: 11, color: TONE.quiet, marginTop: 4, lineHeight: 1.5 }}>
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
  const [selectables, setSelectables] = useState<ClientAiSelectable[]>([]);
  // 分类模块手风琴折叠状态（默认折叠，与「词库管理」保持一致）
  const [openLearn, setOpenLearn] = useState(false);
  const [openPanel, setOpenPanel] = useState(false);
  const [openDisplay, setOpenDisplay] = useState(false);
  const [openUpdate, setOpenUpdate] = useState(false);
  const [openLab, setOpenLab] = useState(false);
  // 更新提醒状态：updateInfo 为 null 表示尚未检查/检查失败
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => setDraft(s))
      .catch(() => { /* 使用默认值 */ })
      .finally(() => setLoading(false));
    // 加载系统 AI provider/模型列表，用于 AI Provider/模型下拉选择
    getAiSelectables()
      .then(setSelectables)
      .catch(() => setSelectables([]));
  }, []);

  // 保存设置到后台并通知其他组件
  const saveSettings = useCallback((next: PluginSettings) => {
    // 防抖：避免频繁写入
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

  // 手动检查更新（强制刷新 host 缓存）
  const handleCheckUpdate = useCallback(async () => {
    setChecking(true);
    setUpdateMsg(null);
    try {
      const info = await getUpdate();
      setUpdateInfo(info);
      if (!info.hasUpdate) {
        setUpdateMsg({ ok: true, text: T("pl.set.updateLatest") });
      }
    } catch {
      setUpdateMsg({ ok: false, text: T("pl.set.updateFail") });
    } finally {
      setChecking(false);
    }
  }, [T]);

  // 立即更新：执行安装命令，成功/失败均提示
  const handleApplyUpdate = useCallback(async () => {
    setUpdating(true);
    setUpdateMsg(null);
    try {
      const res = await applyUpdate();
      if (res.ok) {
        setUpdateMsg({ ok: true, text: T("pl.set.updateSuccess") });
        // 更新成功后刷新版本信息
        try {
          const info = await getUpdate();
          setUpdateInfo(info);
        } catch { /* 忽略 */ }
      } else {
        setUpdateMsg({ ok: false, text: T("pl.set.updateFail") });
      }
    } catch {
      setUpdateMsg({ ok: false, text: T("pl.set.updateFail") });
    } finally {
      setUpdating(false);
    }
  }, [T]);

  if (loading) {
    return (
      <div style={{ padding: 16, color: TONE.quiet, fontFamily: MONO, fontSize: 13 }}>
        {T("pl.loading")}
      </div>
    );
  }

  // 组装 AI Provider 下拉选项：系统列表 + “留空自动发现” + 若已保存值不在列表则保留
  const providerOptions: { value: string; label: string }[] = [{ value: "", label: T("pl.set.autoDiscover") }];
  for (const s of selectables) {
    if (s.provider && !providerOptions.some((o) => o.value === s.provider)) {
      providerOptions.push({ value: s.provider, label: s.name || s.provider });
    }
  }
  if (draft.aiProvider && !providerOptions.some((o) => o.value === draft.aiProvider)) {
    providerOptions.push({ value: draft.aiProvider, label: T("pl.set.notFound", { value: draft.aiProvider }) });
  }
  // 组装 AI 模型下拉选项：当前已选 provider 的模型列表 + “留空自动发现” + 已保存值不在列表则保留
  const activeProvider = selectables.find((s) => s.provider === draft.aiProvider);
  const modelOptions: { value: string; label: string }[] = [{ value: "", label: T("pl.set.autoDiscover") }];
  for (const m of activeProvider?.models ?? []) {
    if (m.id && !modelOptions.some((o) => o.value === m.id)) {
      modelOptions.push({ value: m.id, label: m.name || m.id });
    }
  }
  if (draft.aiModel && !modelOptions.some((o) => o.value === draft.aiModel)) {
    modelOptions.push({ value: draft.aiModel, label: T("pl.set.notFound", { value: draft.aiModel }) });
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
      <div style={{ padding: "2px 0 4px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, color: TONE.text, lineHeight: 1.2 }}>
          {T("pl.setSectionTitle")}
        </div>
        <span style={{ fontSize: 12, color: TONE.quiet, lineHeight: 1.5 }}>
          {T("pl.set.setSectionDesc")}
        </span>
      </div>
      {/* 分类模块一：自动学习 */}
      <ModuleCard
        title={T("pl.setModuleLearn")}
        desc={T("pl.setModuleLearnDesc")}
        open={openLearn}
        onToggle={() => setOpenLearn((v) => !v)}
      >
        <ToggleRow
          label={T("pl.set.autoLearn")}
          desc={T("pl.set.autoLearnDesc")}
          checked={draft.autoLearnEnabled}
          onChange={(v) => updateAndSave({ autoLearnEnabled: v })}
        />

        {/* 自动学习子项：保持缩进呈现父子层级；父开关关闭时只置灰，不改动真实保存值 */}
        <div
          style={{
            marginLeft: 22,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 手动确认开关 */}
          <ToggleRow
            label={T("pl.set.manualConfirm")}
            desc={T("pl.set.manualConfirmDesc")}
            checked={draft.autoLearnManualConfirm}
            disabled={!draft.autoLearnEnabled}
            onChange={(v) => updateAndSave({ autoLearnManualConfirm: v })}
          />

          {/* 自动学习标签 + 最小长度 */}
          <TextRow
            label={T("pl.set.autoLearnTag")}
            value={draft.autoLearnTag}
            placeholder="auto-learned"
            disabled={!draft.autoLearnEnabled}
            onChange={(v) => updateAndSave({ autoLearnTag: v })}
          />
          <NumberRow
            label={T("pl.set.minLength")}
            value={draft.autoLearnMinLength}
            min={20}
            max={500}
            step={10}
            disabled={!draft.autoLearnEnabled}
            onChange={(v) => updateAndSave({ autoLearnMinLength: v })}
          />

          {/* AI 智能完善（自动学习的二级父开关） */}
          <ToggleRow
            label={T("pl.set.aiEnrich")}
            desc={T("pl.set.aiEnrichDesc")}
            checked={draft.aiEnrichEnabled}
            disabled={!draft.autoLearnEnabled}
            onChange={(v) => updateAndSave({ aiEnrichEnabled: v })}
          />

          {/* AI 智能完善子项（Provider / Model）：AI 关闭或自动学习关闭都会置灰 */}
          <div
            style={{
              marginLeft: 22,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <SelectRow
              label={T("pl.set.aiProvider")}
              value={draft.aiProvider}
              options={providerOptions}
              desc={T("pl.set.aiProviderDesc")}
              disabled={!draft.autoLearnEnabled || !draft.aiEnrichEnabled}
              onChange={(v) => updateAndSave({ aiProvider: v })}
            />
            <SelectRow
              label={T("pl.set.aiModel")}
              value={draft.aiModel}
              options={modelOptions}
              desc={T("pl.set.aiModelDesc")}
              disabled={!draft.autoLearnEnabled || !draft.aiEnrichEnabled}
              onChange={(v) => updateAndSave({ aiModel: v })}
            />
          </div>
        </div>
      </ModuleCard>

      {/* 分类模块二：面板显示 */}
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
          max={1000}
          step={10}
          defaultValue={DEFAULT_SETTINGS.maxPromptCount}
          onChange={(v) => updateAndSave({ maxPromptCount: v })}
        />
        <NumberRow
          label={T("pl.set.personTipInterval")}
          value={draft.personTipInterval}
          min={5}
          max={60}
          step={1}
          defaultValue={DEFAULT_SETTINGS.personTipInterval}
          onChange={(v) => updateAndSave({ personTipInterval: v })}
        />
        <NumberRow
          label={T("pl.set.personTipDuration")}
          value={draft.personTipDuration}
          min={10}
          max={30}
          step={1}
          defaultValue={DEFAULT_SETTINGS.personTipDuration}
          onChange={(v) => updateAndSave({ personTipDuration: v })}
        />
      </ModuleCard>

      {/* 分类模块三：显示与交互 */}
      <ModuleCard
        title={T("pl.setModuleDisplay")}
        desc={T("pl.setModuleDisplayDesc")}
        open={openDisplay}
        onToggle={() => setOpenDisplay((v) => !v)}
      >
        {/* 词库助手显隐（主开关；关闭时子项仅灰显，不改动用户保存的值，重新打开时恢复） */}
        <ToggleRow
          label={T("pl.set.assistant")}
          desc={T("pl.set.assistantDesc")}
          checked={draft.assistantEnabled}
          onChange={(v) => updateAndSave({ assistantEnabled: v })}
        />
        {/* 词库助手子项：通过缩进呈现父子层级，不额外绘制连接线 */}
        <div
          style={{
            marginLeft: 22,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 公告控制：仅当词库助手显示时可开关，默认开启；关闭后双击词库助手不再弹出公告 */}
          <ToggleRow
            label={T("pl.set.announcement")}
            desc={T("pl.set.announcementDesc")}
            checked={draft.announcementEnabled}
            disabled={!draft.assistantEnabled}
            onChange={(v) => updateAndSave({ announcementEnabled: v })}
          />
          {/* 工具面板：仅当词库助手显示时可开关；关闭词库助手仅灰显，不改动真实保存值 */}
          <ToggleRow
            label={T("pl.set.rightPanel")}
            desc={T("pl.set.rightPanelDesc")}
            checked={draft.rightPanelEnabled}
            disabled={!draft.assistantEnabled}
            onChange={(v) => updateAndSave({ rightPanelEnabled: v })}
          />
        </div>
        <ToggleRow
          label={T("pl.set.showComposerBtn")}
          desc={T("pl.set.showComposerBtnDesc")}
          checked={draft.showComposerButton}
          onChange={(v) => updateAndSave({ showComposerButton: v })}
        />
        <ToggleRow
          label={T("pl.set.showPolishBtn")}
          desc={T("pl.set.showPolishBtnDesc")}
          checked={draft.showAIPolishButton}
          onChange={(v) => updateAndSave({ showAIPolishButton: v })}
        />
        <ToggleRow
          label={T("pl.set.tildaTrigger")}
          desc={T("pl.set.tildaTriggerDesc")}
          checked={draft.tildaTriggerEnabled}
          onChange={(v) => updateAndSave({ tildaTriggerEnabled: v })}
        />
        <ToggleRow
          label={T("pl.set.hoverDetail")}
          desc={T("pl.set.hoverDetailDesc")}
          checked={draft.hoverDetailEnabled}
          onChange={(v) => updateAndSave({ hoverDetailEnabled: v })}
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
      </ModuleCard>

      {/* 分类模块四：更新 */}
      <ModuleCard
        title={T("pl.setModuleUpdate")}
        desc={T("pl.setModuleUpdateDesc")}
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 13 }}>{T("pl.set.updateReminder")}</span>
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
              {checking ? T("pl.set.updateChecking") : T("pl.set.checkUpdate")}
            </button>
          </div>

          {/* 版本信息状态行 */}
          {checking ? (
            <div style={{ fontSize: 11, color: TONE.quiet }}>{T("pl.set.updateChecking")}</div>
          ) : updating ? (
            <div style={{ fontSize: 11, color: TONE.accent }}>{T("pl.set.updating")}</div>
          ) : updateInfo ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, color: TONE.quiet }}>
                {T("pl.set.updateCurrent", { version: updateInfo.current })}
                {updateInfo.hasUpdate && (
                  <span style={{ color: TONE.accent, marginLeft: 4 }}>
                    {T("pl.set.updateAvailable", { version: updateInfo.latest })}
                  </span>
                )}
              </div>
              {updateInfo.hasUpdate && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                      style={{ flexShrink: 0, marginTop: 1, color: "var(--dsw-alias-state-warning-primary, #f59e0b)" }}
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
              {/* 更新成功后显著提示：必须重启 dsh web 才会加载新版本代码 */}
              {updateMsg.ok && (
                <div
                  role="alert"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 7,
                    background:
                      "linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)",
                    border: "1px solid var(--dsw-alias-state-info-primary, rgba(59, 130, 246, 0.35))",
                    color: TONE.text,
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    style={{
                      flexShrink: 0,
                      marginTop: 1,
                      color: "var(--dsw-alias-state-info-primary, #3b82f6)",
                    }}
                    aria-hidden="true"
                  >
                    <path
                      d="M8 1.5A6.5 6.5 0 1 1 8 14.5 6.5 6.5 0 0 1 8 1.5zm0 2a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8zM6.5 7.5a.8.8 0 1 0 1.6 0V7a.8.8 0 0 0-1.6 0v.5zM7.2 6a.8.8 0 0 1 1.6 0v3.2a.8.8 0 0 1-1.6 0V6z"
                      fill="currentColor"
                    />
                  </svg>
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
          )}
        </div>
      </ModuleCard>

      {/* 分类模块五：实验室 */}
      <ModuleCard
        title={T("pl.setModuleLab")}
        desc={T("pl.setModuleLabDesc")}
        open={openLab}
        onToggle={() => setOpenLab((v) => !v)}
      >
        <ToggleRow
          label={T("pl.set.chatCharacter")}
          desc={T("pl.set.chatCharacterDesc")}
          checked={draft.applyCharacterToChat}
          onChange={(v) => updateAndSave({ applyCharacterToChat: v })}
        />
      </ModuleCard>

      {/* 底部署名 */}
      <footer
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: "18px 0 12px",
          marginTop: 16,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.3,
            color: TONE.text,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.4L5.7 21 8 13.8 2 9.2h7.6L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          master1Sun
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
            fontSize: 11,
            opacity: 0.9,
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.9")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.4 0 12.06c0 5.33 3.44 9.84 8.21 11.43.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.53.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.25 2.88.12 3.18.77.84 1.23 1.92 1.23 3.23 0 4.62-2.81 5.64-5.49 5.94.43.38.81 1.12.81 2.26 0 1.63-.02 2.94-.02 3.34 0 .32.22.7.83.58A12.4 12.4 0 0 0 24 12.06C24 5.4 18.63 0 12 0z" />
          </svg>
          <span>github.com/master1Sun/dsh-prompt-library</span>
        </a>

        {/* 版权信息（通用格式：© 年份 作者 · All rights reserved · License MIT · 免责声明） */}
        <div
          aria-label="版权信息"
          style={{
            width: "100%",
            marginTop: 8,
            paddingTop: 12,
            borderTop: `1px dashed ${TONE.border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            color: TONE.quiet,
            fontSize: 11,
            lineHeight: 1.55,
            textAlign: "center",
            fontFamily: MONO,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            <span>© {new Date().getFullYear()} master1Sun</span>
            <span aria-hidden="true">·</span>
            <span>All rights reserved</span>
            <span aria-hidden="true">·</span>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "1px 6px",
              borderRadius: 4,
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              fontWeight: 600,
              letterSpacing: 0.3,
              color: TONE.muted,
            }}>MIT</span>
          </div>
          <div>
            {T("pl.footer.disclaimer")}
          </div>
        </div>
      </footer>
    </div>
  );
}