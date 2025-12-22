import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  commands as localSttCommands,
  type SupportedSttModel,
} from "@hypr/plugin-local-stt";

const SUPPORTED_LOCAL_MODELS: SupportedSttModel[] = [
  "am-parakeet-v2",
  "am-parakeet-v3",
  "am-whisper-large-v3",
  "QuantizedTiny",
  "QuantizedTinyEn",
  "QuantizedBase",
  "QuantizedBaseEn",
  "QuantizedSmall",
  "QuantizedSmallEn",
  "QuantizedLargeTurbo",
];

/**
 * Hook to validate and auto-clear invalid STT model selections
 */
export function useValidateSttModel(
  provider: string | undefined,
  model: string | undefined,
  onClearModel: () => void,
) {
  const isLocalModel = provider === "hyprnote" && model && model !== "cloud";

  const { data: isDownloaded } = useQuery({
    queryKey: ["stt-model-downloaded", model],
    queryFn: async () => {
      if (!isLocalModel || !model) return true;

      if (SUPPORTED_LOCAL_MODELS.includes(model as SupportedSttModel)) {
        try {
          const result = await localSttCommands.isModelDownloaded(
            model as SupportedSttModel,
          );
          return result.status === "ok" && result.data;
        } catch (error) {
          console.error("Error checking model download status:", error);
          return false;
        }
      }

      return true; // Non-local models are assumed valid
    },
    enabled: !!isLocalModel,
    refetchInterval: 2000, // Check every 2 seconds
    staleTime: 500,
  });

  // Clear invalid selection
  useEffect(() => {
    if (isLocalModel && isDownloaded === false) {
      console.log(`Clearing invalid STT model selection: ${model}`);
      onClearModel();
    }
  }, [isLocalModel, isDownloaded, model, onClearModel]);

  return { isModelValid: !isLocalModel || isDownloaded !== false };
}
