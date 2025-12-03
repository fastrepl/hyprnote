import { createAssemblyAIProxy } from "./assemblyai";
import { WsProxyConnection } from "./connection";
import { createDeepgramProxy } from "./deepgram";
import { createSonioxProxy } from "./soniox";

export { WsProxyConnection, type WsProxyOptions } from "./connection";
export { normalizeWsData, type WsPayload } from "./utils";
export { buildDeepgramUrl, createDeepgramProxy } from "./deepgram";
export { buildAssemblyAIUrl, createAssemblyAIProxy } from "./assemblyai";
export { buildSonioxUrl, createSonioxProxy } from "./soniox";

export const UPSTREAM_URL_HEADER = "x-owh-upstream-url";
export const UPSTREAM_AUTH_HEADER = "x-owh-upstream-auth";

export type SttProvider = "deepgram" | "assemblyai" | "soniox";

export function createProxyFromRequest(
  incomingUrl: URL,
  reqHeaders: Headers,
): WsProxyConnection {
  const upstreamOverride = reqHeaders.get(UPSTREAM_URL_HEADER);
  const rawAuth = reqHeaders.get(UPSTREAM_AUTH_HEADER);

  if (upstreamOverride) {
    const url = new URL(upstreamOverride);
    const headers =
      rawAuth && rawAuth.length > 0 ? { Authorization: rawAuth } : undefined;

    return new WsProxyConnection(url.toString(), {
      headers,
    });
  }

  const provider =
    (incomingUrl.searchParams.get("provider") as SttProvider) || "deepgram";

  switch (provider) {
    case "assemblyai":
      return createAssemblyAIProxy(incomingUrl);
    case "soniox":
      return createSonioxProxy();
    case "deepgram":
    default:
      return createDeepgramProxy(incomingUrl);
  }
}
