import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainIcon, DownloadIcon, MicIcon, SparklesIcon, Zap as SpeedIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { showSttModelDownloadToast } from "@/components/toast/shared";
import { commands as connectorCommands, type Connection } from "@hypr/plugin-connector";
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
import { Input } from "@hypr/ui/components/ui/input";
import { Label } from "@hypr/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@hypr/ui/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import { cn } from "@hypr/ui/lib/utils";
import { toast } from "sonner";

const endpointSchema = z.object({
  model: z.string().min(1),
  api_base: z.string().url({ message: "Please enter a valid URL" }).min(1, { message: "URL is required" }).refine(
    (value) => {
      const v1Needed = ["openai", "openrouter"].some((host) => value.includes(host));
      if (v1Needed && !value.endsWith("/v1")) {
        return false;
      }

      return true;
    },
    { message: "Should end with '/v1'" },
  ).refine(
    (value) => !value.includes("chat/completions"),
    { message: "`/chat/completions` will be appended automatically" },
  ),
  api_key: z.string().optional(),
});
type FormValues = z.infer<typeof endpointSchema>;

const sttModelMetadata: Record<SupportedModel, {
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
    intelligence: 3,
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
    description: "Highest accuracy, potentially faster than standard large. Resource intensive.",
    intelligence: 3,
    speed: 1,
    size: "874 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "multilingual",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-large-v3-turbo-q8_0.bin",
  },
};

export default function LocalAI() {
  const queryClient = useQueryClient();
  const [downloadingModelName, setDownloadingModelName] = useState<string | null>(null);

  const customLLMConnection = useQuery({
    queryKey: ["custom-llm-connection"],
    queryFn: () => connectorCommands.getCustomLlmConnection(),
  });

  const getCustomLLMModel = useQuery({
    queryKey: ["custom-llm-model"],
    queryFn: () => connectorCommands.getCustomLlmModel(),
  });

  const setCustomLLMModel = useMutation({
    mutationFn: (model: string) => connectorCommands.setCustomLlmModel(model),
  });

  const setCustomLLMConnection = useMutation({
    mutationFn: (connection: Connection) => connectorCommands.setCustomLlmConnection(connection),
    onError: console.error,
    onSuccess: () => {
      customLLMConnection.refetch();
    },
  });

  const customLLMEnabled = useQuery({
    queryKey: ["custom-llm-enabled"],
    queryFn: () => connectorCommands.getCustomLlmEnabled(),
  });

  const setCustomLLMEnabled = useMutation({
    mutationFn: (enabled: boolean) => connectorCommands.setCustomLlmEnabled(enabled),
    onSuccess: () => {
      customLLMEnabled.refetch();
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(endpointSchema),
    mode: "onChange",
  });

  useEffect(() => {
    form.reset({
      model: getCustomLLMModel.data || "",
      api_base: customLLMConnection.data?.api_base || "",
      api_key: customLLMConnection.data?.api_key || "",
    });
  }, [getCustomLLMModel.data, customLLMConnection.data]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (!form.formState.errors.model && value.model) {
        setCustomLLMModel.mutate(value.model);
      }

      if (!form.formState.errors.api_base && value.api_base) {
        setCustomLLMConnection.mutate({
          api_base: value.api_base,
          api_key: value.api_key || null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const currentSTTModel = useQuery({
    queryKey: ["local-stt", "current-model"],
    queryFn: () => localSttCommands.getCurrentModel(),
  });

  const setCurrentSTTModel = useMutation({
    mutationFn: (model: SupportedModel) => localSttCommands.setCurrentModel(model),
    onSuccess: () => {
      currentSTTModel.refetch();
    },
  });

  const supportedSTTModels = useQuery({
    queryKey: ["local-stt", "supported-models"],
    queryFn: async () => {
      const models = await localSttCommands.listSupportedModels();
      const downloadedModels = await Promise.all(models.map((model) => localSttCommands.isModelDownloaded(model)));
      return models.map((model, index) => ({ model, isDownloaded: downloadedModels[index] }));
    },
  });

  const isLocalEndpoint = () => {
    const apiBase = form.watch("api_base");
    return apiBase && (apiBase.includes("localhost") || apiBase.includes("127.0.0.1"));
  };

  const currentLLM = customLLMEnabled.data ? "custom" : "llama-3.2-3b-q4";

  return (
    <Tabs defaultValue="stt" className="flex flex-col">
      <TabsList className="grid grid-cols-2 w-fit">
        <TabsTrigger value="stt">
          <MicIcon className="w-4 h-4 mr-2" />
          <Trans>Transcribing</Trans>
        </TabsTrigger>
        <TabsTrigger value="llm">
          <SparklesIcon className="w-4 h-4 mr-2" />
          <Trans>Enhancing</Trans>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="stt" className="mt-4 flex-1 flex flex-col">
        <RadioGroup
          defaultValue={currentSTTModel.data}
          onValueChange={(value) => {
            setCurrentSTTModel.mutate(value as SupportedModel);
          }}
          className="flex flex-col gap-4 flex-1"
        >
          {supportedSTTModels.data?.map((model) => {
            const metadata = sttModelMetadata[model.model as keyof typeof sttModelMetadata];
            const isSelected = currentSTTModel.data === model.model;
            const isDownloaded = model.isDownloaded;
            const isCurrentlyDownloading = downloadingModelName === model.model;

            return (
              <Label
                htmlFor={model.model}
                onClick={(e) => {
                  if (!isDownloaded) {
                    e.preventDefault();
                    toast.info("You need to download this model first to be able to use it.", {
                      duration: 2500,
                    });
                  }
                }}
                className={cn(
                  "rounded-lg p-4 flex flex-col transition-all",
                  isDownloaded
                    ? isSelected
                      ? "border border-blue-500 ring-2 ring-blue-500 bg-blue-50 cursor-pointer"
                      : "border border-neutral-200 bg-white cursor-pointer hover:border-neutral-300"
                    : "border border-neutral-300 bg-neutral-100",
                  !metadata && "items-center",
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <RadioGroupItem
                        value={model.model}
                        id={model.model}
                        className="peer sr-only"
                        disabled={!isDownloaded}
                      />

                      <a
                        href={metadata?.huggingface}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline decoration-dotted"
                      >
                        {metadata?.name || model.model}
                      </a>
                    </div>
                  </div>

                  {metadata?.description && (
                    <div className="text-xs text-neutral-600">
                      {metadata.description}
                    </div>
                  )}
                </div>

                {metadata && (
                  <div className="mt-4 pt-4 border-t border-neutral-200 flex items-center justify-between w-full">
                    <div className="flex divide-x divide-neutral-200 -mx-2">
                      <RatingDisplay label="Intelligence" rating={metadata.intelligence} icon={BrainIcon} />
                      <RatingDisplay label="Speed" rating={metadata.speed} icon={SpeedIcon} />
                      <LanguageDisplay support={metadata.languageSupport} />
                    </div>

                    <div className="flex flex-col items-end space-y-1.5">
                      {!isDownloaded
                        && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (isCurrentlyDownloading || supportedSTTModels.isFetching) {
                                return;
                              }

                              setDownloadingModelName(model.model);

                              try {
                                showSttModelDownloadToast(model.model, () => {
                                  queryClient.invalidateQueries({ queryKey: ["local-stt", "supported-models"] })
                                    .catch((invalidationError) => {
                                      console.error(
                                        `Error during query invalidation for ${model.model}:`,
                                        invalidationError,
                                      );
                                    })
                                    .finally(() => {
                                      setDownloadingModelName(null);
                                    });
                                });
                              } catch (error) {
                                console.error(`Error initiating STT model download for ${model.model}:`, error);
                                setDownloadingModelName(null);
                              }
                            }}
                            disabled={supportedSTTModels.isFetching || isCurrentlyDownloading}
                          >
                            <DownloadIcon className="w-4 h-4" />
                            <Trans>Download {metadata?.size && `(${metadata.size})`}</Trans>
                          </Button>
                        )}
                    </div>
                  </div>
                )}
              </Label>
            );
          })}
          {!supportedSTTModels.data?.length && (
            <div className="text-sm text-neutral-500 py-2 text-center">
              <Trans>No speech-to-text models available or failed to load.</Trans>
            </div>
          )}
        </RadioGroup>
      </TabsContent>

      <TabsContent value="llm" className="mt-4">
        <RadioGroup
          value={currentLLM}
          onValueChange={(value) => {
            setCustomLLMEnabled.mutate(value === "custom");
          }}
          className="space-y-4"
        >
          <Label
            htmlFor="llama-3.2-3b-q4"
            className={cn(
              "p-4 rounded-lg shadow-sm transition-all duration-150 ease-in-out",
              currentLLM === "llama-3.2-3b-q4"
                ? "border border-blue-500 ring-2 ring-blue-500 bg-blue-50"
                : "border border-neutral-200 bg-white hover:border-neutral-300",
              "cursor-pointer flex flex-col gap-2",
            )}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="llama-3.2-3b-q4" id="llama-3.2-3b-q4" className="peer sr-only" />
                <div className="flex flex-col">
                  <span className="font-medium">
                    <Trans>Default (llama-3.2-3b-q4)</Trans>
                  </span>
                  <p className="text-xs font-normal text-neutral-500 mt-1">
                    <Trans>Use the local Llama 3.2 model for enhanced privacy and offline capability.</Trans>
                  </p>
                </div>
              </div>
            </div>
          </Label>

          <Label
            htmlFor="custom"
            className={cn(
              "p-4 rounded-lg shadow-sm transition-all duration-150 ease-in-out",
              currentLLM === "custom"
                ? "border border-blue-500 ring-2 ring-blue-500 bg-blue-50"
                : "border border-neutral-200 bg-white hover:border-neutral-300",
              "cursor-pointer flex flex-col gap-2",
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="custom" id="custom" className="peer sr-only" />
                <div className="flex flex-col">
                  <span className="font-medium">
                    <Trans>Custom Endpoint</Trans>
                  </span>
                  <p className="text-xs font-normal text-neutral-500 mt-1">
                    <Trans>Connect to a self-hosted or third-party LLM endpoint (OpenAI API compatible).</Trans>
                  </p>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "mt-4 pt-4 border-t transition-opacity duration-200",
                customLLMEnabled.data ? "opacity-100" : "opacity-50 pointer-events-none",
              )}
            >
              <Form {...form}>
                <form className="space-y-4">
                  <FormField
                    control={form.control}
                    name="api_base"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          <Trans>API Base URL</Trans>
                        </FormLabel>
                        <FormDescription className="text-xs">
                          <Trans>
                            Enter the base URL for your custom LLM endpoint (e.g., http://localhost:8080/v1)
                          </Trans>
                        </FormDescription>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="http://localhost:8080/v1"
                            disabled={!customLLMEnabled.data}
                            className="focus-visible:ring-1 focus-visible:ring-offset-0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!isLocalEndpoint() && (
                    <FormField
                      control={form.control}
                      name="api_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            <Trans>API Key</Trans>
                          </FormLabel>
                          <FormDescription className="text-xs">
                            <Trans>Enter the API key for your custom LLM endpoint</Trans>
                          </FormDescription>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="sk-..."
                              disabled={!customLLMEnabled.data}
                              className="focus-visible:ring-1 focus-visible:ring-offset-0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          <Trans>Model Name</Trans>
                        </FormLabel>
                        <FormDescription className="text-xs">
                          <Trans>
                            Enter the exact model name required by your endpoint (if applicable).
                          </Trans>
                        </FormDescription>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., QuantizedTiny, llama3"
                            disabled={!customLLMEnabled.data}
                            className="focus-visible:ring-1 focus-visible:ring-offset-0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
          </Label>
        </RadioGroup>
      </TabsContent>
    </Tabs>
  );
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
            i < rating ? "text-black fill-current" : "text-neutral-300",
          )}
          strokeWidth={i < rating ? 0 : 1.5}
        />
      ))}
    </div>
  </div>
);

const LanguageDisplay = ({ support }: { support: "multilingual" | "english-only" }) => {
  return (
    <div className="flex flex-col items-center px-2">
      <span className="text-[10px] text-neutral-500 uppercase font-medium tracking-wider mb-1.5">
        Language
      </span>
      <div className="text-xs font-medium">
        {support === "multilingual" ? "Multilingual" : "English Only"}
      </div>
    </div>
  );
};
