import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { openPath } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useHypr } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as connectorCommands, type Connection } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as localLlmCommands, SupportedModel } from "@hypr/plugin-local-llm";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@hypr/ui/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import { cn } from "@hypr/ui/lib/utils";
import { showLlmModelDownloadToast, showSttModelDownloadToast } from "../../toast/shared";

// Import the new components
import { LLMCustomView } from "../components/ai/llm-custom-view";
import { LLMLocalView } from "../components/ai/llm-local-view";
import {
  ConfigureEndpointConfig,
  CustomFormValues,
  GeminiFormValues,
  LLMModel,
  OpenAIFormValues,
  OpenRouterFormValues,
  SharedCustomEndpointProps,
  SharedLLMProps,
  SharedSTTProps,
  STTModel,
} from "../components/ai/shared";
import { STTView } from "../components/ai/stt-view";

// Schema for OpenAI form
const openaiSchema = z.object({
  api_key: z.string().min(1, { message: "API key is required" }).refine(
    (value) => value.startsWith("sk-"),
    { message: "OpenAI API key should start with 'sk-'" },
  ),
  model: z.string().min(1, { message: "Model is required" }),
});

// Schema for Gemini form
const geminiSchema = z.object({
  api_key: z.string().min(1, { message: "API key is required" }).refine(
    (value) => value.startsWith("AIza"),
    { message: "Gemini API key should start with 'AIza'" },
  ),
  model: z.string().min(1, { message: "Model is required" }),
});

// Schema for OpenRouter form
const openrouterSchema = z.object({
  api_key: z.string().min(1, { message: "API key is required" }).refine(
    (value) => value.startsWith("sk-"),
    { message: "OpenRouter API key should start with 'sk-'" },
  ),
  model: z.string().min(1, { message: "Model is required" }),
});

// Schema for Custom endpoint form
const customSchema = z.object({
  model: z.string().min(1, { message: "Model is required" }),
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

const initialSttModels: STTModel[] = [
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

const initialLlmModels: LLMModel[] = [
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

export default function LocalAI() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"transcription" | "local" | "custom">("transcription");

  // STT State
  const [isWerModalOpen, setIsWerModalOpen] = useState(false);
  const [selectedSTTModel, setSelectedSTTModel] = useState("QuantizedTiny");
  const [sttModels, setSttModels] = useState(initialSttModels);

  // LLM State
  const [selectedLLMModel, setSelectedLLMModel] = useState("HyprLLM");
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());
  const [llmModelsState, setLlmModels] = useState(initialLlmModels);

  // Custom Endpoint State
  const [openAccordion, setOpenAccordion] = useState<"others" | "openai" | "gemini" | "openrouter" | null>(null);

  const { userId } = useHypr();

  // Shared Model Download Function
  const handleModelDownload = async (modelKey: string) => {
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

  // Queries and Mutations
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

  // OpenAI and Gemini API key queries/mutations
  const openaiApiKeyQuery = useQuery({
    queryKey: ["openai-api-key"],
    queryFn: () => connectorCommands.getOpenaiApiKey(),
  });

  const setOpenaiApiKeyMutation = useMutation({
    mutationFn: (apiKey: string) => connectorCommands.setOpenaiApiKey(apiKey),
    onSuccess: () => {
      openaiApiKeyQuery.refetch();
    },
  });

  const geminiApiKeyQuery = useQuery({
    queryKey: ["gemini-api-key"],
    queryFn: () => connectorCommands.getGeminiApiKey(),
  });

  const setGeminiApiKeyMutation = useMutation({
    mutationFn: (apiKey: string) => connectorCommands.setGeminiApiKey(apiKey),
    onSuccess: () => {
      geminiApiKeyQuery.refetch();
    },
  });

  // NEW: Others provider queries/mutations
  const othersApiBaseQuery = useQuery({
    queryKey: ["others-api-base"],
    queryFn: () => connectorCommands.getOthersApiBase(),
  });

  const othersApiKeyQuery = useQuery({
    queryKey: ["others-api-key"],
    queryFn: () => connectorCommands.getOthersApiKey(),
  });

  const othersModelQuery = useQuery({
    queryKey: ["others-model"],
    queryFn: () => connectorCommands.getOthersModel(),
  });

  const providerSourceQuery = useQuery({
    queryKey: ["provider-source"],
    queryFn: () => connectorCommands.getProviderSource(),
  });

  const setOthersApiBaseMutation = useMutation({
    mutationFn: (apiBase: string) => connectorCommands.setOthersApiBase(apiBase),
    onSuccess: () => {
      othersApiBaseQuery.refetch();
    },
  });

  const setOthersApiKeyMutation = useMutation({
    mutationFn: (apiKey: string) => connectorCommands.setOthersApiKey(apiKey),
    onSuccess: () => {
      othersApiKeyQuery.refetch();
    },
  });

  const setOthersModelMutation = useMutation({
    mutationFn: (model: string) => connectorCommands.setOthersModel(model),
    onSuccess: () => {
      othersModelQuery.refetch();
    },
  });

  const setProviderSourceMutation = useMutation({
    mutationFn: (source: string) => connectorCommands.setProviderSource(source),
    onSuccess: () => {
      providerSourceQuery.refetch();
    },
  });

  // NEW: OpenAI and Gemini model queries/mutations
  const openaiModelQuery = useQuery({
    queryKey: ["openai-model"],
    queryFn: () => connectorCommands.getOpenaiModel(),
  });

  const setOpenaiModelMutation = useMutation({
    mutationFn: (model: string) => connectorCommands.setOpenaiModel(model),
    onSuccess: () => {
      openaiModelQuery.refetch();
    },
  });

  const geminiModelQuery = useQuery({
    queryKey: ["gemini-model"],
    queryFn: () => connectorCommands.getGeminiModel(),
  });

  const setGeminiModelMutation = useMutation({
    mutationFn: (model: string) => connectorCommands.setGeminiModel(model),
    onSuccess: () => {
      geminiModelQuery.refetch();
    },
  });

  // OpenRouter queries/mutations
  const openrouterApiKeyQuery = useQuery({
    queryKey: ["openrouter-api-key"],
    queryFn: () => connectorCommands.getOpenrouterApiKey(),
  });

  const setOpenrouterApiKeyMutation = useMutation({
    mutationFn: (apiKey: string) => connectorCommands.setOpenrouterApiKey(apiKey),
    onSuccess: () => {
      openrouterApiKeyQuery.refetch();
    },
  });

  const openrouterModelQuery = useQuery({
    queryKey: ["openrouter-model"],
    queryFn: () => connectorCommands.getOpenrouterModel(),
  });

  const setOpenrouterModelMutation = useMutation({
    mutationFn: (model: string) => connectorCommands.setOpenrouterModel(model),
    onSuccess: () => {
      openrouterModelQuery.refetch();
    },
  });

  // MIGRATION LOGIC - Run once on component mount
  useEffect(() => {
    const handleMigration = async () => {
      // Skip if no store exists at all
      if (!customLLMConnection.data && !customLLMEnabled.data) {
        return;
      }

      // Check if migration needed (no providerSource exists)
      if (!providerSourceQuery.data && customLLMConnection.data) {
        console.log("Migrating existing user to new provider system...");

        try {
          // Copy existing custom* fields to others* fields
          if (customLLMConnection.data.api_base) {
            await setOthersApiBaseMutation.mutateAsync(customLLMConnection.data.api_base);
          }
          if (customLLMConnection.data.api_key) {
            await setOthersApiKeyMutation.mutateAsync(customLLMConnection.data.api_key);
          }
          if (getCustomLLMModel.data) {
            await setOthersModelMutation.mutateAsync(getCustomLLMModel.data);
          }

          // Set provider source to 'others'
          await setProviderSourceMutation.mutateAsync("others");

          console.log("Migration completed successfully");
        } catch (error) {
          console.error("Migration failed:", error);
        }
      }
    };

    // Run migration when all queries have loaded
    if (
      providerSourceQuery.data !== undefined && customLLMConnection.data !== undefined
      && getCustomLLMModel.data !== undefined
    ) {
      handleMigration();
    }
  }, [providerSourceQuery.data, customLLMConnection.data, getCustomLLMModel.data]);

  // ACCORDION DISPLAY - Based on providerSource, not URL
  useEffect(() => {
    if (providerSourceQuery.data) {
      setOpenAccordion(providerSourceQuery.data as "openai" | "gemini" | "openrouter" | "others");
    } else if (customLLMEnabled.data) {
      setOpenAccordion("others"); // Fallback during migration
    } else {
      setOpenAccordion(null);
    }
  }, [providerSourceQuery.data, customLLMEnabled.data, setOpenAccordion]);

  // CRITICAL: Centralized function to configure custom endpoint
  const configureCustomEndpoint = (config: ConfigureEndpointConfig) => {
    const finalApiBase = config.provider === "openai"
      ? "https://api.openai.com/v1"
      : config.provider === "gemini"
      ? "https://generativelanguage.googleapis.com/v1beta/openai"
      : config.provider === "openrouter"
      ? "https://openrouter.ai/api/v1"
      : config.api_base;

    // Enable custom LLM
    setCustomLLMEnabledMutation.mutate(true);

    // Store in provider-specific storage
    if (config.provider === "openai" && config.api_key) {
      setOpenaiApiKeyMutation.mutate(config.api_key);
      setOpenaiModelMutation.mutate(config.model);
    } else if (config.provider === "gemini" && config.api_key) {
      setGeminiApiKeyMutation.mutate(config.api_key);
      setGeminiModelMutation.mutate(config.model);
    } else if (config.provider === "openrouter" && config.api_key) {
      setOpenrouterApiKeyMutation.mutate(config.api_key);
      setOpenrouterModelMutation.mutate(config.model);
    } else if (config.provider === "others") {
      setOthersApiBaseMutation.mutate(config.api_base);
      if (config.api_key) {
        setOthersApiKeyMutation.mutate(config.api_key);
      }
      setOthersModelMutation.mutate(config.model);
    }

    // Set provider source
    setProviderSourceMutation.mutate(config.provider);

    // Set as currently active (custom* fields)
    setCustomLLMModel.mutate(config.model);
    setCustomLLMConnection.mutate({
      api_base: finalApiBase,
      api_key: config.api_key || null,
    });
  };

  // Create form instances for each provider
  const openaiForm = useForm<OpenAIFormValues>({
    resolver: zodResolver(openaiSchema),
    mode: "onChange",
    defaultValues: {
      api_key: "",
      model: "",
    },
  });

  const geminiForm = useForm<GeminiFormValues>({
    resolver: zodResolver(geminiSchema),
    mode: "onChange",
    defaultValues: {
      api_key: "",
      model: "",
    },
  });

  const openrouterForm = useForm<OpenRouterFormValues>({
    resolver: zodResolver(openrouterSchema),
    mode: "onChange",
    defaultValues: {
      api_key: "",
      model: "",
    },
  });

  const customForm = useForm<CustomFormValues>({
    resolver: zodResolver(customSchema),
    mode: "onChange",
    defaultValues: {
      api_base: "",
      api_key: "",
      model: "",
    },
  });

  // Set form values from stored data
  useEffect(() => {
    if (openaiApiKeyQuery.data) {
      openaiForm.setValue("api_key", openaiApiKeyQuery.data);
    }
    if (openaiModelQuery.data) {
      openaiForm.setValue("model", openaiModelQuery.data);
    }
  }, [openaiApiKeyQuery.data, openaiModelQuery.data, openaiForm]);

  useEffect(() => {
    if (geminiApiKeyQuery.data) {
      geminiForm.setValue("api_key", geminiApiKeyQuery.data);
    }
    if (geminiModelQuery.data) {
      geminiForm.setValue("model", geminiModelQuery.data);
    }
  }, [geminiApiKeyQuery.data, geminiModelQuery.data, geminiForm]);

  useEffect(() => {
    if (openrouterApiKeyQuery.data) {
      openrouterForm.setValue("api_key", openrouterApiKeyQuery.data);
    }
    if (openrouterModelQuery.data) {
      openrouterForm.setValue("model", openrouterModelQuery.data);
    }
  }, [openrouterApiKeyQuery.data, openrouterModelQuery.data, openrouterForm]);

  useEffect(() => {
    // Others form gets populated from Others-specific storage using setValue to trigger watch
    if (othersApiBaseQuery.data) {
      customForm.setValue("api_base", othersApiBaseQuery.data);
    }
    if (othersApiKeyQuery.data) {
      customForm.setValue("api_key", othersApiKeyQuery.data);
    }
    if (othersModelQuery.data) {
      customForm.setValue("model", othersModelQuery.data);
    }
  }, [othersApiBaseQuery.data, othersApiKeyQuery.data, othersModelQuery.data, customForm]);

  // Set selected models from stored model for OpenAI and Gemini
  useEffect(() => {
    if (openaiModelQuery.data && openAccordion === "openai") {
      openaiForm.setValue("model", openaiModelQuery.data);
    }
  }, [openaiModelQuery.data, openAccordion, openaiForm]);

  useEffect(() => {
    if (geminiModelQuery.data && openAccordion === "gemini") {
      geminiForm.setValue("model", geminiModelQuery.data);
    }
  }, [geminiModelQuery.data, openAccordion, geminiForm]);

  useEffect(() => {
    if (openrouterModelQuery.data && openAccordion === "openrouter") {
      openrouterForm.setValue("model", openrouterModelQuery.data);
    }
  }, [openrouterModelQuery.data, openAccordion, openrouterForm]);

  // ADD THIS: Set stored values for Others when accordion opens
  useEffect(() => {
    if (openAccordion === "others") {
      if (othersApiBaseQuery.data) {
        customForm.setValue("api_base", othersApiBaseQuery.data);
      }
      if (othersApiKeyQuery.data) {
        customForm.setValue("api_key", othersApiKeyQuery.data);
      }
      if (othersModelQuery.data) {
        customForm.setValue("model", othersModelQuery.data);
      }
    }
  }, [openAccordion, othersApiBaseQuery.data, othersApiKeyQuery.data, othersModelQuery.data, customForm]);

  // AI Configuration
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

  const isLocalEndpoint = (): boolean => {
    const apiBase = customForm.watch("api_base");
    return Boolean(apiBase && (apiBase.includes("localhost") || apiBase.includes("127.0.0.1")));
  };

  // Prepare props for child components
  const sttProps: SharedSTTProps & { isWerModalOpen: boolean; setIsWerModalOpen: (open: boolean) => void } = {
    selectedSTTModel,
    setSelectedSTTModel,
    sttModels,
    setSttModels,
    downloadingModels,
    handleModelDownload,
    handleShowFileLocation,
    isWerModalOpen,
    setIsWerModalOpen,
  };

  const localLlmProps: SharedLLMProps = {
    customLLMEnabled,
    selectedLLMModel,
    setSelectedLLMModel,
    setCustomLLMEnabledMutation,
    downloadingModels,
    llmModelsState,
    handleModelDownload,
    handleShowFileLocation,
  };

  const customEndpointProps: SharedCustomEndpointProps = {
    ...localLlmProps,
    configureCustomEndpoint,
    openAccordion,
    setOpenAccordion,
    customLLMConnection,
    getCustomLLMModel,
    availableLLMModels,
    openaiForm,
    geminiForm,
    openrouterForm,
    customForm,
    isLocalEndpoint,
  };

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "transcription" | "local" | "custom")}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="transcription">
            <Trans>Transcription</Trans>
          </TabsTrigger>
          <TabsTrigger value="local">
            <Trans>LLM - Local</Trans>
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Trans>LLM - Custom</Trans>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab Content */}
      {activeTab === "transcription" && <STTView {...sttProps} />}
      {activeTab === "local" && <LLMLocalView {...localLlmProps} />}
      {activeTab === "custom" && (
        <div className="space-y-8">
          <LLMCustomView {...customEndpointProps} />

          {/* AI Configuration - only show in custom tab */}
          {customLLMEnabled.data && (
            <div className="max-w-2xl">
              <div className="border rounded-lg p-4">
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
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
