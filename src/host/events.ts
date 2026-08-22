/**
 * host → client 的数据变更广播（SSE）。
 *
 * 客户端通过 `/api/prompt-library/events` 订阅本通道；host 侧新增/修改/删除
 * 提示词后调用 {@link emitDataChanged}，向所有在线的面板推送一次
 * `data-changed` 事件，让侧边栏、聊天面板等「用到提示词的地方」即时刷新。
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { WebRoute } from "@deepseek-ai/dsh-host-webserver";

const PREFIX = "/api/prompt-library";

/** 当前订阅了事件推送的响应连接集合。 */
const clients = new Set<ServerResponse>();

let keepAliveTimer: NodeJS.Timeout | undefined;

/** 有订阅时启动 keep-alive 注释帧，避免空闲长连接被网络层断开。 */
function ensureKeepAlive(): void {
  if (keepAliveTimer || clients.size === 0) return;
  keepAliveTimer = setInterval(() => {
    if (clients.size === 0) {
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      keepAliveTimer = undefined;
      return;
    }
    for (const res of clients) {
      try {
        res.write(":\n\n");
      } catch {
        clients.delete(res);
      }
    }
  }, 15000);
}

/** SSE 路由：注册到 host webServer，向客户端长连接推送变更事件。 */
export const dataChangedRoute: WebRoute = {
  kind: "prefix",
  path: `${PREFIX}/events`,
  handler(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== "GET") {
      res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      res.end("method not allowed");
      return;
    }
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    res.write(":\n\n");
    clients.add(res);
    ensureKeepAlive();
    const cleanup = () => {
      clients.delete(res);
      ensureKeepAlive();
    };
    req.on("close", cleanup);
    res.on("close", cleanup);
  },
};

/** 向所有订阅的面板推送一次 `data-changed` 事件。 */
export function emitDataChanged(): void {
  if (clients.size === 0) return;
  const frame = "event: data-changed\ndata: {}\n\n";
  for (const res of clients) {
    try {
      res.write(frame);
    } catch {
      clients.delete(res);
    }
  }
}

/**
 * 向所有订阅的面板推送一次 `fill-draft` 事件，携带一段要填充到当前聊天框的正文
 * （用于 `/prompts -AI`：host 完成 AI 润色后把结果推给 client 填入草稿）。
 * body 经 JSON 编码，换行等字符安全地保持为单行 data。
 */
export function emitFillDraft(body: string): void {
  if (clients.size === 0) return;
  const frame = `event: fill-draft\ndata: ${JSON.stringify(body)}\n\n`;
  for (const res of clients) {
    try {
      res.write(frame);
    } catch {
      clients.delete(res);
    }
  }
}