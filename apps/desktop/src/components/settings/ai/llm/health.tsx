import { useQuery } from "@tanstack/react-query";
import { generateText } from "ai";
import { useEffect, useMemo } from "react";

import { useLanguageModel } from "../../../../hooks/useLLMConnection";
import { ConnectionHealth } from "../shared/health";

export function HealthCheckForConnection() {
  const health = useConnectionHealth();

  const props = useMemo(() => {
    if (health.status === "pending") {
      return {
        status: "pending",
        tooltip: "Checking connection...",
      };
    }

    if (health.status === "error") {
      return {
        status: "error",
        tooltip: health.errorMessage || "Connection failed.",
      };
    }

    if (health.status === "success") {
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

  const text = useQuery({
    enabled: !!model,
    queryKey: ["llm-health-check", model],
    staleTime: 0,
    retry: 5,
    retryDelay: 200,
    queryFn: async () => {
      const result = await generateText({
        model: model!,
        system: "If user says hi, respond with hello, without any other text.",
        prompt: "Hi",
        // openai expect it to be at least 16
        maxOutputTokens: 16,
      });
      return result;
    },
  });

  const { refetch } = text;
  useEffect(() => {
    if (model) {
      void refetch();
    }
  }, [model, refetch]);

  if (!model) {
    return { status: null, errorMessage: null };
  }

  const getErrorMessage = () => {
    if (!text.error) {
      return null;
    }

    const error = text.error as Error;
    const message = error.message || "Unknown error";
    return `Connection failed: ${message}`;
  };

  return {
    status: text.status,
    errorMessage: getErrorMessage(),
  };
}
