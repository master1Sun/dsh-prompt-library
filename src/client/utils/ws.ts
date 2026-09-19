/**
 * 浏览器端 WebSocket 订阅（全插件共享一条连接）。
 *
 * 本插件的 host → client 推送原先是两条 SSE（EventSource 自带重连），换成 WS
 * 后：全插件只在 `/api/prompt-library/events` 上建**一条**连接，数据变更广播等
 * 都走它，用消息信封的 `type` 区分；重连也要自己兜。
 *
 * 因此这里不做「每次订阅一条连接」，而是单例连接 + 监听器集合：
 * {@link subscribePush} 注册/注销监听，最后一个监听注销后连接仍保留（host 的
 * 主动推送随时会到，连接需要常驻到页面卸载）。
 */
/** 唯一的 WS 端点（与 host/events.ts 的路由路径一致）。 */
const SOCKET_PATH = "/api/prompt-library/events";
/** 首次重连等待；每次失败累加，上限 RECONNECT_MAX_MS。 */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10000;

/** 一个 JSON 消息（host 侧推送的信封一定有 `type`）。 */
export type JsonMessage = { type?: string; [key: string]: unknown };

/** 把 `/api/...` 这样的相对路径解析成同源的 ws(s) 地址。 */
export function toWebSocketUrl(path: string): string {
  if (typeof window === "undefined") return path;
  const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${window.location.host}${path}`;
}

/** 共享连接的状态；模块级单例。 */
interface SocketState {
  socket: WebSocket | null;
  listeners: Set<(message: JsonMessage) => void>;
  timer?: ReturnType<typeof setTimeout>;
  attempt: number;
}

let state: SocketState | null = null;

function scheduleReconnect(current: SocketState): void {
  if (current.timer !== undefined) return;
  current.attempt += 1;
  const delay = Math.min(RECONNECT_BASE_MS * current.attempt, RECONNECT_MAX_MS);
  current.timer = setTimeout(() => {
    current.timer = undefined;
    connect(current);
  }, delay);
}

function connect(current: SocketState): void {
  let socket: WebSocket;
  try {
    socket = new WebSocket(toWebSocketUrl(SOCKET_PATH));
  } catch {
    scheduleReconnect(current);
    return;
  }
  current.socket = socket;
  socket.onopen = () => {
    current.attempt = 0;
  };
  socket.onmessage = (event: MessageEvent) => {
    if (typeof event.data !== "string") return;
    let message: unknown;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message === null || typeof message !== "object") return;
    // 复制一份，避免监听器在遍历中注销导致集合变动
    for (const listener of [...current.listeners]) listener(message as JsonMessage);
  };
  socket.onerror = () => {
    // 交给 onclose 统一走重连；这里只负责收尾。
    try {
      socket.close();
    } catch {
      /* 已关闭 */
    }
  };
  socket.onclose = () => {
    current.socket = null;
    scheduleReconnect(current);
  };
}

/** 确保共享连接已建立（幂等）。 */
function ensureSocket(): SocketState | null {
  if (typeof window === "undefined" || typeof WebSocket === "undefined") return null;
  if (state === null) {
    state = { socket: null, listeners: new Set(), attempt: 0 };
    connect(state);
  }
  return state;
}

/**
 * 订阅共享 WS 推送：所有消息都会回调，调用方按 `type` 各取所需。
 * @returns 取消订阅函数（只摘掉自己的监听，不关连接）。
 */
export function subscribePush(listener: (message: JsonMessage) => void): () => void {
  const current = ensureSocket();
  if (current === null) return () => {};
  current.listeners.add(listener);
  return () => {
    current.listeners.delete(listener);
  };
}
