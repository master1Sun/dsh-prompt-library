/**
 * 词库搜索框（非实时过滤）。
 *
 * 左侧搜索图标，点击或按回车触发搜索；右侧清除图标一键清空。
 * 输入内容先暂存在草稿中，只有触发搜索后才生效，避免边输入边过滤。
 */
import type { CSSProperties, ReactNode, Ref } from "react";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 20%, transparent)",
} as const;

export interface SearchBoxProps {
  /** 输入框的当前内容（搜索草稿）。 */
  value: string;
  /** 输入内容变化。 */
  onChange: (v: string) => void;
  /** 按回车或点击搜索图标触发。 */
  onSearch: () => void;
  /** 点击清除图标，清空输入并将搜索词复位。 */
  onClear: () => void;
  placeholder?: string;
  inputRef?: Ref<HTMLInputElement>;
}

/** 标签过滤粒子的基础样式。 */
const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 25,
  padding: "0 8px",
  boxSizing: "border-box",
  maxWidth: 160,
  overflow: "hidden",
  textOverflow: "ellipsis",
  border: `1px solid ${TONE.border}`,
  borderRadius: 4,
  fontWeight: 500,
  fontSize: 11,
  lineHeight: 1,
  fontFamily: "inherit",
  letterSpacing: "0.2px",
  whiteSpace: "nowrap",
  appearance: "none",
  cursor: "pointer",
  userSelect: "none",
  transition: "background 0.18s ease, color 0.18s ease, border-color 0.18s ease",
};

/** 标签过滤条容器的统一间距。 */
const barStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  columnGap: 6,
  rowGap: 6,
  marginTop: 8,
  maxHeight: 56,
  overflowY: "auto",
};

/**
 * 标签过滤条：一组可点击的标签粒子，单选过滤。
 * 「全部」表示不过滤；点击已选中的标签可取消选择。
 */
export function TagFilterBar(props: {
  tags: string[];
  active: string;
  onChange: (tag: string) => void;
  allLabel?: string;
}): ReactNode {
  const { tags, active, onChange, allLabel } = props;
  const chip = (selected: boolean): CSSProperties => ({
    ...chipStyle,
    background: selected ? TONE.accentSoft : TONE.row,
    color: selected ? TONE.accent : TONE.text,
    borderColor: selected ? TONE.accent : TONE.border,
  });
  return (
    <div style={barStyle}>
      <button type="button" onClick={() => onChange("")} style={chip(active === "")}>
        {allLabel ?? "全部"}
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onChange(active === tag ? "" : tag)}
          title={tag}
          style={chip(active === tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

/**
 * 关键词高亮：把 text 中与 query（不含空格、忽略大小写）匹配的子串高亮显示。
 * query 为空时原样返回文本。用于列表标题/正文的搜索结果高亮。
 */
export function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  const q = query?.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;
  for (;;) {
    const idx = lower.indexOf(ql, i);
    if (idx === -1) {
      nodes.push(text.slice(i));
      break;
    }
    if (idx > i) nodes.push(text.slice(i, idx));
    nodes.push(
      <mark
        key={key++}
        style={{
          background: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 26%, transparent)",
          color: "inherit",
          borderRadius: 3,
          padding: "0 1px",
        }}
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
  }
  return <>{nodes}</>;
}

export function SearchBox({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder,
  inputRef,
}: SearchBoxProps) {
  const hasText = value.length > 0;
  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* 左侧搜索图标（可点击触发搜索） */}
      <button
        type="button"
        title="搜索"
        onClick={onSearch}
        aria-label="搜索"
        style={{
          position: "absolute",
          left: 8,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          color: hasText ? TONE.accent : TONE.quiet,
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </button>

      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch();
        }}
        placeholder={placeholder ?? "搜索"}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "7px 30px 7px 28px",
          color: TONE.text,
          background: TONE.row,
          border: `1px solid ${TONE.border}`,
          borderRadius: 7,
          fontFamily: MONO,
          fontSize: 13,
          outline: "none",
        }}
      />

      {/* 右侧清除图标（有内容时才显示） */}
      {hasText && (
        <button
          type="button"
          title="清除"
          aria-label="清除"
          onClick={onClear}
          style={{
            position: "absolute",
            right: 7,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            padding: 0,
            color: TONE.quiet,
            background: "transparent",
            border: "none",
            borderRadius: "50%",
            cursor: "pointer",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}