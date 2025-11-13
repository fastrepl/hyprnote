import { useMemo } from "react";

import { useAuth } from "../../../../auth";
import { useConfigValues } from "../../../../config/use-config";
import * as main from "../../../../store/tinybase/main";
import { Banner } from "../shared";
import { PROVIDERS } from "./shared";

export function BannerForLLM() {
  const { hasModel, message } = useHasLLMModel();

  if (hasModel) {
    return null;
  }

  return <Banner message={message} />;
}

function useHasLLMModel(): { hasModel: boolean; message: string } {
  const auth = useAuth();
  const { current_llm_provider, current_llm_model } = useConfigValues(
    ["current_llm_provider", "current_llm_model"] as const,
  );
  const configuredProviders = main.UI.useResultTable(main.QUERIES.llmProviders, main.STORE_ID);

  const result = useMemo(() => {
    if (!current_llm_provider || !current_llm_model) {
      return { hasModel: false, message: "Please select a provider and model" };
    }

    const providerId = current_llm_provider as string;

    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (!provider) {
      return { hasModel: false, message: "Selected provider not found" };
    }

    if (providerId === "hyprnote") {
      if (!auth?.session) {
        return { hasModel: false, message: "Please sign in to use Hyprnote LLM" };
      }
      return { hasModel: true, message: "" };
    }

    const config = configuredProviders[providerId];
    if (!config || !config.base_url) {
      return { hasModel: false, message: "Provider not configured. Please configure the provider below." };
    }

    if (provider.apiKey && !config.api_key) {
      return { hasModel: false, message: "API key required. Please add your API key below." };
    }

    return { hasModel: true, message: "" };
  }, [current_llm_provider, current_llm_model, configuredProviders, auth]);

  return result;
}
