import { env } from "../env";
import { WsProxyConnection } from "./connection";

const CONTROL_MESSAGE_TYPES = new Set(["keepalive", "finalize"]);

export const buildSonioxUrl = () => {
  return new URL("wss://stt-rt.soniox.com/transcribe-websocket");
};

export const createSonioxProxy = (): WsProxyConnection => {
  if (!env.SONIOX_API_KEY) {
    throw new Error("SONIOX_API_KEY not configured");
  }

  const target = buildSonioxUrl();
  return new WsProxyConnection(target.toString(), {
    controlMessageTypes: CONTROL_MESSAGE_TYPES,
  });
};
