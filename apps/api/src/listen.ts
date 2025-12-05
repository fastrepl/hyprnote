import * as Sentry from "@sentry/bun";
import type { Handler } from "hono";
import { upgradeWebSocket } from "hono/bun";

import { Metrics } from "./sentry/metrics";
import {
  createProxyFromRequest,
  normalizeWsData,
  WsProxyConnection,
} from "./stt";

export const listenSocketHandler: Handler = async (c, next) => {
  const clientUrl = new URL(c.req.url, "http://localhost");
  const provider = clientUrl.searchParams.get("provider") ?? "deepgram";

  const sentryTrace = c.req.header("sentry-trace");
  const baggage = c.req.header("baggage");

  return Sentry.continueTrace({ sentryTrace, baggage }, () => {
    return Sentry.startSpan(
      { name: `WebSocket /listen ${provider}`, op: "websocket.server" },
      async () => {
        let connection: WsProxyConnection;
        try {
          connection = createProxyFromRequest(clientUrl, c.req.raw.headers);
          await connection.preconnectUpstream();
          Metrics.websocketConnected(provider);
        } catch (error) {
          Sentry.addBreadcrumb({
            category: "websocket",
            message: "Upstream connection failed",
            level: "error",
            data: { provider, error: String(error) },
          });
          Sentry.captureException(error, {
            tags: { provider, operation: "upstream_connect" },
          });
          const detail =
            error instanceof Error ? error.message : "upstream_connect_failed";
          const status = detail === "upstream_connect_timeout" ? 504 : 502;
          return c.json({ error: "upstream_connect_failed", detail }, status);
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
              Metrics.websocketDisconnected(
                provider,
                performance.now() - connectionStartTime,
              );
            },
            onError(event) {
              Sentry.addBreadcrumb({
                category: "websocket",
                message: "Client WebSocket error",
                level: "error",
                data: { provider },
              });
              Sentry.captureException(
                event instanceof Error
                  ? event
                  : new Error("websocket_client_error"),
                { tags: { provider, operation: "websocket" } },
              );
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
