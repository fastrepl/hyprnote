import { upgradeWebSocket } from "hono/bun";

import {
  buildDeepgramUrl,
  DeepgramProxyConnection,
  normalizeWsData,
} from "./deepgram";

export const listenSocketHandler = upgradeWebSocket((c) => {
  const clientUrl = new URL(c.req.url, "http://localhost");
  const deepgramUrl = buildDeepgramUrl(clientUrl).toString();

  const connection = new DeepgramProxyConnection(deepgramUrl);

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
    onError(err) {
      connection.closeConnections(1011, "client_error");
    },
  };
});
