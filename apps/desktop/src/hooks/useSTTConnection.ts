import { useQuery } from "@tanstack/react-query";
import { Effect, Exit } from "effect";

import { commands as localSttCommands, type SupportedSttModel } from "@hypr/plugin-local-stt";
import { ProviderId } from "../components/settings/ai/stt/shared";
import { fromResult } from "../effect";
import * as internal from "../store/tinybase/internal";

type Connection = {
  model: string;
  baseUrl: string;
  apiKey: string;
};

export const useSTTConnection = (): Connection | null => {
  const { current_stt_provider, current_stt_model } = internal.UI.useValues(internal.STORE_ID) as {
    current_stt_provider: ProviderId | undefined;
    current_stt_model: string | undefined;
  };

  const providerConfig = internal.UI.useRow(
    "ai_providers",
    current_stt_provider ?? "",
    internal.STORE_ID,
  ) as internal.AIProviderStorage | undefined;

  const isLocalModel = current_stt_provider === "hyprnote" && current_stt_model?.startsWith("am-");

  const { data: localConnection } = useQuery({
    enabled: isLocalModel && !!current_stt_model,
    queryKey: ["stt-connection", isLocalModel, current_stt_model],
    queryFn: async () => {
      if (!isLocalModel || !current_stt_model) {
        return null;
      }

      const program = Effect.gen(function*() {
        const servers = yield* fromResult(localSttCommands.getServers());
        const externalServer = servers.external;

        if (externalServer?.health === "ready" && externalServer.url) {
          return { baseUrl: externalServer.url, apiKey: "" };
        }

        if (externalServer?.health === "loading") {
          yield* fromResult(localSttCommands.stopServer("external"));
        }

        const baseUrl = yield* fromResult(localSttCommands.startServer(current_stt_model as SupportedSttModel));
        return { baseUrl, apiKey: "" };
      });

      const exit = await Effect.runPromiseExit(program);
      return Exit.match(exit, {
        onFailure: (cause) => {
          console.error("[useSTTConnection] Effect failed", cause);
          return null;
        },
        onSuccess: (connection) => ({
          model: current_stt_model,
          ...connection,
        }),
      });
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
    model: current_stt_model,
    baseUrl,
    apiKey,
  };
};
