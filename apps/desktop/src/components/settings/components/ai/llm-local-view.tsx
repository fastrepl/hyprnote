import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, FolderIcon } from "lucide-react";
import { useEffect } from "react";

import { commands as localLlmCommands, SupportedModel } from "@hypr/plugin-local-llm";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import { SharedLLMProps } from "./shared";

export function LLMLocalView({
  customLLMEnabled,
  selectedLLMModel,
  setSelectedLLMModel,
  setCustomLLMEnabledMutation,
  downloadingModels,
  llmModelsState,
  handleModelDownload,
  handleShowFileLocation,
}: SharedLLMProps) {
  // call backend for the current selected LLM model and sets it
  const currentLLMModel = useQuery({
    queryKey: ["current-llm-model"],
    queryFn: () => localLlmCommands.getCurrentModel(),
  });

  useEffect(() => {
    if (currentLLMModel.data && !customLLMEnabled.data) {
      setSelectedLLMModel(currentLLMModel.data);
    }
  }, [currentLLMModel.data, customLLMEnabled.data, setSelectedLLMModel]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">
          <Trans>Local Models</Trans>
        </h2>
      </div>

      <div className="max-w-2xl">
        <div className="space-y-2">
          {llmModelsState.map((model) => (
            <div
              key={model.key}
              className={cn(
                "group relative p-3 rounded-lg border-2 transition-all flex items-center justify-between",
                selectedLLMModel === model.key && model.available && model.downloaded && !customLLMEnabled.data
                  ? "border-solid border-blue-500 bg-blue-50 cursor-pointer"
                  : model.available && model.downloaded
                  ? "border-dashed border-gray-300 hover:border-gray-400 bg-white cursor-pointer"
                  : "border-dashed border-gray-200 bg-gray-50 cursor-not-allowed",
              )}
              onClick={() => {
                if (model.available && model.downloaded) {
                  setSelectedLLMModel(model.key);
                  localLlmCommands.setCurrentModel(model.key as SupportedModel);
                  // CRITICAL: Disable custom LLM when local model is selected
                  setCustomLLMEnabledMutation.mutate(false);
                  localLlmCommands.restartServer();
                }
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4">
                  <div className="min-w-0">
                    <h3
                      className={cn(
                        "font-semibold text-base",
                        model.available && model.downloaded ? "text-gray-900" : "text-gray-400",
                      )}
                    >
                      {model.name}
                    </h3>
                    <p
                      className={cn(
                        "text-sm",
                        model.available && model.downloaded ? "text-gray-600" : "text-gray-400",
                      )}
                    >
                      {model.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!model.available
                  ? (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full whitespace-nowrap">
                      Coming Soon
                    </span>
                  )
                  : model.downloaded
                  ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowFileLocation("llm");
                      }}
                      className="text-xs h-7 px-2 flex items-center gap-1"
                    >
                      <FolderIcon className="w-3 h-3" />
                      Show in Finder
                    </Button>
                  )
                  : downloadingModels.has(model.key)
                  ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="text-xs h-7 px-2 flex items-center gap-1 text-blue-600 border-blue-200"
                    >
                      Downloading...
                    </Button>
                  )
                  : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModelDownload(model.key);
                      }}
                      className="text-xs h-7 px-2 flex items-center gap-1"
                    >
                      <DownloadIcon className="w-3 h-3" />
                      {model.size}
                    </Button>
                  )}
              </div>

              {!model.available && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="text-center">
                    <div className="text-base font-semibold text-gray-700 mb-1">Coming Soon</div>
                    <div className="text-sm text-gray-500">Feature in development</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
