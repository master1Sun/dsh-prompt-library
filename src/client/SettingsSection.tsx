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
import { getSettings, updateSettings as apiUpdateSettings } from "./api.js";

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

/** 设置面板组件，修改后立即生效。 */
export function SettingsSection(): ReactNode {
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => setDraft(s))
      .catch(() => { /* 使用默认值 */ })
      .finally(() => setLoading(false));
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
        加载中…
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
      <div style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 4 }}>
        {/* 自动学习开关 */}
        <ToggleRow
          label="自动学习提示词"
          desc="输入复杂 prompt 时自动保存到词库"
          checked={draft.autoLearnEnabled}
          onChange={(v) => updateAndSave({ autoLearnEnabled: v })}
        />

        {/* 自动学习标签 */}
        {draft.autoLearnEnabled && (
          <div style={{ paddingLeft: 24 }}>
            <TextRow
              label="自动学习标签"
              value={draft.autoLearnTag}
              placeholder="auto-learned"
              onChange={(v) => updateAndSave({ autoLearnTag: v })}
            />
            <NumberRow
              label="最小学习长度"
              value={draft.autoLearnMinLength}
              min={20}
              max={500}
              step={10}
              onChange={(v) => updateAndSave({ autoLearnMinLength: v })}
            />

            {/* AI 智能完善开关（仅在自动学习开启时可用） */}
            <ToggleRow
              label="AI 智能完善"
              desc="自动学习时调用 harness AI 生成标题/标签/摘要并改写正文"
              checked={draft.aiEnrichEnabled}
              onChange={(v) => updateAndSave({ aiEnrichEnabled: v })}
            />
            {draft.aiEnrichEnabled && (
              <div style={{ paddingLeft: 24 }}>
                <TextRow
                  label="AI Provider"
                  value={draft.aiProvider}
                  placeholder="留空自动发现"
                  desc="模型服务供应商，例如 DeepSeek、OpenAI 兼容服务等；留空时自动发现首个可用的 provider。"
                  onChange={(v) => updateAndSave({ aiProvider: v })}
                />
                <TextRow
                  label="AI 模型"
                  value={draft.aiModel}
                  placeholder="留空自动发现"
                  desc="该 provider 下的模型 id，例如 DeepSeek-V4-Flash、DeepSeek-V4-Pro；留空时自动选择 id 含 deepseek 的模型。"
                  onChange={(v) => updateAndSave({ aiModel: v })}
                />
              </div>
            )}
          </div>
        )}

        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* 面板宽高设置 */}
        <NumberRow
          label="聊天框提示词面板宽度（px）"
          value={draft.panelWidth}
          min={300}
          max={700}
          step={10}
          onChange={(v) => updateAndSave({ panelWidth: v })}
        />
        <NumberRow
          label="聊天框提示词面板高度（px）"
          value={draft.panelHeight}
          min={300}
          max={800}
          step={10}
          onChange={(v) => updateAndSave({ panelHeight: v })}
        />
        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* 提示词最大存储数量 */}
        <NumberRow
          label="提示词最大存储数量(10-1000)"
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
          label="右侧侧边栏展开/折叠"
          desc="在右侧展开面板，支持折叠收起"
          checked={draft.rightPanelEnabled}
          onChange={(v) => updateAndSave({ rightPanelEnabled: v })}
        />

        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* 聊天框按钮显隐开关 */}
        <ToggleRow
          label="聊天框显示提示词按钮"
          desc="在输入框工具栏显示提示词库按钮"
          checked={draft.showComposerButton}
          onChange={(v) => updateAndSave({ showComposerButton: v })}
        />

        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* # 触发开关 */}
        <ToggleRow
          label="输入 # 触发词库选择"
          desc="在输入框中输入 # 时弹出词库选择"
          checked={draft.tildaTriggerEnabled}
          onChange={(v) => updateAndSave({ tildaTriggerEnabled: v })}
        />

        <div style={{ height: 1, background: TONE.border, margin: "8px 0" }} />

        {/* 鼠标移入显示详情开关 */}
        <ToggleRow
          label="鼠标移入显示详情"
          desc="鼠标移入提示词时显示完整详情"
          checked={draft.hoverDetailEnabled}
          onChange={(v) => updateAndSave({ hoverDetailEnabled: v })}
        />
      </div>

      {/* 底部署名 */}
      <footer
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          padding: "16px 0 8px",
          borderTop: `1px solid ${TONE.border}`,
          fontSize: 11,
          color: TONE.quiet,
          marginTop: 16,
        }}
      >
        <span>master1Sun</span>
        <a
          href="https://github.com/master1Sun/dsh-prompt-library"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: TONE.accent, textDecoration: "none" }}
        >
          GitHub:https://github.com/master1Sun/dsh-prompt-library
        </a>
      </footer>
    </div>
  );
}