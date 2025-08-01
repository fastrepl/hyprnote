import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, FolderIcon, InfoIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@hypr/ui/components/ui/form";
import { Slider } from "@hypr/ui/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import { WERPerformanceModal } from "../wer-modal";
import { SharedSTTProps } from "./shared";

export const sttModelMetadata: Record<SupportedModel, {
  name: string;
  description: string;
  intelligence: number;
  speed: number;
  size: string;
  inputType: string[];
  outputType: string[];
  languageSupport: "multilingual" | "english-only";
  huggingface?: string;
}> = {
  "QuantizedTiny": {
    name: "Tiny",
    description: "Fastest, lowest accuracy. Good for offline, low-resource use.",
    intelligence: 1,
    speed: 3,
    size: "44 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "multilingual",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-tiny-q8_0.bin",
  },
  "QuantizedTinyEn": {
    name: "Tiny - English",
    description: "Fastest, English-only. Optimized for speed on English audio.",
    intelligence: 1,
    speed: 3,
    size: "44 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "english-only",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-tiny.en-q8_0.bin",
  },
  "QuantizedBase": {
    name: "Base",
    description: "Good balance of speed and accuracy for multilingual use.",
    intelligence: 2,
    speed: 2,
    size: "82 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "multilingual",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-base-q8_0.bin",
  },
  "QuantizedBaseEn": {
    name: "Base - English",
    description: "Balanced speed and accuracy, optimized for English audio.",
    intelligence: 2,
    speed: 2,
    size: "82 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "english-only",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-base.en-q8_0.bin",
  },
  "QuantizedSmall": {
    name: "Small",
    description: "Higher accuracy, moderate speed for multilingual transcription.",
    intelligence: 2,
    speed: 2,
    size: "264 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "multilingual",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-small-q8_0.bin",
  },
  "QuantizedSmallEn": {
    name: "Small - English",
    description: "Higher accuracy, moderate speed, optimized for English audio.",
    intelligence: 3,
    speed: 2,
    size: "264 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "english-only",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-small.en-q8_0.bin",
  },
  "QuantizedLargeTurbo": {
    name: "Large",
    description: "Highest accuracy, resource intensive. Only for Mac Pro M4 and above.",
    intelligence: 3,
    speed: 1,
    size: "874 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "multilingual",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-large-v3-turbo-q8_0.bin",
  },
};

interface STTViewProps extends SharedSTTProps {
  isWerModalOpen: boolean;
  setIsWerModalOpen: (open: boolean) => void;
}

const aiConfigSchema = z.object({
  redemptionTimeMs: z.number().int().min(300).max(1200),
});
type AIConfigValues = z.infer<typeof aiConfigSchema>;

export function STTView({
  selectedSTTModel,
  setSelectedSTTModel,
  sttModels,
  setSttModels,
  downloadingModels,
  handleModelDownload,
  handleShowFileLocation,
  isWerModalOpen,
  setIsWerModalOpen,
}: STTViewProps) {
  const queryClient = useQueryClient();

  const currentSTTModel = useQuery({
    queryKey: ["current-stt-model"],
    queryFn: () => localSttCommands.getCurrentModel(),
  });

  useEffect(() => {
    if (currentSTTModel.data) {
      setSelectedSTTModel(currentSTTModel.data);
    }
  }, [currentSTTModel.data, setSelectedSTTModel]);

  // call backend for the download status of the STT models and sets it
  const sttModelDownloadStatus = useQuery({
    queryKey: ["stt-model-download-status"],
    queryFn: async () => {
      const statusChecks = await Promise.all([
        localSttCommands.isModelDownloaded("QuantizedTiny"),
        localSttCommands.isModelDownloaded("QuantizedTinyEn"),
        localSttCommands.isModelDownloaded("QuantizedBase"),
        localSttCommands.isModelDownloaded("QuantizedBaseEn"),
        localSttCommands.isModelDownloaded("QuantizedSmall"),
        localSttCommands.isModelDownloaded("QuantizedSmallEn"),
        localSttCommands.isModelDownloaded("QuantizedLargeTurbo"),
      ]);
      return {
        "QuantizedTiny": statusChecks[0],
        "QuantizedTinyEn": statusChecks[1],
        "QuantizedBase": statusChecks[2],
        "QuantizedBaseEn": statusChecks[3],
        "QuantizedSmall": statusChecks[4],
        "QuantizedSmallEn": statusChecks[5],
        "QuantizedLargeTurbo": statusChecks[6],
      } as Record<string, boolean>;
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (sttModelDownloadStatus.data) {
      setSttModels(prev =>
        prev.map(model => ({
          ...model,
          downloaded: sttModelDownloadStatus.data[model.key] || false,
        }))
      );
    }
  }, [sttModelDownloadStatus.data, setSttModels]);

  const defaultModelKeys = ["QuantizedTiny", "QuantizedSmall", "QuantizedLargeTurbo"];
  const otherModelKeys = ["QuantizedTinyEn", "QuantizedBase", "QuantizedBaseEn", "QuantizedSmallEn"];

  const modelsToShow = sttModels.filter(model => {
    if (defaultModelKeys.includes(model.key)) {
      return true;
    }

    if (otherModelKeys.includes(model.key) && model.downloaded) {
      return true;
    }

    return false;
  });

  const config = useQuery({
    queryKey: ["config", "ai"],
    queryFn: async () => {
      const result = await dbCommands.getConfig();
      return result;
    },
  });

  const aiConfigForm = useForm<AIConfigValues>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      redemptionTimeMs: 500,
    },
  });

  useEffect(() => {
    if (config.data) {
      aiConfigForm.reset({
        redemptionTimeMs: config.data.ai.redemption_time_ms ?? 500,
      });
    }
  }, [config.data, aiConfigForm]);

  const aiConfigMutation = useMutation({
    mutationFn: async (values: AIConfigValues) => {
      if (!config.data) {
        return;
      }

      await dbCommands.setConfig({
        ...config.data,
        ai: {
          ...config.data.ai,
          redemption_time_ms: values.redemptionTimeMs ?? 500,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "ai"] });
    },
    onError: console.error,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">
          <Trans>Transcribing</Trans>
        </h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" onClick={() => setIsWerModalOpen(true)}>
              <InfoIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <Trans>Performance difference between languages</Trans>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="max-w-2xl">
        <div className="space-y-2">
          {modelsToShow.map((model) => (
            <div
              key={model.key}
              className={cn(
                "p-3 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-between",
                selectedSTTModel === model.key && model.downloaded
                  ? "border-solid border-blue-500 bg-blue-50"
                  : model.downloaded
                  ? "border-dashed border-gray-300 hover:border-gray-400 bg-white"
                  : "border-dashed border-gray-200 bg-gray-50 cursor-not-allowed",
              )}
              onClick={() => {
                if (model.downloaded) {
                  setSelectedSTTModel(model.key);
                  localSttCommands.setCurrentModel(model.key as SupportedModel);
                  localSttCommands.restartServer();
                }
              }}
            >
              <div className="flex items-center gap-6 flex-1">
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "font-semibold text-base",
                      model.downloaded ? "text-gray-900" : "text-gray-400",
                    )}
                  >
                    {model.name}
                  </h3>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        model.downloaded ? "text-gray-700" : "text-gray-400",
                      )}
                    >
                      Accuracy
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={cn(
                            "w-2 h-2 rounded-full",
                            model.accuracy >= step
                              ? "bg-green-500"
                              : "bg-gray-200",
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        model.downloaded ? "text-gray-700" : "text-gray-400",
                      )}
                    >
                      Speed
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={cn(
                            "w-2 h-2 rounded-full",
                            model.speed >= step
                              ? "bg-blue-500"
                              : "bg-gray-200",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                {model.downloaded
                  ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowFileLocation("stt");
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
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-4">
            Configuration
          </h3>
          <Form {...aiConfigForm}>
            <FormField
              control={aiConfigForm.control}
              name="redemptionTimeMs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Redemption Time ({field.value ?? 500}ms)
                  </FormLabel>
                  <FormDescription className="text-xs">
                    Lower value will cause model to output text more often, but may cause performance issues.
                  </FormDescription>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={300}
                        max={1200}
                        step={100}
                        value={[field.value || 500]}
                        onValueChange={(value) => {
                          const newValue = value[0];
                          field.onChange(newValue);
                          aiConfigMutation.mutate({ redemptionTimeMs: newValue });
                        }}
                        className="w-[60%]"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
        </div>
      </div>

      <WERPerformanceModal
        isOpen={isWerModalOpen}
        onClose={() => setIsWerModalOpen(false)}
      />
    </div>
  );
}
