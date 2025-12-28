import * as Sentry from "@sentry/bun";
import type { Handler } from "hono";
import { upgradeWebSocket } from "hono/bun";

import type { AppBindings } from "./hono-bindings";
import {
  createProxyFromRequest,
  normalizeWsData,
  WsProxyConnection,
} from "./stt";

export const listenSocketHandler: Handler<AppBindings> = async (c, next) => {
  const emit = c.get("emit");
  const userId = c.get("supabaseUserId");

  const clientUrl = new URL(c.req.url, "http://localhost");
  const provider = clientUrl.searchParams.get("provider") ?? "deepgram";

  const sentryTrace = c.req.header("sentry-trace");
  const baggage = c.req.header("baggage");

  return Sentry.continueTrace({ sentryTrace, baggage }, () => {
    return Sentry.startSpan(
      { name: `WebSocket /listen ${provider}`, op: "websocket.server" },
      async () => {
        Sentry.addBreadcrumb({
          category: "websocket",
          message: `Starting WebSocket connection for provider: ${provider}`,
          level: "info",
          data: { provider },
        });

        let connection: WsProxyConnection;
        try {
          connection = createProxyFromRequest(clientUrl, c.req.raw.headers);
          await connection.preconnectUpstream();
          emit({ type: "stt.websocket.connected", userId, provider });
          Sentry.addBreadcrumb({
            category: "websocket",
            message: "Upstream STT service connected",
            level: "info",
            data: { provider },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "upstream_connect_failed";
          console.error("[listen] preconnect failed:", {
            provider,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          });
          Sentry.addBreadcrumb({
            category: "websocket",
            message: "Upstream connection failed",
            level: "error",
            data: { provider, error: String(error) },
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
              error instanceof Error
                ? error
                : new Error("upstream_connect_failed"),
          });
          const status =
            errorMessage === "upstream_connect_timeout" ? 504 : 502;
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
              Sentry.addBreadcrumb({
                category: "websocket",
                message: "Client WebSocket opened",
                level: "info",
                data: { provider },
              });
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
              Sentry.addBreadcrumb({
                category: "websocket",
                message: "Client WebSocket closed",
                level: "info",
                data: { provider, code, reason },
              });
              emit({
                type: "stt.websocket.disconnected",
                userId,
                provider,
                durationMs: performance.now() - connectionStartTime,
              });
            },
            onError(event) {
              Sentry.addBreadcrumb({
                category: "websocket",
                message: "Client WebSocket error",
                level: "error",
                data: { provider },
              });
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
      },
    );
  });
};
