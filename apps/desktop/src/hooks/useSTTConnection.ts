import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";

import { useAuth } from "../auth";
import { ProviderId } from "../components/settings/ai/stt/shared";
import { env } from "../env";
import * as main from "../store/tinybase/main";

export const useSTTConnection = () => {
  const auth = useAuth();
  const { current_stt_provider, current_stt_model } = main.UI.useValues(
    main.STORE_ID,
  ) as {
    current_stt_provider: ProviderId | undefined;
    current_stt_model: string | undefined;
  };

  const providerConfig = main.UI.useRow(
    "ai_providers",
    current_stt_provider ?? "",
    main.STORE_ID,
  ) as main.AIProviderStorage | undefined;

  const isLocalModel =
    current_stt_provider === "hyprnote" &&
    !!current_stt_model &&
    (current_stt_model.startsWith("am-") ||
      current_stt_model.startsWith("Quantized"));

  const isCloudModel =
    current_stt_provider === "hyprnote" && current_stt_model === "cloud";

  const local = useQuery({
    enabled: current_stt_provider === "hyprnote",
    queryKey: ["stt-connection", isLocalModel, current_stt_model],
    refetchInterval: 1000,
    queryFn: async () => {
      if (!isLocalModel || !current_stt_model) {
        return null;
      }

      const servers = await localSttCommands.getServers();

      if (servers.status !== "ok") {
        return null;
      }

      const isInternalModel = current_stt_model.startsWith("Quantized");
      const server = isInternalModel
        ? servers.data.internal
        : servers.data.external;

      if (server?.status === "ready" && server.url) {
        return {
          status: "ready",
          connection: {
            provider: current_stt_provider!,
            model: current_stt_model,
            baseUrl: server.url,
            apiKey: "",
          },
        };
      }

      return {
        status: server?.status,
        connection: null,
      };
    },
  });

  const baseUrl = providerConfig?.base_url?.trim();
  const apiKey = providerConfig?.api_key?.trim();

  const connection = useMemo(() => {
    if (!current_stt_provider || !current_stt_model) {
      return null;
    }

    if (isLocalModel) {
      return local.data?.connection ?? null;
    }

    if (isCloudModel) {
      if (!auth?.session) {
        return null;
      }

      return {
        provider: current_stt_provider,
        model: current_stt_model,
        baseUrl: `${env.VITE_API_URL}`,
        apiKey: auth.session.access_token,
      };
    }

    if (!baseUrl || !apiKey) {
      return null;
    }

    return {
      provider: current_stt_provider,
      model: current_stt_model,
      baseUrl,
      apiKey,
    };
  }, [
    current_stt_provider,
    current_stt_model,
    isLocalModel,
    isCloudModel,
    local.data,
    baseUrl,
    apiKey,
    auth,
  ]);

  return {
    conn: connection,
    local,
  };
};
