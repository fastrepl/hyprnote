import { useQuery } from "@tanstack/react-query";
import { generateText } from "ai";
import { useEffect, useMemo } from "react";

import { useConfigValues } from "../../../../config/use-config";
import { useLanguageModel } from "../../../../hooks/useLLMConnection";
import * as main from "../../../../store/tinybase/main";
import { AvailabilityHealth, ConnectionHealth } from "../shared/health";
import { PROVIDERS } from "./shared";

export function HealthCheckForConnection() {
  const health = useConnectionHealth();

  const props = useMemo(() => {
    if (health === "pending") {
      return {
        status: "pending",
        tooltip: "Checking connection...",
      };
    }

    if (health === "error") {
      return {
        status: "error",
        tooltip: "Connection failed.",
      };
    }

    if (health === "success") {
      return {
        status: "success",
        tooltip: "Connection ready",
      };
    }

    return { status: null };
  }, [health]) satisfies Parameters<typeof ConnectionHealth>[0];

  return <ConnectionHealth {...props} />;
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
  const result = useAvailability();

  if (result.available) {
    return null;
  }

  return <AvailabilityHealth message={result.message} />;
}

function useAvailability() {
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
      return {
        available: false,
        message: "Please select a provider and model.",
      };
    }

    if (!PROVIDERS.find((p) => p.id === current_llm_provider)) {
      return {
        available: false,
        message: "Provider not found. Please select a valid provider.",
      };
    }

    if (!configuredProviders[current_llm_provider]?.base_url) {
      return {
        available: false,
        message:
          "Provider not configured. Please configure the provider below.",
      };
    }

    return { available: true };
  }, [current_llm_provider, current_llm_model, configuredProviders]);

  return result as { available: true } | { available: false; message: string };
}
