import { LMStudioClient } from "@lmstudio/sdk";
import { useQuery } from "@tanstack/react-query";
import { Ollama } from "ollama/browser";

import * as settings from "../../../../store/tinybase/settings";

type LocalProviderId = "ollama" | "lmstudio";

const LOCAL_PROVIDER_IDS: LocalProviderId[] = ["ollama", "lmstudio"];

export function isLocalProvider(
  providerId: string,
): providerId is LocalProviderId {
  return LOCAL_PROVIDER_IDS.includes(providerId as LocalProviderId);
}

async function checkOllamaConnection(baseUrl: string): Promise<boolean> {
  try {
    const ollama = new Ollama({ host: baseUrl.replace(/\/v1\/?$/, "") });
    await ollama.list();
    return true;
  } catch {
    return false;
  }
}

async function checkLMStudioConnection(baseUrl: string): Promise<boolean> {
  try {
    const url = new URL(baseUrl);
    const port = url.port || "1234";
    const formattedUrl = `ws:127.0.0.1:${port}`;
    const client = new LMStudioClient({ baseUrl: formattedUrl });
    await client.system.listDownloadedModels();
    return true;
  } catch {
    return false;
  }
}

export function useLocalProviderConnection(providerId: string) {
  const providerRow = settings.UI.useRow(
    "ai_providers",
    providerId,
    settings.STORE_ID,
  );
  const baseUrl = providerRow?.base_url as string | undefined;

  const isLocal = isLocalProvider(providerId);

  const { data: isConnected, isLoading } = useQuery({
    queryKey: ["local-provider-connection", providerId, baseUrl],
    enabled: isLocal && !!baseUrl,
    staleTime: 10_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!baseUrl) {
        return false;
      }

      if (providerId === "ollama") {
        return checkOllamaConnection(baseUrl);
      }

      if (providerId === "lmstudio") {
        return checkLMStudioConnection(baseUrl);
      }

      return false;
    },
  });

  return {
    isLocal,
    isConnected: isConnected ?? false,
    isLoading,
  };
}
