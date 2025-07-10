import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Channel } from "@tauri-apps/api/core";
import { BrainIcon, Zap as SpeedIcon } from "lucide-react";
import React, { useState } from "react";

import { Card, CardContent } from "@hypr/ui/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@hypr/ui/components/ui/carousel";

import { DownloadProgress } from "@/components/toast/shared";
import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
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
  <div className="flex flex-col items-center px-2">
    <span className="text-[10px] text-neutral-500 uppercase font-medium tracking-wider mb-1.5">{label}</span>
    <div className="flex space-x-1">
      {[...Array(maxRating)].map((_, i) => (
        <Icon
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i < rating ? "text-blue-500" : "text-neutral-300",
          )}
        />
      ))}
    </div>
  </div>
);

export const ModelSelectionView = ({
  onContinue,
  onModelSelected,
}: {
  onContinue: (model: SupportedModel) => void;
  onModelSelected?: (model: SupportedModel) => void;
}) => {
  const [selectedModel, setSelectedModel] = useState<SupportedModel>("QuantizedSmall");
  const [isDownloading, setIsDownloading] = useState(false);
  const [sttChannel, setSttChannel] = useState<Channel<number> | null>(null);
  const [llmChannel, setLlmChannel] = useState<Channel<number> | null>(null);
  const [sttComplete, setSttComplete] = useState(false);
  const [llmComplete, setLlmComplete] = useState(false);
  const [modelsAlreadyInstalled, setModelsAlreadyInstalled] = useState(false);
  const [sttAlreadyInstalled, setSttAlreadyInstalled] = useState(false);
  const [llmAlreadyInstalled, setLlmAlreadyInstalled] = useState(false);

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

  const handleContinue = async () => {
    // Notify parent about model selection for mutation
    onModelSelected?.(selectedModel);

    setIsDownloading(true);

    // Check if models are already downloaded
    const [sttDownloaded, llmDownloaded] = await Promise.all([
      localSttCommands.isModelDownloaded(selectedModel),
      localLlmCommands.isModelDownloaded(),
    ]);

    if (sttDownloaded && llmDownloaded) {
      // Both models already downloaded, show feedback then proceed
      setModelsAlreadyInstalled(true);
      setSttAlreadyInstalled(true);
      setLlmAlreadyInstalled(true);
      setSttComplete(true);
      setLlmComplete(true);

      // Show the "already installed" message for 2 seconds then proceed
      setTimeout(() => {
        onContinue(selectedModel);
      }, 2000);
      return;
    }

    if (sttDownloaded) {
      // STT already downloaded, mark as complete
      setSttAlreadyInstalled(true);
      setSttComplete(true);
    } else {
      // Start STT model download
      const sttDownloadChannel = new Channel<number>();
      setSttChannel(sttDownloadChannel);
      localSttCommands.downloadModel(selectedModel, sttDownloadChannel);
    }

    if (llmDownloaded) {
      // LLM already downloaded, mark as complete
      setLlmAlreadyInstalled(true);
      setLlmComplete(true);
    } else {
      // Start LLM model download
      const llmDownloadChannel = new Channel<number>();
      setLlmChannel(llmDownloadChannel);
      localLlmCommands.downloadModel(llmDownloadChannel);
    }
  };

  const handleSttComplete = () => {
    setSttComplete(true);
    localSttCommands.startServer();
  };

  const handleLlmComplete = () => {
    setLlmComplete(true);
    localLlmCommands.startServer();
  };

  // Proceed to next step when both downloads are complete (but not when already installed)
  React.useEffect(() => {
    if (sttComplete && llmComplete && !modelsAlreadyInstalled) {
      onContinue(selectedModel);
    }
  }, [sttComplete, llmComplete, selectedModel, onContinue, modelsAlreadyInstalled]);

  if (isDownloading) {
    return (
      <div className="flex flex-col items-center max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-2 text-center">
          {modelsAlreadyInstalled ? <Trans>Your Private AI is Ready</Trans> : <Trans>Setting Up…</Trans>}
        </h2>
        <p className="text-sm text-muted-foreground mb-8 text-center">
          {modelsAlreadyInstalled
            ? <Trans>Your secure, on-device AI is ready to keep your notes private.</Trans>
            : <Trans>Downloading AI models (~2GB). This is a one-time setup.</Trans>}
        </p>

        <div className="w-full space-y-6">
          {/* STT Model Download */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">HyperWhisper</span>
                <span className="text-xs text-neutral-500">Transcribes locally</span>
              </div>
              {sttComplete && (
                <span className="text-xs text-neutral-600">
                  ✓ {sttAlreadyInstalled ? "Already Installed" : "Complete"}
                </span>
              )}
            </div>
            {sttChannel && (
              <DownloadProgress
                channel={sttChannel}
                onComplete={handleSttComplete}
              />
            )}
            {sttComplete && !sttChannel && (
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div className="bg-neutral-600 h-2 rounded-full w-full"></div>
              </div>
            )}
          </div>

          {/* LLM Model Download */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">HyperLLM</span>
                <span className="text-xs text-neutral-500">Summarizes securely</span>
              </div>
              {llmComplete && (
                <span className="text-xs text-neutral-600">
                  ✓ {llmAlreadyInstalled ? "Already Installed" : "Complete"}
                </span>
              )}
            </div>
            {llmChannel && (
              <DownloadProgress
                channel={llmChannel}
                onComplete={handleLlmComplete}
              />
            )}
            {llmComplete && !llmChannel && (
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div className="bg-neutral-600 h-2 rounded-full w-full"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-2 text-center">
        <Trans>Setting up your private AI</Trans>
      </h2>
      <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
        <Trans>
          Choose your transcription model. All processing happens locally on your device to keep your conversations
          private.
        </Trans>
      </p>

      <div className="w-full mb-8">
        <Carousel
          opts={{
            align: "start",
          }}
          className="w-full max-w-lg"
        >
          <CarouselContent>
            {supportedSTTModels.data?.map(modelInfo => {
              const model = modelInfo.model;
              const metadata = sttModelMetadata[model as SupportedModel];
              if (!metadata) {
                return null;
              }

              const isSelected = selectedModel === model;

              return (
                <CarouselItem key={model} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-1">
                    <Card
                      className={cn(
                        "cursor-pointer transition-all duration-200",
                        isSelected
                          ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50"
                          : "hover:border-gray-400",
                      )}
                      onClick={() => setSelectedModel(model as SupportedModel)}
                    >
                      <CardContent className="flex flex-col gap-4 justify-between p-5 h-56">
                        <div className="flex-1 text-center">
                          <div className="text-lg font-medium mb-4">{metadata.name}</div>
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
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <div className="mt-4">
            <CarouselPrevious className="-left-4" />
            <CarouselNext className="-right-4" />
          </div>
        </Carousel>
      </div>

      <PushableButton
        onClick={handleContinue}
        className="w-full max-w-sm"
        disabled={!selectedModel}
      >
        <Trans>Start Setup</Trans>
      </PushableButton>
    </div>
  );
};
