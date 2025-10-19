import { useForm } from "@tanstack/react-form";
import { useQueries } from "@tanstack/react-query";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/ui/lib/utils";
import * as internal from "../../../../store/tinybase/internal";
import { type ProviderId, PROVIDERS, sttModelQueries } from "./shared";

export function SelectProviderAndModel() {
  const selectedProvider = internal.UI.useValue("current_stt_provider", internal.STORE_ID);
  const configuredProviders = useConfiguredMapping();

  const handleSelectProvider = internal.UI.useSetValueCallback(
    "current_stt_provider",
    (provider: string) => provider,
    [],
    internal.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      provider: selectedProvider || "",
      model: "",
    },
    listeners: { onChange: ({ formApi }) => formApi.handleSubmit() },
    onSubmit: ({ value }) => handleSelectProvider(value.provider),
  });

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-md font-semibold">Model being used</h3>
      <div
        className={cn([
          "flex flex-row items-center gap-4",
          "p-4 rounded-md border border-gray-500 bg-gray-50",
          !!selectedProvider ? "border-solid" : "border-dashed",
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
                      disabled={provider.disabled || !configuredProviders[provider.id]}
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
            const selectedProviderConfig = PROVIDERS.find(
              (p) => p.id === form.getFieldValue("provider"),
            );
            const availableModels = selectedProviderConfig?.models || [];

            return (
              <div style={{ flex: 6 }}>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                  disabled={!selectedProviderConfig || availableModels.length === 0}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }}
        </form.Field>
      </div>
    </div>
  );
}

function useConfiguredMapping(): Record<ProviderId, boolean> {
  const configuredProviders = internal.UI.useResultTable(internal.QUERIES.sttProviders, internal.STORE_ID);

  const modelDownloadedQueries = useQueries({
    queries: [
      sttModelQueries.isDownloaded("am-parakeet-v2"),
      sttModelQueries.isDownloaded("am-parakeet-v3"),
    ],
  });

  const hasAnyModelDownloaded = modelDownloadedQueries.some((query) => query.data === true);

  return Object.fromEntries(
    PROVIDERS.map((provider) => {
      if (provider.id === "hyprnote") {
        return [provider.id, hasAnyModelDownloaded];
      }

      return [provider.id, configuredProviders[provider.id]];
    }),
  );
}
