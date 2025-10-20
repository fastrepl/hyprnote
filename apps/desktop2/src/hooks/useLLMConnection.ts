import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { useMemo } from "react";

import { type ProviderId, PROVIDERS } from "../components/settings/ai/llm/shared";
import * as internal from "../store/tinybase/internal";

const useLLMConnection = (): {
  providerId: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
} | null => {
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

    const baseUrl = providerConfig?.base_url?.trim() || providerDefinition?.baseUrl.value || "";
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
  }, [current_llm_provider, current_llm_model, providerConfig]);
};

export const useLanguageModel = (): LanguageModel | null => {
  const connection = useLLMConnection();

  return useMemo(() => {
    if (!connection) {
      return null;
    }

    if (connection.providerId === "anthropic") {
      const anthropicProvider = createAnthropic({
        apiKey: connection.apiKey,
      });

      return anthropicProvider(connection.modelId);
    }

    const openAICompatibleProvider = createOpenAICompatible({
      name: connection.providerId,
      baseURL: connection.baseUrl,
      apiKey: connection.apiKey,
    });

    return openAICompatibleProvider.chatModel(connection.modelId);
  }, [connection]);
};
