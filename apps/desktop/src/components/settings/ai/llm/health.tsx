import { useQuery } from "@tanstack/react-query";
import { generateText } from "ai";
import { useEffect, useMemo } from "react";

import { useAuth } from "../../../../auth";
import { useConfigValues } from "../../../../config/use-config";
import { useLanguageModel } from "../../../../hooks/useLLMConnection";
import * as main from "../../../../store/tinybase/main";
import { AvailabilityHealth, ConnectionHealth } from "../shared/health";
import { PROVIDERS } from "./shared";

export function HealthCheckForConnection() {
  const health = useConnectionHealth();

  const { status, tooltip } = useMemo(() => {
    if (!health) {
      return {
        status: null,
        tooltip: "No local model selected",
      };
    }

    if (health === "pending") {
      return {
        status: "loading",
        tooltip: "Checking LLM connection...",
      };
    }

    if (health === "error") {
      return {
        status: "error",
        tooltip: "LLM connection failed. Please check your configuration.",
      };
    }

    if (health === "success") {
      return {
        status: "success",
        tooltip: "LLM connection ready",
      };
    }

    return {
      status: "error",
      tooltip: "Connection not available",
    };
  }, [health]) satisfies Parameters<typeof ConnectionHealth>[0];

  return <ConnectionHealth status={status} tooltip={tooltip} />;
}

function useConnectionHealth() {
  const model = useLanguageModel();

  useEffect(() => {
    if (model) {
      text.refetch();
    }
  }, [model]);

  if (!model) {
    return null;
  }

  const text = useQuery({
    enabled: !!model,
    queryKey: ["llm-health-check", model],
    staleTime: 0,
    retry: 5,
    retryDelay: 200,
    queryFn: () =>
      generateText({
        model: model!,
        system: "If user says hi, respond with hello, without any other text.",
        prompt: "Hi",
        maxOutputTokens: 1,
      }),
  });

  return text.status;
}

export function HealthCheckForAvailability() {
  const { hasModel, message } = useLLMModelAvailability();

  if (hasModel) {
    return null;
  }

  return <AvailabilityHealth message={message} />;
}

function useLLMModelAvailability(): {
  hasModel: boolean;
  message: string;
} {
  const auth = useAuth();
  const { current_llm_provider, current_llm_model } = useConfigValues([
    "current_llm_provider",
    "current_llm_model",
  ] as const);
  const configuredProviders = main.UI.useResultTable(
    main.QUERIES.llmProviders,
    main.STORE_ID,
  );

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
        return {
          hasModel: false,
          message: "Please sign in to use Hyprnote LLM",
        };
      }
      return { hasModel: true, message: "" };
    }

    const config = configuredProviders[providerId];
    if (!config || !config.base_url) {
      return {
        hasModel: false,
        message:
          "Provider not configured. Please configure the provider below.",
      };
    }

    if (provider.apiKey && !config.api_key) {
      return {
        hasModel: false,
        message: "API key required. Please add your API key below.",
      };
    }

    return { hasModel: true, message: "" };
  }, [current_llm_provider, current_llm_model, configuredProviders, auth]);

  return result;
}
