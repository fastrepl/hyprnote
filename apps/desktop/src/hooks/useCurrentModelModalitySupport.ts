import { useMemo } from "react";

import { useAuth } from "../auth";
import {
  type ProviderId,
  PROVIDERS,
} from "../components/settings/ai/llm/shared";
import { listAnthropicModels } from "../components/settings/ai/shared/list-anthropic";
import type { InputModality } from "../components/settings/ai/shared/list-common";
import { listGoogleModels } from "../components/settings/ai/shared/list-google";
import { listLMStudioModels } from "../components/settings/ai/shared/list-lmstudio";
import { listOllamaModels } from "../components/settings/ai/shared/list-ollama";
import {
  listGenericModels,
  listOpenAIModels,
} from "../components/settings/ai/shared/list-openai";
import { listOpenRouterModels } from "../components/settings/ai/shared/list-openrouter";
import * as main from "../store/tinybase/main";
import { useModelMetadata } from "./useModelMetadata";

export function useCurrentModelModalitySupport(): InputModality[] | null {
  const auth = useAuth();
  const { current_llm_provider, current_llm_model } = main.UI.useValues(
    main.STORE_ID,
  );
  const providerConfig = main.UI.useRow(
    "ai_providers",
    current_llm_provider ?? "",
    main.STORE_ID,
  ) as main.AIProviderStorage | undefined;

  const providerId = current_llm_provider as ProviderId | null;
  const providerDef = PROVIDERS.find((provider) => provider.id === providerId);

  const listModels = useMemo(() => {
    if (!providerId || !current_llm_model) {
      return undefined;
    }

    if (providerId === "hyprnote") {
      if (!auth?.session) {
        return undefined;
      }
      return async () => ({
        models: ["Auto"],
        ignored: [],
        metadata: {
          Auto: {
            input_modalities: ["text", "image"] as InputModality[],
          },
        },
      });
    }

    const baseUrl =
      providerConfig?.base_url?.trim() || providerDef?.baseUrl?.trim() || "";
    const apiKey = providerConfig?.api_key?.trim() || "";

    if (!baseUrl || (providerDef?.apiKey && !apiKey)) {
      return undefined;
    }

    return getFetcher(providerId, baseUrl, apiKey);
  }, [
    providerId,
    current_llm_model,
    auth?.session,
    providerConfig?.base_url,
    providerConfig?.api_key,
    providerDef,
  ]);

  const { data } = useModelMetadata(providerId, listModels);

  if (!current_llm_model || !data) {
    return null;
  }

  return data.metadata?.[current_llm_model]?.input_modalities ?? null;
}

function getFetcher(providerId: ProviderId, baseUrl: string, apiKey: string) {
  switch (providerId) {
    case "openai":
      return () => listOpenAIModels(baseUrl, apiKey);
    case "anthropic":
      return () => listAnthropicModels(baseUrl, apiKey);
    case "openrouter":
      return () => listOpenRouterModels(baseUrl, apiKey);
    case "google_generative_ai":
      return () => listGoogleModels(baseUrl, apiKey);
    case "ollama":
      return () => listOllamaModels(baseUrl, apiKey);
    case "lmstudio":
      return () => listLMStudioModels(baseUrl, apiKey);
    case "custom":
      return () => listGenericModels(baseUrl, apiKey);
    default:
      return () => listGenericModels(baseUrl, apiKey);
  }
}
