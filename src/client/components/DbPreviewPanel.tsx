/**
 * 数据库可视化管理面板 — 词库左侧菜单「数据库」子视图。
 *
 * 浏览 prompt.db 并可执行可视化常规增删改查：
 * - 左侧列出全部业务表（含行数与列定义）；
 * - 右侧选表自动预览，新增 / 编辑直接在表格行内操作（单元格变输入框），
 *   每行操作列提供编辑 / 删除，顶部可「新增行」在末尾追加空行；
 * - 也保留一只读 SQL 查询框（仅允许 SELECT / WITH / PRAGMA / EXPLAIN）。
 * 涉及写操作时后端以主键精确定位单行，避免误改他人数据。
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  dbDelete,
  dbInsert,
  dbUpdate,
  listDbTables,
  queryDb,
  type DbQueryResult,
  type DbTableInfo,
} from "../utils/api.js";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../utils/button-style.js";
import { PL_DIALOG_CSS, PL_DIALOG_OVERLAY, PL_DIALOG } from "../utils/dialog-style.js";
import { getTone, useThemeSync } from "../utils/theme.js";
import { type PLKey, type PLTranslate, usePLT } from "../utils/i18n.js";
import { ConfirmDialog } from "./ConfirmDialog.js";

/** 表名 → 国际化描述键。覆盖已知业务表，其余表不显示描述。 */
const TABLE_DESC_KEYS: Partial<Record<string, PLKey>> = {
  prompts: "pl.db.tblDesc.prompts",
  tags: "pl.db.tblDesc.tags",
  trash: "pl.db.tblDesc.trash",
  meta: "pl.db.tblDesc.meta",
  usage_log: "pl.db.tblDesc.usageLog",
  personas: "pl.db.tblDesc.personas",
  persona_scope_bindings: "pl.db.tblDesc.personaScopeBindings",
  prompt_scope_bindings: "pl.db.tblDesc.promptScopeBindings",
  prompt_skill_links: "pl.db.tblDesc.promptSkillLinks",
  session_prompts: "pl.db.tblDesc.sessionPrompts",
  session_scope_bindings: "pl.db.tblDesc.sessionScopeBindings",
  newspapers: "pl.db.tblDesc.newspapers",
  pl_points_log: "pl.db.tblDesc.pointsLog",
  pl_achievement_progress: "pl.db.tblDesc.achievementProgress",
  stats_history: "pl.db.tblDesc.statsHistory",
};

/** SQL 语法快捷提示的关键字集合。 */
const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
  "DELETE", "CREATE", "TABLE", "ALTER", "DROP", "INDEX", "PRIMARY", "KEY",
  "REFERENCES", "NOT", "NULL", "AND", "OR", "LIKE", "IN", "IS", "BETWEEN",
  "LIMIT", "OFFSET", "ORDER", "BY", "GROUP", "HAVING", "DISTINCT", "AS",
  "ON", "JOIN", "INNER", "LEFT", "RIGHT", "OUTER", "CASE", "WHEN", "THEN",
  "ELSE", "END", "UNION", "ALL", "EXISTS", "ASC", "DESC", "COUNT", "SUM",
  "AVG", "MIN", "MAX", "PRAGMA", "EXPLAIN",
];
/** 出现在这些关键字后，应优先提示「表名」。 */
const FROM_KW = ["FROM", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "INTO", "UPDATE", "TABLE"];
/** 语法提示项。kind 用于区分 关键字 / 表 / 列，渲染不同颜色。 */
type SuggestionItem = { label: string; insert: string; hint?: string; kind: "kw" | "table" | "col" };

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

const RED = "var(--dsw-alias-state-error-primary, #f87171)";

/** 开发者模式密码弹窗的胶囊按钮样式（与官方 pl-btn--sm 同口径）。 */
const devPwBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--dsw-alias-border-l2)",
  outline: "none",
  height: 28,
  padding: "0 10px",
  fontSize: 12,
  lineHeight: 1,
  borderRadius: 14,
  cursor: "pointer",
  background: "transparent",
  transition:
    "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
};

/** 把单格值渲染为可读文本（对象/数组以 JSON 呈现）。 */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "string") return v.length > 400 ? `${v.slice(0, 400)}…` : v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** 列定义的最小形状（服务端返回的列字段）。 */
type ColLike = { name: string; type: string; notnull?: number; dflt?: string | null; pk?: number };

/** 依据列类型把用户输入的文本转换为合适的 SQLite 值。 */
function coerceValue(col: ColLike, s: string): unknown {
  const v = s.trim();
  if (v === "") return null;
  const t = (col.type ?? "").toLowerCase();
  if (/int|bool/i.test(t) && /^-?\d+$/.test(v)) return Number(v);
  if (/real|num|dec|double|float/i.test(t) && /^-?\d*\.?\d+(e[-+]?\d+)?$/i.test(v)) {
    return Number(v);
  }
  return v;
}

/** 是否为「自增主键」列：单一整数主键（SQLite 中为 rowid 别名），新增时留空由库自动生成。 */
function isAutoIncPk(col: ColLike, all: ColLike[]): boolean {
  const pkCols = all.filter((c) => (c.pk ?? 0) > 0);
  return pkCols.length === 1 && pkCols[0]!.name === col.name && /int/i.test((col.type ?? "").toLowerCase());
}

/** 从表中提取主键定位（列名 → 目标行值）；某列在当前结果中缺失则返回空数组。 */
function buildPk(keyCols: string[], row: Record<string, unknown>): Array<{ name: string; value: unknown }> {
  const pk: Array<{ name: string; value: unknown }> = [];
  for (const c of keyCols) {
    // rowid 别名表用 "__rowid" 承载行号，主键名仍为 rowid 以便后端定位
    const col = c === "rowid" ? "__rowid" : c;
    if (!(col in row)) return [];
    pk.push({ name: c, value: row[col] });
  }
  return pk;
}

/** 行内编辑状态：新增一行（表格末尾占位行）或编辑现有行。 */
type InlineEdit =
  | { type: "new" }
  | { type: "edit"; idx: number; pk: Array<{ name: string; value: unknown }> };

/** 数据库预览面板组件（词库左侧菜单「数据库」子视图）。 */
export function DbPreviewPanel(props: { t?: PLTranslate }): ReactNode {
  const { t } = props;
  const T = usePLT(t);
  useThemeSync(); // 订阅宿主主题变化，切换白天/黑夜时刷新主题色
  const TONE = getTone();

  const [tables, setTables] = useState<DbTableInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [sql, setSql] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DbQueryResult | null>(null);
  const [msg, setMsg] = useState<{ text: string; kind: "error" | "info" | "ok" } | null>(null);

  // 可视化增删改（行内编辑）
  const [selRow, setSelRow] = useState<number | null>(null);
  const [editing, setEditing] = useState<InlineEdit | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [writing, setWriting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  // 开发者模式：默认隐藏可视化增删改工具条与 SQL 查询行，点击开关后显示。
  // 开启需二次确认并输入密码，校验通过后才真正生效。
  const [devMode, setDevMode] = useState(false);
  const [devPwOpen, setDevPwOpen] = useState(false);
  const [devPw, setDevPw] = useState("");
  const [devPwWrong, setDevPwWrong] = useState(false);

  // SQL 语法快捷提示（自动补全）
  const sqlRef = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [hints, setHints] = useState<{ start: number; items: SuggestionItem[] } | null>(null);
  const [hintIdx, setHintIdx] = useState(0);

  // 点击开关：若为开启动作则弹窗校验，否则直接退出
  const onToggleDev = () => {
    if (devMode) {
      setDevMode(false);
    } else {
      setDevPw("");
      setDevPwWrong(false);
      setDevPwOpen(true);
    }
  };
  // 校验密码后再开启
  const onDevPwConfirm = () => {
    if (devPw === "prompt") {
      setDevPwOpen(false);
      setDevMode(true);
    } else {
      setDevPwWrong(true);
    }
  };

  const monoInput: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 8px",
    color: TONE.text,
    background: TONE.row,
    border: `1px solid ${TONE.border}`,
    borderRadius: 6,
    fontFamily: MONO,
    fontSize: 12,
    lineHeight: 1.4,
    outline: "none",
  };
  const ghostBtn: CSSProperties = { alignSelf: "center" };

  const fetchTables = useCallback(() => {
    return listDbTables().then(
      (rows) => setTables(rows),
      (e: unknown) => setMsg({ text: e instanceof Error ? e.message : String(e), kind: "error" }),
    );
  }, []);

  // 左列表刷新（带旋转动画反馈）
  const [refreshing, setRefreshing] = useState(false);
  const reloadTables = useCallback(() => {
    setRefreshing(true);
    fetchTables().finally(() => setRefreshing(false));
  }, [fetchTables]);

  // 每次进入面板重新拉取一次表清单，保证与其它入口数据一致
  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const selectedTable = useMemo(
    () => tables.find((x) => x.name === selected) ?? null,
    [tables, selected],
  );

  // 该表是否允许可视化增删改：有主键（含 rowid）且当前结果中包含这些列
  const keyCols = useMemo(() => selectedTable?.key ?? [], [selectedTable]);
  const editable = !!selectedTable?.editable;
  const rowPk = useMemo(() => {
    if (selRow == null || !result) return [];
    const row = result.rows[selRow];
    return row ? buildPk(keyCols, row) : [];
  }, [selRow, result, keyCols]);
  const canRowOps = editable && rowPk.length === keyCols.length && keyCols.length > 0;

  /** 加载某张表：填入查询并执行；rowid 主键表补选 rowid 用于行定位。 */
  const previewTable = useCallback(
    (name: string) => {
      setSelected(name);
      setEditing(null);
      setSelRow(null);
      setResult(null);
      setMsg(null);
      setRunning(true);
      // rowid 别名表（无显式主键）补选 rowid，用于编辑/删除时的行定位
      const query = `SELECT rowid AS __rowid, * FROM "${name}" LIMIT 100;`;
      setSql(query);
      queryDb(query).then(
        (res) => {
          setResult(res);
          setRunning(false);
        },
        (e: unknown) => {
          setMsg({ text: e instanceof Error ? e.message : String(e), kind: "error" });
          setResult(null);
          setRunning(false);
        },
      );
    },
    [],
  );

  /** 运行当前 SQL（只读查询）。 */
  const runQuery = useCallback(() => {
    const q = sql.trim();
    if (!q) {
      setMsg({ text: T("pl.db.sqlEmpty"), kind: "info" });
      return;
    }
    setSelRow(null);
    setEditing(null);
    setResult(null);
    setMsg(null);
    setRunning(true);
    queryDb(q).then(
      (res) => {
        setResult(res);
        setRunning(false);
      },
      (e: unknown) => {
        setMsg({ text: e instanceof Error ? e.message : String(e), kind: "error" });
        setResult(null);
        setRunning(false);
      },
    );
  }, [sql, T]);

  /** 依据光标位置计算语法提示（关键字 / 表名 / 列名）。 */
  const buildHints = useCallback(
    (value: string, pos: number): { start: number; items: SuggestionItem[] } | null => {
      if (!value || pos == null) return null;
      const before = value.slice(0, pos);
      const wordM = before.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
      let word = "";
      let start = pos;
      if (wordM) {
        word = wordM[1];
        start = pos - word.length;
      }
      const lower = word.toLowerCase();

      // 列提示：SELECT <表名>.<列>
      if (start > 0 && before[start - 1] === ".") {
        const t = before
          .slice(0, start - 1)
          .match(/([A-Za-z_][A-Za-z0-9_]*)\s*$/);
        const table = t ? tables.find((x) => x.name === t[1]) : null;
        if (table) {
          const items: SuggestionItem[] = [];
          for (const c of table.columns) {
            if (!word || c.name.toLowerCase().startsWith(lower)) {
              items.push({ label: c.name, insert: c.name, hint: c.type, kind: "col" });
            }
          }
          return items.length ? { start, items } : null;
        }
      }

      // 表名提示上下文：FROM / JOIN / INTO / UPDATE / TABLE …
      const head = before.slice(0, start);
      const prevM = head.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
      const prevKw = prevM ? prevM[1].toUpperCase() : "";
      const tableContext = FROM_KW.includes(prevKw);

      const items: SuggestionItem[] = [];
      if (tableContext) {
        for (const t of tables) {
          if (!word || t.name.toLowerCase().startsWith(lower)) {
            const descKey = TABLE_DESC_KEYS[t.name];
            items.push({
              label: t.name,
              insert: t.name,
              hint: descKey ? T(descKey) : "table",
              kind: "table",
            });
          }
        }
      } else if (word) {
        // 通用补全：关键字在前，表名 / 列名在后
        for (const k of SQL_KEYWORDS) {
          if (k.toLowerCase().startsWith(lower)) items.push({ label: k, insert: k, kind: "kw" });
        }
        for (const t of tables) {
          if (t.name.toLowerCase().startsWith(lower)) {
            items.push({ label: t.name, insert: t.name, hint: "table", kind: "table" });
          }
        }
        for (const t of tables) {
          for (const c of t.columns) {
            if (c.name.toLowerCase().startsWith(lower)) {
              items.push({ label: `${t.name}.${c.name}`, insert: c.name, hint: c.type, kind: "col" });
            }
          }
        }
      }
      if (!items.length) return null;
      return { start, items };
    },
    [tables, T],
  );

  /** 接受当前选中的提示项，插入光标处。 */
  const acceptHint = useCallback(() => {
    if (!hints || !sqlRef.current) return;
    const it = hints.items[hintIdx] ?? hints.items[0];
    if (!it) return;
    const el = sqlRef.current;
    const before = sql.slice(0, hints.start);
    const after = sql.slice(caret);
    const next = before + it.insert + after;
    const newCaret = before.length + it.insert.length;
    setSql(next);
    setCaret(newCaret);
    setHints(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newCaret, newCaret);
    });
  }, [hints, hintIdx, sql, caret]);

  /** 基于实时光标刷新提示。保留当前选中项，仅当数据变化时兜底收拢到合法范围。 */
  const refreshHints = useCallback(() => {
    const el = sqlRef.current;
    if (!el) return;
    const p = el.selectionStart;
    setCaret(p);
    const h = buildHints(el.value, p);
    setHints(h);
    setHintIdx((prev) => (h ? Math.min(prev, h.items.length - 1) : 0));
  }, [buildHints]);

  // 行内可编辑列：编辑 = 非主键列；新增 = 非自增主键列（留空由库生成）
  const editCols: ColLike[] = useMemo(() => {
    if (!selectedTable) return [];
    return editing?.type === "edit"
      ? selectedTable.columns.filter((c) => !keyCols.includes(c.name))
      : selectedTable.columns.filter((c) => !isAutoIncPk(c, selectedTable.columns));
  }, [selectedTable, editing, keyCols]);

  const editingIsNew = editing?.type === "new";

  /** 某行是否处于编辑态（含末尾新增占位行 = result.rows.length）。 */
  const isEditingRow = useCallback(
    (i: number) => {
      if (!editing) return false;
      if (editing.type === "edit") return editing.idx === i && i < (result?.rows.length ?? 0);
      return i === (result?.rows.length ?? 0);
    },
    [editing, result],
  );

  /** 新增一行：表格末尾追加空的可编辑行。 */
  const startCreate = useCallback(() => {
    if (!editable) {
      setMsg({ text: T("pl.db.notEditable"), kind: "info" });
      return;
    }
    setSelRow(null);
    setDraft({});
    setEditing({ type: "new" });
  }, [editable, T]);

  /** 编辑某行：该行各单元格转为输入框（行内操作列 / 工具条选中行共用）。 */
  const beginEdit = useCallback(
    (i: number) => {
      if (!result || !editable) return;
      const pkFor = keyCols.length > 0 ? buildPk(keyCols, result.rows[i] ?? {}) : [];
      if (keyCols.length === 0 || pkFor.length !== keyCols.length) {
        setMsg({ text: T("pl.db.notEditable"), kind: "info" });
        return;
      }
      const row = result.rows[i];
      const init: Record<string, string> = {};
      for (const c of editCols) {
        const v = row?.[c.name];
        init[c.name] = v == null ? "" : cellText(v);
      }
      setSelRow(i);
      setDraft(init);
      setEditing({ type: "edit", idx: i, pk: pkFor });
    },
    [result, editable, keyCols, editCols, T],
  );

  /** 编辑选中行（工具条）。 */
  const startEdit = useCallback(() => {
    if (!canRowOps || selRow == null) {
      setMsg({ text: T("pl.db.selectRowToEdit"), kind: "info" });
      return;
    }
    beginEdit(selRow);
  }, [canRowOps, selRow, beginEdit, T]);

  /** 取消编辑。 */
  const cancelEdit = useCallback(() => {
    setEditing(null);
    setDraft({});
  }, []);

  /** 保存行内编辑（新增 / 更新）。 */
  const saveEdit = useCallback(() => {
    if (!selectedTable || !editing) return;
    const isNew = editing.type === "new";
    const record: Record<string, unknown> = {};
    for (const c of editCols) record[c.name] = coerceValue(c, draft[c.name] ?? "");
    if (isNew && Object.keys(record).length === 0) {
      setMsg({ text: T("pl.db.noFields"), kind: "info" });
      return;
    }
    setWriting(true);
    const p = isNew
      ? dbInsert({ table: selectedTable.name, record })
      : dbUpdate({ table: selectedTable.name, pk: editing.pk, record });
    p.then(
      () => {
        setMsg({ text: T("pl.db.done"), kind: "ok" });
        setEditing(null);
        setDraft({});
        setWriting(false);
        // 刷新数据：重新执行当前预览 + 刷新表行数
        previewTable(selectedTable.name);
        fetchTables();
      },
      (e: unknown) => {
        setMsg({ text: e instanceof Error ? e.message : String(e), kind: "error" });
        setWriting(false);
      },
    );
  }, [selectedTable, editing, editCols, draft, T, previewTable, fetchTables]);

  /** 渲染单行：普通视图 / 编辑态（单元格变输入框）/ 新增占位行。 */
  const renderRow = (row: Record<string, unknown>, i: number, isNewRow: boolean): ReactNode => {
    const editingThis = isEditingRow(i);
    const selected = !editingThis && selRow === i;
    const rowClickable = editable && !editingThis;
    // 新增行时表内可能无数据（result.columns 为空），改用表结构定义出列
    const cols = isNewRow && selectedTable
      ? selectedTable.columns.map((c) => c.name)
      : (result?.columns ?? []);
    return (
      <tr
        key={i}
        onClick={rowClickable ? () => setSelRow(selected ? null : i) : undefined}
        title={rowClickable ? T("pl.db.clickRowToEdit") : undefined}
        style={{
          cursor: rowClickable ? "pointer" : "default",
          background:
            editingThis || selected
              ? TONE.accentSoft
              : i % 2 === 1
                ? TONE.row
                : "transparent",
        }}
      >
        {cols.map((col) => {
          const colDef = selectedTable?.columns.find((c) => c.name === col);
          const editableCell = editingThis && !!colDef && editCols.some((c) => c.name === col);
          // 编辑态可编辑列 → 输入框
          if (editableCell) {
            return (
              <td
                key={col}
                style={{
                  padding: "3px 6px",
                  borderBottom: `1px solid ${TONE.border}`,
                  borderRight: `1px solid ${TONE.border}`,
                  background: TONE.panel,
                  minWidth: 120,
                }}
              >
                <input
                  value={draft[col] ?? ""}
                  placeholder={colDef.type ? colDef.type : ""}
                  spellCheck={false}
                  onChange={(e) => setDraft({ ...draft, [col]: e.target.value })}
                  style={{ ...monoInput, padding: "4px 6px", fontSize: 11.5 }}
                />
              </td>
            );
          }
          // 其余单元格的展示文本
          let text: string;
          if (editingThis) {
            if (isNewRow) {
              // 新增占位：自增主键显示「自动」，仅 rowid 别名 / 系统列留空
              text =
                colDef && isAutoIncPk(colDef, selectedTable!.columns)
                  ? T("pl.db.auto")
                  : "";
            } else {
              text = cellText(row[col]);
            }
          } else {
            text = cellText(row[col]);
          }
          const isAutoPk = editingThis && isNewRow && !!colDef && isAutoIncPk(colDef, selectedTable!.columns);
          return (
            <td
              key={col}
              style={{
                padding: "5px 9px",
                borderBottom: `1px solid ${TONE.border}`,
                borderRight: `1px solid ${TONE.border}`,
                color: isAutoPk ? TONE.muted : TONE.text,
                maxWidth: 320,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={cellText(row[col])}
            >
              {text}
            </td>
          );
        })}
      </tr>
    );
  };

  /** 删除选中行。 */
  const doDelete = useCallback(() => {
    if (!selectedTable || !canRowOps) return;
    setWriting(true);
    dbDelete({ table: selectedTable.name, pk: rowPk }).then(
      () => {
        setMsg({ text: T("pl.db.deleteDone"), kind: "ok" });
        setConfirmDel(false);
        setSelRow(null);
        setWriting(false);
        previewTable(selectedTable.name);
        fetchTables();
      },
      (e: unknown) => {
        setMsg({ text: e instanceof Error ? e.message : String(e), kind: "error" });
        setWriting(false);
        setConfirmDel(false);
      },
    );
  }, [selectedTable, canRowOps, rowPk, T, previewTable, fetchTables]);

  const feedbackColor = msg?.kind === "error" ? TONE.red : msg?.kind === "ok" ? "#16a34a" : TONE.accent;

  // 结果表格列：有查询结果用结果列；空表新增时退化为表结构定义的列
  const tableCols: string[] =
    result && result.columns.length > 0
      ? result.columns
      : selectedTable
        ? selectedTable.columns.map((c) => c.name)
        : [];
  const showTable =
    !!selectedTable && (editingIsNew || (!!result && result.columns.length > 0));

  return (
    <>
      <style>{PL_DIALOG_CSS}</style>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 反馈信息行 */}
        {msg && (
          <div
            style={{
              flexShrink: 0,
              height: 18,
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: feedbackColor,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: feedbackColor,
              }}
            />
            {msg.text}
          </div>
        )}

        {/* 主区：左侧表清单，右侧查询与结果 */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 2 }}>
          {/* 左：表清单 */}
          <div
            style={{
              width: 190,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              background: TONE.panel,
              border: `1px solid ${TONE.border}`,
              borderRadius: 9,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 8px",
                borderBottom: `1px solid ${TONE.border}`,
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: 600,
                  color: TONE.text,
                  paddingLeft: 2,
                  lineHeight: 1.5,
                }}
              >
                {T("pl.db.tables")}
              </span>
              <button
                type="button"
                onClick={reloadTables}
                title={T("pl.db.refresh")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = TONE.row;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  background: "transparent",
                  borderRadius: 5,
                  cursor: "pointer",
                  color: TONE.muted,
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: refreshing ? "rotate(180deg)" : "none",
                    transition: "transform .3s ease",
                  }}
                >
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <polyline points="21 3 21 9 15 9" />
                </svg>
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 4 }}>
              {tables.length === 0 ? (
                <div style={{ padding: "8px", fontSize: 12, color: TONE.muted }}>
                  {T("pl.db.noTables")}
                </div>
              ) : (
                tables.map((tb) => {
                  const descKey = TABLE_DESC_KEYS[tb.name];
                  return (
                  <button
                    key={tb.name}
                    type="button"
                    onClick={() => previewTable(tb.name)}
                    style={{
                      display: "block",
                      width: "100%",
                      boxSizing: "border-box",
                      border: "none",
                      outline: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: MONO,
                      fontSize: 12,
                      padding: "6px 8px",
                      borderRadius: 6,
                      color: selected === tb.name ? TONE.accent : TONE.text,
                      background: selected === tb.name ? TONE.accentSoft : "transparent",
                      transition: "color .18s, background-color .18s",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tb.name}
                      </span>
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 10,
                          color: TONE.muted,
                          lineHeight: 1.6,
                        }}
                      >
                        {tb.rows}
                      </span>
                    </span>
                    {descKey && (
                      <span
                        style={{
                          display: "block",
                          fontSize: 10,
                          color: TONE.muted,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginTop: 1,
                          lineHeight: 1.5,
                        }}
                      >
                        {T(descKey)}
                      </span>
                    )}
                  </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 右：列定义 + 增删改工具 + 查询 + 结果 */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              background: TONE.panel,
              border: `1px solid ${TONE.border}`,
              borderRadius: 9,
              overflow: "hidden",
            }}
          >
            {/* 选中表信息头（表名 + 行数 + 列定义）与开发者模式开关 */}
            {selectedTable && (
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderBottom: `1px solid ${TONE.border}`,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    fontWeight: 600,
                    fontSize: 12.5,
                    color: TONE.text,
                    lineHeight: 1.4,
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedTable.name}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 10,
                    color: TONE.muted,
                    background: TONE.row,
                    border: `1px solid ${TONE.border}`,
                    borderRadius: 8,
                    padding: "0 6px",
                    lineHeight: 1.6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedTable.rows} {T("pl.db.rows")}
                </span>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflowX: "auto",
                    fontSize: 11,
                    color: TONE.muted,
                    fontFamily: MONO,
                    whiteSpace: "nowrap",
                    scrollbarWidth: "thin",
                  }}
                >
                  <span style={{ color: TONE.quiet }}>{T("pl.db.columns")}:</span>{" "}
                  {selectedTable.columns.map((c) =>
                    c.pk > 0 ? `${c.name}🔑` : c.name,
                  ).join(", ") || "-"}
                </div>
                <button
                  type="button"
                  onClick={onToggleDev}
                  style={{
                    flexShrink: 0,
                    cursor: "pointer",
                    border: `1px solid ${devMode ? TONE.accent : TONE.border}`,
                    background: devMode ? TONE.accentSoft : "transparent",
                    color: devMode ? TONE.accent : TONE.text,
                    borderRadius: 6,
                    padding: "2px 9px",
                    fontSize: 11,
                    lineHeight: 1.7,
                    fontFamily: MONO,
                    whiteSpace: "nowrap",
                  }}
                  title={devMode ? T("pl.db.devModeOff") : T("pl.db.devMode")}
                >
                  {devMode ? T("pl.db.devModeOn") : T("pl.db.devMode")}
                </button>
              </div>
            )}

            {/* 开发者区：可视化增删改工具条 */}
            {devMode && selectedTable && editable && (
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderBottom: `1px solid ${TONE.border}`,
                  background: TONE.row,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 600,
                    color: TONE.muted,
                    marginRight: 2,
                  }}
                >
                  {T("pl.db.toolLabel")}
                </span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className={plBtn("primary", "sm")}
                  onClick={startCreate}
                  disabled={writing || !!editing}
                  style={ghostBtn}
                >
                  {T("pl.db.add")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={plBtn("ghost", "sm")}
                  onClick={startEdit}
                  disabled={writing || !!editing || !canRowOps}
                  style={ghostBtn}
                >
                  {T("pl.db.edit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={plBtn("ghost", "sm")}
                  onClick={() => {
                    if (!canRowOps) {
                      setMsg({ text: T("pl.db.selectRowToEdit"), kind: "info" });
                      return;
                    }
                    setConfirmDel(true);
                  }}
                  disabled={writing || !!editing || !canRowOps}
                  style={{ ...ghostBtn, color: TONE.red }}
                >
                  {T("pl.db.del")}
                </Button>
                {editing && (
                  <>
                    <span
                      style={{
                        width: 1,
                        height: 14,
                        background: TONE.border,
                        margin: "0 2px",
                        flexShrink: 0,
                      }}
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className={plBtn("primary", "sm")}
                      onClick={saveEdit}
                      disabled={writing}
                      style={ghostBtn}
                    >
                      {T("pl.db.save")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={plBtn("ghost", "sm")}
                      onClick={cancelEdit}
                      disabled={writing}
                      style={ghostBtn}
                    >
                      {T("pl.db.cancel")}
                    </Button>
                  </>
                )}
                <span style={{ flex: 1 }} />
                {!editing && !canRowOps && (
                  <span style={{ fontSize: 11, color: TONE.muted }}>
                    ← {T("pl.db.clickRowToEdit")}
                  </span>
                )}
              </div>
            )}

            {/* SQL 输入 + 运行 */}
            {devMode && (
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  padding: "6px 10px",
                  borderBottom: `1px solid ${TONE.border}`,
                  background: TONE.row,
                }}
              >
                {/* SQL 标题行 + 常驻用法提示 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: TONE.text,
                      fontFamily: MONO,
                      whiteSpace: "nowrap",
                    }}
                  >
                    SQL
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: TONE.muted,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {T("pl.db.sqlHintTip")}
                  </span>
                </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "stretch",
                }}
              >
              <div
                style={{
                  position: "relative",
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <textarea
                  ref={sqlRef}
                  value={sql}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSql(v);
                    const p = e.target.selectionStart;
                    setCaret(p);
                    const h = buildHints(v, p);
                    setHints(h);
                    setHintIdx(0);
                  }}
                  onFocus={refreshHints}
                  onClick={refreshHints}
                  onKeyUp={refreshHints}
                  onBlur={() => setHints(null)}
                  onKeyDown={(e) => {
                    // 语法提示：方向键选择 / Enter·Tab 接受 / Esc 关闭
                    if (hints && hints.items.length) {
                      const len = hints.items.length;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHintIdx((hintIdx + 1) % len);
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHintIdx((hintIdx - 1 + len) % len);
                        return;
                      }
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault();
                        acceptHint();
                        return;
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setHints(null);
                        return;
                      }
                    }
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      setHints(null);
                      runQuery();
                    }
                    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                      // 单行 Enter 直接运行，Shift+Enter 换行
                      e.preventDefault();
                      runQuery();
                    }
                  }}
                  placeholder={`SELECT * FROM "prompts" WHERE title LIKE '%…%';`}
                  rows={2}
                  spellCheck={false}
                  style={{ ...monoInput, resize: "none" }}
                />
                {hints && hints.items.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      marginTop: 2,
                      maxHeight: 240,
                      overflowY: "auto",
                      background: TONE.panel,
                      border: `1px solid ${TONE.border}`,
                      borderRadius: 8,
                      boxShadow: "0 8px 24px rgba(0,0,0,.18)",
                    }}
                  >
                    {hints.items.map((it, i) => (
                      <button
                        key={`${it.kind}-${it.label}-${i}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setHintIdx(i);
                          acceptHint();
                        }}
                        onMouseEnter={() => setHintIdx(i)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "5px 10px",
                          border: "none",
                          background: i === hintIdx ? TONE.accentSoft : "transparent",
                          color: TONE.text,
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: 12,
                          fontFamily: MONO,
                        }}
                      >
                        <span style={{ color: it.kind === "kw" ? TONE.accent : TONE.text }}>
                          {it.label}
                        </span>
                        {it.hint && (
                          <span
                            style={{
                              marginLeft: "auto",
                              color: TONE.muted,
                              fontSize: 10,
                              whiteSpace: "nowrap",
                              maxWidth: 140,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {it.hint}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={plBtn("primary", "sm")}
                disabled={running}
                onClick={runQuery}
                style={{ alignSelf: "stretch" }}
              >
                {running ? T("pl.db.running") : T("pl.db.run")}
              </Button>
              </div>
              </div>
            )}
            {/* 查询结果表格（行内编辑，末尾可新增） */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              {showTable ? (
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "max-content",
                    minWidth: "100%",
                    fontSize: 11.5,
                    fontFamily: MONO,
                  }}
                >
                  <thead>
                    <tr>
                      {tableCols.map((col) => (
                        <th
                          key={col}
                          style={{
                            position: "sticky",
                            top: 0,
                            zIndex: 1,
                            textAlign: "left",
                            padding: "6px 9px",
                            background: TONE.panel,
                            borderBottom: `1px solid ${TONE.border}`,
                            borderRight: `1px solid ${TONE.border}`,
                            color: keyCols.includes(col) ? TONE.accent : TONE.quiet,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result && result.rows.map((row, i) => renderRow(row, i, false))}
                    {editingIsNew ? renderRow({}, result?.rows.length ?? 0, true) : null}
                  </tbody>
                </table>
              ) : result && result.columns.length === 0 && !result.truncated ? (
                <div style={{ padding: "10px", fontSize: 12, color: TONE.muted }}>
                  {T("pl.db.noRows")}
                </div>
              ) : !running && !result ? (
                <div style={{ padding: "10px", fontSize: 12, color: TONE.muted }}>
                  {T("pl.db.hint")}
                </div>
              ) : null}
              {result?.truncated && (
                <div style={{ padding: "8px 10px", fontSize: 11, color: TONE.quiet }}>
                  {T("pl.db.truncated")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 删除二次确认 */}
        <ConfirmDialog
          open={confirmDel}
          danger
          message={T("pl.db.deleteConfirm")}
          confirmLabel={T("pl.db.del")}
          cancelLabel={T("pl.cancel")}
          onConfirm={doDelete}
          onCancel={() => setConfirmDel(false)}
        />

        {/* 开发者模式开启：二次确认 + 密码校验 */}
        {devPwOpen && (
          <>
            <style>{PL_DIALOG_CSS}</style>
            <div className={PL_DIALOG_OVERLAY}>
              <div
                role="dialog"
                aria-modal="true"
                className={PL_DIALOG}
                style={{ width: 360, maxWidth: "100%", gap: 14 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: TONE.text }}>
                  {T("pl.db.devPwTitle")}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: devPwWrong ? RED : TONE.muted,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {devPwWrong ? T("pl.db.devPwWrong") : T("pl.db.devPwMsg")}
                </div>
                <input
                  type="password"
                  value={devPw}
                  autoFocus
                  placeholder={T("pl.db.devPwPlaceholder")}
                  onChange={(e) => {
                    setDevPw(e.target.value);
                    if (devPwWrong) setDevPwWrong(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onDevPwConfirm();
                  }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    height: 30,
                    padding: "0 10px",
                    fontSize: 12,
                    color: TONE.text,
                    background: TONE.row,
                    border: `1px solid ${devPwWrong ? RED : TONE.border}`,
                    borderRadius: 8,
                    outline: "none",
                    fontFamily: MONO,
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    type="button"
                    style={{ ...devPwBtn, color: TONE.text }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                    onClick={() => setDevPwOpen(false)}
                  >
                    {T("pl.cancel")}
                  </button>
                  <button
                    type="button"
                    style={{
                      ...devPwBtn,
                      color: "var(--dsw-alias-brand-primary, #2563eb)",
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--dsw-alias-interactive-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                    onClick={onDevPwConfirm}
                  >
                    {T("pl.db.devPwConfirm")}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}