import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";

import { commands as connectorCommands } from "@hypr/plugin-connector";
import { fetch as customFetch } from "@hypr/utils";

export { generateText, smoothStream, streamText } from "ai";

import { useChat as useChat$1 } from "@ai-sdk/react";

export const useChat = (options: Parameters<typeof useChat$1>[0]) => {
  return useChat$1({
    fetch: customFetch,
    ...options,
  });
};

export const getModel = async (model: string) => {
  const { connection: { api_base, api_key } } = await connectorCommands.getLlmConnection();

  const openai = createOpenAI({
    baseURL: api_base,
    apiKey: api_key ?? "SOMETHING_NON_EMPTY",
    fetch: customFetch,
  });

  return openai(model, { structuredOutputs: true });
};

export const modelProvider = async () => {
  const any = await getModel("gpt-4");

  return customProvider({
    languageModels: { any },
  });
};
