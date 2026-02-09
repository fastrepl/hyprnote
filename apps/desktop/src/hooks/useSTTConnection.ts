import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import {
  commands as localSttCommands,
  type SupportedSttModel,
} from "@hypr/plugin-local-stt";
import type { AIProviderStorage } from "@hypr/store";

import { useAuth } from "../auth";
import { useBillingAccess } from "../billing";
import { ProviderId } from "../components/settings/ai/stt/shared";
import { env } from "../env";
import * as settings from "../store/tinybase/store/settings";

export const useSTTConnection = () => {
  const auth = useAuth();
  const billing = useBillingAccess();
  const { current_stt_provider, current_stt_model } = settings.UI.useValues(
    settings.STORE_ID,
  ) as {
    current_stt_provider: ProviderId | undefined;
    current_stt_model: string | undefined;
  };

  const providerConfig = settings.UI.useRow(
    "ai_providers",
    current_stt_provider ?? "",
    settings.STORE_ID,
  ) as AIProviderStorage | undefined;

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
      if (!auth?.session || !billing.isPro) {
        return null;
      }

      return {
        provider: current_stt_provider,
        model: current_stt_model,
        baseUrl: baseUrl ?? new URL("/stt", env.VITE_AI_URL).toString(),
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
    billing.isPro,
  ]);

  const resetSttModel = settings.UI.useSetValueCallback(
    "current_stt_model",
    () => "",
    [],
    settings.STORE_ID,
  );

  // Reset STT model selection when it becomes invalid.
  //
  // IMPORTANT: We use `prevIsProRef` (starting as null) to skip the initial
  // render cycle. During app startup, auth.session is null and billing.isPro
  // is false because they load asynchronously. Without this guard, the effect
  // would see "not authenticated / not pro" and wipe the user's saved model
  // selection before auth has finished loading — the exact race condition that
  // was previously caused by the useEffect in stt/select.tsx.
  const prevIsProRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevIsProRef.current === null) {
      prevIsProRef.current = billing.isPro;
      return;
    }
    prevIsProRef.current = billing.isPro;

    if (!current_stt_provider || !current_stt_model) {
      return;
    }

    if (isLocalModel) {
      void localSttCommands
        .isModelDownloaded(current_stt_model as SupportedSttModel)
        .then((result) => {
          if (result.status === "ok" && !result.data) {
            resetSttModel();
          }
        });
    } else if (isCloudModel && (!auth?.session || !billing.isPro)) {
      resetSttModel();
    }
  }, [
    current_stt_provider,
    current_stt_model,
    isLocalModel,
    isCloudModel,
    auth?.session,
    billing.isPro,
    resetSttModel,
  ]);

  return {
    conn: connection,
    local,
    isLocalModel,
  };
};
