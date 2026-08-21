/**
 * 提示词库设置面板 — 注册到 harness 的 settings.section 插槽。
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
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { PluginSettings } from "../types.js";
import { DEFAULT_SETTINGS } from "../types.js";
import { getAiSelectables, getSettings, updateSettings as apiUpdateSettings, type ClientAiSelectable } from "./api.js";
import { type PLTranslate, usePLT } from "./i18n.js";

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
} as const;

/** 开关行组件。 */
function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): ReactNode {
  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        padding: "8px 0",
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <span style={{ fontSize: 11, color: TONE.quiet }}>{desc}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, cursor: "pointer", accentColor: TONE.accent }}
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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue?: number;
  onChange: (v: number) => void;
}): ReactNode {
  // 把数值限制回 [min, max] 区间
  const clamp = (v: number): number => {
    if (Number.isNaN(v)) return defaultValue ?? min;
    if (v < min) return min;
    if (v > max) return max;
    return v;
  };

  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "8px 0",
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
        onChange={(e) => {
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
        onBlur={() => onChange(clamp(value))}
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
}: {
  label: string;
  value: string;
  placeholder?: string;
  desc?: string;
  onChange: (v: string) => void;
}): ReactNode {
  return (
    <div style={{ padding: "8px 0" }}>
      <label
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13 }}>{label}</span>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
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
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  desc?: string;
}): ReactNode {
  return (
    <div style={{ padding: "8px 0" }}>
      <label
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13 }}>{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
      <div style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 4 }}>
        {/* 自动学习开关 */}
        <ToggleRow
          label={T("pl.set.autoLearn")}
          desc={T("pl.set.autoLearnDesc")}
          checked={draft.autoLearnEnabled}
          onChange={(v) => updateAndSave({ autoLearnEnabled: v })}
        />

        {/* 手动确认开关（仅在自动学习开启时可用） */}
        {draft.autoLearnEnabled && (
          <div style={{ paddingLeft: 0 }}>
            <ToggleRow
              label={T("pl.set.manualConfirm")}
              desc={T("pl.set.manualConfirmDesc")}
              checked={draft.autoLearnManualConfirm}
              onChange={(v) => updateAndSave({ autoLearnManualConfirm: v })}
            />
          </div>
        )}

        {/* 自动学习标签 */}
        {draft.autoLearnEnabled && (
          <div style={{ paddingLeft: 24 }}>
            <TextRow
              label={T("pl.set.autoLearnTag")}
              value={draft.autoLearnTag}
              placeholder="auto-learned"
              onChange={(v) => updateAndSave({ autoLearnTag: v })}
            />
            <NumberRow
              label={T("pl.set.minLength")}
              value={draft.autoLearnMinLength}
              min={20}
              max={500}
              step={10}
              onChange={(v) => updateAndSave({ autoLearnMinLength: v })}
            />

            {/* AI 智能完善开关（仅在自动学习开启时可用） */}
            <ToggleRow
              label={T("pl.set.aiEnrich")}
              desc={T("pl.set.aiEnrichDesc")}
              checked={draft.aiEnrichEnabled}
              onChange={(v) => updateAndSave({ aiEnrichEnabled: v })}
            />
            {draft.aiEnrichEnabled && (
              <div style={{ paddingLeft: 24 }}>
                <SelectRow
                  label={T("pl.set.aiProvider")}
                  value={draft.aiProvider}
                  options={providerOptions}
                  desc={T("pl.set.aiProviderDesc")}
                  onChange={(v) => updateAndSave({ aiProvider: v })}
                />
                <SelectRow
                  label={T("pl.set.aiModel")}
                  value={draft.aiModel}
                  options={modelOptions}
                  desc={T("pl.set.aiModelDesc")}
                  onChange={(v) => updateAndSave({ aiModel: v })}
                />
              </div>
            )}
          </div>
        )}

        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* 面板宽高设置 */}
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
        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* 提示词最大存储数量 */}
        <NumberRow
          label={T("pl.set.maxCount")}
          value={draft.maxPromptCount}
          min={10}
          max={1000}
          step={10}
          defaultValue={DEFAULT_SETTINGS.maxPromptCount}
          onChange={(v) => updateAndSave({ maxPromptCount: v })}
        />

        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* 右侧展开/折叠开关 */}
        <ToggleRow
          label={T("pl.set.rightPanel")}
          desc={T("pl.set.rightPanelDesc")}
          checked={draft.rightPanelEnabled}
          onChange={(v) => updateAndSave({ rightPanelEnabled: v })}
        />

        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* 聊天框按钮显隐开关 */}
        <ToggleRow
          label={T("pl.set.showComposerBtn")}
          desc={T("pl.set.showComposerBtnDesc")}
          checked={draft.showComposerButton}
          onChange={(v) => updateAndSave({ showComposerButton: v })}
        />

		<div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* AI 润色按钮显隐开关 */}
        <ToggleRow
          label={T("pl.set.showPolishBtn")}
          desc={T("pl.set.showPolishBtnDesc")}
          checked={draft.showAIPolishButton}
          onChange={(v) => updateAndSave({ showAIPolishButton: v })}
        />

        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* # 触发开关 */}
        <ToggleRow
          label={T("pl.set.tildaTrigger")}
          desc={T("pl.set.tildaTriggerDesc")}
          checked={draft.tildaTriggerEnabled}
          onChange={(v) => updateAndSave({ tildaTriggerEnabled: v })}
        />

        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* 鼠标移入显示详情开关 */}
        <ToggleRow
          label={T("pl.set.hoverDetail")}
          desc={T("pl.set.hoverDetailDesc")}
          checked={draft.hoverDetailEnabled}
          onChange={(v) => updateAndSave({ hoverDetailEnabled: v })}
        />

        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* 选中文字添加提示词开关 */}
        <ToggleRow
          label={T("pl.set.selectionAdd")}
          desc={T("pl.set.selectionAddDesc")}
          checked={draft.selectionAddEnabled}
          onChange={(v) => updateAndSave({ selectionAddEnabled: v })}
        />

        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* 实验室功能 */}
        <div style={{ padding: "4px 0", display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: TONE.accent,
              letterSpacing: 1,
            }}
          >
            {T("pl.set.lab")}
          </span>
          <span style={{ fontSize: 11, color: "#d89b8a", lineHeight: 1.5 }}>
            {T("pl.set.labWarning")}
          </span>
        </div>
        <ToggleRow
          label={T("pl.set.chatCharacter")}
          desc={T("pl.set.chatCharacterDesc")}
          checked={draft.applyCharacterToChat}
          onChange={(v) => updateAndSave({ applyCharacterToChat: v })}
        />
      </div>

      {/* 底部署名 */}
      <footer
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: "18px 0 12px",
          borderTop: `1px solid ${TONE.border}`,
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
      </footer>
    </div>
  );
}