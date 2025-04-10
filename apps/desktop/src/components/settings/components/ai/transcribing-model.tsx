import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Channel } from "@tauri-apps/api/core";
import { Download, Mic } from "lucide-react";
import { useState } from "react";

import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { Progress } from "@hypr/ui/components/ui/progress";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { RadioGroup, RadioGroupItem } from "@hypr/ui/components/ui/radio-group";
import { Label } from "@hypr/ui/components/ui/label";

interface TranscribingModelProps {
  isRunning: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}

export function TranscribingModel({
  isRunning,
  queryClient,
}: TranscribingModelProps) {
  const [speedModelProgress, setSpeedModelProgress] = useState(0);
  const [qualityModelProgress, setQualityModelProgress] = useState(0);
  const [isSpeedModelDownloading, setIsSpeedModelDownloading] = useState(false);
  const [isQualityModelDownloading, setIsQualityModelDownloading] =
    useState(false);

  const toggleLocalStt = useMutation({
    mutationFn: async () => {
      if (!isRunning) {
        await localSttCommands.startServer();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-stt", "running"] });
    },
  });

  const currentModel = useQuery({
    queryKey: ["local-stt", "current-model"],
    queryFn: () => localSttCommands.getCurrentModel(),
    enabled: isRunning,
  });

  const speedModelStatus = useQuery({
    queryKey: ["local-stt", "model-downloaded", "QuantizedBaseEn"],
    queryFn: async () => {
      const isDownloaded = await localSttCommands.isModelDownloaded(
        "QuantizedBaseEn"
      );
      return isDownloaded;
    },
    enabled: isRunning,
  });

  const qualityModelStatus = useQuery({
    queryKey: ["local-stt", "model-downloaded", "QuantizedSmallEn"],
    queryFn: async () => {
      const isDownloaded = await localSttCommands.isModelDownloaded(
        "QuantizedSmallEn"
      );
      return isDownloaded;
    },
    enabled: isRunning,
  });

  const setCurrentModel = useMutation({
    mutationFn: async (model: SupportedModel) => {
      if (model === "QuantizedBaseEn" && !speedModelStatus.data) {
        setIsSpeedModelDownloading(true);
        const channel = new Channel<number>();

        channel.onmessage = (progress) => {
          setSpeedModelProgress(progress);
          if (progress >= 100) {
            setIsSpeedModelDownloading(false);
            localSttCommands.setCurrentModel(model);
            queryClient.invalidateQueries({
              queryKey: ["local-stt", "current-model"],
            });
            queryClient.invalidateQueries({
              queryKey: ["local-stt", "model-downloaded", model],
            });
          }
        };

        await localSttCommands.downloadModel(model, channel);
        return;
      } else if (model === "QuantizedSmallEn" && !qualityModelStatus.data) {
        setIsQualityModelDownloading(true);
        const channel = new Channel<number>();

        channel.onmessage = (progress) => {
          setQualityModelProgress(progress);
          if (progress >= 100) {
            setIsQualityModelDownloading(false);
            localSttCommands.setCurrentModel(model);
            queryClient.invalidateQueries({
              queryKey: ["local-stt", "current-model"],
            });
            queryClient.invalidateQueries({
              queryKey: ["local-stt", "model-downloaded", model],
            });
          }
        };

        await localSttCommands.downloadModel(model, channel);
        return;
      }

      await localSttCommands.setCurrentModel(model);
    },
    onSuccess: () => {
      if (!isSpeedModelDownloading && !isQualityModelDownloading) {
        queryClient.invalidateQueries({
          queryKey: ["local-stt", "current-model"],
        });
      }
    },
  });

  const downloadSpeedModel = useMutation({
    mutationFn: async () => {
      setIsSpeedModelDownloading(true);
      const channel = new Channel<number>();

      channel.onmessage = (progress) => {
        setSpeedModelProgress(progress);
        if (progress >= 100) {
          setIsSpeedModelDownloading(false);
          queryClient.invalidateQueries({
            queryKey: ["local-stt", "model-downloaded", "QuantizedTinyEn"],
          });
        }
      };

      await localSttCommands.downloadModel("QuantizedTinyEn", channel);
    },
  });

  const downloadQualityModel = useMutation({
    mutationFn: async () => {
      setIsQualityModelDownloading(true);
      const channel = new Channel<number>();

      channel.onmessage = (progress) => {
        setQualityModelProgress(progress);
        if (progress >= 100) {
          setIsQualityModelDownloading(false);
          queryClient.invalidateQueries({
            queryKey: ["local-stt", "model-downloaded", "QuantizedSmallEn"],
          });
        }
      };

      await localSttCommands.downloadModel("QuantizedSmallEn", channel);
    },
  });

  const anyDownloading = isSpeedModelDownloading || isQualityModelDownloading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-6 items-center justify-center">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium">
                <Trans>Transcribing Model</Trans>
              </div>
              <div className="text-xs text-muted-foreground">
                <Trans>
                  Run voice transcription locally for enhanced privacy
                </Trans>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <div className="flex items-center gap-1.5">
                <div className="relative h-2 w-2">
                  <div className="absolute inset-0 rounded-full bg-green-500/30"></div>
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-ping"></div>
                </div>
                <span className="text-xs text-green-600">
                  <Trans>Active</Trans>
                </span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleLocalStt.mutate()}
                disabled={toggleLocalStt.isPending}
                className="min-w-20 text-center"
              >
                {toggleLocalStt.isPending ? (
                  <>
                    <Spinner />
                    <Trans>Loading...</Trans>
                  </>
                ) : (
                  <Trans>Start Server</Trans>
                )}
              </Button>
            )}
          </div>
        </div>

        {isRunning && (
          <div className="mt-2">
            <RadioGroup
              value={currentModel.data || ""}
              disabled={
                !isRunning || setCurrentModel.isPending || anyDownloading
              }
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="QuantizedTinyEn"
                  id="speed-model"
                  disabled={!speedModelStatus.data && anyDownloading}
                  onClick={() =>
                    speedModelStatus.data
                      ? setCurrentModel.mutate("QuantizedTinyEn")
                      : downloadSpeedModel.mutate()
                  }
                />
                <Label
                  htmlFor="speed-model"
                  className="flex items-center cursor-pointer"
                >
                  <span>
                    <Trans>Speed (base-en)</Trans>
                  </span>
                  {!speedModelStatus.data &&
                    (isSpeedModelDownloading ? (
                      <div className="flex items-center ml-2 w-24">
                        <Progress
                          value={speedModelProgress}
                          className="h-2 w-16 mr-1"
                        />
                        <span className="text-xs text-muted-foreground">
                          {speedModelProgress}%
                        </span>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 ml-2 text-xs flex items-center gap-1 px-2"
                      >
                        <Download className="h-3 w-3" />
                        <Trans>Needs download</Trans>
                      </Button>
                    ))}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="QuantizedSmallEn"
                  id="quality-model"
                  disabled={!qualityModelStatus.data && anyDownloading}
                  onClick={() =>
                    qualityModelStatus.data
                      ? setCurrentModel.mutate("QuantizedSmallEn")
                      : downloadQualityModel.mutate()
                  }
                />
                <Label
                  htmlFor="quality-model"
                  className="flex items-center cursor-pointer"
                >
                  <span>
                    <Trans>Quality (small-en)</Trans>
                  </span>
                  {!qualityModelStatus.data &&
                    (isQualityModelDownloading ? (
                      <div className="flex items-center ml-2 w-24">
                        <Progress
                          value={qualityModelProgress}
                          className="h-2 w-16 mr-1"
                        />
                        <span className="text-xs text-muted-foreground">
                          {qualityModelProgress}%
                        </span>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 ml-2 text-xs flex items-center gap-1 px-2"
                      >
                        <Download className="h-3 w-3" />
                        <Trans>Needs download</Trans>
                      </Button>
                    ))}
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </div>
    </div>
  );
}
