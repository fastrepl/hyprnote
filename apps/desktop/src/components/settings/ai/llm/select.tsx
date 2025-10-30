import { useForm } from "@tanstack/react-form";
import { useMemo } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/utils";
import { useAuth } from "../../../../auth";
import * as main from "../../../../store/tinybase/main";
import {
  listAnthropicModels,
  listGenericModels,
  listLMStudioModels,
  type ListModelsResult,
  listOllamaModels,
  listOpenAIModels,
  listOpenRouterModels,
} from "../shared/list-models";
import { ModelCombobox } from "../shared/model-combobox";
import { PROVIDERS } from "./shared";

export function SelectProviderAndModel() {
  const configuredProviders = useConfiguredMapping();
  const { current_llm_model, current_llm_provider } = main.UI.useValues(main.STORE_ID);

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
        const { form: { errors } } = formApi.getAllErrors();
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
          "flex flex-row items-center gap-4",
          "p-4 rounded-md border border-neutral-500 bg-neutral-50",
          (!!current_llm_provider && !!current_llm_model) ? "border-solid" : "border-dashed border-red-400",
        ])}
      >
        <form.Field
          name="provider"
          listeners={{ onChange: () => form.setFieldValue("model", "") }}
        >
          {(field) => (
            <div style={{ flex: 4 }}>
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
              <div style={{ flex: 6 }}>
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
    </div>
  );
}

function useConfiguredMapping(): Record<string, null | (() => Promise<ListModelsResult>)> {
  const auth = useAuth();
  const configuredProviders = main.UI.useResultTable(main.QUERIES.llmProviders, main.STORE_ID);

  const mapping = useMemo(() => {
    return Object.fromEntries(
      PROVIDERS.map((provider) => {
        if (provider.id === "hyprnote") {
          if (!auth?.session) {
            return [provider.id, null];
          }

          return [
            provider.id,
            async () => ({ models: ["Auto"], ignored: [] }),
          ];
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
