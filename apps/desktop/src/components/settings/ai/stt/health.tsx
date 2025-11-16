import { useQueries } from "@tanstack/react-query";

import { useBillingAccess } from "../../../../billing";
import { useConfigValues } from "../../../../config/use-config";
import { useSTTConnection } from "../../../../hooks/useSTTConnection";
import * as main from "../../../../store/tinybase/main";
import { AvailabilityHealth, ConnectionHealth } from "../shared/health";
import {
  type ProviderId,
  PROVIDERS,
  sttModelQueries,
  sttProviderRequiresPro,
} from "./shared";

export function HealthCheckForConnection() {
  const props = useConnectionHealth();
  return <ConnectionHealth {...props} />;
}

function useConnectionHealth(): Parameters<typeof ConnectionHealth>[0] {
  const { conn, local } = useSTTConnection();
  const { current_stt_provider, current_stt_model } = useConfigValues([
    "current_stt_provider",
    "current_stt_model",
  ] as const);

  const isCloud =
    current_stt_provider === "hyprnote" || current_stt_model === "cloud";

  if (isCloud) {
    return conn
      ? { status: "success" }
      : { status: "error", tooltip: "Provider not configured." };
  }

  const serverStatus = local.data?.status ?? "unavailable";

  if (serverStatus === "loading") {
    return {
      status: "pending",
      tooltip: "Local STT server is starting up…",
    };
  }

  if (serverStatus === "ready" && conn) {
    return { status: "success" };
  }

  return { status: "error", tooltip: `Local server status: ${serverStatus}.` };
}

export function HealthCheckForAvailability() {
  const result = useAvailability();

  if (result.available) {
    return null;
  }

  return <AvailabilityHealth message={result.message} />;
}

function useAvailability():
  | { available: true }
  | { available: false; message: string } {
  const { current_stt_provider, current_stt_model } = useConfigValues([
    "current_stt_provider",
    "current_stt_model",
  ] as const);
  const billing = useBillingAccess();

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
    return { available: false, message: "Please select a provider and model." };
  }

  const providerId = current_stt_provider as ProviderId;

  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) {
    return { available: false, message: "Selected provider not found." };
  }

  if (sttProviderRequiresPro(providerId) && !billing.isPro) {
    return {
      available: false,
      message: billing.isLoading
        ? "Checking plan access for this provider..."
        : "Upgrade to Pro to use this provider.",
    };
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
        available: false,
        message:
          "No Hyprnote models downloaded. Please download a model below.",
      };
    }
    return { available: true };
  }

  const config = configuredProviders[providerId] as
    | main.AIProviderStorage
    | undefined;
  if (!config) {
    return {
      available: false,
      message: "Provider not configured. Please configure the provider below.",
    };
  }

  if (providerId === "custom") {
    return { available: true };
  }

  const hasModels = provider.models && provider.models.length > 0;
  if (!hasModels) {
    return {
      available: false,
      message: "No models available for this provider",
    };
  }

  return { available: true };
}
