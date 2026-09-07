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
  height: 24,
  padding: "0 10px",
  boxSizing: "border-box",
  // 固定最大宽度：内容过长时配合内层 span 显示省略号，避免撑破/换行
  maxWidth: 150,
  overflow: "hidden",
  border: `1px solid ${TONE.border}`,
  borderRadius: 999,
  fontWeight: 500,
  fontSize: 11,
  lineHeight: 1,
  fontFamily: "inherit",
  letterSpacing: "0.2px",
  whiteSpace: "nowrap",
  appearance: "none",
  cursor: "pointer",
  userSelect: "none",
  transition:
    "background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease",
};

/** 标签文本容器：在 flex 布局中可收缩，过长时以省略号截断。 */
const chipTextStyle: CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

/** 标签过滤条容器的统一间距。 */
const barStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  columnGap: 8,
  rowGap: 8,
  marginTop: 10,
  paddingBottom: 2,
};

/** 图钉图标：用于「被钉选」的标签。 */
function PinIcon(): ReactNode {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ marginRight: 4, flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
    </svg>
  );
}

/**
 * 标签过滤条：一组可点击的标签粒子，单选过滤。
 * 「全部」表示不过滤；点击已选中的标签可取消选择。
 * 选中的标签呈「图钉钉住」效果：带图钉图标、轻微上浮与投影。
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
    // pin 效果：选中标签轻微上浮、带投影，像被图钉钉在过滤条上
    transform: selected ? "translateY(-1px)" : "none",
    boxShadow: selected ? "0 2px 6px rgba(15, 23, 42, 0.18)" : "none",
    padding: selected ? "0 7px 0 6px" : "0 8px",
  });
  return (
    <div style={barStyle}>
      <button type="button" onClick={() => onChange("")} style={chip(active === "")}>
        {active === "" && <PinIcon />}
        <span style={chipTextStyle}>{allLabel ?? "全部"}</span>
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onChange(active === tag ? "" : tag)}
          data-tip={tag}
          style={chip(active === tag)}
        >
          {active === tag && <PinIcon />}
          <span style={chipTextStyle}>{tag}</span>
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
        data-tip="搜索"
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
        className="pl-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch();
        }}
        placeholder={placeholder ?? "搜索"}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 30px 8px 28px",
          color: TONE.text,
          background: TONE.row,
          border: `1px solid ${TONE.border}`,
          borderRadius: 9,
          fontFamily: MONO,
          fontSize: 13,
          outline: "none",
        }}
      />

      {/* 右侧清除图标（有内容时才显示） */}
      {hasText && (
        <button
          type="button"
          data-tip="清除"
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