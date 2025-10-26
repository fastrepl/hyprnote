import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { useMemo } from "react";

import { useAuth } from "../auth";
import { type ProviderId, PROVIDERS } from "../components/settings/ai/llm/shared";
import { env } from "../env";
import * as internal from "../store/tinybase/internal";

export const useLanguageModel = (): LanguageModel | null => {
  const connection = useLLMConnection();

  return useMemo(() => {
    if (!connection) {
      return null;
    }

    if (connection.providerId === "hyprnote") {
      const hyprnoteProvider = createOpenAICompatible({
        name: "hyprnote",
        baseURL: connection.baseUrl,
        apiKey: connection.apiKey,
        headers: {
          "Authorization": `Bearer ${connection.apiKey}`,
        },
      });

      return hyprnoteProvider.chatModel(connection.modelId);
    }

    if (connection.providerId === "anthropic") {
      const anthropicProvider = createAnthropic({
        apiKey: connection.apiKey,
      });

      return anthropicProvider(connection.modelId);
    }

    if (connection.providerId === "openrouter") {
      const openRouterProvider = createOpenRouter({
        apiKey: connection.apiKey,
      });

      return openRouterProvider(connection.modelId);
    }

    if (connection.providerId === "openai") {
      const openAIProvider = createOpenAI({
        apiKey: connection.apiKey,
      });

      return openAIProvider(connection.modelId);
    }

    const openAICompatibleProvider = createOpenAICompatible({
      name: connection.providerId,
      baseURL: connection.baseUrl,
      apiKey: connection.apiKey,
    });

    return openAICompatibleProvider.chatModel(connection.modelId);
  }, [connection]);
};

const useLLMConnection = (): {
  providerId: ProviderId;
  modelId: string;
  baseUrl: string;
  apiKey: string;
} | null => {
  const auth = useAuth();

  const { current_llm_provider, current_llm_model } = internal.UI.useValues(internal.STORE_ID);
  const providerConfig = internal.UI.useRow(
    "ai_providers",
    current_llm_provider ?? "",
    internal.STORE_ID,
  ) as internal.AIProviderStorage | undefined;

  return useMemo(() => {
    if (!current_llm_provider || !current_llm_model) {
      return null;
    }

    const providerId = current_llm_provider as ProviderId;
    const providerDefinition = PROVIDERS.find((provider) => provider.id === providerId);

    if (providerId === "hyprnote") {
      if (!auth?.session || !env.VITE_SUPABASE_URL) {
        return null;
      }

      const baseUrl = `${env.VITE_SUPABASE_URL}${providerDefinition?.baseUrl || ""}`;
      const apiKey = auth.session.access_token;

      return {
        providerId,
        modelId: current_llm_model,
        baseUrl,
        apiKey,
      };
    }

    const baseUrl = providerConfig?.base_url?.trim() || providerDefinition?.baseUrl || "";
    const apiKey = providerConfig?.api_key?.trim() || "";

    if (!baseUrl) {
      return null;
    }

    if ((providerDefinition?.apiKey ?? true) && !apiKey) {
      return null;
    }

    return {
      providerId,
      modelId: current_llm_model,
      baseUrl,
      apiKey,
    };
  }, [current_llm_provider, current_llm_model, providerConfig, auth]);
};
