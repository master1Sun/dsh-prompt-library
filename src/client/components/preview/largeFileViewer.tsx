/**
 * 大文本文件按行窗口的分页读取 + 虚拟滚动渲染。
 * 从 PreviewView 拆出：只渲染可视窗口，带滚动条与行号，向上/向下浏览自动拉新窗口。
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PLTranslate } from "../../utils/i18n.js";
import { readPreviewFileLines } from "../../utils/api.js";
import {
  S,
  BIG_LINE_H,
  BIG_WINDOW,
  BIG_LOAD_THRESHOLD,
} from "./previewShared.js";

/**
 * 按行窗口虚拟滚动查看器。
 * @param path 文件绝对路径。
 * @param totalHint 后端预读给出的总行数（truncated 时有效）。
 * @param jumpLine 需要滚动定位到的行号（可选）。
 * @param t 翻译座位。
 */
export function LargeFileViewer({
  path,
  totalHint,
  jumpLine,
  t,
}: {
  path: string;
  totalHint?: number;
  jumpLine?: number | null;
  t: PLTranslate;
}): ReactNode {
  const [lines, setLines] = useState<string[]>([]);
  const [base, setBase] = useState(0);
  const [total, setTotal] = useState(totalHint ?? 0);
  const [fetching, setFetching] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const baseRef = useRef(0);
  const lenRef = useRef(0); // 当前已加载窗口的实际行数
  const reqRef = useRef(0);
  const pathRef = useRef(path);

  // 加载可视窗口。offset 为目标窗口起始行；scrollToLine 非空时在数据到达后把滚动条定位到该行。
  // 滚动时加载不重设 scrollTop，保持用户当前位置不变，仅替换占位高度下的行窗口，避免来回跳。
  const load = async (offset: number, scrollToLine?: number | null) => {
    const id = ++reqRef.current;
    setFetching(true);
    try {
      const d = await readPreviewFileLines(pathRef.current, Math.max(0, offset), BIG_WINDOW);
      if (id !== reqRef.current) return; // 过期请求丢弃，避免旧窗口覆盖新窗口
      setLines(d.lines);
      setBase(d.offset);
      baseRef.current = d.offset;
      lenRef.current = d.lines.length;
      if (d.total > 0) setTotal(d.total);
      if (scrollToLine != null && scrollToLine > 0 && scrollRef.current) {
        scrollRef.current.scrollTop = (scrollToLine - 1) * BIG_LINE_H;
      }
    } catch {
      /* 读取失败静默，等待下次滚动重试 */
    } finally {
      if (id === reqRef.current) setFetching(false);
    }
  };

  // 路径变化 → 重置并加载以目标行（或第 1 行）为中心的窗口
  useEffect(() => {
    pathRef.current = path;
    reqRef.current++;
    lenRef.current = 0;
    setBase(0);
    baseRef.current = 0;
    setLines([]);
    setTotal(totalHint ?? 0);
    const jl = jumpLine && jumpLine > 0 ? jumpLine : 1;
    // 目标行进入窗口中部，滚动条随后落到目标行
    load(Math.max(0, jl - 1 - Math.floor(BIG_WINDOW / 3)), jl);
    return () => {
      reqRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // 外部跳转请求变化 → 重新定位（用于全文搜索命中跳到指定行）
  useEffect(() => {
    if (jumpLine != null && jumpLine > 0) {
      load(Math.max(0, jumpLine - 1 - Math.floor(BIG_WINDOW / 3)), jumpLine);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpLine, path]);

  // 滚动：可见区临近/超出已加载窗口（上方或下方）时才拉新窗口，窗口内滚动无需重载。
  // 加载新窗口后不调整滚动位置，行按绝对定位落在真实行高位置，滚动即无缝衔接后续内容。
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const st = el.scrollTop;
    const viewH = el.clientHeight || 400;
    const firstVisible = Math.floor(st / BIG_LINE_H);
    const viewLines = Math.max(1, Math.ceil(viewH / BIG_LINE_H));
    const lastVisible = firstVisible + viewLines;
    // 可视区上方离窗口顶部太近 → 加载更早的窗口（滚动回看）
    if (baseRef.current > 0 && firstVisible - baseRef.current < BIG_LOAD_THRESHOLD) {
      load(Math.max(0, firstVisible - BIG_LOAD_THRESHOLD));
    } else if (lastVisible - (baseRef.current + lenRef.current) > -BIG_LOAD_THRESHOLD) {
      // 可视区下方临近/超出窗口底部 → 加载更晚的窗口（向后浏览）
      load(Math.max(0, firstVisible));
    }
  };

  return (
    <div className={`${S}-bigWrap`}>
      <div className={`${S}-bigBar`}>
        <span title={path}>{path}</span>
        <span className={`${S}-bigCount`}>
          {t?.("pl.preview.bigHints") ?? "大文件按行分片加载"} · {t?.("pl.preview.bigLines", { total }) ?? `${total} 行`}
        </span>
      </div>
      <div className={`${S}-bigBody`} ref={scrollRef} onScroll={onScroll}>
        {/* 占位高度 = 全文行数，保证滚动条可滚到末尾；窗口行绝对定位于各自真实行位置 */}
        <div style={{ height: Math.max(total, 1) * BIG_LINE_H, position: "relative" }}>
          {lines.map((ln, i) => (
            <div
              key={base + i}
              className={`${S}-bigLine`}
              data-line={base + i}
              style={{ position: "absolute", top: (base + i) * BIG_LINE_H, left: 0, right: 0 }}
            >
              <span className={`${S}-bigLineNo`}>{base + i + 1}</span>
              <span className={`${S}-bigLineText`}>{ln || " "}</span>
            </div>
          ))}
          {fetching && <div className={`${S}-bigLoading`}>…</div>}
        </div>
      </div>
    </div>
  );
}
