import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { generateText } from "ai";
import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { useAuth } from "../../../../auth";
import { useConfigValues } from "../../../../config/use-config";
import { useLanguageModel } from "../../../../hooks/useLLMConnection";
import * as main from "../../../../store/tinybase/main";
import type { ListModelsResult } from "../shared/list-common";
import { listLMStudioModels } from "../shared/list-lmstudio";
import { listOllamaModels } from "../shared/list-ollama";
import {
  listAnthropicModels,
  listGenericModels,
  listOpenAIModels,
} from "../shared/list-openai";
import { listOpenRouterModels } from "../shared/list-openrouter";
import { ModelCombobox } from "../shared/model-combobox";
import { PROVIDERS } from "./shared";

export function SelectProviderAndModel() {
  const configuredProviders = useConfiguredMapping();

  const { current_llm_model, current_llm_provider } = useConfigValues([
    "current_llm_model",
    "current_llm_provider",
  ] as const);

  const handleSelectProvider = main.UI.useSetValueCallback(
    "current_llm_provider",
    (provider: string) => provider,
    [],
    main.STORE_ID,
  );
  const handleSelectModel = main.UI.useSetValueCallback(
    "current_llm_model",
    (model: string) => model,
    [],
    main.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      provider: current_llm_provider || "",
      model: current_llm_model || "",
    },
    listeners: {
      onChange: ({ formApi }) => {
        const {
          form: { errors },
        } = formApi.getAllErrors();
        if (errors.length > 0) {
          console.log(errors);
        }

        formApi.handleSubmit();
      },
    },
    onSubmit: ({ value }) => {
      handleSelectProvider(value.provider);
      handleSelectModel(value.model);
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-md font-semibold">Model being used</h3>
      <div
        className={cn([
          "flex flex-col gap-4",
          "p-4 rounded-lg border border-neutral-200",
          !!current_llm_provider && !!current_llm_model
            ? "bg-neutral-50"
            : "bg-red-50",
        ])}
      >
        <div className="flex flex-row items-center gap-4">
          <form.Field
            name="provider"
            listeners={{
              onChange: () => {
                form.setFieldValue("model", "");
              },
            }}
          >
            {(field) => (
              <div className="flex-[2] min-w-0" data-llm-provider-selector>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => (
                      <SelectItem
                        key={provider.id}
                        value={provider.id}
                        disabled={!configuredProviders[provider.id]}
                      >
                        <div className="flex items-center gap-2">
                          {provider.icon}
                          <span>{provider.displayName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <span className="text-neutral-500">/</span>

          <form.Field name="model">
            {(field) => {
              const providerId = form.getFieldValue("provider");
              const maybeListModels = configuredProviders[providerId];

              const listModels = () => {
                if (!maybeListModels) {
                  return { models: [], ignored: [] };
                }
                return maybeListModels();
              };

              return (
                <div className="flex-[3] min-w-0">
                  <ModelCombobox
                    providerId={providerId}
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value)}
                    disabled={!maybeListModels}
                    listModels={listModels}
                  />
                </div>
              );
            }}
          </form.Field>
        </div>
        {current_llm_provider && current_llm_model && <HealthCheck />}
      </div>
    </div>
  );
}

function useConfiguredMapping(): Record<
  string,
  null | (() => Promise<ListModelsResult>)
> {
  const auth = useAuth();
  const configuredProviders = main.UI.useResultTable(
    main.QUERIES.llmProviders,
    main.STORE_ID,
  );

  const mapping = useMemo(() => {
    return Object.fromEntries(
      PROVIDERS.map((provider) => {
        if (provider.id === "hyprnote") {
          if (!auth?.session) {
            return [provider.id, null];
          }

          return [provider.id, async () => ({ models: ["Auto"], ignored: [] })];
        }

        const config = configuredProviders[provider.id];

        if (!config || !config.base_url) {
          return [provider.id, null];
        }

        if (provider.apiKey && !config.api_key) {
          return [provider.id, null];
        }

        const { base_url, api_key } = config;
        const baseUrl = String(base_url);
        const apiKey = String(api_key);

        let listModelsFunc: () => Promise<ListModelsResult>;

        switch (provider.id) {
          case "openai":
            listModelsFunc = () => listOpenAIModels(baseUrl, apiKey);
            break;
          case "anthropic":
            listModelsFunc = () => listAnthropicModels(baseUrl, apiKey);
            break;
          case "openrouter":
            listModelsFunc = () => listOpenRouterModels(baseUrl, apiKey);
            break;
          case "ollama":
            listModelsFunc = () => listOllamaModels(baseUrl, apiKey);
            break;
          case "lmstudio":
            listModelsFunc = () => listLMStudioModels(baseUrl, apiKey);
            break;
          case "custom":
            listModelsFunc = () => listGenericModels(baseUrl, apiKey);
            break;
          default:
            listModelsFunc = () => listGenericModels(baseUrl, apiKey);
        }

        return [provider.id, listModelsFunc];
      }),
    ) as Record<string, null | (() => Promise<ListModelsResult>)>;
  }, [configuredProviders, auth]);

  return mapping;
}

function HealthCheck() {
  const model = useLanguageModel();

  const text = useQuery({
    enabled: !!model,
    queryKey: ["model-health-check", model],
    queryFn: () =>
      generateText({
        model: model!,
        system: "If user says hi, respond with hello, without any other text.",
        prompt: "Hi",
      }),
  });

  const { status, message, textColor } = (() => {
    if (!model) {
      return {
        status: "No model configured",
        message: "Please configure a provider and model",
        textColor: "text-red-600",
      };
    }

    if (text.isPending) {
      return {
        status: "Checking connection",
        message: "Testing model connection",
        textColor: "text-yellow-600",
      };
    }

    if (text.isError) {
      return {
        status: "Connection failed",
        message: text.error?.message || "Unable to connect to the model",
        textColor: "text-red-600",
      };
    }

    if (text.isSuccess) {
      return {
        status: "Connected!",
        message: "Model is ready to use",
        textColor: "text-green-600",
      };
    }

    return {
      status: "Unknown status",
      message: "Connection status unknown",
      textColor: "text-red-600",
    };
  })();

  const isLoading = text.isPending;

  return (
    <div className="flex items-center justify-between gap-2 h-7">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span className={cn(["text-xs font-medium", textColor])}>
            {status}
            {isLoading && (
              <span className="inline-block ml-0.5">
                <span className="animate-pulse">.</span>
                <span
                  className="animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                >
                  .
                </span>
                <span
                  className="animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                >
                  .
                </span>
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">{message}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
