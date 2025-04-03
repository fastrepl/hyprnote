import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Channel } from "@tauri-apps/api/core";
import { Check, ChevronDown, Download, FlaskConical, Languages, Mic, Wand2 } from "lucide-react";
import { useState } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { Progress } from "@hypr/ui/components/ui/progress";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { generateText, modelProvider } from "@hypr/utils/ai";

export default function LocalAI() {
  const queryClient = useQueryClient();

  const sttRunning = useQuery({
    queryKey: ["local-stt", "running"],
    queryFn: async () => localSttCommands.isServerRunning(),
    refetchInterval: 3000,
  });

  const llmRunning = useQuery({
    queryKey: ["local-llm", "running"],
    queryFn: async () => localLlmCommands.isServerRunning(),
    refetchInterval: 3000,
  });

  return (
    <div className="space-y-6">
      <SpeechToTextDetails isRunning={!!sttRunning.data} queryClient={queryClient} />
      <LanguageModelContainer isRunning={!!llmRunning.data} queryClient={queryClient} />
    </div>
  );
}

function SpeechToTextDetails({
  isRunning,
  queryClient,
}: {
  isRunning: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

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

  // Query to check if the speed model is downloaded
  const speedModelStatus = useQuery({
    queryKey: ["local-stt", "model-downloaded", "QuantizedTinyEn"],
    queryFn: async () => {
      const isDownloaded = await localSttCommands.isModelDownloaded("QuantizedTinyEn");
      return isDownloaded;
    },
    enabled: isRunning,
  });

  // Query to check if the quality model is downloaded
  const qualityModelStatus = useQuery({
    queryKey: ["local-stt", "model-downloaded", "QuantizedLargeV3Turbo"],
    queryFn: async () => {
      const isDownloaded = await localSttCommands.isModelDownloaded("QuantizedLargeV3Turbo");
      return isDownloaded;
    },
    enabled: isRunning,
  });

  const setCurrentModel = useMutation({
    mutationFn: async (model: SupportedModel) => {
      // If trying to set to a model that's not downloaded yet
      if ((model === "QuantizedTinyEn" && !speedModelStatus.data) || 
          (model === "QuantizedLargeV3Turbo" && !qualityModelStatus.data)) {
        setIsDownloading(true);
        const channel = new Channel<number>();

        channel.onmessage = (progress) => {
          setDownloadProgress(progress);
          if (progress >= 100) {
            setIsDownloading(false);
            localSttCommands.setCurrentModel(model);
            queryClient.invalidateQueries({ queryKey: ["local-stt", "current-model"] });
            queryClient.invalidateQueries({ queryKey: ["local-stt", "model-downloaded", model] });
          }
        };

        await localSttCommands.downloadModel(model, channel);
        return;
      }

      await localSttCommands.setCurrentModel(model);
    },
    onSuccess: () => {
      if (!isDownloading) {
        queryClient.invalidateQueries({ queryKey: ["local-stt", "current-model"] });
      }
    },
  });

  const downloadSpeedModel = useMutation({
    mutationFn: async () => {
      setIsDownloading(true);
      const channel = new Channel<number>();

      channel.onmessage = (progress) => {
        setDownloadProgress(progress);
        if (progress >= 100) {
          setIsDownloading(false);
          queryClient.invalidateQueries({ queryKey: ["local-stt", "model-downloaded", "QuantizedTinyEn"] });
        }
      };

      await localSttCommands.downloadModel("QuantizedTinyEn", channel);
    },
  });

  const downloadQualityModel = useMutation({
    mutationFn: async () => {
      setIsDownloading(true);
      const channel = new Channel<number>();

      channel.onmessage = (progress) => {
        setDownloadProgress(progress);
        if (progress >= 100) {
          setIsDownloading(false);
          queryClient.invalidateQueries({ queryKey: ["local-stt", "model-downloaded", "QuantizedLargeV3Turbo"] });
        }
      };

      await localSttCommands.downloadModel("QuantizedLargeV3Turbo", channel);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-6 items-center justify-center">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium">
                <Trans>Local Speech-to-Text</Trans>
              </div>
              <div className="text-xs text-muted-foreground">
                <Trans>Run speech recognition locally for enhanced privacy</Trans>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRunning
              ? (
                <div className="flex items-center gap-1.5">
                  <div className="relative h-2 w-2">
                    <div className="absolute inset-0 rounded-full bg-green-500/30"></div>
                    <div className="absolute inset-0 rounded-full bg-green-500 animate-ping"></div>
                  </div>
                  <span className="text-xs text-green-600">
                    <Trans>Active</Trans>
                  </span>
                </div>
              )
              : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleLocalStt.mutate()}
                  disabled={toggleLocalStt.isPending}
                  className="min-w-20 text-center"
                >
                  {toggleLocalStt.isPending
                    ? (
                      <>
                        <Spinner />
                        <Trans>Loading...</Trans>
                      </>
                    )
                    : <Trans>Start Server</Trans>}
                </Button>
              )}
          </div>
        </div>

        {isRunning && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-6 items-center justify-center">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">
                    <Trans>Model Selection</Trans>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <Trans>Choose between speed and quality for speech recognition</Trans>
                  </div>
                </div>
              </div>

              {isDownloading
                ? <Progress value={downloadProgress} className="h-2 w-20" />
                : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!isRunning || setCurrentModel.isPending}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-w-20 text-center"
                        disabled={!isRunning || setCurrentModel.isPending}
                      >
                        {setCurrentModel.isPending ? <Spinner /> : null}
                        {currentModel.data === "QuantizedLargeV3Turbo" ? <Trans>Quality</Trans> : <Trans>Speed</Trans>}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => speedModelStatus.data 
                          ? setCurrentModel.mutate("QuantizedTinyEn") 
                          : downloadSpeedModel.mutate()}
                        disabled={currentModel.data === "QuantizedTinyEn" || isDownloading}
                        className="flex items-center gap-2"
                      >
                        <Trans>Speed (tiny-en)</Trans>
                        {currentModel.data === "QuantizedTinyEn" && <Check className="h-3 w-3 ml-2" />}
                        {!speedModelStatus.data && (
                          downloadSpeedModel.isPending 
                            ? <Spinner className="h-3 w-3 ml-2" /> 
                            : <Download className="h-3 w-3 ml-2" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => qualityModelStatus.data 
                          ? setCurrentModel.mutate("QuantizedLargeV3Turbo") 
                          : downloadQualityModel.mutate()}
                        disabled={currentModel.data === "QuantizedLargeV3Turbo" || isDownloading}
                        className="flex items-center gap-2"
                      >
                        <Trans>Quality (v3 large)</Trans>
                        {currentModel.data === "QuantizedLargeV3Turbo" && <Check className="h-3 w-3 ml-2" />}
                        {!qualityModelStatus.data && (
                          downloadQualityModel.isPending 
                            ? <Spinner className="h-3 w-3 ml-2" /> 
                            : <Download className="h-3 w-3 ml-2" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LanguageModelContainer({
  isRunning,
  queryClient,
}: {
  isRunning: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-6 items-center justify-center">
              <Languages className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium">
                <Trans>Local Language Model</Trans>
              </div>
              <div className="text-xs text-muted-foreground">
                <Trans>Run language models locally for enhanced privacy</Trans>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRunning
              ? (
                <div className="flex items-center gap-1.5">
                  <div className="relative h-2 w-2">
                    <div className="absolute inset-0 rounded-full bg-green-500/30"></div>
                    <div className="absolute inset-0 rounded-full bg-green-500 animate-ping"></div>
                  </div>
                  <span className="text-xs text-green-600">
                    <Trans>Active</Trans>
                  </span>
                </div>
              )
              : (
                <LocalLlmButton
                  isRunning={isRunning}
                  queryClient={queryClient}
                />
              )}
          </div>
        </div>

        {isRunning && (
          <div className="mt-4 border-t pt-4">
            <TestModelButton
              isRunning={isRunning}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LocalLlmButton({
  isRunning,
  queryClient,
}: {
  isRunning: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const toggleLocalLlmServer = useMutation({
    mutationFn: async () => {
      if (!isRunning) {
        await localLlmCommands.startServer();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-llm", "running"] });
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => toggleLocalLlmServer.mutate()}
      disabled={toggleLocalLlmServer.isPending}
      className="min-w-20 text-center"
    >
      {toggleLocalLlmServer.isPending
        ? (
          <>
            <Spinner />
            <Trans>Loading...</Trans>
          </>
        )
        : <Trans>Start Server</Trans>}
    </Button>
  );
}

function TestModelButton({ isRunning }: { isRunning: boolean }) {
  const [testSuccess, setTestSuccess] = useState(false);

  const checkLLM = useMutation({
    mutationFn: async () => {
      const provider = await modelProvider();
      const { text } = await generateText({
        model: provider.languageModel("any"),
        messages: [{ role: "user", content: "generate just 1 sentences" }],
      });

      if (!text) {
        throw new Error("no text");
      }
      return text;
    },
    onError: (error) => {
      console.error(error);
      setTestSuccess(false);
    },
    onSuccess: () => {
      setTestSuccess(true);
    },
  });

  if (!isRunning) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-6 items-center justify-center">
          <FlaskConical className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium">
            <Trans>Test Language Model</Trans>
          </div>
          <div className="text-xs text-muted-foreground">
            {testSuccess
              ? <Trans>Model is working correctly</Trans>
              : <Trans>Verify that your local language model is working correctly</Trans>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {testSuccess
          ? <Check className="text-green-500 h-4 w-4" />
          : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkLLM.mutate()}
              disabled={checkLLM.isPending}
              className="min-w-20 text-center"
            >
              {checkLLM.isPending
                ? (
                  <>
                    <Spinner />
                    <Trans>Testing...</Trans>
                  </>
                )
                : <Trans>Test Model</Trans>}
            </Button>
          )}
      </div>
    </div>
  );
}
