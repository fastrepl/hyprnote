import { useForm } from "@tanstack/react-form";
import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/utils";

import { useAuth } from "../../../../auth";
import { useBillingAccess } from "../../../../billing";
import { useConfigValues } from "../../../../config/use-config";
import * as main from "../../../../store/tinybase/main";
import { listAnthropicModels } from "../shared/list-anthropic";
import {
  type InputModality,
  type ListModelsResult,
} from "../shared/list-common";
import { listGoogleModels } from "../shared/list-google";
import { listLMStudioModels } from "../shared/list-lmstudio";
import { listOllamaModels } from "../shared/list-ollama";
import { listGenericModels, listOpenAIModels } from "../shared/list-openai";
import { listOpenRouterModels } from "../shared/list-openrouter";
import { ModelCombobox } from "../shared/model-combobox";
import { HealthCheckForConnection } from "./health";
import { PROVIDERS } from "./shared";

export function SelectProviderAndModel() {
  const configuredProviders = useConfiguredMapping();

  const { current_llm_model, current_llm_provider } = useConfigValues([
    "current_llm_model",
    "current_llm_provider",
  ] as const);
  const billing = useBillingAccess();

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
              onChange: ({ value }) => {
                if (value === "hyprnote") {
                  form.setFieldValue("model", "Auto");
                } else {
                  form.setFieldValue("model", "");
                }
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
                    {PROVIDERS.map((provider) => {
                      const locked = provider.requiresPro && !billing.isPro;
                      const configured = configuredProviders[provider.id];

                      return (
                        <SelectItem
                          key={provider.id}
                          value={provider.id}
                          disabled={!configured || locked}
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              {provider.icon}
                              <span>{provider.displayName}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
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

              const providerDef = PROVIDERS.find(
                (provider) => provider.id === providerId,
              );
              const providerRequiresPro = providerDef?.requiresPro ?? false;
              const locked = providerRequiresPro && !billing.isPro;

              const listModels = !locked ? maybeListModels : undefined;

              return (
                <div className="flex-[3] min-w-0">
                  <ModelCombobox
                    providerId={providerId}
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value)}
                    disabled={!maybeListModels || locked}
                    listModels={listModels}
                  />
                  {locked ? (
                    <p className="mt-1 text-[11px] text-neutral-500">
                      Upgrade to Pro to pick{" "}
                      {providerDef?.displayName ?? "this provider"} models.
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          {current_llm_provider && current_llm_model && (
            <HealthCheckForConnection />
          )}
        </div>
      </div>
    </div>
  );
}

function useConfiguredMapping(): Record<
  string,
  undefined | (() => Promise<ListModelsResult>)
> {
  const auth = useAuth();
  const billing = useBillingAccess();
  const configuredProviders = main.UI.useResultTable(
    main.QUERIES.llmProviders,
    main.STORE_ID,
  );

  const mapping = useMemo(() => {
    return Object.fromEntries(
      PROVIDERS.map((provider) => {
        if (provider.requiresPro && !billing.isPro) {
          return [provider.id, undefined];
        }

        if (provider.id === "hyprnote") {
          if (!auth?.session) {
            return [provider.id, undefined];
          }

          const result: ListModelsResult = {
            models: ["Auto"],
            ignored: [],
            metadata: {
              Auto: {
                input_modalities: ["text", "image"] as InputModality[],
              },
            },
          };

          return [provider.id, async () => result];
        }

        const config = configuredProviders[provider.id];

        if (!config || !config.base_url) {
          return [provider.id, undefined];
        }

        if (provider.apiKey && !config.api_key) {
          return [provider.id, undefined];
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
          case "google_generative_ai":
            listModelsFunc = () => listGoogleModels(baseUrl, apiKey);
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
    ) as Record<string, undefined | (() => Promise<ListModelsResult>)>;
  }, [configuredProviders, auth, billing]);

  return mapping;
}
