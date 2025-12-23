import { useQuery } from "@tanstack/react-query";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

import { useConfigValues } from "../../../../config/use-config";
import { useSTTConnection } from "../../../../hooks/useSTTConnection";
import { ConnectionHealth } from "../shared/health";

type HealthStatus = {
  status: "pending" | "error" | "success" | null;
  tooltip?: string;
};

export function HealthCheckForConnection() {
  const health = useConnectionHealth();

  const props =
    health.status === "pending"
      ? {
          status: "pending" as const,
          tooltip: health.tooltip ?? "Checking connection...",
        }
      : health.status === "error"
        ? {
            status: "error" as const,
            tooltip: health.tooltip ?? "Connection failed.",
          }
        : health.status === "success"
          ? { status: "success" as const }
          : { status: null };

  return <ConnectionHealth {...props} />;
}

function useDeepgramHealth(enabled: boolean, apiKey?: string) {
  return useQuery({
    enabled,
    queryKey: ["stt-health-check", "deepgram", apiKey],
    staleTime: 0,
    retry: 3,
    retryDelay: 200,
    queryFn: async () => {
      const response = await tauriFetch(
        "https://api.deepgram.com/v1/projects",
        {
          headers: {
            Authorization: `Token ${apiKey}`,
          },
        },
      );
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return response.status;
    },
  });
}

function useConnectionHealth(): HealthStatus {
  const { conn, local } = useSTTConnection();
  const { current_stt_provider, current_stt_model } = useConfigValues([
    "current_stt_provider",
    "current_stt_model",
  ] as const);

  const isCloud =
    (current_stt_provider === "hyprnote" && current_stt_model === "cloud") ||
    current_stt_provider !== "hyprnote";
  const isDeepgram = current_stt_provider === "deepgram";

  const deepgramHealth = useDeepgramHealth(isDeepgram && !!conn, conn?.apiKey);

  if (!isCloud) {
    const serverStatus = local.data?.status ?? "unavailable";
    if (serverStatus === "loading") {
      return { status: "pending", tooltip: "Local STT server is starting up…" };
    }
    if (serverStatus === "ready" && conn) {
      return { status: "success" };
    }
    return {
      status: "error",
      tooltip: `Local server status: ${serverStatus}.`,
    };
  }

  if (!conn) {
    return { status: "error", tooltip: "Provider not configured." };
  }

  if (isDeepgram) {
    if (deepgramHealth.isPending) {
      return { status: "pending", tooltip: "Verifying API key..." };
    }
    if (deepgramHealth.isError) {
      return {
        status: "error",
        tooltip: `API key verification failed: ${deepgramHealth.error.message}`,
      };
    }
    if (deepgramHealth.isSuccess) {
      return { status: "success" };
    }
  }

  return { status: "success" };
}
