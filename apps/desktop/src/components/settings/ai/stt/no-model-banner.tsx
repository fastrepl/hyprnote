import { cn } from "@hypr/utils";

import { useQueries } from "@tanstack/react-query";
import { AlertCircleIcon } from "lucide-react";

import { useConfigValues } from "../../../../config/use-config";
import * as main from "../../../../store/tinybase/main";
import { type ProviderId, PROVIDERS, sttModelQueries } from "./shared";

export function NoModelBanner() {
  const { hasModel, message } = useHasSTTModel();

  if (hasModel) {
    return null;
  }

  return (
    <div
      className={cn([
        "flex items-center justify-center gap-2 text-center",
        "bg-red-50/70 border-b border-red-200",
        "py-3 px-4 -mx-6 -mt-6",
        "text-sm text-red-700",
      ])}
    >
      <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
      {message}
    </div>
  );
}

function useHasSTTModel(): { hasModel: boolean; message: string } {
  const { current_stt_provider, current_stt_model } = useConfigValues(
    ["current_stt_provider", "current_stt_model"] as const,
  );

  const configuredProviders = main.UI.useResultTable(main.QUERIES.sttProviders, main.STORE_ID);

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

    const hasAvailableModel = downloadedModels.some((model) => model.isDownloaded);
    if (!hasAvailableModel) {
      return { hasModel: false, message: "No Hyprnote models downloaded. Please download a model below." };
    }
    return { hasModel: true, message: "" };
  }

  const config = configuredProviders[providerId] as main.AIProviderStorage | undefined;
  if (!config) {
    return { hasModel: false, message: "Provider not configured. Please configure the provider below." };
  }

  if (providerId === "custom") {
    return { hasModel: true, message: "" };
  }

  const hasModels = provider.models && provider.models.length > 0;
  if (!hasModels) {
    return { hasModel: false, message: "No models available for this provider" };
  }

  return { hasModel: true, message: "" };
}
