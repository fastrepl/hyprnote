import { useQuery } from "@tanstack/react-query";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { ProviderId } from "../components/settings/ai/stt/shared";
import * as main from "../store/tinybase/main";

type Connection = {
  provider: ProviderId;
  model: string;
  baseUrl: string;
  apiKey: string;
};

export const useSTTConnection = (): Connection | null => {
  const { current_stt_provider, current_stt_model } = main.UI.useValues(main.STORE_ID) as {
    current_stt_provider: ProviderId | undefined;
    current_stt_model: string | undefined;
  };

  const providerConfig = main.UI.useRow(
    "ai_providers",
    current_stt_provider ?? "",
    main.STORE_ID,
  ) as main.AIProviderStorage | undefined;

  const isLocalModel = current_stt_provider === "hyprnote" && current_stt_model?.startsWith("am-");

  const { data: localConnection } = useQuery({
    enabled: current_stt_provider === "hyprnote",
    queryKey: ["stt-connection", isLocalModel, current_stt_model],
    refetchInterval: 1000,
    queryFn: async () => {
      if (!isLocalModel || !current_stt_model) {
        return null;
      }

      try {
        const servers = await localSttCommands.getServers();

        if (servers.status !== "ok") {
          return null;
        }

        const externalServer = servers.data.external;

        if (externalServer?.health === "ready" && externalServer.url) {
          return {
            provider: current_stt_provider!,
            model: current_stt_model,
            baseUrl: externalServer.url,
            apiKey: "",
          };
        }

        return null;
      } catch {
        return null;
      }
    },
  });

  if (!current_stt_provider || !current_stt_model) {
    return null;
  }

  if (isLocalModel) {
    return localConnection ?? null;
  }

  const baseUrl = providerConfig?.base_url?.trim();
  const apiKey = providerConfig?.api_key?.trim();

  if (!baseUrl || !apiKey) {
    return null;
  }

  return {
    provider: current_stt_provider,
    model: current_stt_model,
    baseUrl,
    apiKey,
  };
};
