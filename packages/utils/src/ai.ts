import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";

import { commands as authCommands } from "@hypr/plugin-auth";
import { commands as connectorCommands } from "@hypr/plugin-connector";

const getModel = async (model: string) => {
  const apiBase = await connectorCommands.getApiBase("auto-llm");
  const apiKey = await authCommands.getFromVault("remote-server");

  if (!apiBase) {
    throw new Error("no_api_base");
  }

  const openai = createOpenAI({
    baseURL: apiBase,
    apiKey: apiKey ?? undefined,
    fetch,
  });

  return openai(model, { structuredOutputs: true });
};

export const modelProvider = async () => {
  const any = await getModel("gpt-4");

  return customProvider({
    languageModels: { any },
  });
};
