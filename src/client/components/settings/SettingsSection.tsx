/**
 * 词库设置面板 — 注册到 harness 的 settings.section 插槽。
 *
 * 在 DSH 设置界面中显示插件的所有配置项：
 * - AI 默认模型（Provider / 模型选择）
 * - 面板宽度/高度自定义
 * - 词库菜单按钮、聊天框词库/AI 优化按钮显隐与仅图标
 * - # 键触发词库选择开关
 * - 上下文推荐、选中添加提示词开关
 * - 提示词最大存储数量
 * - 版本信息与更新入口
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
  getAiSelectables,
  getSettings,
  getVersion,
  updateSettings as apiUpdateSettings,
  type ClientAiSelectable,
} from "../../utils/api.js";
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
  const [openAiModel, setOpenAiModel] = useState(false);
  const [openPanel, setOpenPanel] = useState(false);
  const [openDisplay, setOpenDisplay] = useState(false);
  const [openAbout, setOpenAbout] = useState(false);
  // 系统中可用的 AI provider 及模型列表（来自 harness LLM 服务，设置界面下拉选择用）
  const [aiSelectables, setAiSelectables] = useState<ClientAiSelectable[]>([]);
  // 当前已安装版本号（从 /version 轻量读取，用于「关于」信息行展示，如 v0.9.5）
  const [installedVer, setInstalledVer] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // 拉取当前已安装版本号，供「关于」信息行展示（轻量本地接口）
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
      {/* 分类模块一：AI 模型（词库 AI 润色/完善的默认模型选择） */}
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
          max={10000}
          step={10}
          defaultValue={DEFAULT_SETTINGS.maxPromptCount}
          onChange={(v) => updateAndSave({ maxPromptCount: v })}
        />
      </ModuleCard>

      {/* 分类模块四：显示与交互 */}
      <ModuleCard
        title={T("pl.setModuleDisplay")}
        desc={T("pl.setModuleDisplayDesc")}
        open={openDisplay}
        onToggle={() => setOpenDisplay((v) => !v)}
      >
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
      </ModuleCard>

      {/* 分类模块五：关于（版本信息 + 开源地址 + 版权） */}
      <ModuleCard
        title={T("pl.setModuleAbout")}
        desc={T("pl.setModuleAboutDesc")}
        open={openAbout}
        onToggle={() => setOpenAbout((v) => !v)}
      >
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
              [
                T("pl.set.currentVersion"),
                installedVer ? `v${installedVer}` : "-",
              ],
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
