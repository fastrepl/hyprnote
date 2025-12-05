import { env } from "../../env";
import { WsProxyConnection } from "../connection";

const CONTROL_MESSAGE_TYPES = new Set(["KeepAlive", "CloseStream", "Finalize"]);

export const buildDeepgramUrl = (incomingUrl: URL) => {
  const target = new URL("wss://api.deepgram.com/v1/listen");

  incomingUrl.searchParams.forEach((value, key) => {
    if (key !== "provider") {
      target.searchParams.set(key, value);
    }
  });
  target.searchParams.set("model", "nova-3-general");
  target.searchParams.set("mip_opt_out", "false");

  return target;
};

export const createDeepgramProxy = (incomingUrl: URL): WsProxyConnection => {
  const target = buildDeepgramUrl(incomingUrl);
  return new WsProxyConnection(target.toString(), {
    headers: {
      Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
    },
    controlMessageTypes: CONTROL_MESSAGE_TYPES,
  });
};
