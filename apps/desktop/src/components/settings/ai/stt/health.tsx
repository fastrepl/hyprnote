import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { useBillingAccess } from "../../../../billing";
import { useConfigValues } from "../../../../config/use-config";
import { useSTTConnection } from "../../../../hooks/useSTTConnection";
import { AvailabilityHealth, ConnectionHealth } from "../shared/health";
import {
  type ProviderId,
  PROVIDERS,
  sttModelQueries,
  sttProviderRequiresPro,
} from "./shared";

export function HealthCheckForConnection() {
  const health = useConnectionHealth();

  const props = useMemo(() => {
    if (health.status === "pending") {
      return {
        status: "pending",
        tooltip: health.tooltip || "Checking connection...",
      };
    }

    if (health.status === "error") {
      return {
        status: "error",
        tooltip: health.tooltip || "Connection failed.",
      };
    }

    if (health.status === "success") {
      return { status: "success" };
    }

    return { status: null };
  }, [health]) satisfies Parameters<typeof ConnectionHealth>[0];

  return <ConnectionHealth {...props} />;
}

function useConnectionHealth(): {
  status: "pending" | "error" | "success" | null;
  tooltip?: string;
} {
  const { conn, local } = useSTTConnection();
  const { current_stt_provider, current_stt_model } = useConfigValues([
    "current_stt_provider",
    "current_stt_model",
  ] as const);

  const isCloud =
    (current_stt_provider === "hyprnote" && current_stt_model === "cloud") ||
    current_stt_provider !== "hyprnote";

  const isDeepgram = current_stt_provider === "deepgram";

  const deepgramHealth = useQuery({
    enabled: isDeepgram && !!conn,
    queryKey: ["stt-health-check", "deepgram", conn?.apiKey],
    staleTime: 0,
    retry: 3,
    retryDelay: 200,
    queryFn: async () => {
      const response = await fetch("https://api.deepgram.com/v1/projects", {
        headers: {
          Authorization: `Token ${conn!.apiKey}`,
        },
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return response.status;
    },
  });

  const { refetch } = deepgramHealth;
  useEffect(() => {
    if (isDeepgram && conn) {
      void refetch();
    }
  }, [isDeepgram, conn, refetch]);

  if (isCloud) {
    if (!conn) {
      return { status: "error", tooltip: "Provider not configured." };
    }

    if (isDeepgram) {
      if (deepgramHealth.isPending) {
        return { status: "pending", tooltip: "Verifying API key..." };
      }
      if (deepgramHealth.isError) {
        const error = deepgramHealth.error as Error;
        return {
          status: "error",
          tooltip: `API key verification failed: ${error.message}`,
        };
      }
      if (deepgramHealth.isSuccess) {
        return { status: "success" };
      }
    }

    return { status: "success" };
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

  return {
    status: "error",
    tooltip: `Local server status: ${serverStatus}.`,
  };
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

  const [p2, p3, tinyEn, smallEn] = useQueries({
    queries: [
      sttModelQueries.isDownloaded("am-parakeet-v2"),
      sttModelQueries.isDownloaded("am-parakeet-v3"),
      sttModelQueries.isDownloaded("QuantizedTinyEn"),
      sttModelQueries.isDownloaded("QuantizedSmallEn"),
    ],
  });

  if (!current_stt_provider || !current_stt_model) {
    return {
      available: false,
      message: "Please select a provider and model.",
    };
  }

  const providerId = current_stt_provider as ProviderId;

  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) {
    return { available: false, message: "Selected provider not found." };
  }

  if (sttProviderRequiresPro(providerId) && !billing.isPro) {
    return {
      available: false,
      message: "Upgrade to Pro to use this provider.",
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
