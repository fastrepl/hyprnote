import { useQuery } from "@tanstack/react-query";

import * as settings from "../../../../store/tinybase/store/settings";
import {
  checkLMStudioConnection,
  checkOllamaConnection,
  type LocalProviderStatus,
} from "./check-local-provider";

const LOCAL_PROVIDERS = ["ollama", "lmstudio"] as const;
type LocalProviderId = (typeof LOCAL_PROVIDERS)[number];

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434/v1";
const DEFAULT_LMSTUDIO_URL = "http://127.0.0.1:1234/v1";

function isLocalProvider(providerId: string): providerId is LocalProviderId {
  return LOCAL_PROVIDERS.includes(providerId as LocalProviderId);
}

export function useLocalProviderStatus(
  providerId: string,
): LocalProviderStatus | null {
  const configuredProviders = settings.UI.useResultTable(
    settings.QUERIES.llmProviders,
    settings.STORE_ID,
  );

  const config = configuredProviders[providerId];

  const defaultUrl =
    providerId === "ollama"
      ? DEFAULT_OLLAMA_URL
      : providerId === "lmstudio"
        ? DEFAULT_LMSTUDIO_URL
        : "";

  const baseUrl = String(config?.base_url || defaultUrl).trim();

  const checkFn =
    providerId === "ollama"
      ? checkOllamaConnection
      : providerId === "lmstudio"
        ? checkLMStudioConnection
        : null;

  const query = useQuery({
    enabled: isLocalProvider(providerId) && !!checkFn,
    queryKey: ["local-provider-status", providerId, baseUrl],
    queryFn: async () => {
      if (!checkFn) return false;
      return checkFn(baseUrl);
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: false,
  });

  if (!isLocalProvider(providerId)) {
    return null;
  }

  if (query.isLoading || query.isFetching) {
    return "checking";
  }

  return query.data ? "connected" : "disconnected";
}
