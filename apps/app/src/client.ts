const BASE = "/api/web";

import type {
  ConnectInput,
  ConnectOutput,
  NangoConnectSessionRequest,
  NangoConnectSessionResponse,
} from "./types";

export const connect = async (input: ConnectInput): Promise<ConnectOutput> => {
  return fetch(`${BASE}/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => res.json());
};

export const createNangoSession = async (
  input: NangoConnectSessionRequest,
): Promise<NangoConnectSessionResponse> => {
  return fetch(`${BASE}/integration/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => res.json());
};
