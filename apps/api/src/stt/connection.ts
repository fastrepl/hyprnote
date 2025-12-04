import type { ServerWebSocket, WebSocketOptions } from "bun";

import {
  getPayloadSize,
  normalizeWsData,
  payloadIsControlMessage,
  type WsPayload,
} from "./utils";

const DEFAULT_CLOSE_CODE = 1011;
const UPSTREAM_ERROR_TIMEOUT = 1000;
const UPSTREAM_CONNECT_TIMEOUT = 5000;
const MAX_PENDING_QUEUE_BYTES = 5 * 1024 * 1024; // 5 MiB

type QueuedPayload = { payload: WsPayload; size: number };

export type WsProxyOptions = {
  headers?: Record<string, string>;
  controlMessageTypes?: ReadonlySet<string>;
  transformFirstMessage?: (payload: WsPayload) => WsPayload;
};

const DEFAULT_CONTROL_MESSAGE_TYPES = new Set<string>();

export class WsProxyConnection {
  private upstream?: InstanceType<typeof WebSocket>;
  private upstreamReady = false;
  private shuttingDown = false;
  private clientSocket: ServerWebSocket<unknown> | null = null;
  private pendingControlMessages: QueuedPayload[] = [];
  private pendingDataMessages: QueuedPayload[] = [];
  private pendingDownstreamMessages: WsPayload[] = [];
  private pendingBytes = 0;
  private upstreamErrorTimeout: ReturnType<typeof setTimeout> | null = null;
  private upstreamReadyPromise: Promise<void> | null = null;
  private upstreamReadyResolve: (() => void) | null = null;
  private upstreamReadyReject: ((error: Error) => void) | null = null;

  private readonly headers?: Record<string, string>;
  private readonly controlMessageTypes: ReadonlySet<string>;
  private readonly transformFirstMessage?: (payload: WsPayload) => WsPayload;
  private hasTransformedFirst = false;

  constructor(
    private upstreamUrl: string,
    options: WsProxyOptions = {},
  ) {
    this.headers = options.headers;
    this.controlMessageTypes =
      options.controlMessageTypes ?? DEFAULT_CONTROL_MESSAGE_TYPES;
    this.transformFirstMessage = options.transformFirstMessage;
  }

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

  private resolveUpstreamReadyWaiters() {
    if (this.upstreamReadyResolve) {
      this.upstreamReadyResolve();
    }
    this.upstreamReadyResolve = null;
    this.upstreamReadyReject = null;
    this.upstreamReadyPromise = null;
  }

  private rejectUpstreamReadyWaiters(error: Error) {
    if (this.upstreamReadyReject) {
      this.upstreamReadyReject(error);
    }
    this.upstreamReadyResolve = null;
    this.upstreamReadyReject = null;
    this.upstreamReadyPromise = null;
  }

  private waitForUpstreamReady() {
    if (this.upstreamReady) {
      return Promise.resolve();
    }
    if (!this.upstreamReadyPromise) {
      this.upstreamReadyPromise = new Promise<void>((resolve, reject) => {
        this.upstreamReadyResolve = resolve;
        this.upstreamReadyReject = reject;
      });
    }
    return this.upstreamReadyPromise;
  }

  private ensureUpstreamSocket() {
    if (this.upstream) {
      return;
    }

    const wsOptions: WebSocketOptions =
      this.headers && Object.keys(this.headers).length > 0
        ? { headers: this.headers }
        : {};

    this.upstream = new (globalThis.WebSocket as {
      new (
        url: string | URL,
        options?: WebSocketOptions,
      ): InstanceType<typeof WebSocket>;
    })(this.upstreamUrl, wsOptions);

    this.upstream.binaryType = "arraybuffer";
    this.setupUpstreamHandlers();
  }

  private normalizeCloseCode(code: number): number {
    return code === 1005 || code === 1006 || code === 1015 || code >= 5000
      ? DEFAULT_CLOSE_CODE
      : code;
  }

  private safeCloseSocket(
    socket: { close: (code?: number, reason?: string) => void },
    code: number,
    reason: string,
  ) {
    try {
      socket.close(code, reason);
    } catch (error) {
      console.error(error);
    }
  }

  closeConnections(code = DEFAULT_CLOSE_CODE, reason = "connection_closed") {
    if (this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    this.clearErrorTimeout();
    const validCode = this.normalizeCloseCode(code);
    if (!this.upstreamReady) {
      this.rejectUpstreamReadyWaiters(new Error(reason));
    } else {
      this.resolveUpstreamReadyWaiters();
    }

    if (
      this.clientSocket &&
      this.clientSocket.readyState !== WebSocket.CLOSED
    ) {
      try {
        this.safeCloseSocket(this.clientSocket, validCode, reason);
      } catch (error) {
        console.error(error);
      }
    }

    if (
      this.upstream &&
      this.upstream.readyState !== WebSocket.CLOSED &&
      this.upstream.readyState !== WebSocket.CLOSING
    ) {
      this.safeCloseSocket(this.upstream, validCode, reason);
    }

    this.pendingControlMessages.length = 0;
    this.pendingDataMessages.length = 0;
    this.pendingDownstreamMessages.length = 0;
    this.pendingBytes = 0;
    this.clientSocket = null;
    this.upstream = undefined;
    this.upstreamReady = false;
    this.upstreamReadyPromise = null;
    this.upstreamReadyResolve = null;
    this.upstreamReadyReject = null;
  }

  private flushPendingMessages() {
    if (
      !this.upstream ||
      !this.upstreamReady ||
      (this.pendingControlMessages.length === 0 &&
        this.pendingDataMessages.length === 0)
    ) {
      return;
    }

    while (
      this.pendingControlMessages.length > 0 ||
      this.pendingDataMessages.length > 0
    ) {
      const queued =
        this.pendingControlMessages.shift() ?? this.pendingDataMessages.shift();
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

  private flushDownstreamMessages() {
    if (
      !this.clientSocket ||
      this.clientSocket.readyState !== WebSocket.OPEN ||
      this.pendingDownstreamMessages.length === 0
    ) {
      return;
    }

    while (this.pendingDownstreamMessages.length > 0) {
      const payload = this.pendingDownstreamMessages.shift();
      if (!payload) {
        continue;
      }
      this.forwardDownstreamPayload(payload);
      if (this.shuttingDown) {
        break;
      }
    }
  }

  private forwardDownstreamPayload(payload: WsPayload) {
    if (!this.clientSocket || this.clientSocket.readyState !== WebSocket.OPEN) {
      this.pendingDownstreamMessages.push(payload);
      return;
    }

    try {
      const sendResult = this.clientSocket.send(payload);
      if (!sendResult) {
        console.warn("downstream send backpressure detected");
        this.closeConnections(DEFAULT_CLOSE_CODE, "downstream_backpressure");
      }
    } catch (error) {
      console.error(error);
      this.closeConnections(DEFAULT_CLOSE_CODE, "downstream_send_failed");
    }
  }

  private setupUpstreamHandlers() {
    if (!this.upstream) {
      return;
    }

    this.upstream.addEventListener("open", () => {
      this.upstreamReady = true;
      this.resolveUpstreamReadyWaiters();
      this.flushPendingMessages();
      this.flushDownstreamMessages();
    });

    this.upstream.addEventListener("message", async (event) => {
      const payload = await normalizeWsData(event.data);
      if (!payload) {
        return;
      }
      this.forwardDownstreamPayload(payload);
    });

    this.upstream.addEventListener("close", (event) => {
      this.clearErrorTimeout();
      if (!this.upstreamReady) {
        this.rejectUpstreamReadyWaiters(
          new Error(
            event.reason ||
              `upstream_closed_${event.code || DEFAULT_CLOSE_CODE}`,
          ),
        );
      }
      this.closeConnections(
        event.code || DEFAULT_CLOSE_CODE,
        event.reason || "upstream_closed",
      );
    });

    this.upstream.addEventListener("error", (error) => {
      console.error(error);
      if (!this.upstreamReady) {
        this.rejectUpstreamReadyWaiters(
          error instanceof Error ? error : new Error("upstream_error"),
        );
      }
      this.scheduleErrorTimeout();
    });
  }

  async preconnectUpstream(timeoutMs = UPSTREAM_CONNECT_TIMEOUT) {
    this.ensureUpstreamSocket();
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise =
      timeoutMs > 0
        ? new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
              timeoutHandle = null;
              reject(new Error("upstream_connect_timeout"));
            }, timeoutMs);
          })
        : null;

    try {
      if (timeoutPromise) {
        await Promise.race([this.waitForUpstreamReady(), timeoutPromise]);
      } else {
        await this.waitForUpstreamReady();
      }
    } catch (error) {
      this.closeConnections(DEFAULT_CLOSE_CODE, "upstream_connect_failed");
      throw error;
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  initializeUpstream(clientWs: ServerWebSocket<unknown>) {
    this.clientSocket = clientWs;
    this.ensureUpstreamSocket();
    if (this.upstreamReady) {
      this.flushPendingMessages();
      this.flushDownstreamMessages();
    }
  }

  async sendToUpstream(payload: WsPayload) {
    if (!this.upstream) {
      if (this.clientSocket) {
        this.closeConnections(DEFAULT_CLOSE_CODE, "upstream_unavailable");
      }
      return;
    }

    let finalPayload = payload;
    if (!this.hasTransformedFirst && this.transformFirstMessage) {
      finalPayload = this.transformFirstMessage(payload);
      this.hasTransformedFirst = true;
    } else if (!this.hasTransformedFirst) {
      this.hasTransformedFirst = true;
    }

    const isControlPayload = payloadIsControlMessage(
      finalPayload,
      this.controlMessageTypes,
    );

    if (!this.upstreamReady) {
      this.enqueuePendingPayload(finalPayload, isControlPayload);
      return;
    }

    try {
      this.upstream.send(finalPayload);
    } catch (error) {
      console.error(error);
      this.closeConnections(DEFAULT_CLOSE_CODE, "upstream_send_failed");
    }
  }

  private enqueuePendingPayload(payload: WsPayload, isControlPayload = false) {
    const size = getPayloadSize(payload);
    if (size > MAX_PENDING_QUEUE_BYTES) {
      console.warn("payload exceeded queue budget");
      this.closeConnections(DEFAULT_CLOSE_CODE, "payload_too_large");
      return;
    }

    if (this.pendingBytes + size > MAX_PENDING_QUEUE_BYTES) {
      console.warn("pending queue budget exceeded");
      this.closeConnections(DEFAULT_CLOSE_CODE, "backpressure_limit");
      return;
    }

    const targetQueue = isControlPayload
      ? this.pendingControlMessages
      : this.pendingDataMessages;
    targetQueue.push({ payload, size });
    this.pendingBytes += size;
  }
}
