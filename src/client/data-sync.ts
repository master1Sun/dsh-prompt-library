/**
 * 跨组件数据同步。
 *
 * 聊天面板（PromptLibraryButton）与侧边栏（SidebarPromptLibrary）是各自独立
 * 加载数据的组件。任一组件新增/修改/删除提示词后，通过 window 自定义事件
 * 通知所有提示词组件重新加载，保证两边内容实时一致。
 */
import { useEffect, useRef } from "react";

const DATA_CHANGED_EVENT = "pl:data-changed";
const FILL_DRAFT_EVENT = "pl:fill-draft";
const EXPORT_DOWNLOADED_EVENT = "pl:export-downloaded";

/** 通知所有提示词组件：数据已新增/修改/删除，应重新加载。 */
export function notifyDataChanged(): void {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
}

const SSE_URL = "/api/prompt-library/events";

let subscribed = false;

/**
 * 建立一次到 host 的 SSE 订阅，把 `data-changed` 事件翻译成已有的
 * `pl:data-changed` window 事件。host 侧改动（如 `/prompts` 保存）也能让
 * 所有打开的面板即时刷新。只允许在浏览器端调用一次。
 */
export function startDataChangedSubscription(): void {
  if (subscribed || typeof window === "undefined" || typeof EventSource === "undefined") return;
  subscribed = true;
  try {
    const es = new EventSource(SSE_URL);
    es.addEventListener("data-changed", () => notifyDataChanged());
    // host 侧 `/prompts -AI` 推送的润色正文：转发给填充监听的组件。
    es.addEventListener("fill-draft", (ev) => {
      console.log("[prompt-library] 收到 fill-draft", ev.data);
      let body = "";
      try {
        body = ev.data ? (JSON.parse(ev.data) as string) : "";
      } catch {
        body = "";
      }
      if (!body) return;
      window.dispatchEvent(new CustomEvent(FILL_DRAFT_EVENT, { detail: { body } }));
    });
    // host 侧 `/prompts -e` 推送的 JSON 备份：直接在浏览器本地触发下载。
    es.addEventListener("export-download", (ev) => {
      let count = 0;
      try {
        const { name, json } = JSON.parse(ev.data) as { name?: string; json?: string };
        if (!json) return;
        try {
          const parsed = JSON.parse(json) as { prompts?: unknown[] };
          count = Array.isArray(parsed.prompts) ? parsed.prompts.length : 0;
        } catch {
          count = 0;
        }
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name || `prompt-library-backup-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        /* 解析失败则静默忽略，不打断其他事件。 */
      }
      // 通知 UI 弹成功提示（如聊天框导出按钮）
      if (count > 0) {
        window.dispatchEvent(new CustomEvent(EXPORT_DOWNLOADED_EVENT, { detail: { count } }));
      }
    });
    // 连接断开由 EventSource 自动重连；无需手动处理。
  } catch {
    /* 忽略：个别环境不支持注入时降级为手动刷新。 */
  }
}

/** 订阅数据变化事件：任一组件增删改后都会触发 reload。 */
export function useDataChanged(reload: () => void): void {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useEffect(() => {
    startDataChangedSubscription();
    const onChanged = () => reloadRef.current();
    window.addEventListener(DATA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, onChanged);
  }, []);
}

/** 订阅 host 推送的「填充草稿」事件（/prompts -AI 润色结果），回调填到聊天框。 */
export function useFillDraft(fill: (body: string) => void): void {
  const fillRef = useRef(fill);
  fillRef.current = fill;
  useEffect(() => {
    startDataChangedSubscription();
    const onFill = (ev: Event) => {
      const body = (ev as CustomEvent<{ body: string }>).detail?.body ?? "";
      console.log("[prompt-library] useFillDraft 收到窗口事件", body.length);
      if (body) fillRef.current(body);
    };
    window.addEventListener(FILL_DRAFT_EVENT, onFill);
    return () => window.removeEventListener(FILL_DRAFT_EVENT, onFill);
  }, []);
}

/** 订阅「JSON 备份已下载」事件（/prompts -e），返回导出的提示词条数。 */
export function useExportDownloaded(onDownloaded: (count: number) => void): void {
  const onRef = useRef(onDownloaded);
  onRef.current = onDownloaded;
  useEffect(() => {
    startDataChangedSubscription();
    const handler = (ev: Event) => {
      const count = (ev as CustomEvent<{ count?: number }>).detail?.count ?? 0;
      if (count > 0) onRef.current(count);
    };
    window.addEventListener(EXPORT_DOWNLOADED_EVENT, handler);
    return () => window.removeEventListener(EXPORT_DOWNLOADED_EVENT, handler);
  }, []);
}
