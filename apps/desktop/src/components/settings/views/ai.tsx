import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { openPath } from "@tauri-apps/plugin-opener";
import { DownloadIcon, FolderIcon, InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useHypr } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as connectorCommands, type Connection } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as localLlmCommands, SupportedModel } from "@hypr/plugin-local-llm";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
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
import { showLlmModelDownloadToast, showSttModelDownloadToast } from "../../toast/shared";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import { WERPerformanceModal } from "../components/wer-modal";

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

const initialSttModels = [
  {
    key: "QuantizedTiny",
    name: "Tiny",
    accuracy: 1,
    speed: 3,
    size: "44 MB",
    downloaded: true,
    fileName: "ggml-tiny-q8_0.bin",
  },
  {
    key: "QuantizedTinyEn",
    name: "Tiny - English",
    accuracy: 1,
    speed: 3,
    size: "44 MB",
    downloaded: false,
    fileName: "ggml-tiny.en-q8_0.bin",
  },
  {
    key: "QuantizedBase",
    name: "Base",
    accuracy: 2,
    speed: 2,
    size: "82 MB",
    downloaded: false,
    fileName: "ggml-base-q8_0.bin",
  },
  {
    key: "QuantizedBaseEn",
    name: "Base - English",
    accuracy: 2,
    speed: 2,
    size: "82 MB",
    downloaded: false,
    fileName: "ggml-base.en-q8_0.bin",
  },
  {
    key: "QuantizedSmall",
    name: "Small",
    accuracy: 2,
    speed: 2,
    size: "264 MB",
    downloaded: false,
    fileName: "ggml-small-q8_0.bin",
  },
  {
    key: "QuantizedSmallEn",
    name: "Small - English",
    accuracy: 2,
    speed: 2,
    size: "264 MB",
    downloaded: false,
    fileName: "ggml-small.en-q8_0.bin",
  },
  {
    key: "QuantizedLargeTurbo",
    name: "Large",
    accuracy: 3,
    speed: 1,
    size: "874 MB",
    downloaded: false,
    fileName: "ggml-large-v3-turbo-q8_0.bin",
  },
];

const initialLlmModels = [
  {
    key: "Llama3p2_3bQ4",
    name: "Llama 3 (3B, Q4)",
    description: "Basic",
    available: true,
    downloaded: false,
    size: "2.0 GB",
  },
  {
    key: "HyprLLM",
    name: "HyprLLM v1",
    description: "English only",
    available: true,
    downloaded: false,
    size: "1.1 GB",
  },
  {
    key: "HyprLLMv2",
    name: "HyprLLM v2",
    description: "Multilingual support",
    available: false,
    downloaded: false,
    size: "1.1 GB",
  },
  {
    key: "HyprLLMv3",
    name: "HyprLLM v3",
    description: "Cross-language support",
    available: false,
    downloaded: false,
    size: "1.1 GB",
  },
  {
    key: "HyprLLMv4",
    name: "HyprLLM v4",
    description: "Professional domains",
    available: false,
    downloaded: false,
    size: "1.1 GB",
  },
];

const aiConfigSchema = z.object({
  aiSpecificity: z.number().int().min(1).max(4).optional(),
});
type AIConfigValues = z.infer<typeof aiConfigSchema>;

const specificityLevels = {
  1: {
    title: "Conservative",
    description:
      "Minimal AI autonomy. Closely follows your original content and structure while making only essential improvements to clarity and organization.",
  },
  2: {
    title: "Balanced",
    description:
      "Moderate AI autonomy. Makes independent decisions about structure and phrasing while respecting your core message and intended tone.",
  },
  3: {
    title: "Autonomous",
    description:
      "High AI autonomy. Takes initiative in restructuring and expanding content, making independent decisions about organization and presentation.",
  },
  4: {
    title: "Full Autonomy",
    description:
      "Maximum AI autonomy. Independently transforms and enhances content with complete freedom in structure, language, and presentation while preserving key information.",
  },
} as const;

const openaiModels = [
  "gpt-4",
  "gpt-4-turbo",
  "gpt-4o", 
  "gpt-4o-mini",
  "gpt-3.5-turbo"
];

const geminiModels = [
  "gemini-1.5-pro",
  "gemini-1.5-flash", 
  "gemini-1.0-pro"
];

export default function LocalAI() {
  const queryClient = useQueryClient();
  const [isWerModalOpen, setIsWerModalOpen] = useState(false);
  const [selectedSTTModel, setSelectedSTTModel] = useState("QuantizedTiny");
  const [selectedLLMModel, setSelectedLLMModel] = useState("HyprLLM");
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());
  const [sttModels, setSttModels] = useState(initialSttModels);
  const [llmModelsState, setLlmModels] = useState(initialLlmModels);

  // NEW: Accordion state for Custom vs OpenAI
  const [openAccordion, setOpenAccordion] = useState<'custom' | 'openai' | 'gemini' | null>(null);
  
  // NEW: OpenAI form state
  const [openaiApiKey, setOpenaiApiKeyState] = useState("");
  const [selectedOpenaiModel, setSelectedOpenaiModel] = useState("");

  // NEW: Query for OpenAI API key
  const openaiApiKeyQuery = useQuery({
    queryKey: ["openai-api-key"],
    queryFn: () => connectorCommands.getOpenaiApiKey(),
  });

  // NEW: Mutation for setting OpenAI API key
  const setOpenaiApiKeyMutation = useMutation({
    mutationFn: (apiKey: string) => connectorCommands.setOpenaiApiKey(apiKey),
    onSuccess: () => {
      openaiApiKeyQuery.refetch();
    },
  });

  // NEW: Gemini form state
  const [geminiApiKey, setGeminiApiKeyState] = useState("");
  const [selectedGeminiModel, setSelectedGeminiModel] = useState("");

  // NEW: Query for Gemini API key
  const geminiApiKeyQuery = useQuery({
    queryKey: ["gemini-api-key"],
    queryFn: () => connectorCommands.getGeminiApiKey(),
  });

  // NEW: Mutation for setting Gemini API key
  const setGeminiApiKeyMutation = useMutation({
    mutationFn: (apiKey: string) => connectorCommands.setGeminiApiKey(apiKey),
    onSuccess: () => {
      geminiApiKeyQuery.refetch();
    },
  });

  const { userId } = useHypr();

  const handleModelDownload = async (modelKey: string) => {
    // If the key does not start with "Quantized", treat it as an LLM download.
    if (!modelKey.startsWith("Quantized")) {
      await handleLlmModelDownload(modelKey);
      return;
    }
    setDownloadingModels(prev => new Set([...prev, modelKey]));

    showSttModelDownloadToast(modelKey as any, () => {
      setSttModels(prev =>
        prev.map(model =>
          model.key === modelKey
            ? { ...model, downloaded: true }
            : model
        )
      );
      setDownloadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelKey);
        return newSet;
      });

      setSelectedSTTModel(modelKey);
      localSttCommands.setCurrentModel(modelKey as any);
    }, queryClient);
  };

  const handleLlmModelDownload = async (modelKey: string) => {
    setDownloadingModels((prev) => new Set([...prev, modelKey]));

    showLlmModelDownloadToast(modelKey as SupportedModel, () => {
      setLlmModels((prev) => prev.map((m) => (m.key === modelKey ? { ...m, downloaded: true } : m)));

      setDownloadingModels((prev) => {
        const s = new Set(prev);
        s.delete(modelKey);
        return s;
      });

      setSelectedLLMModel(modelKey);
      localLlmCommands.setCurrentModel(modelKey as SupportedModel);
      setCustomLLMEnabledMutation.mutate(false);
    }, queryClient);
  };

  const handleShowFileLocation = async (modelType: "stt" | "llm") => {
    const path = await (modelType === "stt" ? localSttCommands.modelsDir() : localLlmCommands.modelsDir());
    await openPath(path);
  };

  const customLLMEnabled = useQuery({
    queryKey: ["custom-llm-enabled"],
    queryFn: () => connectorCommands.getCustomLlmEnabled(),
  });

  const setCustomLLMEnabledMutation = useMutation({
    mutationFn: (enabled: boolean) => connectorCommands.setCustomLlmEnabled(enabled),
    onSuccess: () => {
      customLLMEnabled.refetch();
    },
  });

  const customLLMConnection = useQuery({
    queryKey: ["custom-llm-connection"],
    queryFn: () => connectorCommands.getCustomLlmConnection(),
  });

  const getCustomLLMModel = useQuery({
    queryKey: ["custom-llm-model"],
    queryFn: () => connectorCommands.getCustomLlmModel(),
  });

  const availableLLMModels = useQuery({
    queryKey: ["available-llm-models"],
    queryFn: async () => {
      return await localLlmCommands.listSupportedModels();
    },
  });

  const modelDownloadStatus = useQuery({
    queryKey: ["llm-model-download-status"],
    queryFn: async () => {
      const statusChecks = await Promise.all([
        localLlmCommands.isModelDownloaded("Llama3p2_3bQ4" as SupportedModel),
        localLlmCommands.isModelDownloaded("HyprLLM" as SupportedModel),
      ]);
      return {
        "Llama3p2_3bQ4": statusChecks[0],
        "HyprLLM": statusChecks[1],
      } as Record<string, boolean>;
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (modelDownloadStatus.data) {
      setLlmModels(prev =>
        prev.map(model => ({
          ...model,
          downloaded: modelDownloadStatus.data[model.key] || false,
        }))
      );
    }
  }, [modelDownloadStatus.data]);

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

  // MODIFIED: Centralized function to configure custom endpoint
  const configureCustomEndpoint = (config: {
    provider: 'custom' | 'openai' | 'gemini';
    api_base: string;
    api_key?: string;
    model: string;
  }) => {
    // Auto-set API base for different providers
    const finalApiBase = 
      config.provider === 'openai' ? 'https://api.openai.com/v1' :
      config.provider === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta/openai' :
      config.api_base;
    
    // Enable custom LLM
    setCustomLLMEnabledMutation.mutate(true);
    
    // Store provider-specific API keys
    if (config.provider === 'openai' && config.api_key) {
      setOpenaiApiKeyMutation.mutate(config.api_key);
    } else if (config.provider === 'gemini' && config.api_key) {
      setGeminiApiKeyMutation.mutate(config.api_key);
    }
    
    // Set the model and connection
    setCustomLLMModel.mutate(config.model);
    setCustomLLMConnection.mutate({
      api_base: finalApiBase,
      api_key: config.api_key || null,
    });
  };

  // NEW: Determine which accordion should be open based on stored connection
  useEffect(() => {
    if (customLLMConnection.data?.api_base) {
      const apiBase = customLLMConnection.data.api_base;
      const isOpenai = apiBase.includes('openai.com');
      const isGemini = apiBase.includes('googleapis.com');
      
      setOpenAccordion(
        isOpenai ? 'openai' : 
        isGemini ? 'gemini' : 
        'custom'
      );
    } else if (customLLMEnabled.data) {
      setOpenAccordion('custom'); // Default to custom if enabled but no connection
    } else {
      setOpenAccordion(null);
    }
  }, [customLLMConnection.data, customLLMEnabled.data]);

  // NEW: Set OpenAI API key from query
  useEffect(() => {
    if (openaiApiKeyQuery.data) {
      setOpenaiApiKeyState(openaiApiKeyQuery.data);
    }
  }, [openaiApiKeyQuery.data]);

  // NEW: Set selected OpenAI model from stored model
  useEffect(() => {
    if (getCustomLLMModel.data && openAccordion === 'openai') {
      setSelectedOpenaiModel(getCustomLLMModel.data);
    }
  }, [getCustomLLMModel.data, openAccordion]);

  // NEW: Set Gemini API key from query
  useEffect(() => {
    if (geminiApiKeyQuery.data) {
      setGeminiApiKeyState(geminiApiKeyQuery.data);
    }
  }, [geminiApiKeyQuery.data]);

  // NEW: Set selected Gemini model from stored model
  useEffect(() => {
    if (getCustomLLMModel.data && openAccordion === 'gemini') {
      setSelectedGeminiModel(getCustomLLMModel.data);
    }
  }, [getCustomLLMModel.data, openAccordion]);

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
      aiSpecificity: 3,
    },
  });

  useEffect(() => {
    if (config.data) {
      aiConfigForm.reset({
        aiSpecificity: config.data.ai.ai_specificity ?? 3,
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
          ai_specificity: values.aiSpecificity ?? 3,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "ai"] });
    },
    onError: console.error,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(endpointSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (customLLMConnection.data) {
      form.reset({
        model: getCustomLLMModel.data || "",
        api_base: customLLMConnection.data.api_base,
        api_key: customLLMConnection.data.api_key || "",
      });
    } else {
      form.reset({ model: "", api_base: "", api_key: "" });
    }
  }, [getCustomLLMModel.data, customLLMConnection.data, form.reset]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Use the new centralized function for custom endpoint configuration
      if (value.api_base && value.model && 
          !form.formState.errors.model && 
          !form.formState.errors.api_base) {
        configureCustomEndpoint({
          provider: "custom",
          api_base: value.api_base,
          api_key: value.api_key,
          model: value.model,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const isLocalEndpoint = () => {
    const apiBase = form.watch("api_base");
    return apiBase && (apiBase.includes("localhost") || apiBase.includes("127.0.0.1"));
  };

  // call backend for the current selected LLM model and sets it
  const currentLLMModel = useQuery({
    queryKey: ["current-llm-model"],
    queryFn: () => localLlmCommands.getCurrentModel(),
  });

  useEffect(() => {
    if (currentLLMModel.data && !customLLMEnabled.data) {
      setSelectedLLMModel(currentLLMModel.data);
    }
  }, [currentLLMModel.data, customLLMEnabled.data]);

  // call backend for the current selected STT model and sets it
  const currentSTTModel = useQuery({
    queryKey: ["current-stt-model"],
    queryFn: () => localSttCommands.getCurrentModel(),
  });

  useEffect(() => {
    if (currentSTTModel.data) {
      setSelectedSTTModel(currentSTTModel.data);
    }
  }, [currentSTTModel.data]);

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
  }, [sttModelDownloadStatus.data]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-6">
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
            {sttModels.map((model) => (
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
                    localSttCommands.setCurrentModel(model.key as any);

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
      </div>

      <div>
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-lg font-semibold">
            <Trans>Enhancing</Trans>
          </h2>
        </div>

        <div className="max-w-2xl">
          <div className="space-y-2 mb-8">
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

        <div className="max-w-2xl space-y-4">
          {/* OpenAI Accordion */}
          <div
            className={cn(
              "border rounded-lg transition-all duration-150 ease-in-out cursor-pointer",
              openAccordion === 'openai'
                ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
                : "border-neutral-200 bg-white hover:border-neutral-300",
            )}
          >
            <div
              className="p-4"
              onClick={() => {
                const newState = openAccordion === 'openai' ? null : 'openai';
                setOpenAccordion(newState);
                if (newState === 'openai') {
                  setCustomLLMEnabledMutation.mutate(true);
                  setSelectedLLMModel("");
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium">
                    <Trans>OpenAI</Trans>
                  </span>
                  <p className="text-xs font-normal text-neutral-500 mt-1">
                    <Trans>Use OpenAI's GPT models with your API key</Trans>
                  </p>
                </div>
                <div className="text-neutral-400">
                  {openAccordion === 'openai' ? '−' : '+'}
                </div>
              </div>
            </div>

            {openAccordion === 'openai' && (
              <div className="px-4 pb-4 border-t">
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      <Trans>API Key</Trans>
                    </label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={openaiApiKey}
                      onChange={(e) => {
                        setOpenaiApiKeyState(e.target.value);
                        if (e.target.value && selectedOpenaiModel) {
                          configureCustomEndpoint({
                            provider: 'openai',
                            api_base: '', // Will be auto-set
                            api_key: e.target.value,
                            model: selectedOpenaiModel,
                          });
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      <Trans>Model</Trans>
                    </label>
                    <Select
                      value={selectedOpenaiModel}
                      onValueChange={(value) => {
                        setSelectedOpenaiModel(value);
                        if (openaiApiKey && value) {
                          configureCustomEndpoint({
                            provider: 'openai',
                            api_base: '', // Will be auto-set
                            api_key: openaiApiKey,
                            model: value,
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select OpenAI model" />
                      </SelectTrigger>
                      <SelectContent>
                        {openaiModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* NEW: Gemini Accordion */}
          <div
            className={cn(
              "border rounded-lg transition-all duration-150 ease-in-out cursor-pointer",
              openAccordion === 'gemini'
                ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
                : "border-neutral-200 bg-white hover:border-neutral-300",
            )}
          >
            <div
              className="p-4"
              onClick={() => {
                const newState = openAccordion === 'gemini' ? null : 'gemini';
                setOpenAccordion(newState);
                if (newState === 'gemini') {
                  setCustomLLMEnabledMutation.mutate(true);
                  setSelectedLLMModel("");
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium">
                    <Trans>Google Gemini</Trans>
                  </span>
                  <p className="text-xs font-normal text-neutral-500 mt-1">
                    <Trans>Use Google's Gemini models with your API key</Trans>
                  </p>
                </div>
                <div className="text-neutral-400">
                  {openAccordion === 'gemini' ? '−' : '+'}
                </div>
              </div>
            </div>

            {openAccordion === 'gemini' && (
              <div className="px-4 pb-4 border-t">
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      <Trans>API Key</Trans>
                    </label>
                    <Input
                      type="password"
                      placeholder="AIza..."
                      value={geminiApiKey}
                      onChange={(e) => {
                        setGeminiApiKeyState(e.target.value);
                        if (e.target.value && selectedGeminiModel) {
                          configureCustomEndpoint({
                            provider: 'gemini',
                            api_base: '', // Will be auto-set
                            api_key: e.target.value,
                            model: selectedGeminiModel,
                          });
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      <Trans>Model</Trans>
                    </label>
                    <Select
                      value={selectedGeminiModel}
                      onValueChange={(value) => {
                        setSelectedGeminiModel(value);
                        if (geminiApiKey && value) {
                          configureCustomEndpoint({
                            provider: 'gemini',
                            api_base: '', // Will be auto-set
                            api_key: geminiApiKey,
                            model: value,
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Gemini model" />
                      </SelectTrigger>
                      <SelectContent>
                        {geminiModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Custom Endpoint Accordion */}
          <div
            className={cn(
              "border rounded-lg transition-all duration-150 ease-in-out cursor-pointer",
              openAccordion === 'custom'
                ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
                : "border-neutral-200 bg-white hover:border-neutral-300",
            )}
          >
            <div
              className="p-4"
              onClick={() => {
                const newState = openAccordion === 'custom' ? null : 'custom';
                setOpenAccordion(newState);
                if (newState === 'custom') {
                  setCustomLLMEnabledMutation.mutate(true);
                  setSelectedLLMModel("");
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium">
                    <Trans>Custom Endpoint</Trans>
                  </span>
                  <p className="text-xs font-normal text-neutral-500 mt-1">
                    <Trans>Connect to a self-hosted or third-party LLM endpoint (OpenAI API compatible)</Trans>
                  </p>
                </div>
                <div className="text-neutral-400">
                  {openAccordion === 'custom' ? '−' : '+'}
                </div>
              </div>
            </div>

            {openAccordion === 'custom' && (
              <div className="px-4 pb-4 border-t">
                <div className="mt-4">
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
                              <Trans>Enter the base URL for your custom LLM endpoint</Trans>
                            </FormDescription>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="http://localhost:11434/v1"
                                disabled={openAccordion !== 'custom'}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("api_base") && !isLocalEndpoint() && (
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
                                Select a model from the dropdown (if available) or manually enter the model name required by
                                your endpoint.
                              </Trans>
                            </FormDescription>
                            <FormControl>
                              {availableLLMModels.isLoading && !field.value
                                ? (
                                  <div className="py-1 text-sm text-neutral-500">
                                    <Trans>Loading available models...</Trans>
                                  </div>
                                )
                                : availableLLMModels.data && availableLLMModels.data.length > 0
                                ? (
                                  <Select
                                    defaultValue={field.value}
                                    onValueChange={(value: string) => {
                                      field.onChange(value);
                                      setCustomLLMModel.mutate(value);
                                    }}
                                    disabled={!customLLMEnabled.data}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableLLMModels.data.map((model) => (
                                        <SelectItem key={model} value={model}>
                                          {model}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )
                                : (
                                  <Input
                                    {...field}
                                    placeholder="Enter model name (e.g., gpt-4, llama3.2:3b)"
                                    disabled={!customLLMEnabled.data}
                                  />
                                )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* NEW: Detail Level Configuration */}
                      <Form {...aiConfigForm}>
                        <FormField
                          control={aiConfigForm.control}
                          name="aiSpecificity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                <Trans>Autonomy Selector</Trans>
                              </FormLabel>
                              <FormDescription className="text-xs">
                                <Trans>Control how autonomous the AI enhancement should be</Trans>
                              </FormDescription>
                              <FormControl>
                                <div className="space-y-3">
                                  {/* Button bar - matching form element width */}
                                  <div className="w-full">
                                    <div className="flex justify-between rounded-md p-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-sm">
                                      {[1, 2, 3, 4].map((level) => (
                                        <button
                                          key={level}
                                          type="button"
                                          onClick={() => {
                                            field.onChange(level);
                                            aiConfigMutation.mutate({ aiSpecificity: level });
                                            analyticsCommands.event({
                                              event: "autonomy_selected",
                                              distinct_id: userId,
                                              level: level,
                                            });
                                          }}
                                          disabled={!customLLMEnabled.data}
                                          className={cn(
                                            "py-1.5 px-2 flex-1 text-center text-sm font-medium rounded transition-all duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
                                            field.value === level
                                              ? "bg-white text-black shadow-sm"
                                              : "text-white hover:bg-white/20",
                                            !customLLMEnabled.data && "opacity-50 cursor-not-allowed",
                                          )}
                                        >
                                          {specificityLevels[level as keyof typeof specificityLevels]?.title}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Current selection description in card */}
                                  <div className="p-3 rounded-md bg-neutral-50 border border-neutral-200">
                                    <div className="text-xs text-muted-foreground">
                                      {specificityLevels[field.value as keyof typeof specificityLevels]?.description
                                        || specificityLevels[3].description}
                                    </div>
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </Form>
                    </form>
                  </Form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <WERPerformanceModal
        isOpen={isWerModalOpen}
        onClose={() => setIsWerModalOpen(false)}
      />
    </div>
  );
}
