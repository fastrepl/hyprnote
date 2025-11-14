import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { useConfigValues } from "../../../../config/use-config";
import { useSTTConnection } from "../../../../hooks/useSTTConnection";
import * as main from "../../../../store/tinybase/main";
import { AvailabilityHealth, ConnectionHealth } from "../shared/health";
import { type ProviderId, PROVIDERS, sttModelQueries } from "./shared";

export function HealthCheckForConnection() {
  const health = useConnectionHealth();

  const { status, tooltip } = useMemo(() => {
    if (!health) {
      return {
        status: null,
        tooltip: "No local model selected",
      };
    }

    if (health === "no-connection") {
      return {
        status: "error",
        tooltip: "No STT connection. Please configure a provider and model.",
      };
    }

    if (health === "server-not-ready") {
      return {
        status: "error",
        tooltip: "Local server not ready. Click to restart.",
      };
    }

    if (health === "connected") {
      return {
        status: "success",
        tooltip: "STT connection ready",
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
  const configs = useConfigValues([
    "current_stt_provider",
    "current_stt_model",
  ] as const);
  const current_stt_provider = configs.current_stt_provider as
    | string
    | undefined;
  const current_stt_model = configs.current_stt_model as string | undefined;

  const conn = useSTTConnection();

  const isLocalModel =
    current_stt_provider === "hyprnote" &&
    current_stt_model &&
    (current_stt_model.startsWith("am-") ||
      current_stt_model.startsWith("Quantized"));

  if (!isLocalModel) {
    return null;
  }

  if (!conn) {
    return "no-connection";
  }

  if (!conn.baseUrl) {
    return "server-not-ready";
  }

  return "connected";
}

export function HealthCheckForAvailability() {
  const { hasModel, message } = useSTTModelAvailability();

  if (hasModel) {
    return null;
  }

  return <AvailabilityHealth message={message} />;
}

function useSTTModelAvailability(): {
  hasModel: boolean;
  message: string;
} {
  const { current_stt_provider, current_stt_model } = useConfigValues([
    "current_stt_provider",
    "current_stt_model",
  ] as const);

  const configuredProviders = main.UI.useResultTable(
    main.QUERIES.sttProviders,
    main.STORE_ID,
  );

  const [p2, p3, tinyEn, smallEn] = useQueries({
    queries: [
      sttModelQueries.isDownloaded("am-parakeet-v2"),
      sttModelQueries.isDownloaded("am-parakeet-v3"),
      sttModelQueries.isDownloaded("QuantizedTinyEn"),
      sttModelQueries.isDownloaded("QuantizedSmallEn"),
    ],
  });

  if (!current_stt_provider || !current_stt_model) {
    return { hasModel: false, message: "Please select a provider and model" };
  }

  const providerId = current_stt_provider as ProviderId;

  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) {
    return { hasModel: false, message: "Selected provider not found" };
  }

  if (providerId === "hyprnote") {
    const downloadedModels = [
      { id: "am-parakeet-v2", isDownloaded: p2.data ?? false },
      { id: "am-parakeet-v3", isDownloaded: p3.data ?? false },
      { id: "QuantizedTinyEn", isDownloaded: tinyEn.data ?? false },
      { id: "QuantizedSmallEn", isDownloaded: smallEn.data ?? false },
    ];

    const hasAvailableModel = downloadedModels.some(
      (model) => model.isDownloaded,
    );
    if (!hasAvailableModel) {
      return {
        hasModel: false,
        message:
          "No Hyprnote models downloaded. Please download a model below.",
      };
    }
    return { hasModel: true, message: "" };
  }

  const config = configuredProviders[providerId] as
    | main.AIProviderStorage
    | undefined;
  if (!config) {
    return {
      hasModel: false,
      message: "Provider not configured. Please configure the provider below.",
    };
  }

  if (providerId === "custom") {
    return { hasModel: true, message: "" };
  }

  const hasModels = provider.models && provider.models.length > 0;
  if (!hasModels) {
    return {
      hasModel: false,
      message: "No models available for this provider",
    };
  }

  return { hasModel: true, message: "" };
}
