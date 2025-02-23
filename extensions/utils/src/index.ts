import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { commands } from "@hypr/plugin-sse";
import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";

export * from "ai";

export const fetch = (
  input: Parameters<typeof globalThis.fetch>[0],
  init?: Parameters<typeof globalThis.fetch>[1],
) => {
  // @ts-ignore
  const isTauri = !!window.__TAURI__;

  if (!isTauri) {
    return globalThis.fetch(input, init);
  }

  const headers =
    init?.headers instanceof Headers ? Array.from(init.headers.entries()) : [];

  const isSSE = headers.some(
    ([key, value]) =>
      key.toLowerCase() === "accept" &&
      value.toLowerCase() === "text/event-stream",
  );

  const f = isSSE ? commands.fetch : tauriFetch;
  return f(input, init);
};

const openai = createOpenAI({
  baseURL: "http://localhost:1234/v1",
  apiKey: "NOT_NEEDED",
  fetch,
});

export const modelProvider = customProvider({
  languageModels: {
    any: openai("gpt-4", { structuredOutputs: true }),
  },
});

export interface Extension {
  init: () => Promise<void>;
  modal?: (props: { onClose: () => void }) => React.ReactNode;
  panelTwoByTwo?: (props: {}) => React.ReactNode;
  panelFull?: (props: {}) => React.ReactNode;
}
