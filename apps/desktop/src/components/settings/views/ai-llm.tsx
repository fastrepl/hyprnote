import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { commands as connectorCommands, type Connection } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as localLlmCommands, SupportedModel } from "@hypr/plugin-local-llm";

import { showLlmModelDownloadToast } from "../../toast/shared";

import { LLMLocalView } from "../components/ai/llm-local-view";
import {
  ConfigureEndpointConfig,
  CustomFormValues,
  GeminiFormValues,
  LLMModel,
  OpenAIFormValues,
  OpenRouterFormValues,
  SharedLLMProps,
} from "../components/ai/shared";

const openaiSchema = z.object({
  api_key: z.string().min(1, { message: "API key is required" }).refine(
    (value) => value.startsWith("sk-"),
    { message: "OpenAI API key should start with 'sk-'" },
  ),
  model: z.string().min(1, { message: "Model is required" }),
});

const geminiSchema = z.object({
  api_key: z.string().min(1, { message: "API key is required" }).refine(
    (value) => value.startsWith("AIza"),
    { message: "Gemini API key should start with 'AIza'" },
  ),
  model: z.string().min(1, { message: "Model is required" }),
});

const openrouterSchema = z.object({
  api_key: z.string().min(1, { message: "API key is required" }).refine(
    (value) => value.startsWith("sk-"),
    { message: "OpenRouter API key should start with 'sk-'" },
  ),
  model: z.string().min(1, { message: "Model is required" }),
});

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
    { message: "Unless you are using a local endpoint, it should end with '/v1'" },
  ).refine(
    (value) => !value.includes("chat/completions"),
    { message: "`/chat/completions` will be appended automatically" },
  ),
  api_key: z.string().optional(),
});

const aiConfigSchema = z.object({
  aiSpecificity: z.number().int().min(1).max(4),
});
type AIConfigValues = z.infer<typeof aiConfigSchema>;

export default function LlmAI() {
  const queryClient = useQueryClient();

  const [selectedLLMModel, setSelectedLLMModel] = useState("HyprLLM");
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());
  const [llmModelsState, setLlmModels] = useState<LLMModel[]>([]);

  useEffect(() => {
    localLlmCommands.listSupportedModel().then((ms) => {
      const models: LLMModel[] = ms.map((model) => ({
        key: model.key as SupportedModel,
        name: model.name,
        description: model.description,
        available: true,
        downloaded: false,
        size: `${(model.size_bytes / 1024 / 1024 / 1024).toFixed(2)} GB`,
      }));

      setLlmModels(models);
    });
  }, []);

  const [openAccordion, setOpenAccordion] = useState<"others" | "openai" | "gemini" | "openrouter" | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["current-llm-model"] });
      localLlmCommands.restartServer(); // is it necessary to restart the server?
      setCustomLLMEnabledMutation.mutate(false);
      setHyprCloudEnabledMutation.mutate(false);
    }, queryClient);
  };

  const handleModelDownload = async (modelKey: string) => {
    await handleLlmModelDownload(modelKey);
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

  const hyprCloudEnabled = useQuery({
    queryKey: ["hypr-cloud-enabled"],
    queryFn: () => connectorCommands.getHyprcloudEnabled(),
  });

  const setHyprCloudEnabledMutation = useMutation({
    mutationFn: (enabled: boolean) => connectorCommands.setHyprcloudEnabled(enabled),
    onSuccess: () => {
      hyprCloudEnabled.refetch();
    },
  });

  const customLLMConnection = useQuery({
    queryKey: ["custom-llm-connection"],
    queryFn: () => connectorCommands.getCustomLlmConnection(),
  });

  const modelDownloadStatus = useQuery({
    queryKey: ["llm-model-download-status"],
    queryFn: async () => {
      const statusChecks = await Promise.all([
        localLlmCommands.isModelDownloaded("Llama3p2_3bQ4" satisfies SupportedModel),
        localLlmCommands.isModelDownloaded("HyprLLM" satisfies SupportedModel),
        localLlmCommands.isModelDownloaded("Gemma3_4bQ4" satisfies SupportedModel),
      ]);

      return {
        "Llama3p2_3bQ4": statusChecks[0],
        "HyprLLM": statusChecks[1],
        "Gemma3_4bQ4": statusChecks[2],
      };
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

  // No need to force tab switching - user can view custom tab even with HyprCloud

  useEffect(() => {
    // Don't manage accordion state if HyprCloud is enabled
    if (hyprCloudEnabled.data) {
      setOpenAccordion(null);
      return;
    }

    // Don't open accordion if custom LLM is disabled
    if (!customLLMEnabled.data) {
      setOpenAccordion(null);
      return;
    }

    if (providerSourceQuery.data) {
      // Only set accordion if it's a valid custom provider
      if (["openai", "gemini", "openrouter", "others"].includes(providerSourceQuery.data)) {
        setOpenAccordion(providerSourceQuery.data as "openai" | "gemini" | "openrouter" | "others");
      }
    } else {
      // Only clear accordion if custom LLM is disabled
      if (!customLLMEnabled.data) {
        setOpenAccordion(null);
      }
    }
  }, [providerSourceQuery.data, hyprCloudEnabled.data, setOpenAccordion]);

  // Add a separate effect for initial load fallback
  useEffect(() => {
    // Only set default "others" if no provider is configured AND no accordion is open
    // and HyprCloud is not enabled
    if (!providerSourceQuery.data && customLLMEnabled.data && openAccordion === null && !hyprCloudEnabled.data) {
      setOpenAccordion("others");

      // Clear HyprCloud URL if it's stored in "others" API base
      if (othersApiBaseQuery.data === "https://pro.hyprnote.com") {
        setOthersApiBaseMutation.mutate("");
      }
    }
  }, [
    providerSourceQuery.data,
    customLLMEnabled.data,
    openAccordion,
    hyprCloudEnabled.data,
    othersApiBaseQuery.data,
    setOpenAccordion,
    setOthersApiBaseMutation,
  ]);

  const configureCustomEndpoint = (config: ConfigureEndpointConfig) => {
    const finalApiBase = config.provider === "openai"
      ? "https://api.openai.com/v1"
      : config.provider === "gemini"
      ? "https://generativelanguage.googleapis.com/v1beta/openai"
      : config.provider === "openrouter"
      ? "https://openrouter.ai/api/v1"
      : config.provider === "hyprcloud"
      ? "https://pro.hyprnote.com"
      : config.api_base;

    if (config.provider === "hyprcloud") {
      console.log("hyprcloud set, setting values");
      // HyprCloud is special - enable both flags but don't touch provider source
      setHyprCloudEnabledMutation.mutate(true);
      setCustomLLMEnabledMutation.mutate(true);
      setCustomLLMConnection.mutate({
        api_base: finalApiBase,
        api_key: null,
      });
      return; // Early return for HyprCloud
    }

    // For all other providers, disable HyprCloud and enable custom
    setHyprCloudEnabledMutation.mutate(false);
    setCustomLLMEnabledMutation.mutate(true);

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
      setOthersApiKeyMutation.mutate(config.api_key || "");
      setOthersModelMutation.mutate(config.model);
    }

    // Update provider source for non-HyprCloud providers
    setProviderSourceMutation.mutate(config.provider);
    setCustomLLMModel.mutate(config.model);

    setCustomLLMConnection.mutate({
      api_base: finalApiBase,
      api_key: config.api_key || null,
    });
  };

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
    if (othersApiBaseQuery.data && othersApiBaseQuery.data !== "https://pro.hyprnote.com") {
      customForm.setValue("api_base", othersApiBaseQuery.data);
    }
    if (othersApiKeyQuery.data) {
      customForm.setValue("api_key", othersApiKeyQuery.data);
    }
    if (othersModelQuery.data) {
      customForm.setValue("model", othersModelQuery.data);
    }
  }, [othersApiBaseQuery.data, othersApiKeyQuery.data, othersModelQuery.data, customForm]);

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

  useEffect(() => {
    if (openAccordion === "others") {
      if (othersApiBaseQuery.data && othersApiBaseQuery.data !== "https://pro.hyprnote.com") {
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

  const localLlmProps: SharedLLMProps = {
    customLLMEnabled,
    selectedLLMModel,
    setSelectedLLMModel,
    setCustomLLMEnabledMutation,
    downloadingModels,
    llmModelsState,
    handleModelDownload,
    configureCustomEndpoint,
    setOpenAccordion,
    hyprCloudEnabled,
    setHyprCloudEnabledMutation,
  };

  return <LLMLocalView {...localLlmProps} />;
}
