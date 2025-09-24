import { LmStudio } from "@lobehub/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { openPath } from "@tauri-apps/plugin-opener";
import { open } from "@tauri-apps/plugin-shell";
import { CloudIcon, DownloadIcon, FolderIcon } from "lucide-react";
import { useEffect } from "react";

import { useLicense } from "@/hooks/use-license";
import { commands as localLlmCommands, type CustomModelInfo, type ModelSelection } from "@hypr/plugin-local-llm";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import { type LLMModel, SharedLLMProps } from "./shared";

interface ExtendedSharedLLMProps extends SharedLLMProps {
  setOpenAccordion: (accordion: "others" | "openai" | "gemini" | "openrouter" | null) => void;
}

export function LLMLocalView({
  customLLMEnabled,
  selectedLLMModel,
  setSelectedLLMModel,
  setCustomLLMEnabledMutation,
  downloadingModels,
  llmModelsState,
  handleModelDownload,
  configureCustomEndpoint,
  setOpenAccordion,
  hyprCloudEnabled,
  setHyprCloudEnabledMutation,
}: ExtendedSharedLLMProps) {
  const { getLicense } = useLicense();
  const isPro = !!getLicense.data?.valid;
  const queryClient = useQueryClient();

  const currentModelSelection = useQuery({
    queryKey: ["current-model-selection"],
    queryFn: () => localLlmCommands.getCurrentModelSelection(),
  });

  const customModels = useQuery({
    queryKey: ["custom-models"],
    queryFn: () => localLlmCommands.listCustomModels(),
    refetchInterval: 5000,
  });

  const handleShowFileLocation = async () => {
    localLlmCommands.modelsDir().then((path) => openPath(path));
  };

  useEffect(() => {
    if (currentModelSelection.data && !customLLMEnabled.data) {
      const selection = currentModelSelection.data;
      if (selection.type === "Predefined") {
        setSelectedLLMModel(selection.content.key);
      } else if (selection.type === "Custom") {
        setSelectedLLMModel(`custom-${selection.content.path}`);
      }
    }
  }, [currentModelSelection.data, customLLMEnabled.data, setSelectedLLMModel]);

  const handleLocalModelSelection = async (model: LLMModel) => {
    if (model.available && model.downloaded) {
      setSelectedLLMModel(model.key);

      const selection: ModelSelection = { type: "Predefined", content: { key: model.key } };
      await localLlmCommands.setCurrentModelSelection(selection);
      queryClient.invalidateQueries({ queryKey: ["current-model-selection"] });

      setCustomLLMEnabledMutation.mutate(false);
      setHyprCloudEnabledMutation.mutate(false);
      setOpenAccordion(null);

      localLlmCommands.restartServer();
    }
  };

  const handleCustomModelSelection = async (customModel: CustomModelInfo) => {
    setSelectedLLMModel(`custom-${customModel.path}`);

    const selection: ModelSelection = { type: "Custom", content: { path: customModel.path } };
    await localLlmCommands.setCurrentModelSelection(selection);
    queryClient.invalidateQueries({ queryKey: ["current-model-selection"] });

    setCustomLLMEnabledMutation.mutate(false);
    setHyprCloudEnabledMutation.mutate(false);
    setOpenAccordion(null);

    localLlmCommands.restartServer();
  };

  const handleHyprCloudSelection = () => {
    setSelectedLLMModel("hyprcloud");
    configureCustomEndpoint({
      provider: "hyprcloud",
      api_base: "https://pro.hyprnote.com",
      api_key: "",
      model: "",
    });
    setOpenAccordion(null);
  };

  const isHyprCloudSelected = hyprCloudEnabled.data;
  const buttonResetClass = "appearance-none border-0 outline-0 bg-transparent p-0 m-0 font-inherit text-left w-full";

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <div className="space-y-2">
          <div
            className={cn(
              "group relative p-3 rounded-lg border-2 transition-all",
              isHyprCloudSelected
                ? "border-solid border-blue-500 bg-blue-50"
                : "border-dashed border-gray-300 hover:border-gray-400 bg-white",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="relative flex-1">
                <button
                  onClick={handleHyprCloudSelection}
                  disabled={!isPro}
                  className={cn(
                    buttonResetClass,
                    isPro ? "cursor-pointer" : "cursor-not-allowed",
                    "block w-full",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base text-gray-900 flex items-center gap-2">
                        <CloudIcon className={cn("w-4 h-4", isPro ? "" : "opacity-50")} />
                        <span className={isPro ? "" : "opacity-50"}>HyprCloud</span>
                      </h3>
                      <p className={cn("text-sm text-gray-600", isPro ? "" : "opacity-50")}>
                        Connect to Hyprnote's Cloud hosted AI model.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    open("https://docs.hyprnote.com/pro/cloud");
                  }}
                  className="absolute top-[-2px] left-[113px] z-10"
                >
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800 hover:bg-blue-100 transition-colors">
                    Pro
                  </span>
                </button>
              </div>

              {!isPro && (
                <Button
                  onClick={() => {
                    windowsCommands.windowShow({ type: "settings" }).then(() => {
                      setTimeout(() => {
                        windowsCommands.windowEmitNavigate({ type: "settings" }, {
                          path: "/app/settings",
                          search: { tab: "billing" },
                        });
                      }, 500);
                    });
                  }}
                  size="sm"
                  className="ml-4 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-gray-50 text-gray-500">or use local models</span>
            </div>
          </div>

          {llmModelsState.map((model) => (
            <button
              key={model.key}
              onClick={() => handleLocalModelSelection(model)}
              disabled={!model.available}
              className={cn(
                buttonResetClass,
                "group relative p-3 rounded-lg border-2 transition-all flex items-center justify-between",
                selectedLLMModel === model.key && model.available && model.downloaded && !customLLMEnabled.data
                  ? "border-solid border-blue-500 bg-blue-50 cursor-pointer"
                  : model.available && model.downloaded
                  ? "border-dashed border-gray-300 hover:border-gray-400 bg-white cursor-pointer"
                  : "border-dashed border-gray-200 bg-gray-50 cursor-not-allowed",
              )}
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
                        handleShowFileLocation();
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
            </button>
          ))}

          {customModels.data && customModels.data.length > 0 && (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-gray-50 text-gray-500">custom GGUF models</span>
                </div>
              </div>

              {customModels.data.map((customModel) => {
                const isSelected = selectedLLMModel === `custom-${customModel.path}` && !customLLMEnabled.data;
                return (
                  <button
                    key={customModel.path}
                    onClick={() => handleCustomModelSelection(customModel)}
                    className={cn(
                      buttonResetClass,
                      "group relative p-3 rounded-lg border-2 transition-all flex items-center justify-between",
                      isSelected
                        ? "border-solid border-blue-500 bg-blue-50 cursor-pointer"
                        : "border-dashed border-gray-300 hover:border-gray-400 bg-white cursor-pointer",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base text-gray-900 flex items-center gap-2">
                            <LmStudio size={14} />
                            {customModel.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{customModel.path.split("/").slice(-1)[0]}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
