import type { ServerWebSocket, WebSocketOptions } from "bun";

import { env } from "./env";

const DEFAULT_CLOSE_CODE = 1011;
const UPSTREAM_ERROR_TIMEOUT = 1000;
const MAX_PENDING_QUEUE_BYTES = 5 * 1024 * 1024; // 5 MiB
const TEXT_ENCODER = new TextEncoder();
type QueuedPayload = { payload: WsPayload; size: number };

// https://developers.deepgram.com/docs/lower-level-websockets
export class DeepgramProxyConnection {
  private upstream?: InstanceType<typeof WebSocket>;
  private upstreamReady = false;
  private shuttingDown = false;
  private clientSocket: ServerWebSocket<unknown> | null = null;
  private pendingMessages: QueuedPayload[] = [];
  private pendingBytes = 0;
  private upstreamErrorTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private deepgramUrl: string) {}

  private clearErrorTimeout() {
    if (this.upstreamErrorTimeout) {
      clearTimeout(this.upstreamErrorTimeout);
      this.upstreamErrorTimeout = null;
    }
  }

  private scheduleErrorTimeout() {
    this.clearErrorTimeout();
    this.upstreamErrorTimeout = setTimeout(() => {
      this.upstreamErrorTimeout = null;
      if (!this.shuttingDown) {
        this.closeConnections(DEFAULT_CLOSE_CODE, "upstream_error");
      }
    }, UPSTREAM_ERROR_TIMEOUT);
  }

  private normalizeCloseCode(code: number): number {
    return code === 1005 || code === 1006 || code === 1015 || code >= 5000
      ? DEFAULT_CLOSE_CODE
      : code;
  }

  closeConnections(code = DEFAULT_CLOSE_CODE, reason = "connection_closed") {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    this.clearErrorTimeout();

    if (
      this.clientSocket &&
      this.clientSocket.readyState !== WebSocket.CLOSED
    ) {
      try {
        const validCode = this.normalizeCloseCode(code);
        this.clientSocket.close(validCode, reason);
      } catch (error) {
        console.error(error);
      }
    }

    if (
      this.upstream &&
      this.upstream.readyState !== WebSocket.CLOSED &&
      this.upstream.readyState !== WebSocket.CLOSING
    ) {
      try {
        this.upstream.close(code, reason);
      } catch (error) {
        console.error(error);
      }
    }

    this.pendingMessages.length = 0;
    this.pendingBytes = 0;
    this.clientSocket = null;
    this.upstream = undefined;
  }

  private flushPendingMessages() {
    if (
      !this.upstream ||
      !this.upstreamReady ||
      this.pendingMessages.length === 0
    ) {
      return;
    }

    while (this.pendingMessages.length > 0) {
      const queued = this.pendingMessages.shift();
      if (!queued) {
        continue;
      }
      this.pendingBytes = Math.max(0, this.pendingBytes - queued.size);

      try {
        this.upstream.send(queued.payload);
      } catch (error) {
        console.error(error);
        this.closeConnections(DEFAULT_CLOSE_CODE, "upstream_send_failed");
        break;
      }
    }
  }

  private setupUpstreamHandlers() {
    if (!this.upstream) {
      return;
    }

    this.upstream.addEventListener("open", () => {
      this.upstreamReady = true;
      this.flushPendingMessages();
    });

    this.upstream.addEventListener("message", async (event) => {
      if (
        !this.clientSocket ||
        this.clientSocket.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      try {
        this.clientSocket.send(event.data);
      } catch (error) {
        console.error(error);
        this.closeConnections(DEFAULT_CLOSE_CODE, "downstream_send_failed");
      }
    });

    this.upstream.addEventListener("close", (event) => {
      this.clearErrorTimeout();
      this.closeConnections(
        event.code || DEFAULT_CLOSE_CODE,
        event.reason || "upstream_closed",
      );
    });

    this.upstream.addEventListener("error", (error) => {
      console.error(error);
      this.scheduleErrorTimeout();
    });
  }

  initializeUpstream(clientWs: ServerWebSocket<unknown>) {
    this.clientSocket = clientWs;

    const wsOptions: WebSocketOptions = {
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
      },
    };

    this.upstream = new (globalThis.WebSocket as {
      new (
        url: string | URL,
        options?: WebSocketOptions,
      ): InstanceType<typeof WebSocket>;
    })(this.deepgramUrl, wsOptions);

    this.upstream.binaryType = "arraybuffer";
    this.setupUpstreamHandlers();
  }

  async sendToUpstream(payload: WsPayload) {
    if (!this.upstream) {
      if (this.clientSocket) {
        this.closeConnections(DEFAULT_CLOSE_CODE, "upstream_unavailable");
      }
      return;
    }

    const isControlPayload = payloadIsControlMessage(payload);

    if (!this.upstreamReady) {
      this.enqueuePendingPayload(payload, isControlPayload);
      return;
    }

    try {
      this.upstream.send(payload);
    } catch (error) {
      console.error(error);
      this.closeConnections(DEFAULT_CLOSE_CODE, "upstream_send_failed");
    }
  }

  private enqueuePendingPayload(payload: WsPayload, priority = false) {
    const size = getPayloadSize(payload);
    if (size > MAX_PENDING_QUEUE_BYTES) {
      console.warn("payload exceeded queue budget");
      this.closeConnections(DEFAULT_CLOSE_CODE, "payload_too_large");
      return false;
    }

    if (this.pendingBytes + size > MAX_PENDING_QUEUE_BYTES) {
      console.warn("pending queue budget exceeded");
      this.closeConnections(DEFAULT_CLOSE_CODE, "backpressure_limit");
      return false;
    }

    if (priority) {
      this.pendingMessages.unshift({ payload, size });
    } else {
      this.pendingMessages.push({ payload, size });
    }
    this.pendingBytes += size;
    return true;
  }
}

export const buildDeepgramUrl = (incomingUrl: URL) => {
  const target = new URL("wss://api.deepgram.com/v1/listen");

  incomingUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });
  target.searchParams.set("mip_opt_out", "false");

  return target;
};

export type WsPayload = string | Uint8Array;

// https://bun.com/docs/runtime/http/websockets
export const normalizeWsData = async (
  data: unknown,
): Promise<WsPayload | null> => {
  if (typeof data === "string") {
    return data;
  }

  if (data instanceof Uint8Array) {
    return cloneBinaryPayload(data);
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (ArrayBuffer.isView(data)) {
    return cloneBinaryPayload(data);
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    const arrayBuffer = await data.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  return null;
};

const cloneBinaryPayload = (input: ArrayBuffer | ArrayBufferView) => {
  const view =
    input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy;
};

const getPayloadSize = (payload: WsPayload) => {
  if (typeof payload === "string") {
    return TEXT_ENCODER.encode(payload).byteLength;
  }
  return payload.byteLength;
};

const CONTROL_MESSAGE_TYPES = new Set(["KeepAlive", "CloseStream", "Finalize"]);
const payloadIsControlMessage = (payload: WsPayload) => {
  if (typeof payload !== "string") {
    return false;
  }

  try {
    const parsed = JSON.parse(payload);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      CONTROL_MESSAGE_TYPES.has(parsed.type)
    ) {
      return true;
    }
  } catch {
    // ignore parse errors
  }

  return false;
};
