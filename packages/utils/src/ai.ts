import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { getLicenseKey } from "tauri-plugin-keygen-api";

import { commands as connectorCommands } from "@hypr/plugin-connector";
import { fetch as customFetch } from "@hypr/utils";

export { useChat } from "@ai-sdk/react";

export {
  type ChatRequestOptions,
  type ChatTransport,
  convertToModelMessages,
  dynamicTool,
  experimental_createMCPClient,
  generateObject,
  generateText,
  jsonSchema,
  type LanguageModel,
  type Provider,
  smoothStream,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

export const localProviderName = "hypr-llm-local";
export const remoteProviderName = "hypr-llm-remote";

const thinkingMiddleware = extractReasoningMiddleware({
  tagName: "thinking",
  separator: "\n",
  startWithReasoning: false,
});

const thinkMiddleware = extractReasoningMiddleware({
  tagName: "think",
  separator: "\n",
  startWithReasoning: false,
});

const getModel = async ({ onboarding }: { onboarding: boolean }) => {
  const getter = onboarding ? connectorCommands.getLocalLlmConnection : connectorCommands.getLlmConnection;
  const { type, connection: { api_base, api_key } } = await getter();

  const ourCloud = api_base.includes("pro.hyprnote.com");
  const licenseKey = await getLicenseKey();

  if (!api_base) {
    throw new Error("no_api_base");
  }

  const openai = createOpenAICompatible({
    name: type === "HyprLocal" ? localProviderName : remoteProviderName,
    baseURL: api_base,
    apiKey: api_key ?? "SOMETHING_NON_EMPTY",
    fetch: customFetch,
    headers: {
      "origin": "http://localhost:1420",
      ...((ourCloud && licenseKey) ? { "x-hyprnote-license-key": licenseKey } : {}),
    },
  });

  const customModel = await connectorCommands.getCustomLlmModel();
  const id = onboarding
    ? "mock-onboarding"
    : (type === "Custom" && customModel)
    ? customModel
    : "gpt-4";

  return wrapLanguageModel({
    model: openai(id),
    middleware: [thinkingMiddleware, thinkMiddleware],
  });
};

export const modelProvider = async () => {
  const defaultModel = await getModel({ onboarding: false });
  const onboardingModel = await getModel({ onboarding: true });

  return customProvider({
    languageModels: { defaultModel, onboardingModel },
  });
};
