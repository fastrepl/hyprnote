import { useQuery } from "@tanstack/react-query";

import { commands as localLlmCommands, SupportedModel as SupportedModelLLM } from "@hypr/plugin-local-llm";
import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";

interface GlobalDownloadState {
  sttDownloading: boolean;
  llmDownloading: boolean;
  hasAnyDownloads: boolean;
}

export const useGlobalDownloadState = (sttModel?: SupportedModel, llmModel?: SupportedModelLLM) => {
  return useQuery<GlobalDownloadState>({
    queryKey: ["global-downloads", sttModel, llmModel],
    queryFn: async () => {
      try {
        const [sttDownloading, llmDownloading] = await Promise.all([
          sttModel ? localSttCommands.isModelDownloading(sttModel) : false,
          llmModel ? localLlmCommands.isModelDownloading(llmModel) : false,
        ]);
        
        return {
          sttDownloading,
          llmDownloading,
          hasAnyDownloads: sttDownloading || llmDownloading,
        };
      } catch (error) {
        console.error("Error checking download state:", error);
        return {
          sttDownloading: false,
          llmDownloading: false,
          hasAnyDownloads: false,
        };
      }
    },
    refetchInterval: 2000, // Check every 2 seconds
    enabled: !!(sttModel || llmModel), // Only run if we have models to check
  });
};

export const useCheckAnyDownloadsInProgress = () => {
  return useQuery<GlobalDownloadState>({
    queryKey: ["any-downloads-in-progress"],
    queryFn: async () => {
      try {
        // Check all supported models for any ongoing downloads
        const sttModels = await localSttCommands.listSupportedModels();
        const llmModels = await localLlmCommands.listSupportedModels();
        
        const sttDownloadChecks = await Promise.all(
          sttModels.map(model => localSttCommands.isModelDownloading(model))
        );
        
        const llmDownloadChecks = await Promise.all(
          llmModels.map(model => localLlmCommands.isModelDownloading(model))
        );
        
        const sttDownloading = sttDownloadChecks.some(Boolean);
        const llmDownloading = llmDownloadChecks.some(Boolean);
        
        return {
          sttDownloading,
          llmDownloading,
          hasAnyDownloads: sttDownloading || llmDownloading,
        };
      } catch (error) {
        console.error("Error checking any downloads in progress:", error);
        return {
          sttDownloading: false,
          llmDownloading: false,
          hasAnyDownloads: false,
        };
      }
    },
    refetchInterval: 2000,
  });
}; 