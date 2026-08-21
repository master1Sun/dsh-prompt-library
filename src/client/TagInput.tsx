/**
 * 多选标签输入组件：已选标签以可移除的 chip 展示，输入时下拉选择已有标签。
 *
 * - 值约定为 # 分隔的标签串（受控），与原有存储兼容。
 * - 输入框内即时输入 + 下拉候选（按输入内容过滤，模糊包含匹配）。
 * - Enter / #：把当前输入提交为一个新标签；下拉展开且高亮时 Enter 选中候选。
 *   # 是分隔符，输入时连续键入 `#标签1#标签2` 即可快速选择多个标签。
 * - 点 chip 上的 × 或输入框为空时按退格：移除对应标签。
 * - 点击组件外部关闭下拉。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

const TONE = {
  border: "var(--dsw-alias-border-l2, rgba(17,24,39,0.12))",
  chipBg: "var(--dsw-alias-blue-soft-bg, rgba(142,197,255,0.14))",
  chipText: "var(--dsw-alias-label-primary, #1f2937)",
  highlight: "var(--dsw-alias-blue-soft-bg, rgba(142,197,255,0.22))",
} as const;

interface Props {
  /** # 分隔的标签串（受控）。 */
  value: string;
  /** 值变化回调。 */
  onChange: (v: string) => void;
  /** 已有标签候选，用于下拉提示。 */
  suggestions: string[];
  /** 输入框外层样式（颜色/边框/圆角等），组件据此构造外观。 */
  inputStyle: CSSProperties;
}

/**
 * 向上寻找最近的滚动容器（overflow-y 为 auto/scroll/overlay）。
 * 下拉若超出该容器可视区会被裁剪，故底部检测应以此容器为基准，而非整个视口。
 */
function getScrollParent(el: HTMLElement): HTMLElement {
  let p = el.parentElement as HTMLElement | null;
  while (p) {
    const s = getComputedStyle(p);
    if (/(auto|scroll|overlay)/.test(s.overflowY)) return p;
    p = p.parentElement;
  }
  return (document.scrollingElement ?? document.documentElement) as HTMLElement;
}

/**
 * 向上寻找最近的 fixed/absolute 定位包含块祖先（transform/filter/perspective/will-change）。
 * 下拉候选用 position:fixed 时，若存在这样的祖先，fixed 将相对它而非视口定位，
 * 需用它的边界盒折算坐标。
 */
function getFixedBase(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement as HTMLElement | null;
  while (p && p !== document.body) {
    const s = getComputedStyle(p);
    if (
      s.transform !== "none" ||
      s.perspective !== "none" ||
      s.filter !== "none" ||
      /transform/.test(s.willChange)
    ) {
      return p;
    }
    p = p.parentElement;
  }
  return null;
}

export function TagInput({ value, onChange, suggestions, inputStyle }: Props): ReactNode {
  const [open, setOpen] = useState(false);
  // 下拉固定定位（视口坐标折算后），选中标签引发 wrap 高度变化也不会让下拉跳动
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);
  const [hl, setHl] = useState(0);
  const [typed, setTyped] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 已选标签与当前输入片段（即正在输入的下一个标签）
  const tags = useMemo(
    () => value.split("#").map((x) => x.trim()).filter(Boolean),
    [value],
  );
  const kw = typed.trim().toLowerCase();

  // 候选：未选中、且包含输入片段的已有标签
  const options = useMemo(() => {
    const used = new Set(tags.map((x) => x.toLowerCase()));
    return suggestions
      .filter((t) => !used.has(t.toLowerCase()))
      .filter((t) => !kw || t.toLowerCase().includes(kw))
      .slice(0, 8);
  }, [suggestions, tags, kw]);

  // 点击组件外部关闭下拉
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // 计算下拉的固定定位：折算 fixed 包含块（transform 祖先）坐标，避免被 wrap 高度变化带动。
  const place = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap || !open || options.length === 0) {
      setPos(null);
      return;
    }
    const list = listRef.current;
    const wrapRect = wrap.getBoundingClientRect();
    const listH = list ? list.offsetHeight : 180;
    // 基准：最近的 transform 祖先作为 fixed 包含块，否则以视口为基准
    const base = getFixedBase(wrap);
    const originLeft = base ? base.getBoundingClientRect().left : 0;
    const originTop = base ? base.getBoundingClientRect().top : 0;
    // 以最近滚动容器可视区判断空间不足
    const container = getScrollParent(wrap);
    const cRect = container.getBoundingClientRect();
    const spaceBelow = cRect.bottom - wrapRect.bottom;
    const spaceAbove = wrapRect.top - cRect.top;
    const up = spaceBelow < listH + 10 && spaceAbove >= spaceBelow;
    const left = wrapRect.left - originLeft;
    const width = wrapRect.width;
    const top = (up ? wrapRect.top - listH - 3 : wrapRect.bottom + 3) - originTop;
    setPos({ top, left, width, up });
  }, [open, options.length]);

  // 打开时测定一次；此后仅响应滚动/窗口变化重算。
  // 注意只依赖 open：选中标签会使 place 引用变化，但不能因此重算位置，
  // 否则 wrap 高度变化仍会带动下拉跳动（fixed 位置在首次打开时已锁定）。
  useEffect(() => {
    if (!open || options.length === 0) {
      setPos(null);
      return;
    }
    place();
    // 等下拉真实高度出来后校正一次（避免估高与实测偏差）
    const raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 打开期间监听滚动与窗口尺寸变化，实时重算弹出位置
  useEffect(() => {
    if (!open || options.length === 0) return;
    const onScroll = () => place();
    const onResize = () => place();
    window.addEventListener("resize", onResize);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open, options.length, place]);

  // 追加一个标签（已存在则忽略）
  const commit = (label: string) => {
    const t = label.trim();
    if (!t) return;
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    onChange(tags.length ? `${tags.join("#")}#${t}` : t);
    setTyped("");
  };

  // 移除一个标签
  const remove = (label: string) => {
    onChange(tags.filter((x) => x !== label).join("#"));
  };

  // 提交输入框当前内容（回车/逗号屏——Enter 在下拉展开且高亮时优先选中候选）
  const commitTyped = () => {
    if (kw && options.length > 0 && options[hl]) {
      commit(options[hl]);
      setHl(0);
      return;
    }
    if (typed.trim()) {
      commit(typed);
      setHl(0);
    }
  };

  return (
    <div style={{ width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 3 }}>
    <div
      ref={wrapRef}
      onMouseDown={() => setTimeout(() => inputRef.current?.focus(), 0)}
      style={{
        position: "relative",
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        padding: "5px 8px",
        cursor: "text",
        ...inputStyle,
      }}
    >
      {/* 已选标签 chips */}
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "2px 6px 2px 9px",
            borderRadius: 6,
            fontSize: 12,
            lineHeight: 1.6,
            background: TONE.chipBg,
            color: TONE.chipText,
            whiteSpace: "nowrap",
          }}
        >
          {tag}
          <button
            type="button"
            aria-label={tag}
            onClick={(e) => { e.stopPropagation(); remove(tag); }}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              width: 14,
              height: 14,
              lineHeight: 1,
              fontSize: 14,
              color: "var(--dsw-alias-label-tertiary, #718096)",
              borderRadius: "50%",
            }}
          >
            {"\u00D7"}
          </button>
        </span>
      ))}

      {/* 下一个标签输入框 */}
      <input
        ref={inputRef}
        value={typed}
        onChange={(e) => { setTyped(e.target.value); setOpen(true); setHl(0); }}
        onFocus={() => { setOpen(true); setHl(0); }}
        onKeyDown={(e) => {
          // 输入为空时退格移除最后一个标签
          if (e.key === "Backspace" && !typed && tags.length > 0) {
            remove(tags[tags.length - 1]);
            return;
          }
          const hasOptions = open && options.length > 0;
          if (hasOptions) {
            if (e.key === "ArrowDown") { e.preventDefault(); setHl((h) => (h + 1) % options.length); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setHl((h) => (h - 1 + options.length) % options.length); return; }
            if (e.key === "Enter") { e.preventDefault(); commit(options[hl]); setHl(0); return; }
          }
          // Enter 或分隔符 # 提交当前输入作为新标签
          if (e.key === "Enter" || e.key === "#") {
            e.preventDefault();
            commitTyped();
            return;
          }
          if (e.key === "Escape") setOpen(false);
        }}
        style={{
          flex: "1 1 90px",
          minWidth: 0,
          border: 0,
          outline: "none",
          background: "transparent",
          fontFamily: (inputStyle.fontFamily as string) ?? undefined,
          fontSize: 13,
          color: "var(--dsw-alias-label-primary, #1f2937)",
        }}
      />

      {/* 下拉候选（fixed 固定定位，不随 wrap 高度变化跳动） */}
      {open && options.length > 0 && pos && (
        <div
          ref={listRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            boxSizing: "border-box",
            zIndex: 99999,
            maxHeight: 180,
            minHeight: 0,
            overflowY: "auto",
            background: "var(--dsh-alias-bg-layer-2, #ffffff)",
            border: `1px solid ${TONE.border}`,
            borderRadius: 7,
            boxShadow: "none",
          }}
        >
          {options.map((t, i) => (
            <div
              key={t}
              onMouseDown={(e) => {
                // 阻止冒泡到 wrap 的 focus 处理，避免触发光标重排与下拉方向重测造成抖动
                e.stopPropagation();
                e.preventDefault();
                commit(t);
                setHl(0);
              }}
              onMouseEnter={() => setHl(i)}
              style={{
                padding: "7px 10px",
                fontSize: 13,
                cursor: "pointer",
                color: "var(--dsw-alias-label-primary, #1f2937)",
                background: i === hl ? TONE.highlight : "transparent",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
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
      输入 # 分隔可一次添加多个标签（如「营销#汇报」）；回车或 # 确认，退格键或 × 删除
    </div>
    </div>
  );
}