/**
 * 会话预览面板。
 *
 * 注册到 `conversation.view` 插槽，作为「监控」旁的独立预览视图标签。
 * 只读取当前会话所在工作目录（cwd）下的可预览文件并渲染预览，会话切换自动跟随：
 * - 支持 md / json / txt / csv（递归扫描子目录）；
 * - 多个文件：左侧按类型分组 + 树形节点展示（目录可折叠，文件带类型徽标与大小），右侧展示内容；
 * - md：正文含标题大纲时再分左右（大纲 + 正文）；
 * - json：以对象（可折叠树）展示；txt：纯文本；csv：解析为表格。
 *
 * 会话 id 优先取宿主注入的 `useSession`（当前被查看的会话，无论是否运行都实时跟随），
 * 未注入时回退到后端「当前会话」端点 `getActiveSessionId()` 轮询（最近活跃会话，与会话监控同口径）；
 * 文件列表通过后端 `preview/list`（后端解析会话工作目录并递归扫描）、内容经 `preview/read` 读取。
 * 头部提供「打开文件夹」按钮：调用宿主原生目录选择器手动指定目录，直接以该目录为根预览
 * （手动模式覆盖会话派生目录，且不随会话切换改变），再次点击可更换目录。
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import JSZip from "jszip";
import type { PLTranslate } from "../../utils/i18n.js";
import {
  getActiveSessionId,
  listPreviewFiles,
  listPreviewFilesByDir,
  downloadPreviewFile,
  previewDelete,
  previewMkdir,
  previewNewFile,
  previewRename,
  previewMove,
  previewCopy,
  readPreviewFile,
  savePreviewFile,
  searchPreviewFiles,
  type PreviewFileEntry,
  type PreviewFileType,
  type PreviewSearchMatch,
} from "../../utils/api.js";
import { isDirectoryBrowserAvailable, isDirectoryPickerAvailable, pickExportDirectory } from "../../utils/workspace-picker.js";
import { DirectoryPickerModal } from "./DirectoryPickerModal.js";
import { CodeHighlight } from "../common/CodeHighlight.js";
import { ArtifactExporter } from "./ArtifactExporter.js";
// 聊天结果「产物文件」卡片跳转预览面板的目标路径信号
import { consumePendingPreviewPath, PREVIEW_OPEN_EVENT_NAME } from "../../utils/preview-target.js";
import { getTone, useThemeSync } from "../../utils/theme.js";
// ── 拆出的子模块：共享类型/常量、渲染、工具 ─────────────────────────────
import {
  S,
  TYPE_META,
  PRISM_LANG_MAP,
  BIG_LINE_H,
  BIG_TEXT_THRESHOLD,
  type PreviewProps,
  type FileTreeNode,
  type MoveDirNode,
  type CtxTarget,
  type SmartCategory,
} from "./previewShared.js";
import { renderMd } from "./mdRender.js";
import { formatFileSize, formatModified, isLargeFile, buildTree, dirnameOf } from "./fileUtils.js";
import { copyText, triggerDownload, fileTypeOf, fileIconOf, formatZipSize, sanitizeFilename } from "./clientUtils.js";
import { JsonTree } from "./jsonTree.js";
import { TreeNodes } from "./fileTree.js";
import { LargeFileViewer } from "./largeFileViewer.js";
import { parseCsv, CsvTable } from "./csvView.js";

export function PreviewView(props: PreviewProps): ReactNode {
  useThemeSync(); // 订阅宿主主题，白天/黑夜切换时刷新主题色
  // 主题色：右键菜单等浮层也据此统一样式，保证昼夜一致
  const TONE = getTone();
  // 翻译座位；宿主未注入时回退为直接返回 key，保证子弹窗（浏览式目录选择）语言不缺失
  const T: PLTranslate = props?.t ?? ((k: string): string => k);

  // 当前会话 id：优先取宿主注入的 useSession（当前被查看的会话，切换会话无论是否运行都即时跟随），
  // 未注入或取不到时回退到后端「当前会话」端点轮询（最近活跃会话）。后端再据此解析会话所属文件夹。
  const useSession = props?.useSession;
  const viewedSessionId =
    typeof useSession === "function" ? (useSession((s) => s.sessionId) ?? "") : "";
  const [activeSessid, setActiveSessid] = useState<string>("");
  const sessid = viewedSessionId || activeSessid;

  // 解析出的会话所属文件夹（后端返回的根目录，用于头部展示）
  const [dir, setDir] = useState<string>("");
  // 手动选择的预览目录（「打开文件夹」选择后覆盖会话派生目录；null 表示跟随会话）
  const [manualDir, setManualDir] = useState<string | null>(null);
  // 刷新动画状态：点击刷新时 ⟳ 旋转一圈，动画结束后复位
  const [spinning, setSpinning] = useState(false);
  // 浏览式目录选择弹窗（桌面端原生选择器不可用时的回退选择方案）
  const [dirPickerOpen, setDirPickerOpen] = useState(false);
  // 所属文件夹下可预览文件列表
  const [files, setFiles] = useState<PreviewFileEntry[]>([]);
  // 当前选中的文件绝对路径
  const [activePath, setActivePath] = useState<string | null>(null);
  // 当前文件正文
  const [content, setContent] = useState<string | null>(null);
  // 编辑模式：是否处于编辑状态
  const [editing, setEditing] = useState(false);
  // 大纲面板是否收起（默认展开）
  const [tocCollapsed, setTocCollapsed] = useState(false);
  // 编辑中的内容（与 content 分离，避免未保存时污染原始内容）
  const [editContent, setEditContent] = useState<string>("");
  // 保存状态
  const [saving, setSaving] = useState(false);
  // Toast 提示
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  // ── 右键菜单 ──
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; target: CtxTarget } | null>(null);
  // 右键菜单 DOM 引用 + 智能翻转后的纵向位移（避免底部被遮挡时把菜单弹出屏幕外）
  const ctxMenuRef = useRef<HTMLDivElement | null>(null);
  const [ctxMenuTop, setCtxMenuTop] = useState<number | null>(null);
  // 菜单打开后测量实际高度：若高度超出底部可视区，则翻转到光标上方显示
  useLayoutEffect(() => {
    if (!ctxMenu) {
      setCtxMenuTop(null);
      return;
    }
    const el = ctxMenuRef.current;
    if (!el) {
      setCtxMenuTop(null);
      return;
    }
    const h = el.offsetHeight;
    const vh = window.innerHeight;
    let top = ctxMenu.y;
    if (top + h > vh - 8) top = Math.max(8, ctxMenu.y - h - 8); // 下方放不下则翻到光标上方
    setCtxMenuTop(top);
  }, [ctxMenu]);
  // 名称输入弹窗（重命名文件/目录、新建文件/目录共用）
  const [nameDialog, setNameDialog] = useState<{
    title: string;
    label: string;
    initial: string;
    placeholder: string;
    okText: string;
    onOk: (name: string) => Promise<void>;
  } | null>(null);
  // 危险确认弹窗（删除）
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    okText: string;
    onOk: () => Promise<void>;
  } | null>(null);
  // 名称输入框中当前值
  const [nameInput, setNameInput] = useState("");
  // 名称输入弹窗内的校验错误提示
  const [dialogErr, setDialogErr] = useState("");
  // 弹窗进行中（防重复提交）
  const [modalBusy, setModalBusy] = useState(false);
  // 刷新计数：整体自增触发文件列表重载
  const [refreshTick, setRefreshTick] = useState(0);
  // 右键「编辑」时若目标文件尚未加载正文，标记在正文加载完成后自动进入编辑模式
  const editOnLoadRef = useRef(false);
  // ZIP 导出选择器状态：entries 为可勾选文件；zipSel 记录已选（按 rel 路径）
  const [zipExport, setZipExport] = useState<null | {
    title: string;
    rootName: string;
    entries: { absPath: string; rel: string; type: string; size: number }[];
  }>(null);
  const [zipSel, setZipSel] = useState<Set<string>>(new Set());
  const [zipBusy, setZipBusy] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number } | null>(null);
  // 日志文件截断标志和总行数
  const [truncated, setTruncated] = useState<boolean | undefined>(undefined);
  const [totalLines, setTotalLines] = useState<number | undefined>(undefined);
  // 大纲当前高亮项
  const [activeId, setActiveId] = useState<string>("");
  // 已折叠的目录相对路径集合（默认全部展开）
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    // 从 localStorage 读取上次的折叠状态
    try {
      const saved = localStorage.getItem("pl-preview-collapsed");
      if (saved) {
        const arr = JSON.parse(saved) as string[];
        return new Set(arr);
      }
    } catch {}
    return new Set();
  });
  // 当前激活的 Tab（文件类型）
  const [activeTab, setActiveTab] = useState<PreviewFileType | SmartCategory | "all">(() => {
    try {
      const saved = localStorage.getItem("pl-preview-activeTab");
      if (saved === "all") return "all";
      if (saved === "docs" || saved === "config" || saved === "test" || saved === "business" ||
          saved === "styles" || saved === "data" || saved === "other") return saved as SmartCategory;
      if (saved && (saved in TYPE_META)) return saved as PreviewFileType;
    } catch {}
    return "all";
  });
  // 列表显示模式：grouped（分组视图）或 list（列表视图）
  type ViewMode = "grouped" | "list";
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // 从 localStorage 读取上次选择的视图模式
    try {
      const saved = localStorage.getItem("pl-preview-viewMode");
      if (saved === "grouped" || saved === "list") return saved;
    } catch {}
    return "grouped"; // 默认分组视图
  });
  // 是否启用智能分类
  const [smartClassify, setSmartClassify] = useState<boolean>(() => {
    try {
      return localStorage.getItem("pl-preview-smartClassify") === "1";
    } catch {}
    return false;
  });
  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState("");
  // 搜索模式：name（仅匹配文件名）或 full（全文 grep 检索命中内容）
  const [searchMode, setSearchMode] = useState<"name" | "full">("name");
  // 全文搜索命中的结果
  const [fullMatches, setFullMatches] = useState<PreviewSearchMatch[] | null>(null);
  // 全文搜索进行中
  const [fullSearching, setFullSearching] = useState(false);
  // 待跳转定位的行号（点击全文搜索命中 / 大文件视图定位用）
  const [jumpToLine, setJumpToLine] = useState<number | null>(null);
  // 排序方式
  type SortMode = "name" | "size" | "type" | "modified";
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    try {
      const saved = localStorage.getItem("pl-preview-sortMode");
      if (saved === "name" || saved === "size" || saved === "type" || saved === "modified") return saved;
    } catch {}
    return "name";
  });
  const [sortAsc, setSortAsc] = useState<boolean>(() => {
    try {
      return localStorage.getItem("pl-preview-sortAsc") !== "0";
    } catch {}
    return true;
  });
  // 文件树「定位」高亮节点（绝对路径）
  const [flashNode, setFlashNode] = useState<string | null>(null);
  // 移动/复制到目录弹窗
  const [moveDlg, setMoveDlg] = useState<{ op: "move" | "copy"; from: string; name: string } | null>(null);
  // 移动弹窗当前选中目标目录（相对路径，"" 表示根目录）
  const [moveTarget, setMoveTarget] = useState("");
  // 移动弹窗目录树折叠状态（收起则只显示父级，点击箭头展开）
  const [moveCollapsed, setMoveCollapsed] = useState<Set<string>>(new Set());
  // 移动弹窗判断中（防重复提交）
  const [moveBusy, setMoveBusy] = useState(false);
  // 本预览面板是否处于激活视图标签（用于 #8 增量刷新节流）
  const [panelActive, setPanelActive] = useState(false);
  const bodyRef = useRef<HTMLElement | null>(null);
  // 回调 ref：md/txt/编辑共用同一个滚动位置引用指向当前可见的滚动容器（类型统一为 HTMLElement）
  const setBodyRef = (el: HTMLElement | null) => {
    bodyRef.current = el;
  };
  // 每个文件各自的正文滚动位置：切换文件时记录，切回该文件时恢复，避免每次回到顶部丢失阅读位置。
  const scrollPosMapRef = useRef<Map<string, number>>(new Map());
  // 待定位的目标文件（来自聊天结果「产物文件」卡片跳转）：持久保存到文件列表就绪后再定位。
  // 注意：不能用 state 的 activePath 直接存，因为要在文件列表加载完成的效果里消费。
  const targetRef = useRef<string | null>(null);

  // 消费来自聊天结果「产物文件」卡片跳转的目标路径：
  // 挂载时读取模块级待消费信号（激活预览标签后本面板才挂载，信号在此落点），
  // 之后实时监听 window 事件（面板已挂载时点卡片的增量）。
  useEffect(() => {
    const apply = (path?: string | null) => {
      if (!path) return;
      targetRef.current = path;
      // 若目标路径不在当前列表，把其父目录作为手动预览目录重新扫描后再定位
      const hit = files.some((f) => f.path === path);
      if (hit) {
        setActivePath(path);
        targetRef.current = null;
      } else if (!manualDir) {
        // 计算目标文件父目录：聊天产物路径可能不在会话目录下，以父目录为根扫描
        const parent = dirnameOf(path);
        if (parent) setManualDir(parent);
      }
    };
    apply(consumePendingPreviewPath());
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent<{ path?: string }>).detail;
      apply(detail?.path);
    };
    window.addEventListener(PREVIEW_OPEN_EVENT_NAME, onOpen);
    return () => window.removeEventListener(PREVIEW_OPEN_EVENT_NAME, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- files/manualDir 由下方列表效果与 apply 共同驱动
  }, [files, manualDir]);

  // 回退源：仅当宿主未注入 useSession 时，轮询后端「当前会话」端点获取会话 id。
  // useSession 存在时 viewedSessionId 由宿主订阅驱动、随会话切换即时更新，无需轮询。
  useEffect(() => {
    if (useSession) return;
    let alive = true;
    const load = () =>
      getActiveSessionId()
        .then((d) => {
          if (!alive) return;
          const next = d.sessid || "";
          setActiveSessid((prev) => (prev === next ? prev : next));
        })
        .catch(() => {
          /* 后端未就绪时静默，下次轮询再试 */
        });
    load();
    const id = window.setInterval(load, 4000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [useSession]);

  // 持久化：视图模式变化时保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pl-preview-viewMode", viewMode);
    } catch {}
  }, [viewMode]);

  // 持久化：折叠状态变化时保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pl-preview-collapsed", JSON.stringify([...collapsed]));
    } catch {}
  }, [collapsed]);

  // 持久化：排序模式 / 排序方向 / 激活 Tab / 智能分类
  useEffect(() => {
    try {
      localStorage.setItem("pl-preview-sortMode", sortMode);
    } catch {}
  }, [sortMode]);
  useEffect(() => {
    try {
      localStorage.setItem("pl-preview-sortAsc", sortAsc ? "1" : "0");
    } catch {}
  }, [sortAsc]);
  useEffect(() => {
    try {
      localStorage.setItem("pl-preview-activeTab", String(activeTab ?? "all"));
    } catch {}
  }, [activeTab]);
  useEffect(() => {
    try {
      localStorage.setItem("pl-preview-smartClassify", smartClassify ? "1" : "0");
    } catch {}
  }, [smartClassify]);

  // 会话/手动目录变化 → 重新列出文件，保持当前选中（仍存在）或回落第一个。
  // 手动选择的目录优先于会话派生目录（用户显式指定，不随会话切换而改变）。
  useEffect(() => {
    if (!sessid && !manualDir) {
      setDir("");
      setFiles([]);
      setActivePath(null);
      // 不重置 collapsed，保留用户的折叠偏好
      return;
    }
    let alive = true;
    const load = manualDir ? listPreviewFilesByDir(manualDir) : listPreviewFiles(sessid);
    load
      .then(({ dir: root, files: list }) => {
        if (!alive) return;
        setDir(root);
        setFiles(list);
        // 不重置 collapsed，保留用户的折叠偏好
        setActivePath((prev) =>
          prev && list.some((f) => !f.dir && f.path === prev) ? prev : (list.find((f) => !f.dir)?.path ?? null),
        );
      })
      .catch(() => {
        if (alive) {
          setDir("");
          setFiles([]);
          setActivePath(null);
        }
      });
    return () => {
      alive = false;
    };
  }, [sessid, manualDir, refreshTick]);

  // 选中文件变化 → 加载正文
  useEffect(() => {
    if (!activePath) {
      setContent(null);
      setTruncated(undefined);
      setTotalLines(undefined);
      return;
    }
    
    // 立即清空旧内容，避免显示错误类型的内容
    setContent(null);
    setTruncated(undefined);
    setTotalLines(undefined);
    setEditing(false);
    setEditContent("");
    
    let alive = true;
    readPreviewFile(activePath)
      .then((d) => {
        if (alive) {
          setContent(d.content);
          setTruncated(d.truncated);
          setTotalLines(d.totalLines);
          setActiveId("");
          // 右键「编辑」目标为非当前文件时，正文加载完成即自动进入编辑
          if (editOnLoadRef.current) {
            editOnLoadRef.current = false;
            setEditContent(d.content);
            setEditing(true);
          }
        }
      })
      .catch(() => {
        if (alive) {
          setContent(null);
          setTruncated(undefined);
          setTotalLines(undefined);
        }
      });
    return () => {
      alive = false;
    };
  }, [activePath]);

  // 全文搜索模式激活且有查询 → 防抖调用后端全文检索
  const fullOpen = searchMode === "full" && !!searchQuery.trim();
  useEffect(() => {
    if (!fullOpen) {
      setFullMatches(null);
      setFullSearching(false);
      return;
    }
    const q = searchQuery.trim();
    let alive = true;
    const timer = window.setTimeout(async () => {
      setFullSearching(true);
      try {
        const params = manualDir
          ? { dir: manualDir, query: q, caseSensitive: false }
          : { sessid, query: q, caseSensitive: false };
        const r = await searchPreviewFiles(params);
        if (alive) setFullMatches(r.matches);
      } catch {
        if (alive) setFullMatches([]);
      } finally {
        if (alive) setFullSearching(false);
      }
    }, 260);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [fullOpen, searchQuery, sessid, manualDir]);

  // 按命中行跳转：等待内容加载后让正文滚动容器滚动到目标行（大文件视图提供行号定位）
  const plainBodyRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (jumpToLine == null) return;
    const timer = window.setTimeout(() => {
      if (plainBodyRef.current) {
        plainBodyRef.current.scrollTop = Math.max(0, (jumpToLine - 1) * BIG_LINE_H - 40);
      }
      setJumpToLine(null);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [jumpToLine, content, activePath]);

  // 恢复滚动位置：每次切换文件时正文容器可能被 React 复用而非真正卸载（内容先清空再加载，
  // mdBody 与空态同为 div，节点会复用导致 scrollTop 残留）。
  // 因此先强制归零（未打开过的文件默认顶部），若该文件之前打开过再恢复到记录的 scrollTop。
  // 大文件走分片虚拟滚动（LargeFileViewer 自带滚动保持），此处跳过避免误改其滚动。
  useEffect(() => {
    if (!activePath || content === null || bigText) return;
    const el = bodyRef.current;
    if (!el) return;
    // 一律先回顶部，再按需恢复，保证新打开的文件从顶部开始
    if (el.scrollTop !== 0) el.scrollTop = 0;
    const saved = scrollPosMapRef.current.get(activePath);
    if (typeof saved === "number" && el.scrollTop !== saved) el.scrollTop = saved;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bigText 由 content/truncated/totalLines 派生，随 content 变化已覆盖
  }, [activePath, content]);

  // 增量刷新：#8 面板激活时用 SSE 订阅预览根目录变更（fs.watch 实时推送），变更才重扫。
  // 相比轮询 rootmtime，事件驱动更及时且无固定周期开销；目录切换时关闭旧连接、重连新目录。
  useEffect(() => {
    if (!panelActive || !dir) return;
    const es = new EventSource(`/api/prompt-library/preview/watch?dir=${encodeURIComponent(dir)}`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { changed?: boolean };
        if (data.changed) setRefreshTick((t) => t + 1);
      } catch {
        /* 忽略无法解析的推送 */
      }
    };
    // 断线后 EventSource 会自动以指数退避重连；目录切换/面板失活时由下方 cleanup 显式关闭。
    return () => es.close();
  }, [panelActive, dir]);

  // 解析 md 正文：大纲 + 渲染节点
  const parsed = useMemo(() => (content ? renderMd(content) : { outline: [], body: [] }), [content]);
  const outline = parsed.outline;

  // 大文件截断提示条：后端只返回部分内容时告知用户（显示全文共多少行）
  const truncHint = truncated
    ? (
        <div className={`${S}-truncHint`}>
          {T?.("pl.preview.truncated") ?? "文件较大，已截断预览，仅显示部分内容"}（共 {totalLines ?? "?"} 行）
        </div>
      )
    : null;

  // 解析 json 正文：对象 + 是否解析失败
  const activeFile = files.find((f) => f.path === activePath) ?? null;

  const { jsonValue, jsonError } = useMemo(() => {
    if (activeFile?.type !== "json" || content === null) return { jsonValue: null, jsonError: false };
    try {
      return { jsonValue: JSON.parse(content) as unknown, jsonError: false };
    } catch {
      return { jsonValue: null, jsonError: true };
    }
  }, [activeFile, content]);

  // 智能文件分类：基于文件名（basename）与相对路径目录，避免绝对路径里的项目名干扰
  function classifyFile(file: PreviewFileEntry): SmartCategory {
    // 只用「相对根目录」的路径做目录判断：绝对路径可能含项目名（如 C:\test-app、C:\docs），会误判全目录
    const rel = file.name.toLowerCase().replace(/\\/g, "/");
    // 取 basename 做关键词匹配，避免相对路径中的目录名误判（如 style.ts 不因含 style 判为样式）
    const lower = (file.name.split("/").pop() ?? "").toLowerCase();
    // 目录段是否命中任一名字（仅检查父目录，不含 basename）
    const inDir = (...names: string[]) => rel.split("/").slice(0, -1).some((s) => names.includes(s));

    // 配置文件：按 basename 关键词（含 jest/vitest/playwright/tailwind 等测试与构建配置、Dockerfile/.env 等无扩展名配置）或类型
    // 放在文档判定之前：Dockerfile/.env/.gitignore 等被后端映射为 txt，需先按名字归为配置
    if (
      lower === ".env" ||
      lower.startsWith(".env.") ||
      lower === ".envrc" ||
      lower.includes("package.json") ||
      lower.includes("tsconfig") ||
      lower.includes("dockerfile") ||
      lower.includes(".gitignore") ||
      lower.includes(".gitattributes") ||
      lower.includes(".npmrc") ||
      lower.includes(".npmignore") ||
      lower.includes(".editorconfig") ||
      lower.includes("webpack") ||
      lower.includes("vite.config") ||
      lower.includes("eslint") ||
      lower.includes("prettier") ||
      lower.includes("jest.config") ||
      lower.includes("vitest.config") ||
      lower.includes("playwright.config") ||
      lower.includes("tailwind.config") ||
      lower.includes(".babelrc") ||
      lower.includes("babel.config") ||
      lower.includes("makefile") ||
      lower.includes("rakefile") ||
      lower.includes("gemfile") ||
      lower.includes("justfile") ||
      lower.includes("procfile") ||
      lower.includes("vagrantfile") ||
      lower.includes("caddyfile")
    ) {
      return "config";
    }

    // 文档：md/txt 优先，或 readme/changelog/license 文件名、docs 等目录
    if (
      file.type === "md" ||
      file.type === "txt" ||
      lower.includes("readme") ||
      lower.includes("changelog") ||
      lower.includes("license") ||
      inDir("docs", "documentation", "licenses")
    ) {
      return "docs";
    }

    // 测试文件：basename 的 .test./.spec./.tests./__tests__，或 test(s)/__tests__ 目录
    if (
      lower.includes(".test.") ||
      lower.includes(".spec.") ||
      lower.includes(".tests.") ||
      lower.includes("__tests__") ||
      inDir("test", "tests", "__tests__")
    ) {
      return "test";
    }

    // 样式文件：仅按扩展名/tailwind 前缀判定，避免把含 "style"/"tailwind" 的业务代码误判为样式
    if (
      lower.endsWith(".css") ||
      lower.endsWith(".scss") ||
      lower.endsWith(".sass") ||
      lower.endsWith(".less") ||
      lower.startsWith("tailwind")
    ) {
      return "styles";
    }

    // 数据文件
    if (file.type === "json" || file.type === "csv") {
      return "data";
    }

    // 业务代码（test 分支已提前拦截，无需再排除 .test./.spec.）
    if (["ts", "js", "py", "go", "rs", "java", "c", "cpp"].includes(file.type)) {
      return "business";
    }

    return "other";
  }
  
  const CATEGORY_LABELS: Record<SmartCategory, string> = {
    docs: "📝 文档",
    config: "🔧 配置",
    test: "🧪 测试",
    business: "💼 业务代码",
    styles: "🎨 样式",
    data: "📊 数据",
    other: "📦 其他",
  };
  
  const CATEGORY_COLORS: Record<SmartCategory, string> = {
    docs: "#60a5fa",
    config: "#f59e0b",
    test: "#10b981",
    business: "#8b5cf6",
    styles: "#ec4899",
    data: "#14b8a6",
    other: "#6b7280",
  };

  // Tab 标签页：统计每种类型的文件数量
  const tabCounts = useMemo(() => {
    const counts = new Map<PreviewFileType, number>();
    for (const f of files) {
      if (f.dir) continue;
      counts.set(f.type, (counts.get(f.type) || 0) + 1);
    }
    return counts;
  }, [files]);

  // 仅文件（剔除目录条目），供扁平列表/分类/计数使用；目录节点只进图层树
  const fileEntries = useMemo(() => files.filter((f) => !f.dir), [files]);

  // 智能分类统计
  const smartCategoryCounts = useMemo(() => {
    const counts = new Map<SmartCategory, number>();
    for (const f of fileEntries) {
      const category = classifyFile(f);
      counts.set(category, (counts.get(category) || 0) + 1);
    }
    return counts;
  }, [fileEntries]);

  // 过滤和排序后的文件列表
  const filteredFiles = useMemo(() => {
    let result = fileEntries;
    
    // 按 Tab 过滤（支持智能分类）
    if (activeTab !== "all") {
      if (smartClassify) {
        // 智能分类模式：按分类过滤
        result = result.filter((f) => classifyFile(f) === activeTab);
      } else {
        // 普通模式：按文件类型过滤
        result = result.filter((f) => f.type === activeTab);
      }
    }
    
    // 按搜索关键词过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(query));
    }
    
    // 排序
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortMode) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "size":
          cmp = a.size - b.size;
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "modified":
          cmp = (a.modified || 0) - (b.modified || 0);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    
    return result;
  }, [files, activeTab, searchQuery, sortMode, sortAsc]);

  // 图层树（分组视图）：按文件夹节点聚合；受类型/智能分类 Tab 与搜索关键字过滤
  const treeNodes = useMemo(() => {
    // 与扁平列表一致的 Tab 谓词
    let pred: (f: PreviewFileEntry) => boolean = () => true;
    if (activeTab !== "all") {
      pred = smartClassify
        ? (f) => classifyFile(f) === activeTab
        : (f) => f.type === activeTab;
    }
    const q = searchQuery.trim().toLowerCase();
    return buildTree(files.filter((f) => (!q || f.name.toLowerCase().includes(q)) && pred(f)));
  }, [files, activeTab, smartClassify, searchQuery]);

  const showFiles = fileEntries.length > 1;
  const showToc = activeFile?.type === "md" && outline.length > 0;

  // 左侧面板是否可见：多文件正常展示，或处于全文搜索模式（允许单文件目录也检索）
  const showLeftPanel = showFiles || fullOpen;

  // 大文本文件：截断读取（truncated）或行数超阈值时改用分片虚拟滚动查看
  const bigText =
    activeFile != null &&
    (activeFile.type === "txt" || activeFile.type === "md") &&
    (truncated || (totalLines != null && totalLines > BIG_TEXT_THRESHOLD));

  // 全文搜索命中：按文件分组
  const fullGroups = useMemo(() => {
    if (!fullMatches) return [];
    const map = new Map<string, PreviewSearchMatch[]>();
    for (const m of fullMatches) {
      const arr = map.get(m.path);
      if (arr) arr.push(m);
      else map.set(m.path, [m]);
    }
    return [...map.values()];
  }, [fullMatches]);

  // 移动/复制目标目录列表（相对路径 + 绝对路径；含根目录）
  const allDirs = useMemo(() => {
    const set = new Set<string>();
    for (const f of files) {
      const parts = f.name.split("/");
      const end = f.dir ? parts.length : parts.length - 1;
      for (let i = 1; i <= end; i++) set.add(parts.slice(0, i).join("/"));
    }
    const arr: { rel: string; abs: string }[] = [{ rel: "", abs: dir || "" }];
    for (const rel of set) arr.push({ rel, abs: dir ? `${dir}/${rel}` : rel });
    return arr.sort((a, b) => a.rel.localeCompare(b.rel));
  }, [files, dir]);

  // 移动/复制目标目录树：由 allDirs 的相对路径装配成父子结构，供树形选择展示。
  const moveDirTree = useMemo(() => {
    interface MNode {
      name: string;
      rel: string;
      abs: string;
      children: MNode[];
    }
    const root: MNode = { name: "", rel: "", abs: dir || "", children: [] };
    const byRel = new Map<string, MNode>();
    byRel.set("", root);
    for (const d of allDirs) {
      if (!d.rel) continue;
      const parts = d.rel.split("/");
      let acc = "";
      for (let i = 0; i < parts.length; i++) {
        acc = acc ? `${acc}/${parts[i]}` : parts[i];
        if (!byRel.has(acc)) {
          byRel.set(acc, {
            name: parts[i],
            rel: acc,
            abs: dir ? `${dir}/${acc}` : acc,
            children: [],
          });
        }
        const parentRel = i === 0 ? "" : acc.slice(0, acc.lastIndexOf("/"));
        const parent = byRel.get(parentRel);
        const node = byRel.get(acc)!;
        if (parent && parent !== node && !parent.children.some((c) => c.rel === acc)) {
          parent.children.push(node);
        }
      }
    }
    return root.children;
  }, [allDirs]);

  // 递归渲染移动/复制目标目录树（缩进 + 折叠箭头 + 可选中目录）
  const renderMoveDirTree = (nodes: MoveDirNode[], depth: number): ReactNode =>
    nodes.map((n) => {
      const hasChild = n.children.length > 0;
      const open = !moveCollapsed.has(n.rel);
      return (
        <div key={n.rel || "~"} className={`${S}-moveDirBranch`} style={{ paddingLeft: depth * 16 }}>
          {hasChild && (
            <button
              type="button"
              className={`${S}-moveDirArrow${open ? " open" : ""}`}
              onClick={() =>
                setMoveCollapsed((prev) => {
                  const next = new Set(prev);
                  if (open) next.add(n.rel);
                  else next.delete(n.rel);
                  return next;
                })
              }
              title={open ? (T?.("pl.preview.collapse") ?? "收起") : (T?.("pl.preview.expand") ?? "展开")}
            >
              {open ? "▾" : "▸"}
            </button>
          )}
          <button
            type="button"
            className={`${S}-moveDir${moveTarget === n.rel ? " active" : ""}`}
            style={{ paddingLeft: hasChild ? 4 : 20, width: hasChild ? undefined : "100%" }}
            onClick={() => setMoveTarget(n.rel)}
            title={n.abs}
          >
            {n.rel === "" ? (T?.("pl.preview.moveRoot") ?? "根目录") : n.name}
          </button>
          {open && hasChild && renderMoveDirTree(n.children, depth + 1)}
        </div>
      );
    });

  // 打开全文搜索命中：选中文件并请求跳到匹配行
  const openSearchMatch = (m: PreviewSearchMatch) => {
    setActivePath(m.path);
    setJumpToLine(m.line);
  };

  // 左侧搜索/列表区域滚动容器引用（供「定位」操作找到目标节点）
  const fileListRef = useRef<HTMLDivElement | null>(null);

  // 「定位」：展开 activePath 所在目录并滚动高亮该文件节点（列表/分组视图均适用）
  const locateActive = () => {
    if (!activePath || !dir) return;
    // 若处于全文搜索模式，先退出回到文件浏览，确保目标节点可见
    if (searchMode === "full" && searchQuery.trim()) setSearchQuery("");
    // 分组视图：先展开目标所在各级父目录
    if (viewMode === "grouped") {
      const rel = relOf(activePath).split("/");
      const parents = new Set<string>();
      let p = "";
      for (let i = 0; i < rel.length - 1; i++) {
        p = p ? `${p}/${rel[i]}` : rel[i];
        parents.add(p);
      }
      setCollapsed((prev) => {
        const next = new Set(prev);
        for (const d of parents) next.delete(d);
        return next;
      });
    }
    setFlashNode(activePath);
    window.setTimeout(() => {
      const container = fileListRef.current;
      const pathQuery = CSS.escape(activePath);
      const node = container?.querySelector<HTMLElement>(
        `.${S}-file[data-path="${pathQuery}"], .${S}-fileItem[data-path="${pathQuery}"]`,
      );
      node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      window.setTimeout(() => setFlashNode(null), 1600);
    }, 150);
  };

  // 移动/复制动作执行
  const runMoveCopy = async () => {
    if (!moveDlg || moveBusy) return;
    setMoveBusy(true);
    try {
      const absTarget = moveTarget ? (dir ? `${dir}/${moveTarget}` : moveTarget) : dir || "";
      if (absTarget && absTarget === moveDlg.from) {
        flash(T("pl.preview.targetSame"), "error");
        return;
      }
      if (moveDlg.op === "move") await previewMove(moveDlg.from, absTarget);
      else await previewCopy(moveDlg.from, absTarget);
      flash(T("pl.preview.toast.opSuccess"));
      setMoveDlg(null);
      setMoveTarget("");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      flash(err instanceof Error ? err.message : T("pl.preview.toast.opFailed"), "error");
    } finally {
      setMoveBusy(false);
    }
  };
  const openMoveDlg = (op: "move" | "copy") => {
    const t = useCtxTarget();
    if (!t) return;
    closeMenu();
    setMoveTarget("");
    setMoveCollapsed(new Set());
    setMoveDlg({ op, from: t.absPath, name: t.relPath || t.name });
  };

  // 编辑功能
  /** 进入编辑模式 */
  const startEditing = () => {
    if (content === null || truncated) return; // 截断的文件数据不完整，禁止编辑，以免保存时覆盖原文件
    setEditContent(content);
    setEditing(true);
  };

  /** 取消编辑 */
  const cancelEditing = () => {
    setEditing(false);
    setEditContent("");
  };

  /** 保存文件 */
  const handleSave = async () => {
    if (!activePath || !editContent) return;
    
    setSaving(true);
    try {
      await savePreviewFile(activePath, editContent);
      setContent(editContent);
      setEditing(false);
      setToast({ message: T("pl.preview.toast.saveOk"), type: "success" });
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error("Save failed:", err);
      setToast({ message: T("pl.preview.toast.saveFail"), type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // 手动刷新：重列文件 + 重载当前正文（跟随会话或手动目录）
  const refresh = () => {
    setSpinning(true);
    if (!sessid && !manualDir) return;
    const load = manualDir ? listPreviewFilesByDir(manualDir) : listPreviewFiles(sessid);
    load
      .then(({ dir: root, files: list }) => {
        setDir(root);
        setFiles(list);
        // 不重置 collapsed，保留用户的折叠偏好
        setActivePath((prev) =>
          prev && list.some((f) => !f.dir && f.path === prev) ? prev : (list.find((f) => !f.dir)?.path ?? null),
        );
      })
      .catch(() => {});
  };

  // ── 右键菜单 ──
  // 绝对路径 → 相对列表根目录的路径（用于展示「相对路径」）
  const relOf = (abs: string): string =>
    dir ? abs.replace(/\\/g, "/").slice(dir.length).replace(/^\/+/, "") : abs;

  const flash = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), type === "error" ? 3000 : 2000);
  };

  // 打开右键菜单：n 为树/列表节点；null 表示列表空白区。
  const openCtx = (
    e: { clientX: number; clientY: number; preventDefault(): void; stopPropagation(): void },
    n: FileTreeNode | null,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    let target: CtxTarget;
    if (!n) {
      target = { kind: "blank", absPath: dir || "", relPath: "", name: "" };
    } else if (n.children) {
      target = {
        kind: "dir",
        absPath: dir ? `${dir}/${n.path ?? ""}` : (n.path ?? ""),
        relPath: n.path ?? "",
        name: n.name,
      };
    } else {
      target = {
        kind: "file",
        absPath: n.path ?? "",
        relPath: relOf(n.path ?? ""),
        name: n.name,
        type: n.type,
      };
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, target });
  };

  const closeMenu = () => setCtxMenu(null);

  // 任一动作执行前的自定义跳转（裁剪到当前 target）
  const useCtxTarget = (): CtxTarget | null => ctxMenu?.target ?? null;

  // 纯前端动作：复制
  const actCopy = async (what: "abs" | "rel" | "name" | "link") => {
    const t = useCtxTarget();
    if (!t) return;
    const text =
      what === "abs" ? t.absPath : what === "rel" ? t.relPath : what === "name" ? t.name : `[${t.name}](${t.relPath})`;
    const ok = await copyText(text);
    flash(ok ? T("pl.preview.toast.copied") : T("pl.preview.toast.copyFailed"));
    closeMenu();
  };

  const readAndCopy = async (fence: boolean) => {
    const t = useCtxTarget();
    if (!t) return;
    closeMenu();
    try {
      const d = await readPreviewFile(t.absPath);
      const text = fence
        ? "```" + (t.type === "md" ? "markdown" : (t.type ?? "")) + "\n" + d.content.replace(/\s+$/, "") + "\n```"
        : d.content;
      const ok = await copyText(text);
      flash(ok ? T("pl.preview.toast.copied") : T("pl.preview.toast.copyFailed"));
    } catch {
      flash(T("pl.preview.toast.readFailed"), "error");
    }
  };

  // 展开/折叠全部（作用于当前树）
  const collectDirs = (nodes: FileTreeNode[]): string[] =>
    nodes.flatMap((n) => (n.children ? [n.path!, ...collectDirs(n.children)] : []));
  const actExpandAll = () => {
    setCollapsed(new Set());
    closeMenu();
  };
  const actCollapseAll = () => {
    setCollapsed(new Set(collectDirs(treeNodes)));
    closeMenu();
  };
  const actRefresh = () => {
    closeMenu();
    refresh();
  };

  // 右键「编辑」：若目标文件已是当前文件且正文已加载则直接进入编辑，否则加载后自动编辑。
  // 截断的文件数据不完整，禁止编辑以免覆盖原文件。
  const actEdit = () => {
    const t = useCtxTarget();
    if (!t || t.kind !== "file") return;
    if (activePath === t.absPath && truncated) {
      flash(T("pl.preview.editForbiddenTruncated"), "error");
      closeMenu();
      return;
    }
    closeMenu();
    if (activePath === t.absPath && content !== null) {
      setEditContent(content);
      setEditing(true);
    } else {
      editOnLoadRef.current = true;
      setActivePath(t.absPath);
    }
  };

  // 右键「导出」：文件→单文件；文件夹→该目录下所有文件。均弹选择器勾选后打包为 ZIP
  const actExport = () => {
    const t = useCtxTarget();
    if (!t || t.kind === "blank") return;
    closeMenu();
    let entries: { absPath: string; rel: string; type: string; size: number }[];
    if (t.kind === "file") {
      entries = [
        {
          absPath: t.absPath,
          rel: t.relPath || t.name,
          type: fileTypeOf(t.name),
          size: 0,
        },
      ];
    } else {
      const prefix = t.relPath ? t.relPath + "/" : "";
      entries = files
        .filter((f) => !f.dir && f.name.startsWith(prefix))
        .map((f) => ({ absPath: f.path, rel: f.name, type: f.type, size: f.size }));
    }
    if (entries.length === 0) {
      flash(T("pl.preview.toast.noExportable"), "error");
      return;
    }
    setZipExport({
      title: t.kind === "file" ? T("pl.preview.ctx.export") : T("pl.preview.zip.dirTitle"),
      rootName: t.name || "export",
      entries,
    });
    setZipSel(new Set(entries.map((e) => e.rel)));
    setZipProgress(null);
  };

  // 切换 ZIP 勾选
  const toggleZipFile = (rel: string) =>
    setZipSel((prev) => {
      const next = new Set(prev);
      next.has(rel) ? next.delete(rel) : next.add(rel);
      return next;
    });

  // ZIP 全选 / 取消全选
  const toggleZipAll = () => {
    if (!zipExport) return;
    setZipSel((prev) =>
      prev.size === zipExport.entries.length
        ? new Set()
        : new Set(zipExport.entries.map((e) => e.rel)),
    );
  };

  // 把已勾选文件逐个读取原始字节并打包为 ZIP 下载
  const runZipExport = async () => {
    if (!zipExport || zipSel.size === 0 || zipBusy) return;
    setZipBusy(true);
    setZipProgress({ current: 0, total: zipSel.size });
    try {
      const zip = new JSZip();
      const selected = zipExport.entries.filter((e) => zipSel.has(e.rel));
      for (let i = 0; i < selected.length; i++) {
        const e = selected[i];
        try {
          const d = await downloadPreviewFile(e.absPath);
          const bin = atob(d.base64);
          const bytes = new Uint8Array(bin.length);
          for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
          zip.file(e.rel, bytes);
        } catch (err) {
          console.warn("zip export skip:", e.rel, err);
        }
        setZipProgress({ current: i + 1, total: selected.length });
      }
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      triggerDownload(blob, `${sanitizeFilename(zipExport.rootName)}.zip`);
      setZipExport(null);
      flash(T("pl.preview.toast.exported"));
    } catch (err) {
      console.error("zip export failed:", err);
      flash(T("pl.preview.toast.exportFailed"), "error");
    } finally {
      setZipBusy(false);
      setZipProgress(null);
    }
  };

  // ── 写操作：重命名 / 删除 / 新建文件 / 新建目录 ──
  const runAndRefresh = (op: () => Promise<unknown>) =>
    op()
      .then(() => {
        flash(T("pl.preview.toast.opSuccess"));
        setRefreshTick((t) => t + 1);
      })
      .catch((err: unknown) => {
        console.error(err);
        flash(err instanceof Error ? err.message : T("pl.preview.toast.opFailed"), "error");
      });

  const actRename = () => {
    const t = useCtxTarget();
    if (!t) return;
    setNameInput(t.name);
    setNameDialog({
      title: t.kind === "dir" ? T("pl.preview.renameDir") : T("pl.preview.renameFile"),
      label: T("pl.preview.renameLabel"),
      initial: t.name,
      placeholder: "",
      okText: T("pl.preview.ok"),
      onOk: (name) => {
        if (!name.trim()) throw new Error(T("pl.preview.dialog.nameEmpty"));
        return runAndRefresh(() => previewRename(t.absPath, name.trim()));
      },
    });
    closeMenu();
  };

  const actDelete = () => {
    const t = useCtxTarget();
    if (!t) return;
    setConfirmDialog({
      title: t.kind === "dir" ? T("pl.preview.deleteDirTitle") : T("pl.preview.deleteFileTitle"),
      message: T("pl.preview.deleteConfirm", { name: t.relPath || t.name }),
      okText: T("pl.preview.deleteOk"),
      onOk: () => runAndRefresh(() => previewDelete(t.absPath)),
    });
    closeMenu();
  };

  const openNewFileDialog = (baseDirPath: string) => {
    setNameInput("");
    setNameDialog({
      title: T("pl.preview.newFileTitle"),
      label: T("pl.preview.newFileLabel"),
      initial: "",
      placeholder: T("pl.preview.newFilePlaceholder"),
      okText: T("pl.preview.create"),
      onOk: (name) => {
        if (!name.trim()) throw new Error(T("pl.preview.dialog.nameEmpty"));
        return runAndRefresh(() => previewNewFile(baseDirPath, name.trim()));
      },
    });
    closeMenu();
  };

  const openNewDirDialog = (baseDirPath: string) => {
    setNameInput("");
    setNameDialog({
      title: T("pl.preview.newDirTitle"),
      label: T("pl.preview.newDirLabel"),
      initial: "",
      placeholder: T("pl.preview.newDirPlaceholder"),
      okText: T("pl.preview.create"),
      onOk: (name) => {
        if (!name.trim()) throw new Error(T("pl.preview.dialog.nameEmpty"));
        return runAndRefresh(() => previewMkdir(baseDirPath, name.trim()));
      },
    });
    closeMenu();
  };

  // 提交名称输入弹窗：校验非空（不含路径分隔符）→ 防重 → 调用 onOk → 成功后关闭
  const submitNameDialog = async () => {
    const dlg = nameDialog;
    if (!dlg || modalBusy) return;
    const name = nameInput.trim();
    if (!name) {
      setDialogErr(T("pl.preview.dialog.nameEmpty"));
      return;
    }
    if (name.includes("/") || name.includes("\\") || name.includes("..")) {
      setDialogErr(T("pl.preview.dialog.nameInvalid"));
      return;
    }
    setModalBusy(true);
    try {
      // onOk 内部已做完整写操作与刷新；resolve 即成功，reject 表示未处理错误
      await dlg.onOk(name);
      setNameDialog(null);
      setDialogErr("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : T("pl.preview.toast.opFailed");
      setNameDialog(null);
      flash(msg, "error");
    } finally {
      setModalBusy(false);
    }
  };

  // 打开文件夹：优先宿主原生目录选择器；原生不可用（桌面端仅 browse）时回退到浏览式目录选择弹窗
  const openFolder = async () => {
    if (isDirectoryPickerAvailable()) {
      try {
        const picked = await pickExportDirectory();
        if (picked) {
          setManualDir(picked);
          return;
        }
        // 原生选择器被用户取消：不打开浏览弹窗
        return;
      } catch {
        // 原生能力不可用（桌面端报 native capability 缺失）→ 回退到浏览式
      }
    }
    if (!isDirectoryBrowserAvailable()) return;
    setDirPickerOpen(true);
  };

  // 大纲点击 → 平滑滚动到对应标题
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 正文滚动 → 记录当前文件的滚动位置，并高亮当前所在标题
  const onBodyScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    // 记住当前文件的滚动位置，供切出再切回时恢复
    if (activePath) scrollPosMapRef.current.set(activePath, el.scrollTop);
    if (outline.length === 0) return;
    const top = el.getBoundingClientRect().top + 12;
    let current = "";
    for (const item of outline) {
      const node = document.getElementById(item.id);
      if (node && node.getBoundingClientRect().top <= top) current = item.id;
    }
    setActiveId(current);
  };

  // 目录折叠切换
  const toggleDir = (p: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  // 本面板激活（data-phase="active"）时隐藏底部聊天框，切走时恢复显示；
  // 同时把本面板所在视图容器（.wSkVaW_viewArea）高度设为 100%，使面板铺满可视区域。
  // 用 MutationObserver 监听本面板所在 root 的 data-phase，避免污染其它视图标签。
  useEffect(() => {
    const panel = document.querySelector(`.${S}-wrap`);
    const area = panel instanceof HTMLElement ? panel.closest(".wSkVaW_viewArea") : null;
    let lastSeat: HTMLElement | null = null;
    const sync = () => {
      const root = panel instanceof HTMLElement ? panel.closest(".wSkVaW_root") : null;
      const active = root instanceof HTMLElement && root.getAttribute("data-phase") === "active";
      setPanelActive(active);
      const seat = document.querySelector(".wSkVaW_composerSeat");
      if (seat instanceof HTMLElement) {
        lastSeat = seat;
        if (active) seat.style.display = "none";
        else seat.style.display = "";
      }
      if (area instanceof HTMLElement) {
        // 切进本面板时铺满 100%，切出时还原
        if (active) area.style.height = "100%";
        else area.style.height = "auto";
      }
    };
    let mo: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      const effRoot = panel instanceof HTMLElement ? panel.closest(".wSkVaW_root") : null;
      if (effRoot instanceof HTMLElement) {
        mo = new MutationObserver(sync);
        mo.observe(effRoot, { attributes: true, attributeFilter: ["data-phase"] });
      }
    }
    sync();
    return () => {
      mo?.disconnect();
      if (lastSeat) lastSeat.style.display = "";
      // 用缓存的引用还原 viewArea 高度，避免残留 100% 影响其它视图
      if (area instanceof HTMLElement) area.style.height = "auto";
    };
  }, []);

  return (
    <div className={`${S}-wrap`}>
      <div className={`${S}-root`}>
        <style>{`
        .${S}-wrap{position:relative;display:flex;flex-direction:row;flex-wrap:nowrap;align-items:stretch;flex:1;height:100%;width:100%;min-height:0;box-sizing:border-box;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
        .${S}-root{box-sizing:border-box;flex:1;min-width:0;min-height:0;overflow:hidden;display:flex;flex-direction:column;color:var(--dsw-alias-label-primary);font-size:12.5px;line-height:20px;background:var(--dsw-alias-bg-layer-1)}
        .${S}-header{flex:none;display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--dsw-alias-bg-container);border-bottom:1px solid var(--dsw-alias-border-l2)}
        .${S}-headerTitle{flex:none;display:flex;align-items:center;gap:6px;font-weight:600;font-size:12.5px;color:var(--dsw-alias-label-primary)}
        .${S}-headerDot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-static-blue-450,var(--dsw-static-blue-500))}
        .${S}-headerPath{flex:1;min-width:0;color:var(--dsw-alias-label-tertiary);font:11px/16px var(--ds-font-family-code,ui-monospace,Consolas,monospace);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .${S}-count{flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px;font-variant-numeric:tabular-nums}
        .${S}-refresh{flex:none;width:26px;height:26px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:15px;line-height:15px;transition:color .24s,background-color .24s}
        .${S}-refresh:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-refresh.spinning .${S}-refreshIcon{animation:${S}-spin .5s ease}
        @keyframes ${S}-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .${S}-locateBtn{flex:none;width:26px;height:26px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:14px;line-height:1;transition:color .24s,background-color .24s}
        .${S}-locateBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-locateBtn:disabled{opacity:.4;cursor:not-allowed}
        .${S}-openFolder{flex:none;display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:11.5px;line-height:1;cursor:pointer;white-space:nowrap;transition:background-color .24s,color .24s,border-color .24s}
        .${S}-openFolder:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-static-blue-450)}
        .${S}-openFolder.active{color:var(--dsw-static-blue-450);background:color-mix(in srgb,var(--dsw-static-blue-450) 14%,transparent);border-color:var(--dsw-static-blue-450)}
        .${S}-body{flex:1;min-height:0;display:flex;flex-direction:row;align-items:stretch;overflow:hidden}
        .${S}-files{flex:none;width:280px;min-width:220px;box-sizing:border-box;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;overflow:hidden}
        
        /* Tab 标签页 */
        .${S}-tabs{flex:none;display:flex;gap:4px;padding:8px 8px 4px;overflow-x:auto;border-bottom:1px solid var(--dsw-alias-border-l2)}
        .${S}-tab{flex:none;display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;cursor:pointer;white-space:nowrap;transition:background-color .2s,color .2s}
        .${S}-tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-tab.active{background:var(--dsw-alias-bg-accent);color:var(--dsw-alias-label-inverse);font-weight:600}
        .${S}-tabDot{flex:none;width:6px;height:6px;border-radius:50%}
        .${S}-tabCount{margin-left:2px;font-size:10px;opacity:.8}
        
        /* 搜索框 */
        .${S}-searchBox{flex:none;padding:6px 8px;position:relative}
        .${S}-searchMode{display:flex;gap:2px;margin-bottom:6px;padding:2px;background:var(--dsw-alias-bg-subtle,var(--dsw-alias-bg-layer-2));border-radius:8px}
        .${S}-searchModeBtn{flex:1;padding:4px 0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:11.5px;cursor:pointer;transition:background .18s,color .18s,font-weight .18s}
        .${S}-searchModeBtn:hover{color:var(--dsw-alias-label-primary)}
        .${S}-searchModeBtn.active{background:var(--dsw-alias-bg-layer-1);box-shadow:0 1px 3px rgba(0,0,0,.12);color:var(--dsw-alias-label-primary);font-weight:600}
        .${S}-searchRow{position:relative;display:flex;align-items:center}
        .${S}-searchInput{width:100%;padding:5px 30px 5px 26px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:12px;outline:none;transition:border-color .2s;box-sizing:border-box}
        .${S}-searchInput:focus{border-color:var(--dsw-static-blue-450)}
        .${S}-searchInput::placeholder{color:var(--dsw-alias-label-tertiary)}
        .${S}-searchModeIcon{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1;pointer-events:none}
        .${S}-searchClear{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-size:11px;padding:2px 5px;border-radius:4px;line-height:1}
        .${S}-searchClear:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
        /* 全文搜索结果 */
        .${S}-fullList{flex:1;min-height:0;overflow-y:auto;padding:0 8px 8px}
        .${S}-fullList::-webkit-scrollbar{width:10px;height:10px}
        .${S}-fullList::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:5px;border:2px solid transparent;background-clip:content-box}
        .${S}-fullGroup{display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;overflow:hidden;background:var(--dsw-alias-bg-layer-1);margin-bottom:8px}
        .${S}-fullGroupHead{display:flex;align-items:center;gap:6px;width:100%;padding:6px 8px;border:0;background:transparent;color:var(--dsw-alias-label-primary);font-size:11.5px;font-weight:600;cursor:pointer;text-align:left}
        .${S}-fullGroupHead:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-fullFileName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .${S}-fullCount{flex:none;font-size:10.5px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;background:var(--dsw-alias-bg-subtle,var(--dsw-alias-bg-layer-2));border-radius:10px;padding:0 7px;line-height:18px}
        .${S}-fullHit{display:flex;align-items:flex-start;gap:8px;width:100%;padding:5px 10px;border:0;border-top:1px dashed var(--dsw-alias-border-l1,var(--dsw-alias-border-l2));background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:17px;cursor:pointer;text-align:left;min-width:0}
        .${S}-fullHit:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-fullLineNo{flex:none;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-family:var(--dsw-font-mono);font-size:10px;min-width:30px;text-align:right;line-height:17px}
        .${S}-fullLineText{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-font-mono)}
        .${S}-hl{background:rgba(250,204,21,.35);color:inherit;border-radius:2px;padding:0 1px}
        .${S}-emptyList.${S}-fullEmpty{padding:28px 10px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12px}
        
        /* 排序栏 */
        .${S}-sortBar{flex:none;display:flex;gap:4px;padding:4px 8px 6px;border-bottom:1px solid var(--dsw-alias-border-l2);overflow-x:auto}
        .${S}-sortBtn{flex:none;padding:3px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:10px;cursor:pointer;white-space:nowrap;transition:all .2s}
        .${S}-sortBtn:hover{border-color:var(--dsw-static-blue-450);color:var(--dsw-static-blue-450)}
        .${S}-sortToggle{flex:none;width:24px;height:24px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;transition:all .2s}
        .${S}-sortToggle:hover{border-color:var(--dsw-static-blue-450);color:var(--dsw-static-blue-450)}
        
        /* 视图模式切换按钮 */
        .${S}-viewToggle{flex:none;width:28px;height:24px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .2s;margin-right:2px}
        .${S}-viewToggle:hover{border-color:var(--dsw-static-blue-450);color:var(--dsw-static-blue-450)}
        .${S}-viewToggle.active{background:var(--dsw-static-blue-450);border-color:var(--dsw-static-blue-450);color:#fff}
        
        /* 扁平文件列表 */
        .${S}-fileListFlat{flex:1;min-height:0;overflow-y:auto;padding:4px 8px 8px;display:flex;flex-direction:column;gap:2px}
        .${S}-fileItem{display:flex;align-items:center;gap:6px;padding:5px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11.5px;cursor:pointer;text-align:left;width:100%;min-width:0;transition:background-color .2s,color .2s}
        .${S}-fileItem:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-fileItem.active{background:var(--dsw-alias-bg-accent);color:var(--dsw-alias-label-inverse);font-weight:600}
        .${S}-fileItem.warning{border-left:2px solid #f59e0b}
        .${S}-fileItem.error{border-left:2px solid #ef4444}
        .${S}-fileTypeBadge{flex:none;font-size:9px;line-height:14px;font-weight:600;color:#fff;border-radius:3px;padding:0 4px;min-width:24px;text-align:center}
        .${S}-fileName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .${S}-fileMeta{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:1px}
        .${S}-fileSize{font-size:10px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
        .${S}-fileModified{font-size:9px;color:var(--dsw-alias-label-tertiary);opacity:.7}
        .${S}-emptyList{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font-size:12px;padding:24px;text-align:center}
        
        /* 树形文件列表 */
        .${S}-fileListTree{flex:1;min-height:0;overflow-y:auto;padding:4px 8px 8px}
        
        /* 保留旧的树形样式（向后兼容） */
        .${S}-fileList{flex:1;min-height:0;overflow-y:auto;padding:0 8px 8px;display:flex;flex-direction:column;gap:2px}
        .${S}-group{display:flex;flex-direction:column;gap:1px}
        .${S}-groupHead{flex:none;display:flex;align-items:center;gap:6px;padding:6px 8px 3px;font-size:11px;color:var(--dsw-alias-label-secondary);font-weight:600}
        .${S}-groupDot{flex:none;width:7px;height:7px;border-radius:50%}
        .${S}-groupCount{flex:none;color:var(--dsw-alias-label-tertiary);font-size:10px;font-variant-numeric:tabular-nums}
        .${S}-treeDir{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;min-width:0;transition:background-color .24s,color .24s}
        .${S}-treeDir:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-treeArrow{flex:none;width:12px;font-size:10px;line-height:12px;color:var(--dsw-alias-label-tertiary);transition:transform .24s}
        .${S}-treeArrow.open{transform:rotate(90deg)}
        .${S}-treeDirName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
        .${S}-file{display:flex;align-items:center;gap:7px;padding:4px 8px;border-radius:6px;cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;min-width:0;transition:background-color .24s,color .24s}
        .${S}-file:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-file.active{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}
        @keyframes ${S}-flashPulse{0%,100%{background-color:transparent}30%{background-color:color-mix(in srgb,var(--dsw-static-blue-450,var(--dsw-alias-brand-primary)) 30%,transparent)}60%{background-color:color-mix(in srgb,var(--dsw-static-blue-450,var(--dsw-alias-brand-primary)) 20%,transparent)}}
        .${S}-file.flash,.${S}-fileItem.flash{animation:${S}-flashPulse 1.6s ease-in-out 2;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-static-blue-450,var(--dsw-alias-brand-primary)) 55%,transparent)}
        .${S}-fileBadge{flex:none;font-size:9px;line-height:14px;font-weight:600;color:#60a5fa;background:color-mix(in srgb,#60a5fa 16%,transparent);border-radius:4px;padding:0 4px}
        .${S}-fileName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .${S}-fileSize{flex:none;color:var(--dsw-alias-label-tertiary);font-size:10px;font-variant-numeric:tabular-nums}
        .${S}-content{flex:1;min-width:0;min-height:0;display:flex;flex-direction:row;align-items:stretch;overflow:hidden}
        .${S}-toc{flex:0 1 auto;min-height:0;height:100%;width:200px;min-width:160px;box-sizing:border-box;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;overflow:hidden}
        .${S}-tocHead{flex:none;display:flex;align-items:center;justify-content:space-between;padding:6px 6px 6px 12px;font-size:11px;color:var(--dsw-alias-label-tertiary);font-weight:600}
        .${S}-tocCollapseBtn{display:flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1;cursor:pointer;transition:background .12s ease}
        .${S}-tocCollapseBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-tocCollapsed{width:26px;min-width:26px!important;align-items:center;justify-content:flex-start;padding:6px 0 0;border-right:1px solid var(--dsw-alias-border-l2)}
        .${S}-tocList{flex:1;min-height:0;overflow-y:auto;padding:0 8px 8px}
        .${S}-tocItem{display:block;text-align:left;width:100%;border:0;background:transparent;padding:3px 8px;border-radius:6px;cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:17px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:background-color .24s,color .24s}
        .${S}-tocItem:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-tocItem.active{color:var(--dsw-static-blue-450,var(--dsw-static-blue-500));font-weight:600}
        .${S}-mdBody{flex:1;min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;padding:14px 18px;font-size:13px;line-height:1.8;color:var(--dsw-alias-label-primary)}
        .${S}-mdBody::-webkit-scrollbar,.${S}-fileList::-webkit-scrollbar,.${S}-tocList::-webkit-scrollbar,.${S}-jBody::-webkit-scrollbar,.${S}-txtBody::-webkit-scrollbar,.${S}-csvWrap::-webkit-scrollbar{width:10px;height:10px}
        .${S}-mdBody::-webkit-scrollbar-thumb,.${S}-fileList::-webkit-scrollbar-thumb,.${S}-tocList::-webkit-scrollbar-thumb,.${S}-jBody::-webkit-scrollbar-thumb,.${S}-txtBody::-webkit-scrollbar-thumb,.${S}-csvWrap::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:5px;border:2px solid transparent;background-clip:content-box}
        .${S}-mdBody::-webkit-scrollbar-thumb:hover,.${S}-fileList::-webkit-scrollbar-thumb:hover,.${S}-tocList::-webkit-scrollbar-thumb:hover,.${S}-jBody::-webkit-scrollbar-thumb:hover,.${S}-txtBody::-webkit-scrollbar-thumb:hover,.${S}-csvWrap::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-border-l3)}
        .${S}-mdBody::-webkit-scrollbar-track,.${S}-fileList::-webkit-scrollbar-track,.${S}-tocList::-webkit-scrollbar-track,.${S}-jBody::-webkit-scrollbar-track,.${S}-txtBody::-webkit-scrollbar-track,.${S}-csvWrap::-webkit-scrollbar-track{background:transparent}
        .${S}-mdBody h1,.${S}-mdBody h2,.${S}-mdBody h3,.${S}-mdBody h4,.${S}-mdBody h5,.${S}-mdBody h6{margin:14px 0 8px;font-weight:650;line-height:1.4;color:var(--dsw-alias-label-primary);scroll-margin-top:12px}
        .${S}-mdBody h1{font-size:17px}
        .${S}-mdBody h2{font-size:15px}
        .${S}-mdBody h3{font-size:13.5px}
        .${S}-mdBody h4{font-size:13px}
        .${S}-mdBody h5,.${S}-mdBody h6{font-size:12.5px}
        .${S}-mdBody p{margin:7px 0}
        .${S}-mdBody ul,.${S}-mdBody ol{margin:7px 0;padding-left:22px}
        .${S}-mdBody li{margin:2px 0}
        .${S}-mdBody blockquote{margin:8px 0;padding:4px 12px;border-left:3px solid var(--dsw-alias-border-strong);color:var(--dsw-alias-label-secondary)}
        .${S}-mdBody hr{border:none;border-top:1px solid var(--dsw-alias-border-l2);margin:12px 0}
        .${S}-mdBody a{color:var(--dsw-static-blue-500)}
        .${S}-mdBody strong{font-weight:650}
        .${S}-mdBody em{font-style:italic}
        .${S}-mdBody del{color:var(--dsw-alias-label-tertiary)}
        .${S}-mdBody code{font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:.9em;padding:0 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
        .${S}-mdPre{margin:9px 0;padding:11px 13px;overflow-x:auto;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);white-space:pre-wrap}
        .${S}-mdPre code{background:none;padding:0}
        .${S}-mdImg{max-width:100%;height:auto;border-radius:6px;margin:4px 0}
        .${S}-hl{background:rgba(250,204,21,.22);color:var(--dsw-alias-label-primary);padding:0 2px;border-radius:3px}
        .${S}-taskBox{width:13px;height:13px;margin:0 5px 0 0;vertical-align:-2px;accent-color:#34d399;pointer-events:none}
        .${S}-done{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}
        .${S}-mdTable{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;line-height:1.6}
        .${S}-mdTable th,.${S}-mdTable td{border:1px solid var(--dsw-alias-border-l2);padding:4px 8px;text-align:left;vertical-align:top}
        .${S}-mdTable th{background:var(--dsw-alias-bg-layer-2);font-weight:600;color:var(--dsw-alias-label-secondary);white-space:nowrap}
        .${S}-mdTable td{color:var(--dsw-alias-label-primary)}
        .${S}-jBody{flex:1;min-width:0;min-height:0;overflow:auto;padding:12px 14px;font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:11.5px;line-height:1.7}
        .${S}-jRow{display:flex;align-items:baseline;gap:5px;white-space:nowrap;min-height:20px}
        .${S}-jRow.jHead{cursor:pointer;user-select:none}
        .${S}-jKey{color:var(--dsw-alias-label-secondary);font-weight:600}
        .${S}-jColon{color:var(--dsw-alias-label-tertiary)}
        .${S}-jType{color:var(--dsw-alias-label-tertiary);font-style:italic}
        .${S}-jStr{color:#34d399}
        .${S}-jNum{color:#fbbf24}
        .${S}-jBool{color:#60a5fa}
        .${S}-jNull{color:#94a3b8;font-style:italic}
        .${S}-txtBody{flex:1;min-width:0;min-height:0;overflow:auto;padding:14px 18px;margin:0;font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:12px;line-height:1.7;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word}
        .${S}-csvWrap{flex:1;min-width:0;min-height:0;overflow:auto;padding:14px 18px}
        .${S}-csvTable{width:100%;border-collapse:collapse;font-size:12px;line-height:1.6}
        .${S}-csvTable th,.${S}-csvTable td{border:1px solid var(--dsw-alias-border-l2);padding:4px 8px;text-align:left;vertical-align:top;white-space:nowrap;max-width:360px;overflow:hidden;text-overflow:ellipsis}
        .${S}-csvTable th{background:var(--dsw-alias-bg-layer-2);font-weight:600;color:var(--dsw-alias-label-secondary);position:sticky;top:0}
        .${S}-csvTable td{color:var(--dsw-alias-label-primary)}
        
        /* 代码高亮容器 */
        .${S}-codeBody{flex:1;min-width:0;min-height:100px;height:100%;overflow:auto;padding:14px 18px;background:var(--dsw-alias-bg-subtle);border-radius:8px;font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:13px;line-height:1.6}
        .${S}-codeBody pre[class*="language-"]{margin:0;padding:12px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;font-family:inherit;font-size:inherit;line-height:inherit;white-space:pre;overflow-x:auto}
        .${S}-codeBody code[class*="language-"],.${S}-codeBody pre[class*="language-"]{text-shadow:none !important;color:var(--dsw-alias-label-primary)}
        
        /* 日志文件 */
        .${S}-logBody{flex:1;min-width:0;min-height:0;overflow:auto;padding:14px 18px;margin:0;background:var(--dsw-alias-bg-subtle);border-radius:8px;font-family:var(--ds-font-family-code,ui-monospace,Consolas,monospace);font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word}
        .${S}-logBody pre{margin:0;padding:0;background:none;border:none;font-family:inherit;font-size:inherit;line-height:inherit;color:inherit;white-space:inherit;word-break:inherit}
        .${S}-logTruncated{margin-top:8px;padding:8px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px;border-top:1px solid var(--dsw-alias-border-l2);font-style:italic}
        .${S}-truncHint{flex-shrink:0;margin-bottom:8px;padding:8px 12px;text-align:center;font-weight:600;font-size:12px;color:var(--dsw-alias-brand-primary,#2563eb);background:var(--dsw-alias-brand-primary-selected,rgba(37,99,235,.08));border:1px solid var(--dsw-alias-brand-primary,#2563eb);border-radius:6px}
        
        /* 图片预览 */
        .${S}-imgBody{flex:1;min-width:0;min-height:0;display:flex;justify-content:center;align-items:center;padding:14px 18px;overflow:auto;background:var(--dsw-alias-bg-subtle);border-radius:8px}
        .${S}-imgBody img{max-width:100%;max-height:70vh;object-fit:contain;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.15)}
        .${S}-videoBody{flex:1;min-width:0;min-height:0;display:flex;justify-content:center;align-items:center;padding:14px 18px;overflow:auto;background:var(--dsw-alias-bg-subtle);border-radius:8px}
        .${S}-videoBody video{max-width:100%;max-height:72vh;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.15);background:#000}
        
        .${S}-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;flex:1;min-height:0;color:var(--dsw-alias-label-tertiary);font-size:12.5px;padding:24px;text-align:center}
        .${S}-emptyNote{font-size:11px;opacity:.85}
        
        /* 编辑按钮 */
        .${S}-editBtn,.${S}-cancelBtn,.${S}-saveBtn{padding:4px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;transition:all .2s}
        .${S}-editBtn:hover:not(:disabled){border-color:var(--dsw-static-blue-450);background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-editBtn:disabled{opacity:.5;cursor:not-allowed;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);border-color:var(--dsw-alias-border-l2)}
        .${S}-cancelBtn:hover:not(:disabled){background:var(--dsw-alias-bg-hover)}
        .${S}-saveBtn{background:var(--dsw-static-blue-450);color:#fff;border-color:var(--dsw-static-blue-450)}
        .${S}-saveBtn:hover:not(:disabled){opacity:.9}
        .${S}-saveBtn:disabled,.${S}-cancelBtn:disabled{opacity:.5;cursor:not-allowed}
        
        /* 编辑器 */
        .${S}-editorBody{flex:1;display:flex;flex-direction:column;padding:12px;overflow:hidden;background:var(--dsw-alias-bg-subtle);border-radius:8px;min-height:0}
        .${S}-editorTextarea{flex:1;width:100%;padding:12px;border:none;background:transparent;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-mono);font-size:13px;line-height:1.6;resize:none;outline:none;tab-size:2;overflow:auto}
        .${S}-editorTextarea:focus{outline:none}
        
        /* 大文件分片 + 虚拟滚动查看器 */
        .${S}-bigWrap{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;border-radius:8px}
        .${S}-bigBar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 14px;font-size:12px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l2);flex:none}
        .${S}-bigBar>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-font-mono);font-size:11px;color:var(--dsw-alias-label-tertiary)}
        .${S}-bigCount{flex:none;white-space:nowrap}
        .${S}-bigBody{flex:1;min-height:0;overflow:auto;position:relative;background:var(--dsw-alias-bg-layer-1);font-family:var(--dsw-font-mono);font-size:12px;line-height:20px}
        .${S}-bigBody::-webkit-scrollbar{width:10px;height:10px}
        .${S}-bigBody::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:5px;border:2px solid transparent;background-clip:content-box}
        .${S}-bigBody::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-border-l3)}
        .${S}-bigBody::-webkit-scrollbar-track{background:transparent}
        .${S}-bigLine{display:flex;height:20px;padding:0 14px;white-space:pre;color:var(--dsw-alias-label-primary)}
        .${S}-bigLineNo{flex:none;min-width:0;max-width:52px;padding-right:14px;text-align:right;color:var(--dsw-alias-label-tertiary);user-select:none}
        .${S}-bigLineText{flex:none;min-width:0;white-space:pre;overflow:visible}
        
        /* Toast 提示 */
        .${S}-toast{position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;color:#fff;font-size:13px;font-weight:500;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.15);animation:slideIn .3s ease-out}
        .${S}-toast.success{background:#10b981}
        .${S}-toast.error{background:#ef4444}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}

        /* 右键菜单 */
        .${S}-ctxOverlay{position:fixed;inset:0;z-index:2147483646}
        .${S}-ctxMenu{
          position:fixed;z-index:2147483647;min-width:168px;max-width:280px;box-sizing:border-box;
          padding:4px;border-radius:8px;background:var(--dsw-alias-bg-layer-1, #ffffff);
          border:1px solid var(--dsw-alias-border-l2);box-shadow:0 6px 20px rgba(0,0,0,.18);
          color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.4;
          max-height:calc(100vh - 24px);overflow-y:auto;overscroll-behavior:contain
        }
        .${S}-ctxTitle{padding:4px 8px;font-size:11px;color:var(--dsw-alias-label-tertiary);word-break:break-all;border-bottom:1px solid var(--dsw-alias-border-l2);margin-bottom:4px}
        .${S}-ctxItem{display:flex;align-items:center;gap:8px;padding:6px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer;text-align:left;width:100%;white-space:nowrap}
        .${S}-ctxItem:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-ctxItem .${S}-ctxIcon{flex:none;width:14px;height:14px;opacity:.75;display:inline-flex;align-items:center;justify-content:center}
        .${S}-ctxItem.danger{color:#ef4444}
        .${S}-ctxItem.danger:hover{background:rgba(239,68,68,.12)}
        .${S}-ctxSep{height:1px;background:var(--dsw-alias-border-l2);margin:4px 6px}

        /* 名称输入 / 确认 弹窗 */
        .${S}-dialogOverlay{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}
        .${S}-dialog{width:320px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:16px;border-radius:10px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l2);box-shadow:0 12px 32px rgba(0,0,0,.2);color:var(--dsw-alias-label-primary)}
        .${S}-dialogTitle{font-size:14px;font-weight:600;margin-bottom:12px}
        .${S}-dialogMsg{font-size:12.5px;color:var(--dsw-alias-label-secondary);margin-bottom:14px;word-break:break-all;line-height:1.5}
        .${S}-dialogInput{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;outline:none;margin-bottom:14px}
        .${S}-dialogInput:focus{border-color:var(--dsw-static-blue-450)}
        .${S}-dialogBtns{display:flex;justify-content:flex-end;gap:8px}
        .${S}-dialogBtn{padding:6px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:12.5px;cursor:pointer}
        .${S}-dialogBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-dialogBtn.primary{background:var(--dsw-static-blue-450,var(--dsw-alias-brand-primary));border-color:transparent;color:#fff;font-weight:500}
        .${S}-dialogBtn.danger{background:#ef4444;border-color:transparent;color:#fff;font-weight:500}
        .${S}-dialogBtn:disabled{opacity:.5;cursor:not-allowed}
        .${S}-moveDirList{flex-direction:column;gap:2px;max-height:260px;overflow-y:auto;margin-bottom:14px}
        .${S}-moveDirList::-webkit-scrollbar{width:8px;height:8px}
        .${S}-moveDirList::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:4px;border:2px solid transparent;background-clip:content-box}
        .${S}-moveDirBranch{white-space:nowrap;min-width:0}
        .${S}-moveDirArrow{display:inline-block;vertical-align:top;width:20px;height:26px;padding:0;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:26px;cursor:pointer;text-align:center;border-radius:4px;transition:color .15s}
        .${S}-moveDirArrow:hover{color:var(--dsw-alias-label-primary)}
        .${S}-moveDirArrow.open{transform:none}
        .${S}-moveDir{display:inline-block;vertical-align:top;width:calc(100% - 24px);min-width:0;box-sizing:border-box;text-align:left;padding:6px 10px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12.5px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background-color .18s,color .18s,border-color .18s}
        .${S}-moveDir:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-moveDir.active{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-static-blue-450);color:var(--dsw-alias-label-primary);font-weight:500}

        /* ZIP 导出选择器 */
        .${S}-zipOverlay{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}
        .${S}-zipPanel{width:520px;max-width:calc(100vw - 32px);max-height:82vh;box-sizing:border-box;display:flex;flex-direction:column;border-radius:12px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l2);box-shadow:0 12px 32px rgba(0,0,0,.2);color:var(--dsw-alias-label-primary)}
        .${S}-zipHead{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l2)}
        .${S}-zipTitle{font-size:14px;font-weight:600}
        .${S}-zipClose{background:none;border:0;color:var(--dsw-alias-label-secondary);font-size:15px;cursor:pointer;padding:2px 6px;border-radius:4px}
        .${S}-zipClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
        .${S}-zipActions{display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--dsw-alias-border-l2)}
        .${S}-zipAction{padding:4px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;cursor:pointer}
        .${S}-zipAction:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-zipCounter{font-size:12px;color:var(--dsw-alias-label-secondary)}
        .${S}-zipList{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:6px}
        .${S}-zipItem{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;cursor:pointer;user-select:none;font-size:12.5px}
        .${S}-zipItem:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-zipItem.selected{background:rgba(96,165,250,.12)}
        .${S}-zipItem input[type="checkbox"]{cursor:pointer;flex:none}
        .${S}-zipIcon{flex:none;width:18px;text-align:center}
        .${S}-zipName{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;word-break:break-all}
        .${S}-zipSize{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary)}
        .${S}-zipFoot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-top:1px solid var(--dsw-alias-border-l2)}
        .${S}-zipProgress{flex:1;display:flex;align-items:center;gap:8px}
        .${S}-zipBar{flex:1;height:4px;background:var(--dsw-alias-bg-subtle);border-radius:2px;overflow:hidden}
        .${S}-zipFill{height:100%;background:var(--dsw-static-blue-450);transition:width .2s}
        .${S}-zipPct{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary)}
        .${S}-zipBtns{display:flex;gap:8px}
        .${S}-zipBtn{padding:6px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-size:12.5px;cursor:pointer}
        .${S}-zipBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}
        .${S}-zipBtn.primary{background:var(--dsw-static-blue-450,var(--dsw-alias-brand-primary));border-color:transparent;color:#fff;font-weight:500}
        .${S}-zipBtn:disabled{opacity:.5;cursor:not-allowed}
      `}</style>

        {/* 头部：标题 + 打开文件夹 + 当前目录 + 文件数 + 刷新 */}
        <div className={`${S}-header`}>
          <span className={`${S}-headerTitle`}>
            <span className={`${S}-headerDot`} />
            {T?.("pl.view.preview") ?? "预览"}
          </span>
          {(isDirectoryPickerAvailable() || isDirectoryBrowserAvailable()) && (
            <button
              type="button"
              className={`${S}-openFolder${manualDir ? " active" : ""}`}
              title={T("pl.preview.openFolder")}
              onClick={openFolder}
            >
              {T("pl.preview.openFolder")}
            </button>
          )}
          <span className={`${S}-headerPath`} title={dir}>
            {dir || (T?.("pl.preview.noSession") ?? "暂无会话所属文件夹")}
          </span>
          {fileEntries.length > 0 && (
            <span className={`${S}-count`}>{fileEntries.length}</span>
          )}
          
          {/* 导出按钮 */}
          {fileEntries.length > 0 && (
            <ArtifactExporter files={fileEntries} sessionTitle={dir?.split("/").pop()} t={T} />
          )}
          
          {/* 编辑按钮（仅当有选中文件且不是二进制文件、且未被截断时显示可点） */}
          {activeFile && !["png", "jpg", "jpeg", "gif", "svg", "mp4"].includes(activeFile.type) && (
            <>
              {!editing ? (
                <button
                  type="button"
                  className={`${S}-editBtn`}
                  onClick={startEditing}
                  disabled={truncated}
                  title={truncated ? T("pl.preview.editForbiddenTruncated") : T("pl.preview.editFile")}
                >
                  ✏️ {T("pl.preview.ctx.edit")}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`${S}-cancelBtn`}
                    onClick={cancelEditing}
                    disabled={saving}
                    title={T("pl.preview.cancelEdit")}
                  >
                    {T("pl.preview.cancel")}
                  </button>
                  <button
                    type="button"
                    className={`${S}-saveBtn`}
                    onClick={handleSave}
                    disabled={saving}
                    title={T("pl.preview.saveFile")}
                  >
                    {saving ? T("pl.preview.saving") : `💾 ${T("pl.preview.save")}`}
                  </button>
                </>
              )}
            </>
          )}
          
          <button type="button" className={`${S}-refresh${spinning ? " spinning" : ""}`} title={T?.("pl.preview.refresh") ?? "刷新"} onClick={refresh}>
            <span className={`${S}-refreshIcon`} onAnimationEnd={() => setSpinning(false)}>⟳</span>
          </button>
          <button
            type="button"
            className={`${S}-locateBtn`}
            title={T?.("pl.preview.locateFile") ?? "定位当前文件"} 
            onClick={locateActive}
            disabled={!activePath || viewMode !== "grouped"}
          >
            ◎
          </button>
        </div>

        <div className={`${S}-body`}>
          {/* 文件列表：Tab 标签页 + 搜索过滤 + 排序 + 扁平列表（全文模式显示命中结果） */}
          {showLeftPanel && (
            <div className={`${S}-files`}>
              {/* Tab 标签页（全文搜索模式下不显示） */}
              {!fullOpen && showFiles && (
                <>
                  <div className={`${S}-tabs`}>
                    {/* 智能分类切换按钮 */}
                    <button
                      type="button"
                      className={`${S}-tab${smartClassify ? " smart-active" : ""}`}
                      onClick={() => {
                        setSmartClassify(!smartClassify);
                        setActiveTab("all"); // 切换模式时重置为全部
                      }}
                      title={T("pl.preview.smartClassify")}
                    >
                      🤖 {smartClassify ? T("pl.preview.smart") : T("pl.preview.type")}
                    </button>
                    
                    <button
                      type="button"
                      className={`${S}-tab${activeTab === "all" ? " active" : ""}`}
                      onClick={() => setActiveTab("all")}
                    >
                      {T("pl.preview.all")}
                      <span className={`${S}-tabCount`}>{fileEntries.length}</span>
                    </button>
                    
                    {smartClassify ? (
                      // 智能分类 Tab
                      Array.from(smartCategoryCounts.entries()).map(([category, count]) => (
                        <button
                          key={category}
                          type="button"
                          className={`${S}-tab${activeTab === category ? " active" : ""}`}
                          onClick={() => setActiveTab(category)}
                        >
                          <span className={`${S}-tabDot`} style={{ background: CATEGORY_COLORS[category] }} />
                          {CATEGORY_LABELS[category]}
                          <span className={`${S}-tabCount`}>{count}</span>
                        </button>
                      ))
                    ) : (
                      // 普通文件类型 Tab
                      Array.from(tabCounts.entries()).map(([type, count]) => (
                        <button
                          key={type}
                          type="button"
                          className={`${S}-tab${activeTab === type ? " active" : ""}`}
                          onClick={() => setActiveTab(type)}
                        >
                          <span className={`${S}-tabDot`} style={{ background: TYPE_META[type].color }} />
                          {TYPE_META[type].label}
                          <span className={`${S}-tabCount`}>{count}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* 搜索框（含文件名/全文模式切换） */}
              <div className={`${S}-searchBox`}>
                <div className={`${S}-searchMode`}>
                  <button
                    type="button"
                    className={`${S}-searchModeBtn${searchMode === "name" ? " active" : ""}`}
                    onClick={() => setSearchMode("name")}
                    title={T("pl.preview.searchNameMode")}
                  >
                    {T("pl.preview.searchName")}
                  </button>
                  <button
                    type="button"
                    className={`${S}-searchModeBtn${searchMode === "full" ? " active" : ""}`}
                    onClick={() => setSearchMode("full")}
                    title={T("pl.preview.searchFullMode")}
                  >
                    {T("pl.preview.searchFull")}
                  </button>
                </div>
                <div className={`${S}-searchRow`}>
                  <span className={`${S}-searchModeIcon`}>🔍</span>
                  <input
                    type="text"
                    className={`${S}-searchInput`}
                    placeholder={
                      searchMode === "full"
                        ? (T?.("pl.preview.searchFullPlaceholder") ?? "全文搜索…")
                        : T("pl.preview.searchPlaceholder")
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className={`${S}-searchClear`}
                      onClick={() => setSearchQuery("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* 全文搜索结果 */}
              {fullOpen ? (
                <div className={`${S}-fullList`} ref={fileListRef}>
                  {fullSearching ? (
                    <div className={`${S}-emptyList ${S}-fullEmpty`}>{T("pl.preview.fullSearching")}</div>
                  ) : fullGroups.length === 0 ? (
                    <div className={`${S}-emptyList ${S}-fullEmpty`}>{T("pl.preview.fullNoMatch")}</div>
                  ) : (
                    fullGroups.map((group) => (
                      <div key={group[0].path} className={`${S}-fullGroup`}>
                        <button
                          type="button"
                          className={`${S}-fullGroupHead`}
                          onClick={() => openSearchMatch(group[0])}
                          title={group[0].path}
                        >
                          <span
                            className={`${S}-fullFileBadge`}
                            style={{ background: TYPE_META[group[0].type].color }}
                          >
                            {TYPE_META[group[0].type].label}
                          </span>
                          <span className={`${S}-fullFileName`}>{group[0].name}</span>
                          <span className={`${S}-fullCount`}>{group.length}</span>
                        </button>
                        {group.map((m) => {
                          const q = searchQuery.trim();
                          const ll = q.toLowerCase();
                          const idx = m.text ? m.text.toLowerCase().indexOf(ll) : -1;
                          return (
                            <button
                              key={`${m.path}:${m.line}:${m.index}`}
                              type="button"
                              className={`${S}-fullHit`}
                              onClick={() => openSearchMatch(m)}
                              title={T?.("pl.preview.matchJump") ?? "打开文件并跳转到该行"}
                            >
                              <span className={`${S}-fullLineNo`}>{m.line}</span>
                              <span className={`${S}-fullLineText`}>
                                {idx >= 0 ? (
                                  <>
                                    {m.text.slice(0, idx)}
                                    <mark className={`${S}-hl`}>{m.text.slice(idx, idx + q.length)}</mark>
                                    {m.text.slice(idx + q.length)}
                                  </>
                                ) : (
                                  m.text
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  {/* 视图模式切换 + 排序按钮 */}
                  <div className={`${S}-sortBar`}>
                    {/* 视图模式切换 */}
                    <button
                      type="button"
                      className={`${S}-viewToggle${viewMode === "grouped" ? " active" : ""}`}
                      onClick={() => setViewMode("grouped")}
                      title={T("pl.preview.groupView")}
                    >
                      ▤
                    </button>
                    <button
                      type="button"
                      className={`${S}-viewToggle${viewMode === "list" ? " active" : ""}`}
                      onClick={() => setViewMode("list")}
                      title={T("pl.preview.listView")}
                    >
                      ☰
                    </button>
                    
                    {/* 仅在列表模式下显示排序按钮 */}
                    {viewMode === "list" && (
                      <>
                        <button
                          type="button"
                          className={`${S}-sortBtn`}
                          onClick={() => setSortMode("name")}
                        >
                          {T("pl.preview.name")} {sortMode === "name" && (sortAsc ? "↑" : "↓")}
                        </button>
                        <button
                          type="button"
                          className={`${S}-sortBtn`}
                          onClick={() => setSortMode("size")}
                        >
                          {T("pl.preview.size")} {sortMode === "size" && (sortAsc ? "↑" : "↓")}
                        </button>
                        <button
                          type="button"
                          className={`${S}-sortBtn`}
                          onClick={() => {
                            setSortMode("modified");
                            setSortAsc(false); // 默认最新在前
                          }}
                        >
                          {T("pl.preview.modified")} {sortMode === "modified" && (sortAsc ? "↑" : "↓")}
                        </button>
                        <button
                          type="button"
                          className={`${S}-sortToggle`}
                          onClick={() => setSortAsc(!sortAsc)}
                          title={T("pl.preview.toggleOrder")}
                        >
                          {sortAsc ? "↑" : "↓"}
                        </button>
                      </>
                    )}
                  </div>

                  {/* 文件列表：根据视图模式渲染 */}
                  {viewMode === "list" && (
                    <div
                      className={`${S}-fileListFlat`}
                      ref={fileListRef}
                      onContextMenu={(e) => openCtx(e, null)}
                    >
                      {filteredFiles.length === 0 ? (
                        <div className={`${S}-emptyList`}>
                          {searchQuery ? T("pl.preview.noMatch") : T("pl.preview.noFilesInType")}
                        </div>
                      ) : (
                        filteredFiles.map((f) => {
                          const sizeWarning = isLargeFile(f.size);
                          const fileNode: FileTreeNode = {
                            name: f.name.split("/").pop() ?? f.name,
                            path: f.path,
                            type: f.type,
                            size: f.size,
                          };
                          return (
                            <button
                              key={f.path}
                              type="button"
                              className={`${S}-fileItem${activePath === f.path ? " active" : ""}${flashNode === f.path ? ` ${S}-flash` : ""}${sizeWarning ? ` ${sizeWarning}` : ""}`}
                              onClick={() => setActivePath(f.path)}
                              onContextMenu={(e) => openCtx(e, fileNode)}
                              data-path={f.path}
                              title={f.name}
                            >
                              <span
                                className={`${S}-fileTypeBadge`}
                                style={{ background: TYPE_META[f.type].color }}
                              >
                                {TYPE_META[f.type].label}
                              </span>
                              <span className={`${S}-fileName`}>{f.name.split("/").pop()}</span>
                              <span className={`${S}-fileMeta`}>
                                <span className={`${S}-fileSize`}>{formatFileSize(f.size)}</span>
                                {f.modified && (
                                  <span className={`${S}-fileModified`}>{formatModified(f.modified)}</span>
                                )}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                  
                  {/* 分组视图 */}
                  {viewMode === "grouped" && (
                    <div
                      className={`${S}-fileListTree`}
                      ref={fileListRef}
                      onContextMenu={(e) => openCtx(e, null)}
                    >
                      {treeNodes.length === 0 ? (
                        <div className={`${S}-emptyList`}>
                          {searchQuery ? T("pl.preview.noMatch") : T("pl.preview.noFilesInType")}
                        </div>
                      ) : (
                        <TreeNodes
                          nodes={treeNodes}
                          depth={0}
                          collapsed={collapsed}
                          onToggle={toggleDir}
                          activePath={activePath}
                          onSelect={setActivePath}
                          baseDir={dir}
                          onCtx={openCtx}
                          flashPath={flashNode}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className={`${S}-content`}>
            {/* 正文含大纲：左侧大纲（仅 md） */}
            {showToc && (
              <div className={`${S}-toc${tocCollapsed ? ` ${S}-tocCollapsed` : ""}`}>
                {tocCollapsed ? (
                  <button
                    type="button"
                    className={`${S}-tocCollapseBtn`}
                    title={T?.("pl.preview.showOutline") ?? "展开大纲"}
                    onClick={() => setTocCollapsed(false)}
                  >
                    ❯
                  </button>
                ) : (
                  <>
                    <div className={`${S}-tocHead`}>
                      {T?.("pl.preview.outline") ?? "大纲"}
                      <button
                        type="button"
                        className={`${S}-tocCollapseBtn`}
                        title={T?.("pl.preview.hideOutline") ?? "收起大纲"}
                        onClick={() => setTocCollapsed(true)}
                      >
                        ❮
                      </button>
                    </div>
                    <div className={`${S}-tocList`}>
                      {outline.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`${S}-tocItem ${item.id === activeId ? "active" : ""}`}
                          style={{ paddingLeft: 8 + (item.level - 1) * 12 }}
                          onClick={() => scrollTo(item.id)}
                        >
                          {item.text}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 正文渲染：按类型 */}
            {activePath && content !== null && activeFile ? (
              editing ? (
                <div className={`${S}-editorBody`} ref={setBodyRef}>
                  <textarea
                    className={`${S}-editorTextarea`}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    data-pl-no-hash-trigger="1"
                    spellCheck={false}
                  />
                </div>
              ) : bigText ? (
                <LargeFileViewer path={activePath} totalHint={totalLines} jumpLine={jumpToLine} t={T} />
              ) : activeFile.type === "md" ? (
                <div className={`${S}-mdBody`} ref={setBodyRef} onScroll={onBodyScroll}>
                  {truncHint}
                  {parsed.body}
                </div>
              ) : activeFile.type === "json" ? (
                jsonError ? (
                  <div className={`${S}-empty`}>
                    {T?.("pl.preview.jsonError") ?? "JSON 解析失败，请检查文件内容"}
                  </div>
                ) : (
                  <div className={`${S}-jBody`}>
                    <JsonTree value={jsonValue} />
                  </div>
                )
              ) : activeFile.type === "csv" ? (
                <CsvTable rows={parseCsv(content)} />
              ) : activeFile.type === "ts" || activeFile.type === "js" || activeFile.type === "py" ||
                  activeFile.type === "go" || activeFile.type === "rs" || activeFile.type === "java" ||
                  activeFile.type === "c" || activeFile.type === "cpp" ? (
                <div className={`${S}-codeBody`}>
                  <CodeHighlight code={content} language={PRISM_LANG_MAP[activeFile.type]} />
                </div>
              ) : activeFile.type === "png" || activeFile.type === "jpg" || activeFile.type === "jpeg" ||
                  activeFile.type === "gif" || activeFile.type === "svg" ? (
                <div className={`${S}-imgBody`}>
                  <img
                    src={`data:image/${activeFile.type === "jpg" ? "jpeg" : activeFile.type};base64,${content}`}
                    alt={activeFile.name}
                  />
                </div>
              ) : activeFile.type === "mp4" ? (
                <div className={`${S}-videoBody`}>
                  <video controls src={`data:video/mp4;base64,${content}`} />
                </div>
              ) : (
                <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  {truncHint}
                  <pre className={`${S}-txtBody`} ref={setBodyRef} onScroll={onBodyScroll}>{content}</pre>
                </div>
              )
            ) : (
              <div className={`${S}-empty`}>
                {!dir
                  ? (T?.("pl.preview.noSession") ?? "暂无会话所属文件夹")
                  : fileEntries.length === 0
                    ? (
                        <>
                          <span>{T?.("pl.preview.noFiles") ?? "当前目录没有可预览文件"}</span>
                          <span className={`${S}-emptyNote`}>{dir}</span>
                        </>
                      )
                    : activeFile
                      ? (T?.("pl.preview.loading") ?? "加载中…")
                      : (T?.("pl.preview.noSession") ?? "暂无会话所属文件夹")}
              </div>
            )}
          </div>
        </div>
        {/* 浏览式目录选择弹窗：预览「打开文件夹」在桌面端（无原生选择器）时的回退选择方案 */}
        <DirectoryPickerModal
          open={dirPickerOpen}
          initialPath={dir || undefined}
          onPick={(d) => {
            setDirPickerOpen(false);
            setManualDir(d);
          }}
          onClose={() => setDirPickerOpen(false)}
          t={T}
        />
        
        {/* 右键菜单（用 portal 挂到 body，避免祖先 transform 破坏 fixed 定位） */}
        {ctxMenu &&
          createPortal(
            <>
              <div
                className={`${S}-ctxOverlay`}
                onMouseDown={closeMenu}
                onContextMenu={(e) => {
                  e.preventDefault();
                  closeMenu();
                }}
              />
              <div
                className={`${S}-ctxMenu`}
                ref={ctxMenuRef}
                style={{
                  left: Math.min(ctxMenu.x, window.innerWidth - 190),
                  top: ctxMenuTop ?? Math.min(ctxMenu.y, window.innerHeight - 80),
                  // 统一面板底色 + 在本浮层内就地声明主题变量，保证 portal 子树昼夜一致
                  background: TONE.panel,
                  borderColor: TONE.border,
                  color: TONE.text,
                  ["--dsw-alias-bg-layer-1" as any]: TONE.panel,
                  ["--dsw-alias-border-l2" as any]: TONE.border,
                  ["--dsw-alias-label-primary" as any]: TONE.text,
                  ["--dsw-alias-label-secondary" as any]: TONE.muted,
                  ["--dsw-alias-label-tertiary" as any]: TONE.quiet,
                  ["--dsw-alias-interactive-bg-hover" as any]:
                    "color-mix(in srgb, currentColor 12%, transparent)",
                } as React.CSSProperties}
              >
                {ctxMenu.target.name && (
                  <div className={`${S}-ctxTitle`}>{ctxMenu.target.name}</div>
                )}
                {ctxMenu.target.kind === "file" && (
                  <>
                    <button
                      type="button"
                      className={`${S}-ctxItem`}
                      onClick={actEdit}
                      disabled={
                        ctxMenu.target.kind === "file" &&
                        activePath === ctxMenu.target.absPath &&
                        !!truncated
                      }
                      title={
                        ctxMenu.target.kind === "file" &&
                        activePath === ctxMenu.target.absPath &&
                        !!truncated
                          ? T("pl.preview.editForbiddenTruncated")
                          : undefined
                      }
                      style={
                        ctxMenu.target.kind === "file" &&
                        activePath === ctxMenu.target.absPath &&
                        !!truncated
                          ? { color: "var(--dsw-alias-label-tertiary)", opacity: .5, cursor: "not-allowed" }
                          : undefined
                      }
                    >
                      <span className={`${S}-ctxIcon`}>✏️</span>{T("pl.preview.ctx.edit")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actExport()}>
                      <span className={`${S}-ctxIcon`}>📤</span>{T("pl.preview.ctx.export")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actCopy("abs")}>
                      <span className={`${S}-ctxIcon`}>🔗</span>{T("pl.preview.ctx.copyAbs")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actCopy("rel")}>
                      <span className={`${S}-ctxIcon`}>📂</span>{T("pl.preview.ctx.copyRel")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actCopy("name")}>
                      <span className={`${S}-ctxIcon`}>📄</span>{T("pl.preview.ctx.copyName")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={() => readAndCopy(false)}>
                      <span className={`${S}-ctxIcon`}>📋</span>{T("pl.preview.ctx.copyContent")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => readAndCopy(true)}>
                      <span className={`${S}-ctxIcon`}>🧩</span>{T("pl.preview.ctx.copyFence")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actCopy("link")}>
                      <span className={`${S}-ctxIcon`}>🔎</span>{T("pl.preview.ctx.copyLink")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={() => openMoveDlg("move")}>
                      <span className={`${S}-ctxIcon`}>📂</span>{T("pl.preview.ctx.moveTo")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => openMoveDlg("copy")}>
                      <span className={`${S}-ctxIcon`}>📄</span>{T("pl.preview.ctx.copyTo")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={actRename}>
                      <span className={`${S}-ctxIcon`}>✏️</span>{T("pl.preview.ctx.rename")}
                    </button>
                    <button type="button" className={`${S}-ctxItem danger`} onClick={actDelete}>
                      <span className={`${S}-ctxIcon`}>🗑️</span>{T("pl.preview.ctx.delete")}
                    </button>
                  </>
                )}
                {ctxMenu.target.kind === "dir" && (
                  <>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actExport()}>
                      <span className={`${S}-ctxIcon`}>📤</span>{T("pl.preview.ctx.export")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button
                      type="button"
                      className={`${S}-ctxItem`}
                      onClick={() => openNewFileDialog(ctxMenu.target.absPath)}
                    >
                      <span className={`${S}-ctxIcon`}>📄</span>{T("pl.preview.ctx.newFile")}
                    </button>
                    <button
                      type="button"
                      className={`${S}-ctxItem`}
                      onClick={() => openNewDirDialog(ctxMenu.target.absPath)}
                    >
                      <span className={`${S}-ctxIcon`}>📁</span>{T("pl.preview.ctx.newDir")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actCopy("abs")}>
                      <span className={`${S}-ctxIcon`}>🔗</span>{T("pl.preview.ctx.copyAbs")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={() => actCopy("rel")}>
                      <span className={`${S}-ctxIcon`}>📂</span>{T("pl.preview.ctx.copyRel")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={actExpandAll}>
                      <span className={`${S}-ctxIcon`}>⤵</span>{T("pl.preview.ctx.expandAll")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={actCollapseAll}>
                      <span className={`${S}-ctxIcon`}>⤴</span>{T("pl.preview.ctx.collapseAll")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={actRefresh}>
                      <span className={`${S}-ctxIcon`}>🔄</span>{T("pl.preview.refresh")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={actRename}>
                      <span className={`${S}-ctxIcon`}>✏️</span>{T("pl.preview.ctx.rename")}
                    </button>
                    <button type="button" className={`${S}-ctxItem danger`} onClick={actDelete}>
                      <span className={`${S}-ctxIcon`}>🗑️</span>{T("pl.preview.ctx.deleteDir")}
                    </button>
                  </>
                )}
                {ctxMenu.target.kind === "blank" && (
                  <>
                    <button
                      type="button"
                      className={`${S}-ctxItem`}
                      onClick={() => openNewFileDialog(ctxMenu.target.absPath)}
                    >
                      <span className={`${S}-ctxIcon`}>📄</span>{T("pl.preview.ctx.newFile")}
                    </button>
                    <button
                      type="button"
                      className={`${S}-ctxItem`}
                      onClick={() => openNewDirDialog(ctxMenu.target.absPath)}
                    >
                      <span className={`${S}-ctxIcon`}>📁</span>{T("pl.preview.ctx.newDir")}
                    </button>
                    <div className={`${S}-ctxSep`} />
                    <button type="button" className={`${S}-ctxItem`} onClick={actExpandAll}>
                      <span className={`${S}-ctxIcon`}>⤵</span>{T("pl.preview.ctx.expandAll")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={actCollapseAll}>
                      <span className={`${S}-ctxIcon`}>⤴</span>{T("pl.preview.ctx.collapseAll")}
                    </button>
                    <button type="button" className={`${S}-ctxItem`} onClick={actRefresh}>
                      <span className={`${S}-ctxIcon`}>🔄</span>{T("pl.preview.refresh")}
                    </button>
                  </>
                )}
              </div>
            </>,
            document.body,
          )}

        {/* 名称输入弹窗（重命名 / 新建文件 / 新建目录） */}
        {nameDialog &&
          createPortal(
            <div className={`${S}-dialogOverlay`} onMouseDown={() => (modalBusy ? undefined : setNameDialog(null))}>
              <div className={`${S}-dialog`} onMouseDown={(e) => e.stopPropagation()}>
                <div className={`${S}-dialogTitle`}>{nameDialog.title}</div>
                <div className={`${S}-dialogMsg`} style={{ marginBottom: 8 }}>
                  {nameDialog.label}
                </div>
                <input
                  className={`${S}-dialogInput`}
                  autoFocus
                  value={nameInput}
                  placeholder={nameDialog.placeholder}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (dialogErr) setDialogErr("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !modalBusy) submitNameDialog();
                    if (e.key === "Escape" && !modalBusy) setNameDialog(null);
                  }}
                />
                {dialogErr && (
                  <div className={`${S}-dialogMsg`} style={{ color: "#ef4444", marginTop: -8 }}>
                    {dialogErr}
                  </div>
                )}
                <div className={`${S}-dialogBtns`}>
                  <button
                    type="button"
                    className={`${S}-dialogBtn`}
                    disabled={modalBusy}
                    onClick={() => setNameDialog(null)}
                  >
                    {T("pl.preview.cancel")}
                  </button>
                  <button
                    type="button"
                    className={`${S}-dialogBtn primary`}
                    disabled={modalBusy}
                    onClick={() => submitNameDialog()}
                  >
                    {nameDialog.okText}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* 危险确认弹窗（删除） */}
        {confirmDialog &&
          createPortal(
            <div
              className={`${S}-dialogOverlay`}
              onMouseDown={() => (modalBusy ? undefined : setConfirmDialog(null))}
            >
              <div className={`${S}-dialog`} onMouseDown={(e) => e.stopPropagation()}>
                <div className={`${S}-dialogTitle`}>{confirmDialog.title}</div>
                <div className={`${S}-dialogMsg`}>{confirmDialog.message}</div>
                <div className={`${S}-dialogBtns`}>
                  <button
                    type="button"
                    className={`${S}-dialogBtn`}
                    disabled={modalBusy}
                    onClick={() => setConfirmDialog(null)}
                  >
                    {T("pl.preview.cancel")}
                  </button>
                  <button
                    type="button"
                    className={`${S}-dialogBtn danger`}
                    disabled={modalBusy}
                    onClick={async () => {
                      const onOk = confirmDialog.onOk;
                      setModalBusy(true);
                      await onOk();
                      setModalBusy(false);
                      setConfirmDialog(null);
                    }}
                  >
                    {confirmDialog.okText}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* 移动/复制到目录弹窗（选择目标目录后调用 previewMove / previewCopy） */}
        {moveDlg &&
          createPortal(
            <div className={`${S}-dialogOverlay`} onMouseDown={() => (moveBusy ? undefined : setMoveDlg(null))}>
              <div className={`${S}-dialog`} onMouseDown={(e) => e.stopPropagation()}>
                <div className={`${S}-dialogTitle`}>
                  {moveDlg.op === "move" ? T?.("pl.preview.moveTitle") ?? "移动到" : T?.("pl.preview.copyTitle") ?? "复制到"}
                </div>
                <div className={`${S}-dialogMsg`} style={{ marginBottom: 8 }}>
                  {T?.("pl.preview.moveSource") ?? "选择目标目录"}：{moveDlg.name}
                </div>
                <div className={`${S}-moveDirList`}>
                  <button
                    type="button"
                    className={`${S}-moveDir${moveTarget === "" ? " active" : ""}`}
                    onClick={() => setMoveTarget("")}
                    title={dir || ""}
                    style={{ paddingLeft: 20, width: "100%" }}
                  >
                    📁 {T?.("pl.preview.moveRoot") ?? "根目录"}
                  </button>
                  {renderMoveDirTree(moveDirTree, 0)}
                </div>
                <div className={`${S}-dialogBtns`}>
                  <button
                    type="button"
                    className={`${S}-dialogBtn`}
                    disabled={moveBusy}
                    onClick={() => setMoveDlg(null)}
                  >
                    {T("pl.preview.cancel")}
                  </button>
                  <button
                    type="button"
                    className={`${S}-dialogBtn primary`}
                    disabled={moveBusy}
                    onClick={() => runMoveCopy()}
                  >
                    {moveBusy
                      ? T?.("pl.preview.moving") ?? "处理中…"
                      : moveDlg.op === "move"
                        ? (T?.("pl.preview.moveOk") ?? "移动")
                        : (T?.("pl.preview.copyOk") ?? "复制")}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* Toast 提示 */}
        {toast && (
          <div className={`${S}-toast ${toast.type}`}>
            {toast.type === "success" ? "✓" : "✗"} {toast.message}
          </div>
        )}

        {zipExport &&
          createPortal(
            <div
              className={`${S}-zipOverlay`}
              onMouseDown={() => (zipBusy ? undefined : setZipExport(null))}
            >
              <div
                className={`${S}-zipPanel`}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className={`${S}-zipHead`}>
                  <div className={`${S}-zipTitle`}>{zipExport.title}</div>
                  <button
                    type="button"
                    className={`${S}-zipClose`}
                    disabled={zipBusy}
                    onClick={() => setZipExport(null)}
                    title={T("pl.preview.cancel")}
                  >
                    ✕
                  </button>
                </div>
                <div className={`${S}-zipActions`}>
                  <button type="button" className={`${S}-zipAction`} onClick={toggleZipAll}>
                    {zipSel.size === zipExport.entries.length
                      ? T("pl.preview.zip.unselectAll")
                      : T("pl.preview.zip.selectAll")}
                  </button>
                  <span className={`${S}-zipCounter`}>
                    {T("pl.preview.zip.selected", {
                      n: String(zipSel.size),
                      total: String(zipExport.entries.length),
                    })}
                  </span>
                </div>
                <div className={`${S}-zipList`}>
                  {zipExport.entries.map((e) => (
                    <label
                      key={e.rel}
                      className={`${S}-zipItem ${zipSel.has(e.rel) ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={zipSel.has(e.rel)}
                        disabled={zipBusy}
                        onChange={() => toggleZipFile(e.rel)}
                      />
                      <span className={`${S}-zipIcon`}>{fileIconOf(e.type)}</span>
                      <span className={`${S}-zipName`} title={e.rel}>
                        {e.rel}
                      </span>
                      {e.size > 0 && (
                        <span className={`${S}-zipSize`}>{formatZipSize(e.size)}</span>
                      )}
                    </label>
                  ))}
                </div>
                <div className={`${S}-zipFoot`}>
                  {zipProgress && (
                    <div className={`${S}-zipProgress`}>
                      <div className={`${S}-zipBar`}>
                        <div
                          className={`${S}-zipFill`}
                          style={{ width: `${(zipProgress.current / zipProgress.total) * 100}%` }}
                        />
                      </div>
                      <span className={`${S}-zipPct`}>
                        {zipProgress.current}/{zipProgress.total}
                      </span>
                    </div>
                  )}
                  <div className={`${S}-zipBtns`}>
                    <button
                      type="button"
                      className={`${S}-zipBtn`}
                      disabled={zipBusy}
                      onClick={() => setZipExport(null)}
                    >
                      {T("pl.preview.cancel")}
                    </button>
                    <button
                      type="button"
                      className={`${S}-zipBtn primary`}
                      disabled={zipSel.size === 0 || zipBusy}
                      onClick={runZipExport}
                    >
                      {zipBusy
                        ? T("pl.preview.zip.exporting")
                        : T("pl.preview.zip.export", {
                            n: String(zipSel.size),
                          })}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
