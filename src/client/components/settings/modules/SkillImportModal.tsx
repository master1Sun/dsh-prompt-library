/**
 * 技能导入弹窗 — 从本地 md 文件或 ~/.dsh/skills 目录导入技能为提示词。
 *
 * - 「选择本地 md 文件」逐份解析导入（frontmatter + 正文 → 标题 / 摘要 / 正文）；
 * - 「扫描 Skills 目录」批量列出可导入技能；
 * - 每条目可编辑标题 / 摘要 / 正文，正文支持插入 {{变量名}} 占位符；
 * - 「校验」检查必填项与模板变量括号配对，只有校验通过后才能保存入库。
 *
 * 弹窗只能通过关闭按钮或保存/取消操作手动关闭，不响应遮罩点击。
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { plBtn } from "../../../utils/button-style.js";
import { type PLT, type PLTranslate, usePLT } from "../../../i18n/i18n.js";
import {
  describeSkill,
  exportSkillEntries,
  importSkillEntries,
  listAvailableSkills,
  parseSkillRaw,
  type SkillDescribeFail,
  type SkillEntry,
  type SkillExportResult,
} from "../../../services/api.js";
import { notifyDataChanged } from "../../../services/data-sync.js";
import { insertVariableAt } from "../../common/TemplateVariables.js";

const MONO =
  'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';

const TONE = {
  text: "var(--dsw-alias-label-primary, #f2f6fc)",
  muted: "var(--dsw-alias-label-secondary, #9daabd)",
  quiet: "var(--dsw-alias-label-tertiary, #718096)",
  panel: "var(--dsw-alias-bg-layer-1, #171f2b)",
  row: "var(--dsw-alias-bg-layer-3, #1d2735)",
  border: "var(--dsw-alias-border-l2, rgba(196, 211, 232, 0.16))",
  borderStrong: "var(--dsw-alias-border-l3, rgba(196, 211, 232, 0.31))",
  accent: "var(--dsw-alias-brand-primary, #8ec5ff)",
  success: "var(--dsw-alias-state-success-primary, #78dda0)",
  red: "var(--dsw-alias-state-error-primary, #ff6b6b)",
} as const;

/** 弹窗内单条可编辑条目。 */
interface EditableEntry {
  /** 唯一标识：来源前缀 + 技能名（导出模式为提示词 id）。 */
  key: string;
  /** 技能名（kebab-case），保存时用于关联 / 覆盖判断。 */
  name: string;
  /** 来源提示词 id（导出模式用于复用已关联技能名）。 */
  promptId?: string;
  title: string;
  body: string;
  summary: string;
  /** 同名技能是否已入库（重复导入时覆盖更新）。 */
  exists: boolean;
  /** 来源：本地文件 / Skills 目录 / 词库导出 / 自定义 JSON。 */
  source: "file" | "disk" | "export" | "json";
  checked: boolean;
  /** 导出模式：AI 校验后是否生成失败（用于行内红色高亮与提示）。 */
  aiFailed?: boolean;
  /** 导出模式：AI 生成失败原因（本地化文案，行内展示）。 */
  aiFailReason?: string;
}

/** 单条校验问题。 */
interface EntryIssue {
  /** 所属条目 key。 */
  key: string;
  /** 所属条目标题（用于展示定位）。 */
  entryTitle: string;
  /** 问题描述。 */
  message: string;
  /** 是否可一键自动修复。 */
  fixable: boolean;
}

/** 校验结果：是否通过 + 问题清单 + 是否可一键修复。 */
interface ValidateResult {
  ok: boolean;
  issues: EntryIssue[];
  fixable: boolean;
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 9px",
  color: TONE.text,
  background: TONE.row,
  border: `1px solid ${TONE.border}`,
  borderRadius: 7,
  fontFamily: MONO,
  fontSize: 13,
  outline: "none",
};

/** 把本地文件名收敛为合法的小写 kebab-case 技能名（兜底用固定名）。 */
function kebabFromName(raw: string, fallback: number): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || `skill-file-${fallback}`;
}

/** 把 kebab-case 技能名转成可读标题（如 prompt-writing → Prompt Writing）；空名返回空串。 */
function readableFromName(name: string): string {
  const words = name
    .trim()
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** 把 AI 生成失败原因码转为本地化提示文案。 */
function skillFailReason(fail: SkillDescribeFail | undefined, T: PLTranslate): string {
  switch (fail) {
    case "no-llm":
      return T("pl.skillModal.aiUnavailable");
    case "route":
      return T("pl.skillModal.aiNoRoute");
    case "empty":
      return T("pl.skillModal.aiEmpty");
    case "parse":
      return T("pl.skillModal.aiParse");
    default:
      return T("pl.skillModal.aiUnavailable");
  }
}

/** 从自定义 JSON 数据解析技能条目：支持顶层数组，或 { skills | entries | prompts } 列表。
 * 每条需含 title 与 body，name/summary/promptId 可选；非法条目自动跳过。 */
function parseJsonSkillEntries(raw: unknown): Array<{
  name?: string;
  promptId?: string;
  title: string;
  body: string;
  summary?: string;
}> {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : undefined;
  const list = Array.isArray(raw)
    ? raw
    : obj
      ? (obj.skills ?? obj.entries ?? obj.prompts)
      : undefined;
  if (!Array.isArray(list)) return [];
  const out: Array<{ name?: string; promptId?: string; title: string; body: string; summary?: string }> =
    [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    if (typeof it.title !== "string" || !it.title.trim()) continue;
    if (typeof it.body !== "string" || !it.body.trim()) continue;
    out.push({
      title: it.title.trim(),
      body: it.body,
      ...(typeof it.name === "string" && it.name.trim() ? { name: it.name.trim() } : {}),
      ...(typeof it.summary === "string" && it.summary.trim() ? { summary: it.summary.trim() } : {}),
      ...(typeof it.promptId === "string" && it.promptId.trim()
        ? { promptId: it.promptId.trim() }
        : {}),
    });
  }
  return out;
}

/** 自动修复正文中的模板变量格式：
 * - 未闭合的 {{ 补全为 {{默认变量}}；
 * - 多余的 }} 移除；
 * - 空的 {{}} 填入默认变量；
 * - 非法变量名去除 {} 与换行。 */
function fixTemplateVars(body: string, defaultVar: string): string {
  let out = "";
  let i = 0;
  const n = body.length;
  while (i < n) {
    if (body.startsWith("{{", i)) {
      const close = body.indexOf("}}", i + 2);
      if (close === -1) {
        out += `{{${defaultVar}}}`;
        i += 2;
        continue;
      }
      let inner = body.slice(i + 2, close).trim();
      if (!inner) inner = defaultVar;
      else {
        inner = inner.replace(/[{}\n]/g, "").trim();
        if (!inner) inner = defaultVar;
      }
      out += `{{${inner}}}`;
      i = close + 2;
      continue;
    }
    if (body.startsWith("}}", i)) {
      i += 2;
      continue;
    }
    out += body[i];
    i += 1;
  }
  return out;
}

/** 一键修复单条条目：补全空标题、修复正文模板变量；返回修复后的条目 + 修复记录。 */
function autoFixEntry(entry: EditableEntry, T: PLT): { entry: EditableEntry; fixes: string[] } {
  const fixes: string[] = [];
  let title = entry.title.trim();
  if (!title) {
    title = readableFromName(entry.name) || T("pl.skillModal.unnamed");
    fixes.push(T("pl.skillModal.fixTitle", { title }));
  }
  let body = entry.body;
  if (body.trim()) {
    const fixed = fixTemplateVars(body, T("pl.skillModal.varFixDefault"));
    if (fixed !== body) {
      body = fixed;
      fixes.push(T("pl.skillModal.fixBodyVars"));
    }
  }
  return { entry: { ...entry, title, body }, fixes };
}

/** 技能导入/导出弹窗组件。 */
export function SkillImportModal(props: {
  open: boolean;
  onClose: () => void;
  t?: PLTranslate;
  /** 模式：import（技能→提示词入库）/ export（提示词→技能写盘）。 */
  mode?: "import" | "export";
  /** 导出模式的初始条目（由勾选的提示词转换而来）。 */
  initialEntries?: Array<{
    promptId: string;
    name?: string;
    title: string;
    body: string;
    summary?: string;
  }>;
  /** 导出成功回调（用于管理面板展示结果）。 */
  onExported?: (result: SkillExportResult) => void;
}): ReactNode {
  const { open, onClose, t, mode = "import", initialEntries, onExported } = props;
  const T = usePLT(t);
  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [fixLog, setFixLog] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  // 导出模式 AI 校验状态：idle 未触发 / running 生成中 / done 已生成
  const [aiState, setAiState] = useState<"idle" | "running" | "done">("idle");
  // 导出模式 AI 校验结果：成功条数 + 失败清单（skipped 表示校验未通过未执行 AI）
  const [aiResult, setAiResult] = useState<{
    done: number;
    errors: { title: string; reason: string }[];
    skipped?: boolean;
  } | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // 导出模式：自定义 JSON 数据文件输入
  const jsonRef = useRef<HTMLInputElement | null>(null);
  const bodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const seqRef = useRef(0);
  // 每个条目的折叠状态（key → 是否折叠），默认展开
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // 打开弹窗时重置上次的状态；导入模式自动扫描一次 Skills 目录，导出模式加载勾选的词库条目
  useEffect(() => {
    if (!open) return;
    setEntries([]);
    setValidation(null);
    setFixLog([]);
    setMsg(null);
    setCollapsed({});
    setAiState("idle");
    setAiResult(null);
    if (mode === "export") {
      addEntries(
        (initialEntries ?? []).map((e) => ({
          name: e.name ?? "",
          promptId: e.promptId,
          title: e.title,
          body: e.body,
          summary: e.summary ?? "",
          exists: false,
          source: "export" as const,
        })),
      );
      return;
    }
    listAvailableSkills().then(
      (list) => {
        if (list.length === 0) return;
        addEntries(
          list.map((s) => ({
            name: s.name,
            title: s.title,
            body: s.body,
            summary: s.summary,
            exists: s.exists,
            source: "disk" as const,
          })),
        );
      },
      () => {
        /* 扫描失败静默，用户仍可通过「选择 md 文件」导入 */
      },
    );
  }, [open]);

  /** 批量追加条目（按 key 去重），并清空上次校验结果与修复记录。 */
  const addEntries = useCallback(
    (incoming: Array<Omit<EditableEntry, "key" | "checked">>) => {
      setEntries((prev) => {
        const next = [...prev];
        for (const it of incoming) {
          // 同一来源 + 同一标识（技能名 / promptId）已存在时跳过，避免重复扫描重复加入
          const ident = it.promptId ?? it.name;
          if (
            ident &&
            next.some((e) => e.source === it.source && (e.promptId ?? e.name) === ident)
          ) {
            continue;
          }
          let key = `${it.source}:${it.promptId ?? it.name}`;
          // 同源同名（如 JSON 条目未带 name）冲突时追加序号，保证每条独立可编辑
          while (next.some((e) => e.key === key)) {
            key = `${key}-${++seqRef.current}`;
          }
          // 标题为空时按当前语言兜底（如未命名技能 / Untitled skill）
          next.push({
            ...it,
            title: it.title.trim() || T("pl.skillModal.unnamed"),
            key,
            checked: true,
          });
        }
        return next;
      });
      setValidation(null);
      setFixLog([]);
    },
    [T],
  );

  /** 读取本地 md 文件并解析为一条可编辑条目。 */
  const onPickFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        if (!text.trim()) return;
        parseSkillRaw(text).then(
          (parsed) => {
            const base = file.name.replace(/\.md$/i, "");
            addEntries([
              {
                name: kebabFromName(base, ++seqRef.current),
                title: parsed.title || base,
                body: parsed.body,
                summary: parsed.summary,
                exists: false,
                source: "file",
              },
            ]);
          },
          (err: unknown) => {
            setMsg({
              text: T("pl.skillModal.fileError", {
                err: err instanceof Error ? err.message : String(err),
              }),
              error: true,
            });
          },
        );
      };
      reader.readAsText(file);
    },
    [addEntries, T],
  );

  /** 读取自定义 JSON 文件（数组或 skills/entries/prompts 列表）并追加为可编辑条目。 */
  const onPickJson = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        if (!text.trim()) return;
        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch (err) {
          setMsg({
            text: T("pl.skillModal.jsonError", {
              err: err instanceof Error ? err.message : String(err),
            }),
            error: true,
          });
          return;
        }
        const parsed = parseJsonSkillEntries(raw);
        if (parsed.length === 0) {
          setMsg({ text: T("pl.skillModal.jsonEmpty"), error: true });
          return;
        }
        addEntries(
          parsed.map((p) => ({
            name: p.name ?? "",
            promptId: p.promptId,
            title: p.title,
            body: p.body,
            summary: p.summary ?? "",
            exists: false,
            source: "json" as const,
          })),
        );
      };
      reader.readAsText(file);
    },
    [addEntries, T],
  );

  /** 手动扫描 Skills 目录，把可导入技能追加为条目。 */
  const scanSkills = useCallback(() => {
    listAvailableSkills().then(
      (list) => {
        if (list.length === 0) {
          setMsg({ text: T("pl.skillImportNone"), error: false });
          return;
        }
        addEntries(
          list.map((s) => ({
            name: s.name,
            title: s.title,
            body: s.body,
            summary: s.summary,
            exists: s.exists,
            source: "disk" as const,
          })),
        );
      },
      (err: unknown) => {
        setMsg({
          text: err instanceof Error ? err.message : String(err),
          error: true,
        });
      },
    );
  }, [addEntries, T]);

  /** 更新某条目字段；编辑会使之前的校验与修复记录失效。 */
  const updateEntry = useCallback((key: string, patch: Partial<EditableEntry>) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
    setValidation(null);
    setFixLog([]);
    setAiState("idle");
    setAiResult(null);
  }, []);

  /** 勾选 / 取消勾选条目。 */
  const toggleChecked = useCallback((key: string) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, checked: !e.checked } : e)));
  }, []);

  /** 移除条目。 */
  const removeEntry = useCallback((key: string) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
    setValidation(null);
    setFixLog([]);
    setAiState("idle");
    setAiResult(null);
  }, []);

  /** 折叠 / 展开单条技能框。 */
  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /** 在正文光标处插入 {{变量名}}（有选中文本时以选中内容作为变量名）。
   * 正文过长时先记住滚动位置，插入后恢复，避免内容跳回顶部。 */
  const insertVar = useCallback(
    (key: string) => {
      const entry = entries.find((e) => e.key === key);
      if (!entry) return;
      const textarea = bodyRefs.current[key] ?? null;
      const scrollTop = textarea?.scrollTop ?? 0;
      insertVariableAt(
        textarea,
        entry.body,
        (next) => {
          updateEntry(key, { body: next });
          // 状态更新重渲染 + 内部光标定位（两个 rAF）后再恢复滚动位置，
          // 避免内容较长时插入变量后跳回顶部
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (textarea) textarea.scrollTop = scrollTop;
            });
          });
        },
        T("pl.insertVariableDefault"),
      );
    },
    [entries, updateEntry, T],
  );

  /** 校验正文中的模板变量括号是否配对、变量名是否合法。 */
  const validateTemplateVars = useCallback(
    (body: string): string[] => {
      const errs: string[] = [];
      const opens: number[] = [];
      const re = /\{\{|\}\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        if (m[0] === "{{") {
          opens.push(m.index);
        } else {
          if (opens.length === 0) {
            errs.push(T("pl.skillModal.varUnmatched"));
            continue;
          }
          const start = opens.pop()!;
          const inner = body.slice(start + 2, m.index).trim();
          if (!inner) errs.push(T("pl.skillModal.varEmpty"));
          else if (/[{}\n]/.test(inner)) errs.push(T("pl.skillModal.varInvalid", { name: inner }));
        }
      }
      if (opens.length > 0) errs.push(T("pl.skillModal.varUnclosed", { n: opens.length }));
      return errs;
    },
    [T],
  );

  /** 校验全部勾选条目，返回结构化问题清单（含可修复标记）。 */
  const validateEntries = useCallback(
    (list: EditableEntry[]): ValidateResult => {
      const checked = list.filter((e) => e.checked);
      const issues: EntryIssue[] = [];
      for (const e of checked) {
        const entryTitle = e.title.trim() || T("pl.skillModal.unnamed");
        if (!e.title.trim()) {
          issues.push({
            key: e.key,
            entryTitle,
            message: T("pl.skillModal.titleRequired"),
            fixable: true,
          });
        }
        if (!e.body.trim()) {
          issues.push({
            key: e.key,
            entryTitle,
            message: T("pl.skillModal.bodyRequired"),
            fixable: false,
          });
        }
        for (const m of validateTemplateVars(e.body)) {
          issues.push({ key: e.key, entryTitle, message: m, fixable: true });
        }
      }
      return { ok: issues.length === 0, issues, fixable: issues.some((i) => i.fixable) };
    },
    [T, validateTemplateVars],
  );

  /** 校验全部勾选条目：必填项 + 模板变量格式，问题以结构化清单展示。
   * 导出模式校验通过后自动执行 AI 操作：逐条生成英文技能名与描述（正文 {{变量名}} 原样保留并在描述中补全）。 */
  const handleValidate = useCallback(async () => {
    if (entries.filter((e) => e.checked).length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    const result = validateEntries(entries);
    setValidation(result);
    setFixLog([]);
    setMsg(null);
    // 导出模式：校验通过后合并 AI 操作，逐条生成技能名与描述；
    // 校验未通过或非导出模式时清空上次 AI 结果，避免底部提示残留旧数据
    if (mode !== "export" || !result.ok) {
      setAiState("idle");
      setAiResult(null);
      return;
    }
    setAiState("running");
    setAiResult(null);
    const checked = entries.filter((e) => e.checked);
    const updates = new Map<string, { name: string; summary: string }>();
    const errors: { key: string; title: string; reason: string }[] = [];
    for (const entry of checked) {
      try {
        const desc = await describeSkill({
          title: entry.title,
          body: entry.body,
          summary: entry.summary.trim() || undefined,
        });
        if (desc && desc.desc && desc.desc.name && desc.desc.description) {
          // 技能名/摘要为空时由 AI 补全；已有内容则保留（尊重手动填写）
          updates.set(entry.key, {
            name: entry.name.trim() ? entry.name : desc.desc.name,
            summary: entry.summary.trim() ? entry.summary : desc.desc.description,
          });
        } else {
          errors.push({ key: entry.key, title: entry.title, reason: skillFailReason(desc?.fail, T) });
        }
      } catch (err) {
        errors.push({
          key: entry.key,
          title: entry.title,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
    // 应用 AI 结果：补全技能名/摘要，并标记失败条目（行内红色高亮 + 原因）
    setEntries((prev) =>
      prev.map((e) => {
        const update = updates.get(e.key);
        if (update) return { ...e, ...update, aiFailed: false, aiFailReason: undefined };
        const error = errors.find((err) => err.key === e.key);
        if (error && e.checked) return { ...e, aiFailed: true, aiFailReason: error.reason };
        return e;
      }),
    );
    setAiState("done");
    setAiResult({
      done: updates.size,
      errors: errors.map(({ title, reason }) => ({ title, reason })),
    });
  }, [entries, mode, T, validateEntries]);

  /** 一键修复：自动修复可修复的问题（补全标题、修复模板变量），并展示修复内容后重新校验。 */
  const handleFix = useCallback(() => {
    if (!validation || validation.ok) return;
    const fixesLog: string[] = [];
    const next = entries.map((e) => {
      if (!validation.issues.some((i) => i.key === e.key && i.fixable)) return e;
      const res = autoFixEntry(e, T);
      for (const f of res.fixes) fixesLog.push(`「${res.entry.title}」${f}`);
      return res.entry;
    });
    setEntries(next);
    setFixLog(fixLog);
    setValidation(validateEntries(next));
  }, [entries, validation, T, validateEntries]);

  /** 保存勾选条目：导入模式入库、导出模式写盘（仅在校验通过后可点）。 */
  const handleSave = useCallback(() => {
    if (!validation?.ok || saving) return;
    const checked = entries.filter((e) => e.checked);
    if (checked.length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    setSaving(true);
    if (mode === "export") {
      const payload: SkillEntry[] = checked.map((e) => ({
        promptId: e.promptId,
        name: e.name,
        title: e.title,
        body: e.body,
        summary: e.summary,
      }));
      exportSkillEntries(payload).then(
        (result) => {
          setSaving(false);
          onExported?.(result);
          // 导出写盘成功后关闭弹窗，回到词库管理面板
          onClose();
        },
        (err: unknown) => {
          setSaving(false);
          setMsg({ text: err instanceof Error ? err.message : String(err), error: true });
        },
      );
      return;
    }
    const payload: SkillEntry[] = checked.map((e) => ({
      name: e.name,
      title: e.title,
      body: e.body,
      summary: e.summary,
    }));
    importSkillEntries(payload).then(
      () => {
        setSaving(false);
        notifyDataChanged();
        // 保存成功后关闭弹窗，回到词库管理面板
        onClose();
      },
      (err: unknown) => {
        setSaving(false);
        setMsg({ text: err instanceof Error ? err.message : String(err), error: true });
      },
    );
  }, [validation, saving, entries, mode, onClose, onExported, T]);

  if (!open) return null;

  const checkedCount = entries.filter((e) => e.checked).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T(mode === "export" ? "pl.skillModal.exportTitle" : "pl.skillModal.title")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,.35)",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 1020,
          maxWidth: "90%",
          height: "min(720px, calc(100vh - 60px))",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: TONE.panel,
          border: `1px solid ${TONE.borderStrong}`,
          borderRadius: 12,
          padding: "18px 20px",
          color: TONE.text,
          fontFamily: MONO,
        }}
      >
        {/* 标题 + 关闭按钮（弹窗仅通过按钮手动关闭） */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <strong style={{ fontSize: 15, fontWeight: 560, flex: 1, minWidth: 0 }}>
            {T(mode === "export" ? "pl.skillModal.exportTitle" : "pl.skillModal.title")}
          </strong>
          <button
            type="button"
            onClick={onClose}
            aria-label={T("pl.close")}
            data-tip={T("pl.close")}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              border: "none",
              outline: "none",
              borderRadius: 6,
              background: "transparent",
              color: TONE.muted,
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
              transition: "background-color .24s cubic-bezier(.22,1,.36,1), color .24s cubic-bezier(.22,1,.36,1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
              e.currentTarget.style.color = TONE.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = TONE.muted;
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: 12, color: TONE.quiet, lineHeight: 1.6, flexShrink: 0 }}>
          {T(mode === "export" ? "pl.skillModal.exportSubtitle" : "pl.skillModal.subtitle")}
        </div>

        {/* 工具栏（仅导入模式）：选择文件 / 扫描目录 */}
        {mode === "import" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className={plBtn("primary", "sm")}
              onClick={() => fileRef.current?.click()}
            >
              {T("pl.skillModal.chooseFile")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={plBtn("ghost", "sm")}
              onClick={scanSkills}
            >
              {T("pl.skillModal.scanSkills")}
            </Button>
            <span style={{ fontSize: 11, color: TONE.quiet }}>
              {entries.length === 0
                ? T("pl.skillModal.selectHint")
                : T("pl.skillModal.selectHint") + ` · ${checkedCount}/${entries.length}`}
            </span>
          </div>
        )}

        {/* 工具栏（仅导出模式）：上传自定义 JSON 数据追加技能条目 */}
        {mode === "export" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={plBtn("ghost", "sm")}
              onClick={() => jsonRef.current?.click()}
              data-tip={T("pl.skillModal.uploadJsonTitle")}
            >
              {T("pl.skillModal.uploadJson")}
            </Button>
            <span style={{ fontSize: 11, color: TONE.quiet }}>
              {T("pl.skillModal.selectHint")} · {checkedCount}/{entries.length}
            </span>
          </div>
        )}

        {/* 条目列表：可滚动 */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.length === 0 ? (
            <div
              style={{
                padding: "22px 0",
                textAlign: "center",
                fontSize: 12,
                color: TONE.quiet,
                border: `1px dashed ${TONE.border}`,
                borderRadius: 8,
              }}
            >
              {T("pl.skillModal.noEntry")}
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "10px 12px",
                  background: TONE.row,
                  border: `1px solid ${TONE.border}`,
                  borderRadius: 8,
                  opacity: entry.checked ? 1 : 0.55,
                  transition: "opacity .18s",
                }}
              >
                {/* 首行：折叠 + 勾选 + 标题 + 徽标 + 移除 */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(entry.key)}
                    data-tip={collapsed[entry.key] ? T("pl.skillModal.expand") : T("pl.skillModal.collapse")}
                    aria-expanded={!collapsed[entry.key]}
                    style={{
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      border: "none",
                      outline: "none",
                      borderRadius: 6,
                      background: "transparent",
                      color: TONE.muted,
                      cursor: "pointer",
                      transition: "background-color .18s, color .18s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                      e.currentTarget.style.color = TONE.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = TONE.muted;
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      style={{
                        flexShrink: 0,
                        transform: collapsed[entry.key] ? "rotate(-90deg)" : "rotate(0deg)",
                        transition: "transform .2s ease",
                      }}
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
                  </button>
                  <input
                    type="checkbox"
                    checked={entry.checked}
                    onChange={() => toggleChecked(entry.key)}
                    data-tip={T("pl.skillModal.selectHint")}
                    style={{ flexShrink: 0, accentColor: TONE.accent }}
                  />
                  <input
                    type="text"
                    value={entry.title}
                    onChange={(e) => updateEntry(entry.key, { title: e.target.value })}
                    placeholder={T("pl.skillModal.titleLabel")}
                    disabled={!entry.checked}
                    style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                  />
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 10,
                      lineHeight: 1,
                      color: entry.source === "disk" ? TONE.muted : TONE.accent,
                      border: `1px solid ${
                        entry.source === "disk"
                          ? TONE.border
                          : "var(--dsw-alias-brand-primary, #8ec5ff)"
                      }`,
                      borderRadius: 4,
                      padding: "2px 5px",
                    }}
                  >
                    {entry.source === "file"
                      ? T("pl.skillModal.fromFile")
                      : entry.source === "disk"
                        ? T("pl.skillModal.fromDisk")
                        : entry.source === "json"
                          ? T("pl.skillModal.fromJson")
                          : T("pl.skillModal.fromLibrary")}
                  </span>
                  {entry.exists && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 10,
                        lineHeight: 1,
                        color: TONE.success,
                        border: `1px solid color-mix(in srgb, ${TONE.success} 45%, transparent)`,
                        borderRadius: 4,
                        padding: "2px 5px",
                      }}
                    >
                      {T("pl.skillModal.exists")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.key)}
                    data-tip={T("pl.skillModal.remove")}
                    style={{
                      flexShrink: 0,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: TONE.quiet,
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: MONO,
                      padding: "2px 4px",
                      borderRadius: 4,
                      transition: "color .18s, background-color .18s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = TONE.red;
                      e.currentTarget.style.backgroundColor = "var(--dsw-alias-interactive-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = TONE.quiet;
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {T("pl.skillModal.remove")}
                  </button>
                </div>
                {/* 可折叠区域：用 grid 行动画实现平滑折叠/展开，避免高度突变抖动 */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: collapsed[entry.key] ? "0fr" : "1fr",
                    transition: "grid-template-rows .22s ease",
                    marginTop: collapsed[entry.key] ? 0 : 7,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                      minHeight: 0,
                      overflow: "hidden",
                    }}
                  >
                    {/* 技能名（仅导出模式）：校验通过后由 AI 自动生成，也可手动修改 */}
                    {mode === "export" && (
                      <input
                        type="text"
                        value={entry.name}
                        onChange={(e) => updateEntry(entry.key, { name: e.target.value })}
                        placeholder={T("pl.skillModal.nameLabel")}
                        disabled={!entry.checked}
                        style={inputStyle}
                      />
                    )}
                    {/* 摘要 */}
                    <input
                      type="text"
                      value={entry.summary}
                      onChange={(e) => updateEntry(entry.key, { summary: e.target.value })}
                      placeholder={T("pl.skillModal.summaryLabel")}
                      disabled={!entry.checked}
                      style={inputStyle}
                    />
                    {/* 正文 + 插入变量 */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <textarea
                        ref={(el) => {
                          bodyRefs.current[entry.key] = el;
                        }}
                        value={entry.body}
                        onChange={(e) => updateEntry(entry.key, { body: e.target.value })}
                        placeholder={T("pl.skillModal.bodyLabel")}
                        disabled={!entry.checked}
                        spellCheck={false}
                        style={{
                          ...inputStyle,
                          flex: 1,
                          minHeight: 200,
                          resize: "vertical",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={plBtn("ghost", "sm")}
                        onClick={() => insertVar(entry.key)}
                        disabled={!entry.checked}
                        data-tip={T("pl.insertVariableTitle")}
                        style={{ flexShrink: 0 }}
                      >
                        {T("pl.skillModal.insertVar")}
                      </Button>
                    </div>
                  </div>
                </div>
                {entry.aiFailed && entry.aiFailReason && (
                  <div
                    role="alert"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                      marginTop: 7,
                      padding: "6px 9px",
                      borderRadius: 6,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: TONE.red,
                      background:
                        "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 8%, transparent)",
                      border:
                        "1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 40%, transparent)",
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>{T("pl.skillModal.aiFailed")}</span>
                    <span style={{ minWidth: 0 }}>{entry.aiFailReason}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 校验结果 / 操作反馈 */}
        {msg && (
          <div
            style={{
              flexShrink: 0,
              fontSize: 12,
              lineHeight: 1.5,
              color: msg.error ? TONE.red : TONE.text,
            }}
          >
            {msg.text}
          </div>
        )}
        {validation && (
          <div
            role="alert"
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "7px 10px",
              borderRadius: 7,
              fontSize: 12,
              lineHeight: 1.5,
              color: validation.ok ? TONE.success : TONE.red,
              background: validation.ok
                ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)"
                : "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 8%, transparent)",
              border: `1px solid ${
                validation.ok
                  ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)"
                  : "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 40%, transparent)"
              }`,
            }}
          >
            {validation.ok ? (
              <div>{T("pl.skillModal.validatePass")}</div>
            ) : (
              <>
                <div>{T("pl.skillModal.issueCount", { count: validation.issues.length })}</div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  {validation.issues.map((issue, idx) => (
                    <li key={idx}>
                      「{issue.entryTitle}」{issue.message}
                    </li>
                  ))}
                </ul>
                {validation.fixable && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className={plBtn("primary", "sm")}
                      onClick={handleFix}
                      data-tip={T("pl.skillModal.fixAll")}
                    >
                      {T("pl.skillModal.fixAll")}
                    </Button>
                    <span style={{ color: TONE.muted }}>
                      {T("pl.skillModal.fixHint", {
                        fixable: validation.issues.filter((i) => i.fixable).length,
                      })}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {fixLog.length > 0 && (
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "7px 10px",
              borderRadius: 7,
              fontSize: 12,
              lineHeight: 1.5,
              color: TONE.success,
              background:
                "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)",
            }}
          >
            <div>{T("pl.skillModal.fixDone", { count: fixLog.length })}</div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {fixLog.map((f, idx) => (
                <li key={idx}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 导出模式 AI 校验底部提示：校验通过后自动用 AI 生成技能名与描述，反馈生成进度与结果 */}
        {mode === "export" && aiState !== "idle" && (
          <div
            role={aiState === "done" ? "status" : undefined}
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "7px 10px",
              borderRadius: 7,
              fontSize: 12,
              lineHeight: 1.5,
              color:
                aiState === "running"
                  ? TONE.accent
                  : aiResult && aiResult.errors.length > 0
                    ? TONE.red
                    : TONE.success,
              background:
                aiState === "running"
                  ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 8%, transparent)"
                  : aiResult && aiResult.errors.length > 0
                    ? "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 8%, transparent)"
                    : "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 8%, transparent)",
              border: `1px solid ${
                aiState === "running"
                  ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 40%, transparent)"
                  : aiResult && aiResult.errors.length > 0
                    ? "color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6b6b) 40%, transparent)"
                    : "color-mix(in srgb, var(--dsw-alias-state-success-primary, #78dda0) 40%, transparent)"
              }`,
            }}
          >
            {aiState === "running" ? (
              <div>{T("pl.skillModal.aiValidating")}</div>
            ) : aiResult && aiResult.errors.length > 0 ? (
              <>
                <div>
                  {T("pl.skillModal.aiDoneErrors", {
                    done: aiResult.done,
                    n: aiResult.errors.length,
                  })}
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  {aiResult.errors.map((err, idx) => (
                    <li key={idx}>
                      「{err.title}」{err.reason}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div>{T("pl.skillModal.aiDone", { done: aiResult?.done ?? 0 })}</div>
            )}
          </div>
        )}

        {/* 底部操作：校验（导出模式合并 AI，校验通过后自动生成）+ 保存（仅校验通过后可用） */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", flexShrink: 0 }}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={plBtn("ghost", "sm")}
            onClick={handleValidate}
            disabled={mode === "export" && aiState === "running"}
          >
            {mode === "export" ? T("pl.skillModal.validateAi") : T("pl.skillModal.validate")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={plBtn("primary", "sm")}
            onClick={handleSave}
            disabled={
              !validation?.ok || saving || checkedCount === 0 || (mode === "export" && aiState === "running")
            }
            data-tip={validation?.ok ? "" : T("pl.skillModal.selectHint")}
          >
            {saving
              ? T("pl.skillModal.saving")
              : mode === "export"
                ? T("pl.skillModal.saveExport")
                : T("pl.skillModal.save")}
          </Button>
        </div>
      </div>

      {/* 选择本地 md 文件用的隐藏文件输入 */}
      <input
        ref={fileRef}
        type="file"
        accept=".md,text/markdown,text/plain"
        style={{ display: "none" }}
        onChange={onPickFile}
      />
      {/* 导出模式：上传自定义 JSON 数据用的隐藏文件输入 */}
      <input
        ref={jsonRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={onPickJson}
      />
    </div>
  );
}
