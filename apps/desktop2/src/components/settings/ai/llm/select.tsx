import { useForm } from "@tanstack/react-form";
import { useMemo } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/ui/lib/utils";
import * as internal from "../../../../store/tinybase/internal";
import { ModelCombobox, openaiCompatibleListModels } from "../shared/model-combobox";
import { ProviderId, PROVIDERS } from "./shared";

export function SelectProviderAndModel() {
  const configuredProviders = useConfiguredMapping();
  const { current_llm_model, current_llm_provider } = internal.UI.useValues(internal.STORE_ID);

  const handleSelectProvider = internal.UI.useSetValueCallback(
    "current_llm_provider",
    (provider: string) => provider,
    [],
    internal.STORE_ID,
  );
  const handleSelectModel = internal.UI.useSetValueCallback(
    "current_llm_model",
    (model: string) => model,
    [],
    internal.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      provider: current_llm_provider || "",
      model: current_llm_model || "",
    },
    listeners: { onChange: ({ formApi }) => formApi.handleSubmit() },
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
          "p-4 rounded-md border border-gray-500 bg-gray-50",
          (!!current_llm_provider && !!current_llm_model) ? "border-solid" : "border-dashed",
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

        <span className="text-gray-500">/</span>

        <form.Field name="model">
          {(field) => {
            const providerId = form.getFieldValue("provider");
            const maybeListModels = configuredProviders[providerId];

            const listModels = () => {
              if (!maybeListModels) {
                return [];
              }
              return maybeListModels();
            };

            return (
              <div style={{ flex: 6 }}>
                <ModelCombobox
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  disabled={!maybeListModels}
                  listModels={listModels}
                  placeholder="Select a model"
                />
              </div>
            );
          }}
        </form.Field>
      </div>
    </div>
  );
}

function useConfiguredMapping(): Record<ProviderId, null | (() => Promise<string[]>)> {
  const configuredProviders = internal.UI.useResultTable(internal.QUERIES.llmProviders, internal.STORE_ID);

  const mapping = useMemo(() => {
    return Object.fromEntries(
      PROVIDERS.map((provider) => {
        if (
          !configuredProviders[provider.id]
          || !configuredProviders[provider.id]?.base_url
          || !configuredProviders[provider.id]?.api_key
        ) {
          return [provider.id, null];
        }

        const { base_url, api_key } = configuredProviders[provider.id];

        return [
          provider.id,
          () => openaiCompatibleListModels(String(base_url), String(api_key)),
        ];
      }),
    );
  }, [configuredProviders]);

  return mapping;
}
