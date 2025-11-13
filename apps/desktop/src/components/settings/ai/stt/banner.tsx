import { useQueries } from "@tanstack/react-query";

import { useConfigValues } from "../../../../config/use-config";
import * as main from "../../../../store/tinybase/main";
import { Banner } from "../shared";
import { type ProviderId, PROVIDERS, sttModelQueries } from "./shared";

export function BannerForSTT() {
  const { hasModel, message } = useHasSTTModel();

  if (hasModel) {
    return null;
  }

  return <Banner message={message} />;
}

function useHasSTTModel(): { hasModel: boolean; message: string } {
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
