import { env } from "../../env";
import { WsProxyConnection } from "../connection";

const CONTROL_MESSAGE_TYPES = new Set(["Terminate"]);

export const buildAssemblyAIUrl = (incomingUrl: URL) => {
  const target = new URL("wss://streaming.assemblyai.com/v3/ws");

  incomingUrl.searchParams.forEach((value, key) => {
    if (key !== "provider") {
      target.searchParams.set(key, value);
    }
  });

  return target;
};

export const createAssemblyAIProxy = (incomingUrl: URL): WsProxyConnection => {
  const apiKey = env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error("ASSEMBLYAI_API_KEY not configured");
  }

  const target = buildAssemblyAIUrl(incomingUrl);
  return new WsProxyConnection(target.toString(), {
    headers: {
      authorization: apiKey,
    },
    controlMessageTypes: CONTROL_MESSAGE_TYPES,
  });
};
