/**
 * 单个标签选择组件：用原生 <select> 下拉框从已有标签中选择一个。
 *
 * - 值约定为单个标签名（受控），兼容历史 # 分隔数据（取首个）。
 * - 只能从已有标签候选中选择，不支持手动输入新建。
 * - 未选择时显示「（无标签）」占位；选择一个标签后即为当前值。
 */
import { type CSSProperties, type ReactNode } from "react";
import { type PLTranslate, usePLT } from "../utils/i18n.js";

interface Props {
  /** 单个标签（受控，可能包含 # 分隔的旧数据，取首个）。 */
  value: string;
  /** 值变化回调。 */
  onChange: (v: string) => void;
  /** 已有标签候选，用于下拉选择。 */
  suggestions: string[];
  /** 外层样式（颜色/边框/圆角等），组件据此构造外观。 */
  inputStyle: CSSProperties;
  /** 国际化翻译函数（可选，未传时回退中文）。 */
  t?: PLTranslate;
}

export function TagInput({ value, onChange, suggestions, inputStyle, t }: Props): ReactNode {
  const T = usePLT(t);
  // 已选标签：仅取第一个（单个标签），兼容历史 # 分隔数据
  const current = value.split("#").map((x) => x.trim()).filter(Boolean)[0] ?? "";
  return (
    <div style={{ width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 3 }}>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          ...inputStyle,
        }}
      >
        <option value="">{T("pl.tagsNoneSelect")}</option>
        {suggestions.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </select>
      {/* 标签操作提示（小字） */}
      <div
        style={{
          fontSize: 11,
          lineHeight: 1.5,
          color: "var(--dsw-alias-label-tertiary, #9ca3af)",
          padding: "0 2px",
          userSelect: "none",
        }}
      >
        {T("pl.tagsHint")}
      </div>
    </div>
  );
}

