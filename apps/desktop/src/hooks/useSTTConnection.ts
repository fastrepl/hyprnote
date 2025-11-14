import {
  type FetchStatus,
  type QueryStatus,
  useQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";

import { ProviderId } from "../components/settings/ai/stt/shared";
import * as main from "../store/tinybase/main";

type Connection = {
  provider: ProviderId;
  model: string;
  baseUrl: string;
  apiKey: string;
};

type LocalConnectionSnapshot = {
  serverStatus: string | null;
  connection: Connection | null;
};

type LocalConnectionMeta = {
  snapshot: LocalConnectionSnapshot | null;
  status: QueryStatus;
  fetchStatus: FetchStatus;
  isFetching: boolean;
  isPending: boolean;
};

export type STTConnectionResult = {
  conn: Connection | null;
  local: LocalConnectionMeta | null;
};

export const useSTTConnection = (): STTConnectionResult => {
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

  const {
    data: localSnapshot,
    status: localStatus,
    fetchStatus: localFetchStatus,
    isFetching: localIsFetching,
    isPending: localIsPending,
  } = useQuery<LocalConnectionSnapshot | null>({
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
          serverStatus: server.status ?? "ready",
          connection: {
            provider: current_stt_provider!,
            model: current_stt_model,
            baseUrl: server.url,
            apiKey: "",
          },
        };
      }

      return {
        serverStatus: server?.status ?? "unknown",
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
      return localSnapshot?.connection ?? null;
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
    localSnapshot,
    baseUrl,
    apiKey,
  ]);

  return useMemo(
    () => ({
      conn: connection,
      local: isLocalModel
        ? {
            snapshot: localSnapshot ?? null,
            status: localStatus,
            fetchStatus: localFetchStatus,
            isFetching: localIsFetching,
            isPending: localIsPending,
          }
        : null,
    }),
    [
      connection,
      isLocalModel,
      localSnapshot,
      localStatus,
      localFetchStatus,
      localIsFetching,
      localIsPending,
    ],
  );
};
