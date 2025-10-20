import { useForm } from "@tanstack/react-form";
import { useQueries } from "@tanstack/react-query";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/ui/lib/utils";
import * as internal from "../../../../store/tinybase/internal";
import { displayModelId, type ProviderId, PROVIDERS, sttModelQueries } from "./shared";

export function SelectProviderAndModel() {
  const { current_stt_provider, current_stt_model } = internal.UI.useValues(internal.STORE_ID);
  const configuredProviders = useConfiguredMapping();

  const handleSelectProvider = internal.UI.useSetValueCallback(
    "current_stt_provider",
    (provider: string) => provider,
    [],
    internal.STORE_ID,
  );

  const handleSelectModel = internal.UI.useSetValueCallback(
    "current_stt_model",
    (model: string) => model,
    [],
    internal.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      provider: current_stt_provider || "",
      model: current_stt_model || "",
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
          "p-4 rounded-md border border-gray-500 bg-gray-50",
          (!!current_stt_provider && !!current_stt_model) ? "border-solid" : "border-dashed",
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
            const providerId = field.form.getFieldValue("provider") as ProviderId;
            const models = configuredProviders?.[providerId] ?? [];

            return (
              <div style={{ flex: 6 }}>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                  disabled={models.length === 0}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model} value={model}>
                        {displayModelId(model)}
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

function useConfiguredMapping(): Record<ProviderId, string[]> {
  const configuredProviders = internal.UI.useResultTable(internal.QUERIES.sttProviders, internal.STORE_ID);

  const [p2, p3] = useQueries({
    queries: [
      sttModelQueries.isDownloaded("am-parakeet-v2"),
      sttModelQueries.isDownloaded("am-parakeet-v3"),
    ],
  });

  return Object.fromEntries(
    PROVIDERS.map((provider) => {
      if (provider.id === "hyprnote") {
        return [
          provider.id,
          [
            p2.data ? "am-parakeet-v2" : null,
            p3.data ? "am-parakeet-v3" : null,
          ].filter(Boolean) as string[],
        ];
      }

      const config = configuredProviders[provider.id] as internal.AIProviderStorage | undefined;

      if (!config) {
        return [provider.id, null];
      }

      return [provider.id, provider.models];
    }),
  );
}
