/**
 * 技能导入弹窗 — 从本地 md 文件或 ~/.dsh/skills 目录导入技能为提示词。
 *
 * - 「选择本地 md 文件」逐份解析导入（frontmatter + 正文 → 标题 / 摘要 / 正文）；
 * - 「扫描 Skills 目录」批量列出可导入技能；
 * - 每条目可编辑标题 / 摘要 / 正文，正文支持插入 {{变量名}} 占位符；
 * - 「AI 补充」（仅导出模式）直接用 AI 自动补全技能名与摘要；「校验」检查必填项
 *   （标题 / 正文，导出模式还校验技能名 / 摘要）与模板变量括号配对；
 *   只有校验通过后才能保存入库 / 导出技能。
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
  getExportProjectCwd,
  importSkillEntries,
  listAvailableSkills,
  parseSkillRaw,
  scanSkillDir,
  type SkillDescribeFail,
  type SkillEntry,
  type SkillExportScope,
  type SkillImportResult,
} from "../../../services/api.js";
import { notifyDataChanged } from "../../../services/data-sync.js";
import {
  isDirectoryBrowserAvailable,
  isDirectoryPickerAvailable,
  pickExportDirectory,
} from "../../../services/workspace-picker.js";
import { insertVariableAt } from "../../common/TemplateVariables.js";
import { ImportResultPanel, type ImportResultRow } from "../../common/ImportResultPanel.js";
import { DirectoryPickerModal } from "../../common/DirectoryPickerModal.js";
import { DialogCloseButton } from "../../common/DialogCloseButton.js";
import { BookIcon } from "../../common/BookIcon.js";

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
  accentSoft: "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 18%, transparent)",
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

/** 手动填写的项目导出路径记忆键：上次输入过则下次打开自动预填。 */
const PROJECT_PATH_KEY = "pl:skill:export:projectPath";

/** 读取上次手动填写的项目导出路径（无记录或失败时返回空串）。 */
function loadSavedProjectPath(): string {
  try {
    return localStorage.getItem(PROJECT_PATH_KEY) ?? "";
  } catch {
    return "";
  }
}

/** 记录手动填写/选择的项目导出路径，供下次打开自动填充（忽略空值）。 */
function saveProjectPath(path: string): void {
  try {
    if (path.trim()) localStorage.setItem(PROJECT_PATH_KEY, path.trim());
  } catch {
    /* 忽略：记忆失败不影响导出 */
  }
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
  /** 导入成功回调（用于管理面板刷新数据）。 */
  onImported?: (result: SkillImportResult) => void;
}): ReactNode {
  const { open, onClose, t, mode = "import", initialEntries, onImported } = props;
  const T = usePLT(t);
  const [entries, setEntries] = useState<EditableEntry[]>([]);
  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [fixLog, setFixLog] = useState<string[]>([]);
  // 导出模式：校验时给正文 {{变量名}} 赋值的改动清单（{{var}} → [var]）
  const [fillLog, setFillLog] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  // 导出模式 AI 补充状态：idle 未触发 / running 生成中 / done 已生成
  const [aiState, setAiState] = useState<"idle" | "running" | "done">("idle");
  // 导出模式 AI 补充结果：成功条数 + 失败清单
  const [aiResult, setAiResult] = useState<{
    done: number;
    errors: { title: string; reason: string }[];
  } | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  // 导入/导出完成后的逐条结果（展示成功/失败/跳过，用户点击「完成」后关闭）
  const [result, setResult] = useState<{ title: string; summary: string; rows: ImportResultRow[] } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // 导出模式：自定义 JSON 数据文件输入
  const jsonRef = useRef<HTMLInputElement | null>(null);
  const bodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const seqRef = useRef(0);
  // 右栏编辑窗口当前选中的条目 key
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // 浮动反馈气泡开关与定时器（如聊天气泡，一段时间后自动消失）
  const [toastOpen, setToastOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);
  // 导出模式：导出范围（通用 / 项目 / 私有），决定技能写盘位置与注入方式
  const [exportScope, setExportScope] = useState<SkillExportScope>("global");
  // 导出模式：当前项目路径（「项目技能」范围展示保存位置用）；未自动解析到时可让用户手动填写
  const [projectCwd, setProjectCwd] = useState<string | null>(null);
  const [projectCwdLoading, setProjectCwdLoading] = useState(false);
  const [projectPathInput, setProjectPathInput] = useState("");
  // 浏览式目录选择弹窗（桌面端无原生目录选择器时的回退方案）
  const [dirPickerOpen, setDirPickerOpen] = useState(false);
  // 导入模式「扫描文件夹」目录选择弹窗开关
  const [scanDirPickerOpen, setScanDirPickerOpen] = useState(false);

  // 打开弹窗时重置上次的状态；导入模式自动扫描一次 Skills 目录，导出模式加载勾选的词库条目
  useEffect(() => {
    if (!open) return;
    setEntries([]);
    setValidation(null);
    setFixLog([]);
    setFillLog([]);
    setMsg(null);
    setSelectedKey(null);
    setAiState("idle");
    setAiResult(null);
    setResult(null);
    setExportScope("global");
    setProjectCwd(null);
    setProjectCwdLoading(false);
    setProjectPathInput("");
    setDirPickerOpen(false);
    setScanDirPickerOpen(false);
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
    // 导入模式不自动扫描 Skills 目录：默认保持空列表，
    // 仅在用户点击「扫描」后才会列出 ~/.dsh/skills 下的技能
  }, [open]);

  // 导出模式选中「项目技能」时，向 host 解析当前项目路径，用于展示保存位置；
  // 解析不到时由用户在下方面板手动填写导出路径
  useEffect(() => {
    if (!open || mode !== "export" || exportScope !== "project") return;
    let alive = true;
    setProjectCwdLoading(true);
    getExportProjectCwd()
      .then(({ cwd }) => {
        if (!alive) return;
        setProjectCwd(cwd);
        // 当前会话没有关联项目路径（cwd 为 null）时，把上次手动填写的项目路径预填到输入框
        if (!cwd) setProjectPathInput(loadSavedProjectPath());
        setProjectCwdLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        // 读取项目路径失败时，同样把上次手动填写的项目路径预填到输入框
        setProjectCwd(null);
        setProjectPathInput(loadSavedProjectPath());
        setProjectCwdLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, mode, exportScope]);

  /** 选择项目导出路径：优先宿主原生目录选择器；桌面端仅提供 browse 时回退到内置浏览弹窗。 */
  const handlePickDirectory = useCallback(async () => {
    // 1) 原生目录选择器（native capability）：可用时优先使用
    if (isDirectoryPickerAvailable()) {
      try {
        const dir = await pickExportDirectory();
        if (dir) {
          setProjectPathInput(dir);
          setMsg(null);
          return;
        }
        // 原生选择器被用户取消：不打开浏览弹窗
        return;
      } catch {
        // 原生能力不可用（桌面端报 host.pickDirectory needs the native capability）→ 回退到浏览式
      }
    }
    // 2) 浏览式目录选择（browse capability）：打开内置目录浏览弹窗
    if (!isDirectoryBrowserAvailable()) {
      setMsg({ text: T("pl.skillModal.directoryPickerUnavailable"), error: true });
      return;
    }
    setDirPickerOpen(true);
  }, [T]);

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
          setMsg({ text: T("pl.skillModal.scanSkillsEmpty"), error: false });
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

  /** 调用后端递归扫描指定目录，扫描结果追加为可导入条目。 */
  const runScanDir = useCallback(
    (dir: string) => {
      scanSkillDir(dir).then(
        (list) => {
          if (list.length === 0) {
            setMsg({ text: T("pl.skillModal.scanDirEmpty"), error: false });
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
          setMsg({ text: err instanceof Error ? err.message : String(err), error: true });
        },
      );
    },
    [addEntries, T],
  );

  /** 打开目录选择器选择文件夹（优先原生，回退浏览式弹窗），选中后扫描其中的 md 文件。 */
  const scanFolder = useCallback(async () => {
    if (isDirectoryPickerAvailable()) {
      try {
        const dir = await pickExportDirectory();
        if (dir) {
          runScanDir(dir);
          return;
        }
        // 原生选择器被用户取消：不打开浏览弹窗
        return;
      } catch {
        // 原生能力不可用 → 回退到浏览式
      }
    }
    if (!isDirectoryBrowserAvailable()) {
      setMsg({ text: T("pl.skillModal.directoryPickerUnavailable"), error: true });
      return;
    }
    setScanDirPickerOpen(true);
  }, [runScanDir, T]);

  /** 更新某条目字段；编辑会使之前的校验与修复记录失效。 */
  const updateEntry = useCallback((key: string, patch: Partial<EditableEntry>) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
    setValidation(null);
    setFixLog([]);
    setFillLog([]);
    setAiState("idle");
    setAiResult(null);
  }, []);

  /** 勾选 / 取消勾选条目。 */
  const toggleChecked = useCallback((key: string) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, checked: !e.checked } : e)));
  }, []);

  /** 全选 / 取消全选全部条目（全部已勾选时再点则取消全选；列表为空时无操作）。 */
  const toggleSelectAll = useCallback(() => {
    setEntries((prev) => {
      const allChecked = prev.length > 0 && prev.every((e) => e.checked);
      return prev.map((e) => ({ ...e, checked: !allChecked }));
    });
  }, []);

  /** 移除条目。 */
  const removeEntry = useCallback((key: string) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
    setSelectedKey((cur) => (cur === key ? null : cur));
    setValidation(null);
    setFixLog([]);
    setAiState("idle");
    setAiResult(null);
  }, []);

  /** 切换导出范围：重置结果面板/校验/AI 状态，避免上次导出遗留的「完成」面板阻塞重新导出。 */
  const changeScope = useCallback((scope: SkillExportScope) => {
    setExportScope(scope);
    setResult(null);
    setValidation(null);
    setFixLog([]);
    setFillLog([]);
    setAiState("idle");
    setAiResult(null);
    setMsg(null);
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

  /** 导出模式校验时给正文 {{变量名}} 赋值：替换为方括号包裹的自然语言占位 [name]。
   * 返回替换后的正文 + 每条替换记录（{{name}} → [name]），供校验详情展示改动。 */
  const wrapTemplateVars = useCallback(
    (body: string): { body: string; changes: string[] } => {
      const changes: string[] = [];
      const defaultVar = T("pl.skillModal.varFixDefault");
      let out = "";
      let i = 0;
      const len = body.length;
      while (i < len) {
        if (body.startsWith("{{", i)) {
          const close = body.indexOf("}}", i + 2);
          if (close === -1) {
            // 未闭合 {{：取余下可用文本作为变量名，替换后结束
            const rest = body
              .slice(i + 2)
              .replace(/[{}]/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            const name = rest || defaultVar;
            out += `[${name}]`;
            changes.push(`{{${name}}} → [${name}]`);
            i = len;
            continue;
          }
          const inner = body.slice(i + 2, close);
          const name = inner.replace(/[{}]/g, " ").replace(/\s+/g, " ").trim() || defaultVar;
          out += `[${name}]`;
          changes.push(`{{${inner.trim() || name}}} → [${name}]`);
          i = close + 2;
          continue;
        }
        if (body.startsWith("}}", i)) {
          // 多余的 }} 视为非法直接丢弃
          i += 2;
          continue;
        }
        out += body[i];
        i += 1;
      }
      return { body: out, changes };
    },
    [T],
  );

  /** 校验全部勾选条目，返回结构化问题清单（含可修复标记）。
   * requireNameAndSummary：导出模式为 true，技能名 / 摘要也纳入必填（AI 补充完成后会自动触发校验）。 */
  const validateEntries = useCallback(
    (list: EditableEntry[], requireNameAndSummary: boolean): ValidateResult => {
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
        // 导出模式：技能名 / 摘要缺失时提示用户补全（摘要可由 AI 补充自动生成）
        if (requireNameAndSummary && !e.name.trim()) {
          issues.push({
            key: e.key,
            entryTitle,
            message: T("pl.skillModal.nameRequired"),
            fixable: false,
          });
        }
        if (requireNameAndSummary && !e.summary.trim()) {
          issues.push({
            key: e.key,
            entryTitle,
            message: T("pl.skillModal.summaryRequired"),
            fixable: false,
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

  /** 校验全部勾选条目：必填项 + 模板变量格式，问题以结构化清单展示（不触发 AI）。
   * 导出模式：校验前先给含 {{变量名}} 的正文赋值（→ [name]），并把改动记录到 fillLog 在详情中列出。 */
  const handleValidate = useCallback(() => {
    if (entries.filter((e) => e.checked).length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    setMsg(null);
    setFixLog([]);
    setFillLog([]);
    let list = entries;
    if (mode === "export") {
      // 导出模式：给正文里的 {{变量名}} 统一赋值（方括号占位），并汇总改动清单
      const log: string[] = [];
      let next = entries;
      for (let k = 0; k < next.length; k++) {
        const e = next[k]!;
        if (!e.checked) continue;
        const w = wrapTemplateVars(e.body);
        if (w.body === e.body) continue;
        for (const c of w.changes) {
          log.push(`「${e.title.trim() || T("pl.skillModal.unnamed")}」${c}`);
        }
        next = next.map((x) => (x.key === e.key ? { ...x, body: w.body } : x));
      }
      if (log.length > 0) {
        setFillLog(log);
        setEntries(next); // 写入赋值后的正文，确保导出使用处理后的内容
        list = next;
      }
    }
    const result = validateEntries(list, mode === "export");
    setValidation(result);
  }, [entries, mode, T, validateEntries, wrapTemplateVars]);

  /** AI 补充（仅导出模式）：直接逐条用 AI 生成英文技能名与摘要
   * （正文 {{变量名}} 原样保留，描述中自动补全占位符说明）；
   * 生成完成后自动触发校验，校验通过后即可导出。 */
  const handleAiEnhance = useCallback(async () => {
    if (entries.filter((e) => e.checked).length === 0) {
      setMsg({ text: T("pl.skillModal.emptyChecked"), error: true });
      return;
    }
    setMsg(null);
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
    const next = entries.map((e) => {
      const update = updates.get(e.key);
      if (update) return { ...e, ...update, aiFailed: false, aiFailReason: undefined };
      const error = errors.find((err) => err.key === e.key);
      if (error && e.checked) return { ...e, aiFailed: true, aiFailReason: error.reason };
      return e;
    });
    setEntries(next);
    setAiState("done");
    setAiResult({
      done: updates.size,
      errors: errors.map(({ title, reason }) => ({ title, reason })),
    });
    // 补充完成后自动触发校验，校验通过后即可导出
    setFixLog([]);
    setValidation(validateEntries(next, mode === "export"));
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
    setValidation(validateEntries(next, mode === "export"));
  }, [entries, validation, T, validateEntries, mode]);

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
      // 项目技能：优先用输入框（可手动输入或用「浏览」选择）中的路径，其次自动解析到的当前项目路径
      let rootPath: string | undefined;
      if (exportScope === "project") {
        const targetPath = projectPathInput.trim() || projectCwd || "";
        if (!targetPath) {
          setSaving(false);
          setMsg({ text: T("pl.skillModal.projectPathEmpty"), error: true });
          return;
        }
        rootPath = targetPath;
        // 记录本次导出的项目路径，供下次打开自动填充
        saveProjectPath(targetPath);
      }
      const payload: SkillEntry[] = checked.map((e) => ({
        promptId: e.promptId,
        name: e.name,
        title: e.title,
        body: e.body,
        summary: e.summary,
      }));
      exportSkillEntries(payload, exportScope, rootPath).then(
          (res) => {
            setSaving(false);
            // 导出成功后展示逐条结果，由用户点击「完成」关闭弹窗
            const rows: ImportResultRow[] = [
              ...res.items.map((i) => ({
                title: i.title,
                label: T("pl.resultExported"),
                kind: "ok" as const,
              })),
              ...res.errors.map((e) => ({
                title: e.title,
                label: T("pl.resultFail"),
                kind: "error" as const,
                reason: e.reason,
              })),
            ];
            const errNote = res.errors.length
              ? T("pl.skillModal.savedExportErrors", { n: res.errors.length })
              : "";
            const rootNote = res.root
              ? T("pl.skillModal.exportRoot", { root: res.root })
              : "";
            setResult({
              title: T("pl.resultExportTitle"),
              summary: `${T("pl.skillModal.savedExport", { exported: res.exported })} · ${rootNote}${errNote}`,
              rows,
            });
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
      (res) => {
        setSaving(false);
        notifyDataChanged();
        onImported?.(res);
        // 导入成功后展示逐条结果，由用户点击「完成」关闭弹窗
        const rows: ImportResultRow[] = [
          ...res.items.map((i) => ({
            title: i.title,
            label:
              i.status === "updated"
                ? T("pl.resultUpdated")
                : i.status === "skipped"
                  ? T("pl.resultSkipped")
                  : T("pl.resultImported"),
            kind:
              i.status === "updated"
                ? ("updated" as const)
                : i.status === "skipped"
                  ? ("skipped" as const)
                  : ("ok" as const),
          })),
          ...res.errors.map((e) => ({
            title: e.name,
            label: T("pl.resultFail"),
            kind: "error" as const,
            reason: e.reason,
          })),
        ];
        const errNote = res.errors.length
          ? T("pl.skillModal.savedErrors", { n: res.errors.length })
          : "";
        setResult({
          title: T("pl.resultTitle"),
          summary: `${T("pl.skillModal.saved", { imported: res.imported, updated: res.updated })}${errNote}`,
          rows,
        });
      },
      (err: unknown) => {
        setSaving(false);
        setMsg({ text: err instanceof Error ? err.message : String(err), error: true });
      },
    );
  }, [validation, saving, entries, mode, exportScope, projectCwd, projectPathInput, onImported, T]);

  const checkedCount = entries.filter((e) => e.checked).length;
  const allChecked = entries.length > 0 && checkedCount === entries.length;
  // 右栏编辑窗口当前选中的条目（被删除或不存在时为 null）
  const selected = entries.find((e) => e.key === selectedKey) ?? null;
  // 是否存在需要浮动提示的反馈内容（校验结果 / 修复记录 / 操作信息 / 导出 AI 补充）
  const hasFeedback =
    !result &&
    (msg != null || validation != null || fixLog.length > 0 || (mode === "export" && aiState !== "idle"));

  // 反馈内容变化时浮出气泡；气泡常开则启动自动消失定时
  // 依赖反馈内容本身（而非仅 hasFeedback 布尔值）：手动关闭气泡后 validation 等仍非空，
  // 布尔值不变，导致再次点击校验等操作时不重新浮出气泡；内容引用变化即可重新弹出。
  // 注意：这两个 useEffect 必须放在条件 return 之前，保证弹窗开/关切换时 hooks 数量一致，
  // 否则会触发 React #310「rendered fewer hooks than expected」崩溃。
  useEffect(() => {
    setToastOpen(hasFeedback);
  }, [hasFeedback, msg, validation, fixLog, fillLog, aiState, aiResult, result]);

  useEffect(() => {
    if (!toastOpen) return;
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOpen(false), 30000);
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [toastOpen]);

  if (!open) return null;

  /** 鼠标移入气泡：暂停自动消失；移出：重新开始计时。 */
  const pauseToast = () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  };
  const resumeToast = () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOpen(false), 30000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T(mode === "export" ? "pl.skillModal.exportTitle" : "pl.skillModal.title")}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        background: TONE.panel,
        borderRadius: 12,
        padding: "18px 7px 18px 10px",
        boxSizing: "border-box",
      }}
    >
        {/* 标题 + 关闭按钮（弹窗仅通过按钮手动关闭） */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <BookIcon color={TONE.accent} />
          <strong style={{ fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0, color: TONE.text }}>
            {T(mode === "export" ? "pl.skillModal.exportTitle" : "pl.skillModal.title")}
          </strong>
          <DialogCloseButton onClick={onClose} label={T("pl.close")} />
        </div>
        {/* 模块说明（与人格管理 / 技能管理说明框一致） */}
        <div
          style={{
            marginTop: 10,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: TONE.quiet,
            background: TONE.accentSoft,
            border: `1px solid ${TONE.border}`,
            borderRadius: 7,
            padding: "7px 10px",
            flexShrink: 0,
          }}
        >
          {T(mode === "export" ? "pl.skillModal.exportSubtitle" : "pl.skillModal.subtitle")}
        </div>

        {/* 左右分栏主体：左栏操作+列表 / 右栏编辑窗口 */}
        <div style={{ flex: 1, minHeight: 0, marginTop: 10, display: "flex", gap: 12, alignItems: "stretch", position: "relative" }}>
          {/* 左栏：模式操作区 + 紧凑条目列表 */}
          <div
            style={{
              flex: "1 1 0",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              boxSizing: "border-box",
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              padding: 10,
            }}
          >
            {/* 工具栏（仅导入模式）：选择文件 / 扫描目录 */}
            {mode === "import" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0, marginBottom: 8 }}>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={plBtn("ghost", "sm")}
                  onClick={scanFolder}
                >
                  {T("pl.skillModal.scanFolder")}
                </Button>
              </div>
            )}

            {/* 导出范围（仅导出模式）：通用 / 项目 / 私有 三选一，决定技能写盘位置与注入方式 */}
            {mode === "export" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 560, color: TONE.muted }}>
                  {T("pl.skillModal.exportScope")}
                </div>
                {/* 三个导出范围选项横排：通用 / 项目 / 私有 */}
                <div style={{ display: "flex", gap: 8, flexDirection: "row" }}>
                  {(
                    [
                      {
                        value: "global",
                        label: T("pl.skillModal.scopeGlobal"),
                        desc: T("pl.skillModal.scopeGlobalDesc"),
                        path: "~/.dsh/skills/",
                      },
                      {
                        value: "project",
                        label: T("pl.skillModal.scopeProject"),
                        desc: T("pl.skillModal.scopeProjectDesc"),
                        path: projectCwd ? `${projectCwd}` : T("pl.skillModal.projectNoPath"),
                      },
                      {
                        value: "private",
                        label: T("pl.skillModal.scopePrivate"),
                        desc: T("pl.skillModal.scopePrivateDesc"),
                        path: T("pl.skillModal.scopePrivatePath"),
                      },
                    ] as Array<{ value: SkillExportScope; label: string; desc: string; path: string }>
                  ).map((opt) => {
                    const active = exportScope === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => changeScope(opt.value)}
                        aria-pressed={active}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 10px",
                          textAlign: "left",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontFamily: MONO,
                          background: active
                            ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 10%, transparent)"
                            : "transparent",
                          border: `1px solid ${
                            active ? "var(--dsw-alias-brand-primary, #8ec5ff)" : TONE.border
                          }`,
                          transition:
                            "border-color .24s cubic-bezier(.22,1,.36,1), background-color .24s cubic-bezier(.22,1,.36,1)",
                        }}
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.borderColor = TONE.borderStrong;
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.borderColor = TONE.border;
                        }}
                      >
                        {/* 按钮内容：上方标签 + 下方说明（竖排），横排的三个按钮各自收窄为紧凑矩形，避免溢出 */}
                        <span
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: 2,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 560,
                              color: active ? TONE.accent : TONE.text,
                              lineHeight: 1.4,
                              maxWidth: "100%",
                              overflow: "hidden",
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {opt.label}
                          </span>
                          <span
                            style={{
                              fontSize: 10.5,
                              color: TONE.quiet,
                              lineHeight: 1.4,
                              width: "100%",
                              minWidth: 0,
                              wordBreak: "break-all",
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {opt.desc}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* 项目技能：始终展示路径输入框，支持手动输入或用「浏览」选择目录填充；
                    已解析到当前项目路径时自动预填，用户可随时修改导出位置 */}
                {/* 项目路径输入区：恒占固定高度，仅「项目」范围显示内容，切换导出范围时列表不因高度变化而跳动 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    flexShrink: 0,
                    height: 56,
                    overflow: "hidden",
                  }}
                >
                  {/* 非项目范围：通用/私有 展示功能说明（路径、使用方式），保持恒定区域高度 */}
                  {exportScope === "project" ? (
                    <>
                      <div
                        style={{
                          fontSize: 11,
                          color: projectCwdLoading
                            ? TONE.quiet
                            : projectCwd
                              ? TONE.quiet
                              : TONE.red,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {projectCwdLoading
                          ? T("pl.skillModal.projectPathResolving")
                          : projectCwd
                            ? T("pl.skillModal.projectPathHintResolved")
                            : T("pl.skillModal.projectPathHint")}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          type="text"
                          value={projectPathInput || projectCwd || ""}
                          onChange={(e) => setProjectPathInput(e.target.value)}
                          placeholder={T("pl.skillModal.projectPathPlaceholder")}
                          spellCheck={false}
                          disabled={projectCwdLoading}
                          style={inputStyle}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={plBtn("ghost", "sm")}
                          onClick={handlePickDirectory}
                          disabled={projectCwdLoading}
                          style={{ flexShrink: 0, minWidth: 64 }}
                        >
                          {T("pl.skillModal.browse")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        fontSize: 11,
                        lineHeight: 1.6,
                        color: TONE.quiet,
                        width: "100%",
                        minWidth: 0,
                        wordBreak: "break-all",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {exportScope === "global"
                        ? T("pl.skillModal.scopeGlobalHint")
                        : T("pl.skillModal.scopePrivateHint")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 工具栏（仅导出模式）：上传自定义 JSON 数据追加技能条目 */}
            {mode === "export" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0, marginBottom: 8 }}>
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
              </div>
            )}

            {/* 全选工具栏：与导入数据页一致的复选全选 + 勾选计数（列表滚动时悬浮固定） */}
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 12,
                paddingBottom: 8,
                borderBottom: `1px solid ${TONE.border}`,
                background: TONE.row,
                position: "sticky",
                top: -10,
                zIndex: 1,
              }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: TONE.muted,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleSelectAll}
                  disabled={entries.length === 0}
                />
                {allChecked ? T("pl.importEdit.deselectAll") : T("pl.exportSelectAll")}
              </label>
              <span style={{ marginLeft: "auto", fontSize: 11, color: TONE.quiet }}>
                {T("pl.skillModal.selectHint")} · {checkedCount}/{entries.length}
              </span>
            </div>

            {/* 紧凑条目列表 */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                paddingTop: 6,
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              {entries.length === 0 ? (
                <div
                  style={{
                    padding: "22px 0",
                    textAlign: "center",
                    fontSize: 12,
                    color: TONE.quiet,
                    border: `1px dashed ${TONE.border}`,
                    borderRadius: 8,
                    marginTop: 6,
                  }}
                >
                  {T("pl.skillModal.noEntry")}
                </div>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.key}
                    onClick={() => setSelectedKey(entry.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "7px 9px",
                      background:
                        selectedKey === entry.key
                          ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 16%, transparent)"
                          : "transparent",
                      border: `1px solid ${
                        selectedKey === entry.key
                          ? "color-mix(in srgb, var(--dsw-alias-brand-primary, #8ec5ff) 45%, transparent)"
                          : "transparent"
                      }`,
                      borderRadius: 8,
                      cursor: "pointer",
                      opacity: entry.checked ? 1 : 0.55,
                      transition:
                        "border-color .24s cubic-bezier(.22,1,.36,1), background-color .24s cubic-bezier(.22,1,.36,1), opacity .18s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={entry.checked}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleChecked(entry.key);
                      }}
                      data-tip={T("pl.skillModal.selectHint")}
                      style={{ flexShrink: 0, accentColor: TONE.accent, margin: 0 }}
                    />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 12.5,
                        color: TONE.text,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {entry.title.trim() || T("pl.skillModal.nameLabel")}
                    </span>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEntry(entry.key);
                      }}
                      data-tip={T("pl.skillModal.remove")}
                      style={{
                        flexShrink: 0,
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        color: TONE.quiet,
                        cursor: "pointer",
                        fontSize: 13,
                        lineHeight: 1,
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
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右栏：当前选中条目的编辑窗口 */}
          <div
            style={{
              flex: "1.1 1 0",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              boxSizing: "border-box",
              background: TONE.row,
              border: `1px solid ${TONE.border}`,
              borderRadius: 10,
              padding: 10,
            }}
          >
            {!selected ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: TONE.quiet,
                }}
              >
                {T("pl.previewEmpty")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 0, flex: 1, overflow: "hidden" }}>
                {/* 技能名（仅导出模式）：校验通过后由 AI 自动生成，也可手动修改 */}
                {mode === "export" && (
                  <>
                    <span style={{ fontSize: 12, color: TONE.muted, marginTop: 2 }}>{T("pl.skillModal.nameLabel")}</span>
                    <input
                      type="text"
                      value={selected.name}
                      onChange={(e) => updateEntry(selected.key, { name: e.target.value })}
                      placeholder={T("pl.skillModal.nameLabel")}
                      disabled={!selected.checked}
                      style={inputStyle}
                    />
                  </>
                )}
                <span style={{ fontSize: 12, color: TONE.muted, marginTop: 2 }}>{T("pl.skillModal.titleLabel")}</span>
                <input
                  type="text"
                  value={selected.title}
                  onChange={(e) => updateEntry(selected.key, { title: e.target.value })}
                  placeholder={T("pl.skillModal.titleLabel")}
                  disabled={!selected.checked}
                  style={inputStyle}
                />
                <span style={{ fontSize: 12, color: TONE.muted, marginTop: 2 }}>{T("pl.skillModal.summaryLabel")}</span>
                <input
                  type="text"
                  value={selected.summary}
                  onChange={(e) => updateEntry(selected.key, { summary: e.target.value })}
                  placeholder={T("pl.skillModal.summaryLabel")}
                  disabled={!selected.checked}
                  style={inputStyle}
                />
                <span style={{ fontSize: 12, color: TONE.muted, marginTop: 2 }}>{T("pl.skillModal.bodyLabel")}</span>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minHeight: 350 }}>
                  <textarea
                    ref={(el) => {
                      bodyRefs.current[selected.key] = el;
                    }}
                    value={selected.body}
                    onChange={(e) => updateEntry(selected.key, { body: e.target.value })}
                    placeholder={T("pl.skillModal.bodyLabel")}
                    disabled={!selected.checked}
                    spellCheck={false}
                    style={{
                      ...inputStyle,
                      flex: 1,
                      minHeight: 350,
                      resize: "vertical",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  />
                  {mode !== "export" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={plBtn("ghost", "sm")}
                      onClick={() => insertVar(selected.key)}
                      disabled={!selected.checked}
                      data-tip={T("pl.insertVariableTitle")}
                      style={{ flexShrink: 0 }}
                    >
                      {T("pl.skillModal.insertVar")}
                    </Button>
                  )}
                </div>
                {selected.aiFailed && selected.aiFailReason && (
                  <div
                    role="alert"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
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
                    <span style={{ minWidth: 0 }}>{selected.aiFailReason}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 底部操作：AI 补充（仅导出模式，放最左边）+ 校验 + 保存（仅校验通过后可用） */}
        {!result && (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", flexShrink: 0, marginTop: 10, position: "relative" }}>

            {/* 浮动反馈层：校验/修复/操作信息（如聊天气泡，嵌于底部按钮条上方悬浮，一段时间后自动消失） */}
            {toastOpen && hasFeedback && (
              <div
                role={validation ? "alert" : undefined}
                onMouseEnter={pauseToast}
                onMouseLeave={resumeToast}
                style={{
                  position: "absolute",
                  bottom: 2,
                  left: 0,
                  maxWidth: 360,
              maxHeight: 230,
              overflow: "hidden",
              zIndex: 20,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              boxSizing: "border-box",
              padding: "9px 11px",
              borderRadius: 12,
              fontSize: 12,
              lineHeight: 1.5,
              color: TONE.text,
              background: "color-mix(in srgb, var(--dsw-alias-bg-layer-1, #171f2b) 78%, transparent)",
              WebkitBackdropFilter: "blur(12px)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${TONE.borderStrong}`,
              boxShadow: "0 8px 24px rgba(0, 0, 0, .22)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontWeight: 560, fontSize: 12, flex: 1, minWidth: 0 }}>
                {T("pl.skillModal.notice")}
              </span>
              <button
                type="button"
                onClick={() => setToastOpen(false)}
                data-tip={T("pl.close")}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: TONE.quiet,
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                  fontFamily: MONO,
                  padding: "0 2px",
                }}
              >
                ×
              </button>
            </div>

            {/* 内容区：仅此区域滚动，标题与关闭按钮保持固定 */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                overflowY: "auto",
              }}
            >
            {msg && (
              <div style={{ color: msg.error ? TONE.red : TONE.text }}>{msg.text}</div>
            )}

            {validation &&
              (validation.ok ? (
                <div style={{ color: TONE.success }}>{T("pl.skillModal.validatePass")}</div>
              ) : (
                <>
                  <div style={{ color: TONE.red }}>{T("pl.skillModal.issueCount", { count: validation.issues.length })}</div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                      color: TONE.red,
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
              ))}

            {fixLog.length > 0 && (
              <div style={{ color: TONE.success }}>
                <div>{T("pl.skillModal.fixDone", { count: fixLog.length })}</div>
                <ul
                  style={{
                    margin: "2px 0 0",
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

            {fillLog.length > 0 && (
              <div style={{ color: TONE.accent }}>
                <div>{T("pl.skillModal.fillDone", { count: fillLog.length })}</div>
                <ul
                  style={{
                    margin: "2px 0 0 8px",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  {fillLog.map((f, idx) => (
                    <li key={idx} style={{ listStyle: "none" }}>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mode === "export" && aiState !== "idle" && (
              <div
                style={{
                  color:
                    aiState === "running"
                      ? TONE.accent
                      : aiResult && aiResult.errors.length > 0
                        ? TONE.red
                        : TONE.success,
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
                        margin: "2px 0 0",
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
            </div>
          </div>
        )}

            {mode === "export" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={plBtn("ghost", "sm")}
                onClick={handleAiEnhance}
                disabled={aiState === "running"}
                data-tip={T("pl.skillModal.aiEnhanceHint")}
              >
                {T("pl.skillModal.aiEnhance")}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={plBtn("ghost", "sm")}
              onClick={handleValidate}
            >
              {T("pl.skillModal.validate")}
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
            >
              {saving
                ? T("pl.skillModal.saving")
                : mode === "export"
                  ? T("pl.skillModal.saveExport")
                  : T("pl.skillModal.save")}
            </Button>
          </div>
        )}

        {/* 导入/导出结果面板：逐条展示成功/失败/跳过 */}
        {result && (
          <ImportResultPanel
            title={result.title}
            summary={result.summary}
            rows={result.rows}
            onDone={onClose}
            doneLabel={T("pl.resultDone")}
          />
        )}

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
      {/* 浏览式目录选择弹窗（桌面端无原生目录选择器时的回退方案） */}
      <DirectoryPickerModal
        open={dirPickerOpen}
        initialPath={projectPathInput || projectCwd || ""}
        onPick={(dir) => {
          setProjectPathInput(dir);
          setMsg(null);
          setDirPickerOpen(false);
        }}
        onClose={() => setDirPickerOpen(false)}
        t={T}
      />
      {/* 「扫描文件夹」目录选择弹窗：选中后递归扫描其中的 md 文件 */}
      <DirectoryPickerModal
        open={scanDirPickerOpen}
        initialPath=""
        onPick={(dir) => {
          setScanDirPickerOpen(false);
          runScanDir(dir);
        }}
        onClose={() => setScanDirPickerOpen(false)}
        t={T}
      />
    </div>
  );
}
