/**
 * host → client 的唯一一条 WebSocket 推送通道。
 *
 * 客户端只在 `ws(s)://<host>/api/prompt-library/events` 上建一条连接：
 *   - 数据变更广播：{@link emitDataChanged} / {@link emitFillDraft} /
 *     {@link emitExportDownload} 推送 `{type:"data-changed"|"fill-draft"|
 *     "export-download", …}；
 *   - 词库助手状态流：连接建立即推一次 activity / status 快照，之后变化再推
 *     （见 host/assistant-stream.ts 的 {@link attachAssistantStream}）。
 * 全插件只此一条 WS，用消息信封的 `type` 区分业务。
 *
 * 原先这里是 SSE（`text/event-stream` 长连接），现改为 WS：命名事件改成
 * 消息信封里的 `type` 字段，其余语义不变。
 */
import { attachAssistantStream } from "./assistant-stream.js";
import { createWsRoute, type WsSession } from "./ws.js";

const PREFIX = "/api/prompt-library";

/** 当前在线的 WS 连接集合。 */
const clients = new Set<WsSession>();

/** WS 路由：注册到 host webServer 的 upgrade 表，是插件唯一的 WS 入口。 */
export const dataChangedUpgradeRoute = createWsRoute({
  path: `${PREFIX}/events`,
  onOpen(session) {
    clients.add(session);
    session.onClose(() => {
      clients.delete(session);
    });
    // 助手状态流复用同一条连接，不另开一条。
    attachAssistantStream(session);
  },
});

/**
 * 向所有订阅的面板广播一条 JSON 消息。
 * @returns 成功写出的连接数；0 表示当前没有任何在线面板。
 */
function broadcast(message: unknown): number {
  if (clients.size === 0) return 0;
  const text = JSON.stringify(message);
  let sent = 0;
  for (const session of clients) {
    if (session.closed) {
      clients.delete(session);
      continue;
    }
    try {
      session.send(text);
      sent += 1;
    } catch {
      clients.delete(session);
    }
  }
  return sent;
}

/** 向所有订阅的面板推送一次 `data-changed` 事件。 */
export function emitDataChanged(): void {
  broadcast({ type: "data-changed" });
}

/**
 * 向所有订阅的面板推送一次 `fill-draft` 事件，携带一段要填充到当前聊天框的正文
 * （用于 `/prompts -AI`：host 完成 AI 润色后把结果推给 client 填入草稿）。
 */
export function emitFillDraft(body: string): void {
  broadcast({ type: "fill-draft", body });
}

/** 向所有订阅的面板推送一次 `export-download` 事件，触发浏览器下载 JSON 备份文件。
 * 消息体携带 `{ name, json }`：name 为下载文件名，json 为序列化后的备份内容。
 * @returns 是否成功推送到至少一个订阅者（true 时客户端会发起下载）。
 */
export function emitExportDownload(name: string, json: string): boolean {
  return broadcast({ type: "export-download", name, json }) > 0;
}
