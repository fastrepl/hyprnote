import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BrainIcon, DownloadIcon, HardDriveIcon, MicIcon, SparklesIcon, Zap as SpeedIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { commands as connectorCommands, type Connection } from "@hypr/plugin-connector";
import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import CursorFollowTooltip from "@hypr/ui/components/ui/cursor-tooltip";
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
import { showSttModelDownloadToast } from "../../toast/shared";

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
    size: "~40 MB",
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
    size: "~40 MB",
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
    size: "~75 MB",
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
    size: "~75 MB",
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
    size: "~250 MB",
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
    size: "~250 MB",
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
    size: "~1.5 GB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "multilingual",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-large-v3-turbo-q8_0.bin",
  },
};

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

const SpecDisplay = ({ value, icon: Icon }: { value: string; icon: React.ElementType }) => (
  <div className="flex items-center space-x-1.5 text-xs text-neutral-600">
    <Icon className="w-3.5 h-3.5 text-neutral-500" strokeWidth={1.5} />
    <span>{value}</span>
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

export default function LocalAI() {
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
    onSuccess: () => {
      customLLMModels.refetch();
    },
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

  const customLLMModels = useQuery({
    queryKey: ["custom-llm-models"],
    queryFn: () => connectorCommands.listCustomLlmModels(),
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="stt">
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

        {/* Speech-to-Text Tab */}
        <TabsContent value="stt" className="mt-4">
          <RadioGroup
            defaultValue={currentSTTModel.data}
            onValueChange={(value) => {
              setCurrentSTTModel.mutate(value as SupportedModel);
            }}
            className="grid grid-cols-1 gap-4"
          >
            {supportedSTTModels.data?.map((model) => {
              const metadata = sttModelMetadata[model.model as keyof typeof sttModelMetadata];
              const isSelected = currentSTTModel.data === model.model;
              const isDownloaded = model.isDownloaded;

              return (
                <CursorFollowTooltip
                  key={model.model}
                  tooltipContent={
                    <p>
                      <Trans>Download this model to use it.</Trans>
                    </p>
                  }
                  disabled={isDownloaded}
                >
                  <Label
                    htmlFor={model.model}
                    className={cn(
                      "border rounded-lg p-4 flex flex-col transition-all",
                      isSelected ? "border-blue-500 ring-1 ring-blue-500" : "border-neutral-200",
                      !isDownloaded && "opacity-60",
                      isDownloaded && "cursor-pointer hover:border-neutral-300",
                      !metadata && "items-center",
                    )}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem
                          value={model.model}
                          id={model.model}
                          className="peer sr-only"
                          disabled={!isDownloaded}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            <a
                              href={metadata?.huggingface}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline decoration-dotted"
                            >
                              {metadata?.name || model.model}
                            </a>
                          </span>
                          {metadata?.description && (
                            <span className="text-xs text-neutral-600 mt-1 pr-4">
                              {metadata.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isDownloaded ? null : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center p-1 -m-1 text-xs transition-colors rounded-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              showSttModelDownloadToast(model.model);
                              supportedSTTModels.refetch();
                            }}
                            disabled={supportedSTTModels.isFetching}
                          >
                            <DownloadIcon className="w-4 h-4" />
                            <Trans>Download</Trans>
                          </Button>
                        )}
                      </div>
                    </div>

                    {metadata && (
                      <div className="mt-4 pt-4 border-t border-neutral-200 flex items-center justify-between w-full">
                        <div className="flex divide-x divide-neutral-200">
                          <RatingDisplay label="Intelligence" rating={metadata.intelligence} icon={BrainIcon} />
                          <RatingDisplay label="Speed" rating={metadata.speed} icon={SpeedIcon} />
                          <LanguageDisplay support={metadata.languageSupport} />
                        </div>

                        <div className="flex flex-col items-end space-y-1.5">
                          <SpecDisplay value={metadata.size} icon={HardDriveIcon} />
                        </div>
                      </div>
                    )}
                  </Label>
                </CursorFollowTooltip>
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
            value={customLLMEnabled.data ? "custom" : "llama-3.2-3b-q4"}
            onValueChange={(value) => {
              setCustomLLMEnabled.mutate(value === "custom");
            }}
            className="space-y-4"
          >
            <Label
              htmlFor="default-llm"
              className={cn(
                "border rounded-md p-4 transition-all block",
                !customLLMEnabled.data
                  ? "ring-1 ring-blue-500 border-blue-500"
                  : "border-neutral-200 cursor-pointer hover:border-neutral-300",
              )}
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="llama-3.2-3b-q4" id="default-llm" className="peer sr-only" />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      <Trans>Default (llama-3.2-3b-q4)</Trans>
                    </span>
                    <p className="text-xs font-normal text-neutral-500 mt-1">
                      <Trans>Use the local Llama 3.2 model for enhanced privacy and offline capability.</Trans>
                    </p>
                  </div>
                </div>
                {/* Right side placeholder - empty for now */}
              </div>
            </Label>

            <Label
              htmlFor="custom-llm"
              className={cn(
                "border rounded-md p-4 transition-all block",
                customLLMEnabled.data
                  ? "ring-1 ring-blue-500 border-blue-500"
                  : "border-neutral-200 cursor-pointer hover:border-neutral-300",
              )}
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="custom" id="custom-llm" className="peer sr-only" />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      <Trans>Custom Endpoint</Trans>
                    </span>
                    <p className="text-xs font-normal text-neutral-500 mt-1">
                      <Trans>Connect to a self-hosted or third-party LLM endpoint (OpenAI API compatible).</Trans>
                    </p>
                  </div>
                </div>
                {/* Right side placeholder - empty for now */}
              </div>

              {/* Custom LLM Form Fields - Placed after the main content flex container */}
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
    </div>
  );
}
