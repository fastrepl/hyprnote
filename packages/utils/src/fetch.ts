import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

import { commands as sseCommands } from "@hypr/plugin-sse";

export const fetch = (
  input: Parameters<typeof globalThis.fetch>[0],
  init?: Parameters<typeof globalThis.fetch>[1],
) => {
  if (!isTauri()) {
    return globalThis.fetch(input, init);
  }

  const headers = init?.headers instanceof Headers ? Array.from(init.headers.entries()) : [];

  const isSSE = headers.some(
    ([key, value]) =>
      key.toLowerCase() === "accept"
      && value.toLowerCase() === "text/event-stream",
  );

  const f = isSSE ? sseCommands.fetch : tauriFetch;
  return f(input, init);
};
