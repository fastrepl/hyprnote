import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";

import { commands as authCommands } from "@hypr/plugin-auth";
import { commands as connectorCommands } from "@hypr/plugin-connector";

import { fetch as customFetch } from "@hypr/utils";

const getModel = async (model: string) => {
  const apiBase = await connectorCommands.getApiBase("auto-llm");
  const apiKey = apiBase?.includes("localhost") || apiBase?.includes("127.0.0.1")
    ? undefined
    : await authCommands.getFromVault("remote-server");

  if (!apiBase) {
    throw new Error("no_api_base");
  }

  const openai = createOpenAI({
    baseURL: apiBase,
    apiKey: apiKey ?? "SOMETHING_NON_EMPTY",
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
