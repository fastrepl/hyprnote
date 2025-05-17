import { zodResolver } from "@hookform/resolvers/zod";
import { commands as connectorCommands, type Connection } from "@hypr/plugin-connector";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/ui/lib/utils";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const llmProviders = [
  { value: "openai", label: "OpenAI" },
  { value: "openai_eu", label: "OpenAI (EU)" },
  { value: "claude", label: "Claude" },
  { value: "grok", label: "Grok" },
  { value: "ollama", label: "Ollama" },
  { value: "lm_studio", label: "LM Studio" },
  { value: "github", label: "GitHub Models" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "martian", label: "Martian" },
  { value: "others", label: "Others" },
];

const llmProviderPresets: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  openai_eu: "https://eu.api.openai.com/v1",
  // ollama and lm_studio are handled separately due to dynamic ports
  grok: "https://api.x.ai/v1",
  claude: "https://api.anthropic.com/v1",
  github: "https://models.github.ai/inference",
  openrouter: "https://openrouter.ai/api/v1",
  martian: "https://withmartian.com/api/openai/v1",
};

const defaultPorts: Record<string, string> = {
  ollama: "11434",
  lm_studio: "1234",
};

const getProviderFromApiBase = (apiBase: string | undefined): string => {
  if (!apiBase) {
    return "ollama"; // Default to Ollama if no apiBase provided initially
  }

  // Check for exact matches in presets first
  for (const [provider, url] of Object.entries(llmProviderPresets)) {
    if (apiBase === url) {
      return provider;
    }
  }

  // Check for Ollama/LM Studio patterns if no exact preset match
  if (apiBase.startsWith("http://localhost:")) {
    const port = apiBase.match(/^http:\/\/localhost:(\d+)\/v1$/)?.[1];
    if (port) {
      if (port === defaultPorts.ollama) {
        return "ollama";
      }
      if (port === defaultPorts.lm_studio) {
        return "lm_studio";
      }
      // If it's a localhost URL with a port but not matching default, leans towards 'others'
      // or could be a custom-ported Ollama/LM Studio. For selection, 'others' is safer.
      return "others";
    }
  }

  return "others"; // Fallback if no specific provider identified
};

const extractPortOrDefault = (apiBase: string | undefined, provider: string | undefined): string => {
  if (apiBase && (provider === "ollama" || provider === "lm_studio")) {
    const match = apiBase.match(/^http:\/\/localhost:(\d+)\/v1$/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return defaultPorts[provider || ""] || "";
};

const endpointSchema = z.object({
  api_provider: z.string().min(1, { message: "Provider selection is required." }),
  model: z.string().min(1),
  port: z.string().regex(/^\d*$/, { message: "Port must be a number." }).optional(),
  api_base: z.string().url({ message: "Please enter a valid URL" }).min(1, { message: "URL is required" }).refine(
    (value) => {
      const v1NeededProviders = [
        "openai",
        "openrouter",
        "openai_eu",
        "claude",
        "grok",
        "lm_studio",
        "openrouter",
        "martian",
      ];
      const includesV1Provider = v1NeededProviders.some((host) => value.includes(host));
      const isLocal = value.includes("localhost") || value.includes("127.0.0.1");

      if ((includesV1Provider || isLocal) && !value.endsWith("/v1")) {
        if (Object.values(llmProviderPresets).includes(value)) {
          return true;
        }
        return false;
      }
      return true;
    },
    { message: "URL should typically end with '/v1' for supported providers, or be a complete base URL." },
  ).refine(
    (value) => !value.includes("chat/completions"),
    { message: "`/chat/completions` will be appended automatically" },
  ),
  api_key: z.string().optional(),
});

export type FormValues = z.infer<typeof endpointSchema>;

export function LLMView() {
  const customLLMConnection = useQuery({
    queryKey: ["custom-llm-connection"],
    queryFn: () => connectorCommands.getCustomLlmConnection(),
  });

  const availableLLMModels = useQuery({
    queryKey: ["available-llm-models"],
    queryFn: () => connectorCommands.listCustomLlmModels(),
    enabled: !!customLLMConnection.data?.api_base,
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
    defaultValues: {
      api_provider: "ollama",
      model: "",
      port: defaultPorts.ollama,
      api_base: `http://localhost:${defaultPorts.ollama}/v1`,
      api_key: "",
    },
  });

  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsContainerRef.current && !suggestionsContainerRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (customLLMConnection.data) {
      const currentApiBase = customLLMConnection.data.api_base;
      const provider = getProviderFromApiBase(currentApiBase);
      let portValue = "";

      if (provider === "ollama" || provider === "lm_studio") {
        portValue = extractPortOrDefault(currentApiBase, provider);
      } else if (provider === "others" && currentApiBase?.startsWith("http://localhost:")) {
        // If 'others' is detected for a localhost URL, try to extract port for display if user switches back
        portValue = extractPortOrDefault(currentApiBase, undefined); // Pass undefined if provider is 'others'
      }

      form.reset({
        api_provider: provider,
        model: getCustomLLMModel.data || "",
        api_base: currentApiBase || "", // Use the loaded one, or empty if none
        port: portValue,
        api_key: customLLMConnection.data.api_key || "",
      });

      // If the loaded provider is Ollama/LM Studio, ensure api_base reflects its port
      if ((provider === "ollama" || provider === "lm_studio") && currentApiBase) {
        const finalPort = portValue || defaultPorts[provider];
        form.setValue("api_base", `http://localhost:${finalPort}/v1`, { shouldValidate: true });
      }
    } else {
      // Initial default setup when no connection data
      const initialProvider = "ollama";
      const initialPort = defaultPorts[initialProvider];
      form.reset({
        api_provider: initialProvider,
        model: "",
        api_base: `http://localhost:${initialPort}/v1`,
        port: initialPort,
        api_key: "",
      });
    }
  }, [customLLMConnection.data, getCustomLLMModel.data, form.reset, form.setValue]);

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      const selectedProvider = value.api_provider; // The provider being changed to, if name is api_provider

      if (name === "api_provider" && selectedProvider) {
        if (selectedProvider === "ollama" || selectedProvider === "lm_studio") {
          // Try to use existing port if user is toggling, otherwise default
          let portToUse = form.getValues("port");
          if (!portToUse || (type === "change" && !form.getFieldState("port").isDirty)) {
            // If port field is pristine or empty when switching to Ollama/LM, set its default.
            portToUse = defaultPorts[selectedProvider];
          }
          form.setValue("port", portToUse, { shouldValidate: true, shouldDirty: true });
          form.setValue("api_base", `http://localhost:${portToUse}/v1`, { shouldValidate: true, shouldDirty: true });
        } else if (selectedProvider === "others") {
          form.setValue("api_base", "", { shouldValidate: true, shouldDirty: true });
          form.setValue("port", "", { shouldValidate: false, shouldDirty: true });
        } else { // Other preset providers
          form.setValue("api_base", llmProviderPresets[selectedProvider] || "", {
            shouldValidate: true,
            shouldDirty: true,
          });
          form.setValue("port", "", { shouldValidate: false, shouldDirty: true });
        }
      }

      if (name === "port") {
        const providerForPort = form.getValues("api_provider"); // Get current provider from form state
        if (providerForPort === "ollama" || providerForPort === "lm_studio") {
          const portVal = value.port;
          const effectivePort = portVal || defaultPorts[providerForPort]; // Use default if port field is empty

          form.setValue("api_base", `http://localhost:${effectivePort}/v1`, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }

      const runMutations = () => {
        if (!form.formState.errors.model && value.model && value.model !== getCustomLLMModel.data) {
          setCustomLLMModel.mutate(value.model);
        }

        const currentApiBase = form.getValues("api_base"); // Use getValues for freshest data
        if (
          !form.formState.errors.api_base && currentApiBase
          && (currentApiBase !== customLLMConnection.data?.api_base
            || value.api_key !== customLLMConnection.data?.api_key)
        ) {
          setCustomLLMConnection.mutate({
            api_base: currentApiBase,
            api_key: value.api_key || null,
          });
        }
      };

      // Run mutations on relevant field changes, after potential setValue calls
      if (name === "api_provider" || name === "api_base" || name === "api_key" || name === "model") {
        // Allow RHF to process setValue and validation by deferring slightly or using a resolved promise
        Promise.resolve().then(runMutations);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, setCustomLLMModel, setCustomLLMConnection, getCustomLLMModel.data, customLLMConnection.data]);

  const currentLLM = customLLMEnabled.data ? "custom" : "llama-3.2-3b-q4";

  return (
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
          <div className="flex items-center">
            <RadioGroupItem value="llama-3.2-3b-q4" id="llama-3.2-3b-q4" className="peer sr-only" />
            <div className="flex flex-col">
              <span className="font-medium">
                <Trans>Default (llama-3.2-3b-q4)</Trans>
              </span>
              <p className="text-xs font-normal text-neutral-500 mt-1">
                <Trans>Use the local Llama 3.2 model for enhanced privacy and offline capability</Trans>
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
          <div className="flex items-center">
            <RadioGroupItem value="custom" id="custom" className="peer sr-only" />
            <div className="flex flex-col">
              <span className="font-medium">
                <Trans>Bring Your Own LLM</Trans>
              </span>
              <p className="text-xs font-normal text-neutral-500 mt-1">
                <Trans>Connect to a self-hosted or third-party LLM endpoint</Trans>
              </p>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "border-t transition-opacity duration-200",
            customLLMEnabled.data ? "opacity-100" : "opacity-50 pointer-events-none",
          )}
        >
          <Form {...form}>
            <form className="mt-4 space-y-4">
              <FormItem>
                <div
                  className={cn(
                    "flex w-full items-start space-x-2",
                  )}
                >
                  <FormField
                    control={form.control}
                    name="api_provider"
                    render={({ field }) => (
                      <div
                        className={cn(
                          "w-40 flex-shrink-0",
                        )}
                      >
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.trigger("api_base");
                          }}
                          value={field.value}
                          disabled={!customLLMEnabled.data}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an LLM provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {llmProviders.map(p => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="pt-1" />
                      </div>
                    )}
                  />

                  {(form.watch("api_provider") === "ollama" || form.watch("api_provider") === "lm_studio") && (
                    <FormField
                      control={form.control}
                      name="port"
                      render={({ field }) => (
                        <div className="w-[100px] flex-shrink-0">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={defaultPorts[form.watch("api_provider") as keyof typeof defaultPorts]
                                || "Port"}
                              disabled={!customLLMEnabled.data}
                            />
                          </FormControl>
                          <FormMessage className="pt-1" />
                        </div>
                      )}
                    />
                  )}

                  {form.watch("api_provider") === "others" && (
                    <FormField
                      control={form.control}
                      name="api_base"
                      render={({ field }) => (
                        <div className="flex-grow min-w-0">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter API Base URL (e.g., http://host/v1)"
                              disabled={!customLLMEnabled.data}
                              className="focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                          </FormControl>
                          <FormMessage className="pt-1" />
                        </div>
                      )}
                    />
                  )}
                </div>
              </FormItem>

              {(() => {
                const currentProvider = form.watch("api_provider");
                let showApiKey = true; // Default to show

                if (currentProvider === "ollama" || currentProvider === "lm_studio") {
                  showApiKey = false;
                }

                if (!customLLMEnabled.data || !showApiKey) {
                  return null;
                }

                return (
                  <FormField
                    control={form.control}
                    name="api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          <Trans>API Key</Trans>
                        </FormLabel>
                        <FormDescription className="text-xs">
                          <Trans>Enter the API key if your LLM endpoint requires one.</Trans>
                        </FormDescription>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""} // Ensure controlled component with string value
                            type="password"
                            placeholder="sk-... or leave blank if not needed"
                            disabled={!customLLMEnabled.data} // Redundant check, but good for clarity
                            className="focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              })()}

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Model</Trans>
                    </FormLabel>
                    <FormDescription className="text-xs">
                      <Trans>Specify the model name. Type to search or enter a custom name.</Trans>
                    </FormDescription>
                    <FormControl>
                      {availableLLMModels.isLoading
                        ? (
                          <div className="py-1 text-sm text-neutral-500">
                            <Trans>Loading available models...</Trans>
                          </div>
                        )
                        : (
                          <div className="w-full" ref={suggestionsContainerRef}>
                            <Input
                              value={field.value || ""} // Ensure controlled component with string value
                              onChange={(e) => {
                                const newValue = e.target.value;
                                field.onChange(newValue); // Update RHF state
                                setCustomLLMModel.mutate(newValue); // Persist this specific field change
                                if (!isSuggestionsOpen) {
                                  setIsSuggestionsOpen(true);
                                }
                              }}
                              onFocus={() => setIsSuggestionsOpen(true)}
                              placeholder="Type or select a model"
                              disabled={!customLLMEnabled.data || availableLLMModels.isError}
                              autoComplete="off"
                              className="w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                            {isSuggestionsOpen && !availableLLMModels.isError && (
                              <div className="w-full mt-2 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {availableLLMModels.data && availableLLMModels.data.length > 0
                                  ? (
                                    (() => {
                                      const filteredModels = availableLLMModels.data.filter(model =>
                                        model.toLowerCase().includes((field.value || "").toLowerCase())
                                      );
                                      if (filteredModels.length > 0) {
                                        return filteredModels.map(model => (
                                          <div
                                            key={model}
                                            className="p-2 hover:bg-accent cursor-pointer text-sm"
                                            onClick={() => {
                                              field.onChange(model);
                                              setCustomLLMModel.mutate(model);
                                              setIsSuggestionsOpen(false);
                                            }}
                                          >
                                            {model}
                                          </div>
                                        ));
                                      } else {
                                        return (
                                          <div className="p-2 text-sm text-neutral-500">
                                            <Trans>
                                              No matching models. Continue typing to use a custom model name.
                                            </Trans>
                                          </div>
                                        );
                                      }
                                    })()
                                  )
                                  : (
                                    <div className="p-2 text-sm text-neutral-500">
                                      <Trans>No models listed for this endpoint. Type your model name.</Trans>
                                    </div>
                                  )}
                              </div>
                            )}
                            {/* Display error message if model fetching failed, but still allow typing */}
                            {availableLLMModels.isError && (
                              <div className="pt-1 text-xs text-red-500">
                                <Trans>Could not load models. You can still type a custom model name above.</Trans>
                              </div>
                            )}
                          </div>
                        )}
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
  );
}
