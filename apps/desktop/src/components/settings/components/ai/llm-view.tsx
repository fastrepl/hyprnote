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
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const llmProviders = [
  { value: "openai", label: "OpenAI" },
  { value: "openai_eu", label: "OpenAI (EU)" },
  { value: "claude", label: "Claude" },
  { value: "grok", label: "Grok" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "lm_studio", label: "LM Studio (Local)" },
  { value: "github", label: "GitHub Models" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "martian", label: "Martian" },
  { value: "others", label: "Others" },
];

const llmProviderPresets: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  openai_eu: "https://eu.api.openai.com/v1",
  ollama: "http://localhost:11434/v1",
  lm_studio: "http://localhost:1234/v1",
  grok: "https://api.x.ai/v1",
  claude: "https://api.anthropic.com/v1",
  github: "https://models.github.ai/inference",
  openrouter: "https://openrouter.ai/api/v1",
  martian: "https://withmartian.com/api/openai/v1"
};

const getProviderFromApiBase = (apiBase: string | undefined): string => {
  if (!apiBase) return "ollama";
  for (const [provider, url] of Object.entries(llmProviderPresets)) {
    if (apiBase === url) {
      return provider;
    }
  }
  return "others";
};

const endpointSchema = z.object({
  api_provider: z.string().min(1, { message: "Provider selection is required." }),
  model: z.string().min(1),
  api_base: z.string().url({ message: "Please enter a valid URL" }).min(1, { message: "URL is required" }).refine(
    (value) => {
      const v1NeededProviders = ["openai", "openrouter", "openai_eu", "claude", "grok", "lm_studio", "openrouter", "martian"];
      const includesV1Provider = v1NeededProviders.some((host) => value.includes(host));
      const isLocal = value.includes("localhost") || value.includes("127.0.0.1");

      if ((includesV1Provider || isLocal) && !value.endsWith("/v1")) {
        if (Object.values(llmProviderPresets).includes(value)) return true;
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
    mode: "onChange", // Important for watch to pick up programmatic changes correctly
    defaultValues: {
      api_provider: "ollama", // Default provider
      model: "",
      api_base: llmProviderPresets.ollama, // Default API base for Ollama
      api_key: "",
    },
  });

  useEffect(() => {
    if (customLLMConnection.data) {
      const currentApiBase = customLLMConnection.data.api_base;
      const provider = getProviderFromApiBase(currentApiBase);
      form.reset({
        api_provider: provider,
        model: getCustomLLMModel.data || "",
        api_base: currentApiBase || (provider !== 'others' && llmProviderPresets[provider]) || "",
        api_key: customLLMConnection.data.api_key || "",
      });
    } else {
      // Ensure default values are set if no connection data (already handled by defaultValues in useForm)
      // Optionally, could re-verify defaults or set a specific initial state if connection load fails
      const initialProvider = form.getValues("api_provider") || "ollama";
      form.reset({
        api_provider: initialProvider,
        model: "",
        api_base: llmProviderPresets[initialProvider] || "",
        api_key: ""
      })
    }
  }, [getCustomLLMModel.data, customLLMConnection.data, form.reset, form]); // Added form to dependencies

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === "api_provider") {
        const selectedProvider = value.api_provider;
        if (selectedProvider) {
          const presetUrl = llmProviderPresets[selectedProvider];
          if (presetUrl) {
            form.setValue("api_base", presetUrl, { shouldValidate: true, shouldDirty: true });
          } else {
            // No preset (e.g. Claude, Grok, or if user selected 'others' then switched to one without preset)
            // Clear api_base if not 'others', to prompt for input. 'others' keeps its current input.
            if (selectedProvider !== "others") {
              form.setValue("api_base", "", { shouldValidate: true, shouldDirty: true });
            }
          }
        }
      }

      // Debounce or ensure validation pass before mutating
      // Check if form is valid for specific fields before mutating
      const runMutations = () => {
        if (!form.formState.errors.model && value.model && value.model !== getCustomLLMModel.data) {
          setCustomLLMModel.mutate(value.model);
        }

        const currentApiBase = form.getValues("api_base"); // Use getValues for freshest data
        if (!form.formState.errors.api_base && currentApiBase &&
          (currentApiBase !== customLLMConnection.data?.api_base || value.api_key !== customLLMConnection.data?.api_key)) {
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
  }, [form, setCustomLLMModel, setCustomLLMConnection, getCustomLLMModel.data, customLLMConnection.data]); // Added relevant dependencies

  const isLocalEndpoint = (apiBase: string | undefined): boolean => {
    if (!apiBase) return false;
    return apiBase.includes("localhost") || apiBase.includes("127.0.0.1");
  };

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
          <div className="flex items-center">
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
            <form className="mt-4 space-y-4">
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  <Trans>LLM Provider / Endpoint</Trans>
                </FormLabel>
                <div className={cn(
                  "flex w-full items-start",
                  form.watch("api_provider") === "others" ? "space-x-2" : ""
                )}>
                  <FormField
                    control={form.control}
                    name="api_provider"
                    render={({ field }) => (
                      <div className={cn(
                        "max-w-[160px]",
                        form.watch("api_provider") === "others" ? "flex-shrink-0" : "w-full"
                      )}>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Trigger validation for api_base as it might change visibility/value
                            form.trigger("api_base");
                          }}
                          value={field.value} // Controlled component
                          disabled={!customLLMEnabled.data}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an LLM provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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

                  {form.watch("api_provider") === "others" && (
                    <FormField
                      control={form.control}
                      name="api_base"
                      render={({ field }) => (
                        <div className="w-1/2 flex-grow min-w-0">
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
                <FormDescription className="text-xs pt-1">
                  <Trans>Select a provider. For 'Others', specify the API base URL.</Trans>
                </FormDescription>
              </FormItem>

              {(() => {
                const currentProvider = form.watch("api_provider");
                const currentApiBase = form.watch("api_base");
                let showApiKey = false;

                if (customLLMEnabled.data && currentApiBase) {
                  if (currentProvider === "ollama" || currentProvider === "lm studio") {
                    showApiKey = false;
                  } else if (currentProvider === "others") {
                    showApiKey = !isLocalEndpoint(currentApiBase);
                  } else {
                    // For providers like openai, claude, grok, github that usually need keys
                    showApiKey = true;
                  }
                }

                if (!showApiKey) return null;

                return (
                  <FormField
                    control={form.control}
                    name="api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          <Trans>API Key (Optional)</Trans>
                        </FormLabel>
                        <FormDescription className="text-xs">
                          <Trans>Enter the API key if your LLM endpoint requires one.</Trans>
                        </FormDescription>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="sk-... or leave blank if not needed"
                            disabled={!customLLMEnabled.data}
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
                    <FormLabel className="text-sm font-medium">
                      <Trans>Model Name</Trans>
                    </FormLabel>
                    <FormDescription className="text-xs">
                      <Trans>
                        Select or enter the model name required by your endpoint.
                      </Trans>
                    </FormDescription>
                    <FormControl>
                      {availableLLMModels.isLoading
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
                            <div className="py-1 text-sm text-neutral-500">
                              <Trans>No models available for this endpoint.</Trans>
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
