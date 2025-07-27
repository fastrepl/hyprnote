import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { BrainIcon, Zap as SpeedIcon } from "lucide-react";
import React, { useState } from "react";

import { Card, CardContent } from "@hypr/ui/components/ui/card";

import { SupportedModel } from "@hypr/plugin-local-stt";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { cn } from "@hypr/ui/lib/utils";
import { sttModelMetadata } from "../settings/components/ai/stt-view";

interface ModelInfo {
  model: string;
  is_downloaded: boolean;
}

const RatingDisplay = (
  { label, rating, maxRating = 3, icon: Icon }: {
    label: string;
    rating: number;
    maxRating?: number;
    icon: React.ElementType;
  },
) => (
  <div className="flex flex-col items-center px-1 sm:px-2">
    <span className="text-[8px] sm:text-[10px] text-neutral-500 uppercase font-medium tracking-wider mb-1 sm:mb-1.5">
      {label}
    </span>
    <div className="flex space-x-0.5 sm:space-x-1">
      {[...Array(maxRating)].map((_, i) => (
        <Icon
          key={i}
          className={cn(
            "w-2.5 h-2.5 sm:w-3.5 sm:h-3.5",
            i < rating ? "text-blue-500" : "text-neutral-300",
          )}
        />
      ))}
    </div>
  </div>
);

export const ModelSelectionView = ({
  onContinue,
}: {
  onContinue: (model: SupportedModel) => void;
}) => {
  const [selectedModel, setSelectedModel] = useState<SupportedModel>("QuantizedSmall");

  const supportedSTTModels = useQuery<ModelInfo[]>({
    queryKey: ["local-stt", "supported-models"],
    queryFn: async () => {
      const models = await localSttCommands.listSupportedModels();
      const downloadedModels = await Promise.all(
        models.map((model) => localSttCommands.isModelDownloaded(model)),
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
        <Trans>Select a transcribing model</Trans>
      </h2>

      <div className="w-full mb-8 px-2 sm:px-4">
        <div className="flex gap-2 sm:gap-4 max-w-2xl mx-auto">
          {supportedSTTModels.data
            ?.filter(modelInfo => {
              const model = modelInfo.model;
              return ["QuantizedTiny", "QuantizedSmall", "QuantizedLargeTurbo"].includes(model);
            })
            ?.map(modelInfo => {
              const model = modelInfo.model;
              const metadata = sttModelMetadata[model as SupportedModel];
              if (!metadata) {
                return null;
              }

              const isSelected = selectedModel === model;

              return (
                <div key={model} className="flex-1">
                  <div className="p-0.5 sm:p-1">
                    <Card
                      className={cn(
                        "cursor-pointer transition-all duration-200",
                        isSelected
                          ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50"
                          : "hover:border-gray-400",
                      )}
                      onClick={() => setSelectedModel(model as SupportedModel)}
                    >
                      <CardContent className="flex flex-col gap-2 sm:gap-4 justify-between p-3 sm:p-5 h-48 sm:h-56">
                        <div className="flex-1 text-center">
                          <div className="text-sm sm:text-lg font-medium mb-2 sm:mb-4">{metadata.name}</div>
                          <div className="text-xs text-center text-neutral-600">{metadata.description}</div>
                        </div>

                        <div>
                          <div className="flex justify-center divide-x divide-neutral-200">
                            <RatingDisplay label="Intelligence" rating={metadata.intelligence} icon={BrainIcon} />
                            <RatingDisplay label="Speed" rating={metadata.speed} icon={SpeedIcon} />
                          </div>

                          <div className="mt-4 flex justify-center">
                            <div className="text-xs bg-gray-100 border border-gray-200 rounded-full px-3 py-1 inline-flex items-center">
                              <span className="text-gray-500 mr-2">Size:</span>
                              <span className="font-medium">{metadata.size}</span>
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
