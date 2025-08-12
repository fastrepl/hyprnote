import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { type SupportedSttModel } from "@hypr/plugin-local-stt";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Card, CardContent } from "@hypr/ui/components/ui/card";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { cn } from "@hypr/ui/lib/utils";

export const ModelSelectionView = ({
  onContinue,
}: {
  onContinue: (model: SupportedSttModel) => void;
}) => {
  const [selectedModel, setSelectedModel] = useState<SupportedSttModel>("QuantizedSmall");

  const supportedSTTModels = useQuery({
    queryKey: ["local-stt", "supported-models"],
    queryFn: async () => {
      const models = await localSttCommands.listSupportedModels();
      const downloadedModels = await Promise.all(
        models.map((model) => localSttCommands.isModelDownloaded(model.key as SupportedSttModel)),
      );

      return models.map((model, index) => ({
        model,
        is_downloaded: downloadedModels[index],
      }));
    },
  });

  const handleContinue = () => {
    onContinue(selectedModel);
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-4 flex items-center justify-center">
        <Trans>Select a transcribing model (STT)</Trans>
      </h2>

      <div className="w-full mb-8 px-2 sm:px-4">
        <div className="flex gap-2 sm:gap-4 max-w-2xl mx-auto">
          {supportedSTTModels.data
            ?.filter(modelInfo => {
              const model = modelInfo.model;
              return ["QuantizedTiny", "QuantizedSmall", "QuantizedLargeTurbo"].includes(model.key);
            })
            ?.map(modelInfo => {
              const model = modelInfo.model;

              const isSelected = selectedModel === model.key;

              return (
                <div key={model.key} className="flex-1">
                  <div className="p-0.5 sm:p-1">
                    <Card
                      className={cn(
                        "cursor-pointer transition-all duration-200",
                        isSelected
                          ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50"
                          : "hover:border-gray-400",
                      )}
                      onClick={() => setSelectedModel(model.key as SupportedSttModel)}
                    >
                      <CardContent className="flex flex-col gap-2 sm:gap-4 justify-between p-3 sm:p-5 h-48 sm:h-56">
                        <div className="flex-1 text-center">
                          <div className="text-sm sm:text-lg font-medium mb-2 sm:mb-4">{model.display_name}</div>
                        </div>

                        <div>
                          <div className="mt-4 flex justify-center">
                            <div className="text-xs bg-gray-100 border border-gray-200 rounded-full px-3 py-1 inline-flex items-center">
                              <span className="text-gray-500 mr-2">Size:</span>
                              <span className="font-medium">{(model.size_bytes / 1024 / 1024).toFixed(0)} MB</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <PushableButton
        onClick={handleContinue}
        className="w-full max-w-sm"
        disabled={!selectedModel}
      >
        <Trans>Continue</Trans>
      </PushableButton>
    </div>
  );
};
