import type { Handler } from "hono";
import { upgradeWebSocket } from "hono/bun";

import { createProxyFromRequest, normalizeWsData } from "./deepgram";

export const listenSocketHandler: Handler = async (c, next) => {
  const clientUrl = new URL(c.req.url, "http://localhost");
  const connection = createProxyFromRequest(clientUrl, c.req.raw.headers);
  try {
    await connection.preconnectUpstream();
  } catch (error) {
    console.error("Failed to establish upstream connection", error);
    const detail =
      error instanceof Error ? error.message : "upstream_unavailable";
    const status = detail === "upstream_connect_timeout" ? 504 : 502;
    return c.json({ error: "upstream_unavailable", detail }, status);
  }

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
      },
      onError() {
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
