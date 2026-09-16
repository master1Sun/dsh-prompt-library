/**
 * 极简 WebSocket 服务端（RFC 6455 的常用子集，零依赖）。
 *
 * 本插件原先的 host → client 推送走 SSE（`text/event-stream` 长连接）。宿主
 * webServer 提供 `registerUpgrade`（精确路径的 HTTP upgrade 路由），因此这里
 * 用一条 WS 连接替代原先的每条 SSE 长连接：握手、文本帧收发、ping/pong
 * 心跳与 close 帧都自己实现，不引入 `ws` 等第三方依赖（host bundle 只
 * external 了 @deepseek-ai/*，打包第三方包会失败）。
 *
 * 支持范围：文本帧（含分片续帧）、ping/pong、close；客户端帧必须带掩码
 * （浏览器实现必然带掩码），服务端发出的帧不带掩码。二进制帧按 utf8 字符串
 * 交给上层（本插件只推 JSON 文本）。
 */
import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import type { WebUpgradeRoute } from "@deepseek-ai/dsh-host-webserver";

/** RFC 6455 规定的握手 GUID。 */
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
/** 单帧载荷上限（16 MiB）：超过即断开，防止恶意/异常帧吃满内存。 */
const MAX_PAYLOAD_BYTES = 16 * 1024 * 1024;
/** 默认心跳间隔：与原先 SSE 的 15s keep-alive 注释帧对齐。 */
const DEFAULT_HEARTBEAT_MS = 15000;

/** 帧操作码。 */
const OP_CONTINUATION = 0x0;
const OP_TEXT = 0x1;
const OP_BINARY = 0x2;
const OP_CLOSE = 0x8;
const OP_PING = 0x9;
const OP_PONG = 0xa;

/** 一条已建立的 WS 连接。 */
export interface WsSession {
  /** 发送一帧 UTF-8 文本（上层传 JSON 字符串即可）；已关闭时静默丢弃。 */
  send(text: string): void;
  /** 主动关闭连接（发送 close 帧后结束 socket）。 */
  close(): void;
  /**
   * 注册消息回调（可多次注册，收到消息时按注册顺序调用）。
   * 全插件共用一条连接，各功能模块各自挂钩、只看自己关心的 `type`。
   */
  onMessage(listener: (message: string) => void): void;
  /** 注册关闭回调（可多次注册，连接断开时按注册顺序调用）。 */
  onClose(listener: () => void): void;
  /** 连接是否已关闭。 */
  readonly closed: boolean;
  /** 握手请求：用于读取查询参数与请求头。 */
  readonly req: IncomingMessage;
}

/** WS upgrade 路由配置。 */
export interface WsRouteOptions {
  /** 精确路径（不含查询串），如 `/api/prompt-library/events`。 */
  path: string;
  /** 握手完成后调用；可异步（例如先推一次当前快照再订阅变更）。 */
  onOpen(session: WsSession): void | Promise<void>;
  /** 收到一条完整消息（文本帧内容，续帧已合并）。 */
  onMessage?(session: WsSession, message: string): void;
  /** 连接关闭（任一方向）后调用。 */
  onClose?(session: WsSession): void;
  /** 心跳间隔（毫秒）；传 0 关闭心跳。默认 15000。 */
  heartbeatMs?: number;
}

/** 计算握手响应头 `Sec-WebSocket-Accept`。 */
function acceptKey(key: string): string {
  return createHash("sha1").update(key + WS_GUID).digest("base64");
}

/** 客户端帧解除掩码（原地拷贝一份，避免复用底层 buffer）。 */
function unmask(payload: Buffer, mask: Buffer): Buffer {
  const out = Buffer.allocUnsafe(payload.length);
  for (let i = 0; i < payload.length; i += 1) {
    out[i] = payload[i] ^ mask[i % 4];
  }
  return out;
}

/** 编码一帧服务端 → 客户端数据（FIN=1，无掩码）。 */
function encodeFrame(opcode: number, payload: Buffer): Buffer {
  const len = payload.length;
  let header: Buffer;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = len;
  } else if (len < 0x10000) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  header[0] = 0x80 | opcode;
  return Buffer.concat([header, payload]);
}

const EMPTY_PAYLOAD = Buffer.alloc(0);

/**
 * 构造一条 WS upgrade 路由，交给宿主 `webServer.registerUpgrade` 注册。
 * 握手失败（非 websocket upgrade / 缺少 key）时直接回 400 并关闭 socket。
 */
export function createWsRoute(options: WsRouteOptions): WebUpgradeRoute {
  return {
    path: options.path,
    handler(req: IncomingMessage, socket: Duplex, head: Buffer) {
      const upgrade = String(req.headers.upgrade ?? "").toLowerCase();
      const key = req.headers["sec-websocket-key"];
      if (upgrade !== "websocket" || typeof key !== "string" || key === "") {
        socket.end("HTTP/1.1 400 Bad Request\r\nconnection: close\r\n\r\n");
        return;
      }
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
      );

      let closed = false;
      const closeListeners: Array<() => void> = [];
      const messageListeners: Array<(message: string) => void> = [];
      /** 已收到的分片（用于续帧合并）。 */
      let fragments: Buffer[] = [];
      let fragmentOpcode = OP_TEXT;
      /** 最近一次收到客户端数据的时间，用于心跳超时判定。 */
      let lastSeenAt = Date.now();
      let pending = Buffer.alloc(0);

      const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
      let heartbeat: NodeJS.Timeout | undefined;

      const session: WsSession = {
        get closed() {
          return closed;
        },
        req,
        send(text: string) {
          if (closed) return;
          try {
            socket.write(encodeFrame(OP_TEXT, Buffer.from(text, "utf8")));
          } catch {
            destroy();
          }
        },
        close() {
          if (closed) return;
          try {
            // 1000 = normal closure
            socket.write(encodeFrame(OP_CLOSE, Buffer.from([0x03, 0xe8])));
          } catch {
            /* 写失败直接结束 socket */
          }
          socket.end();
        },
        onMessage(listener: (message: string) => void) {
          messageListeners.push(listener);
        },
        onClose(listener: () => void) {
          if (closed) {
            listener();
            return;
          }
          closeListeners.push(listener);
        },
      };

      function finish(): void {
        if (closed) return;
        closed = true;
        if (heartbeat !== undefined) {
          clearInterval(heartbeat);
          heartbeat = undefined;
        }
        options.onClose?.(session);
        for (const listener of closeListeners) listener();
        closeListeners.length = 0;
      }

      function destroy(): void {
        finish();
        try {
          socket.destroy();
        } catch {
          /* 已销毁 */
        }
      }

      function deliver(opcode: number, payload: Buffer): void {
        if (opcode === OP_TEXT || opcode === OP_BINARY) {
          const text = payload.toString("utf8");
          options.onMessage?.(session, text);
          for (const listener of messageListeners) listener(text);
        }
      }

      /** 解析并派发缓冲区中的所有完整帧。 */
      function parse(): void {
        // 单个循环里尽量消费完：任一阵不完整即返回，等下一次 data 事件。
        for (;;) {
          if (pending.length < 2) return;
          const b0 = pending[0];
          const b1 = pending[1];
          const fin = (b0 & 0x80) !== 0;
          const opcode = b0 & 0x0f;
          const masked = (b1 & 0x80) !== 0;
          let length = b1 & 0x7f;
          let offset = 2;
          if (length === 126) {
            if (pending.length < offset + 2) return;
            length = pending.readUInt16BE(offset);
            offset += 2;
          } else if (length === 127) {
            if (pending.length < offset + 8) return;
            const raw = pending.readBigUInt64BE(offset);
            if (raw > BigInt(MAX_PAYLOAD_BYTES)) {
              destroy();
              return;
            }
            length = Number(raw);
            offset += 8;
          }
          if (length > MAX_PAYLOAD_BYTES) {
            destroy();
            return;
          }
          let mask: Buffer | undefined;
          if (masked) {
            if (pending.length < offset + 4) return;
            mask = pending.subarray(offset, offset + 4);
            offset += 4;
          }
          if (pending.length < offset + length) return;
          const raw = pending.subarray(offset, offset + length);
          const payload = mask === undefined ? Buffer.from(raw) : unmask(raw, mask);
          pending = Buffer.from(pending.subarray(offset + length));

          if (opcode === OP_CLOSE) {
            session.close();
            destroy();
            return;
          }
          if (opcode === OP_PING) {
            if (!closed) {
              try {
                socket.write(encodeFrame(OP_PONG, payload));
              } catch {
                destroy();
              }
            }
            continue;
          }
          if (opcode === OP_PONG) {
            lastSeenAt = Date.now();
            continue;
          }
          if (opcode === OP_CONTINUATION) {
            fragments.push(payload);
            if (fin) {
              const merged = Buffer.concat(fragments);
              fragments = [];
              deliver(fragmentOpcode, merged);
            }
            continue;
          }
          // 起始帧（文本 / 二进制）
          if (fin) {
            deliver(opcode, payload);
          } else {
            fragmentOpcode = opcode;
            fragments = [payload];
          }
        }
      }

      socket.on("data", (chunk: Buffer) => {
        lastSeenAt = Date.now();
        pending = pending.length === 0 ? Buffer.from(chunk) : Buffer.concat([pending, chunk]);
        try {
          parse();
        } catch {
          destroy();
        }
      });
      socket.on("error", () => destroy());
      socket.on("close", () => finish());
      socket.on("end", () => destroy());

      if (heartbeatMs > 0) {
        heartbeat = setInterval(() => {
          if (closed) return;
          // 三次心跳周期内毫无动静（含 pong）即认为对端已失联。
          if (Date.now() - lastSeenAt > heartbeatMs * 3) {
            destroy();
            return;
          }
          try {
            socket.write(encodeFrame(OP_PING, EMPTY_PAYLOAD));
          } catch {
            destroy();
          }
        }, heartbeatMs);
        // 心跳定时器不能拖住进程退出
        heartbeat.unref?.();
      }

      // upgrade 时可能已经捎带了首帧数据（head），先喂给解析器。
      if (head !== undefined && head.length > 0) {
        pending = Buffer.from(head);
        try {
          parse();
        } catch {
          destroy();
        }
      }

      try {
        void Promise.resolve(options.onOpen(session)).catch(() => destroy());
      } catch {
        destroy();
      }
    },
  };
}
