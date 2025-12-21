import * as Sentry from "@sentry/bun";
import type { Handler } from "hono";
import { upgradeWebSocket } from "hono/bun";

import { env } from "./env";
import type { AppBindings } from "./hono-bindings";
import {
  createProxyFromRequest,
  normalizeWsData,
  WsProxyConnection,
} from "./stt";

function createAiServiceProxy(
  clientUrl: URL,
  reqHeaders: Headers,
): WsProxyConnection {
  const aiServiceUrl = new URL("/stt/listen", env.AI_SERVICE_URL!);
  aiServiceUrl.search = clientUrl.search;

  const authHeader = reqHeaders.get("authorization");
  const headers = authHeader ? { Authorization: authHeader } : undefined;

  return new WsProxyConnection(aiServiceUrl.toString(), { headers });
}

export const listenSocketHandler: Handler<AppBindings> = async (c, next) => {
  const emit = c.get("emit");
  const userId = c.get("supabaseUserId");

  const clientUrl = new URL(c.req.url, "http://localhost");
  const provider = clientUrl.searchParams.get("provider") ?? "deepgram";

  let connection: WsProxyConnection;
  try {
    if (env.AI_SERVICE_URL) {
      connection = createAiServiceProxy(clientUrl, c.req.raw.headers);
    } else {
      connection = createProxyFromRequest(clientUrl, c.req.raw.headers);
    }
    await connection.preconnectUpstream();
    emit({ type: "stt.websocket.connected", userId, provider });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "upstream_connect_failed";
    console.error("[listen] preconnect failed:", {
      provider,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    Sentry.captureException(error, {
      tags: {
        operation: "stt_preconnect",
        provider,
      },
      extra: {
        errorMessage,
        userId,
      },
    });
    emit({
      type: "stt.websocket.error",
      userId,
      provider,
      error:
        error instanceof Error ? error : new Error("upstream_connect_failed"),
    });
    const status = errorMessage === "upstream_connect_timeout" ? 504 : 502;
    return c.json(
      { error: "upstream_connect_failed", detail: errorMessage },
      status,
    );
  }

  const connectionStartTime = performance.now();

  const handler = upgradeWebSocket(() => {
    return {
      onOpen(_event, ws) {
        connection.initializeUpstream(ws.raw);
      },
      async onMessage(event) {
        const payload = await normalizeWsData(event.data);
        if (!payload) {
          return;
        }
        await connection.sendToUpstream(payload);
      },
      onClose(event) {
        const code = event?.code ?? 1000;
        const reason = event?.reason || "client_closed";
        connection.closeConnections(code, reason);
        emit({
          type: "stt.websocket.disconnected",
          userId,
          provider,
          durationMs: performance.now() - connectionStartTime,
        });
      },
      onError(event) {
        emit({
          type: "stt.websocket.error",
          userId,
          provider,
          error:
            event instanceof Error
              ? event
              : new Error("websocket_client_error"),
        });
        connection.closeConnections(1011, "client_error");
      },
    };
  });

  const response = await handler(c, next);
  if (!response) {
    connection.closeConnections();
    return c.json({ error: "upgrade_failed" }, 400);
  }
  return response;
};
