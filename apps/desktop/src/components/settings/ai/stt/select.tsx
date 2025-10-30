import { useForm } from "@tanstack/react-form";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { commands as localSttCommands, type SupportedSttModel } from "@hypr/plugin-local-stt";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/utils";
import * as main from "../../../../store/tinybase/main";
import { displayModelId, type ProviderId, PROVIDERS, sttModelQueries } from "./shared";

export function SelectProviderAndModel() {
  const { current_stt_provider, current_stt_model } = main.UI.useValues(main.STORE_ID);
  const configuredProviders = useConfiguredMapping();

  const server = useQuery({
    enabled: current_stt_provider === "hyprnote",
    refetchInterval: 1000,
    queryKey: ["local-stt-servers"],
    queryFn: () => localSttCommands.getServers(),
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }

      return result.data.external;
    },
  });

  const experimental_handleServer = useCallback(() => {
    if (current_stt_provider === "hyprnote" && current_stt_model?.startsWith("am-")) {
      localSttCommands.stopServer("external")
        .then(() => new Promise((resolve) => setTimeout(resolve, 500)))
        .then(() => localSttCommands.startServer(current_stt_model as SupportedSttModel))
        .then(console.log)
        .catch(console.error);
    }
  }, [current_stt_provider, current_stt_model]);

  const handleSelectProvider = main.UI.useSetValueCallback(
    "current_stt_provider",
    (provider: string) => provider,
    [],
    main.STORE_ID,
  );

  const handleSelectModel = main.UI.useSetValueCallback(
    "current_stt_model",
    (model: string) => model,
    [],
    main.STORE_ID,
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
      <div className="flex flex-row items-center gap-2">
        <h3 className="text-md font-semibold" onClick={experimental_handleServer}>Model being used</h3>
        <span
          className={cn([
            "text-sm w-2 h-2 rounded-full",
            (current_stt_provider === "hyprnote" && current_stt_model?.startsWith("am-")) ? "visible" : "hidden",
            server.data?.health === "ready"
              ? "bg-green-200"
              : server.data?.health === "loading"
              ? "bg-yellow-200"
              : "bg-red-200",
          ])}
        />
      </div>
      <div
        className={cn([
          "flex flex-row items-center gap-4",
          "p-4 rounded-md border border-neutral-500 bg-neutral-50",
          (!!current_stt_provider && !!current_stt_model) ? "border-solid" : "border-dashed border-red-400",
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
                  {PROVIDERS.filter(({ disabled }) => !disabled).map((provider) => (
                    <SelectItem
                      key={provider.id}
                      value={provider.id}
                      disabled={provider.disabled || (configuredProviders[provider.id]?.length ?? 0) === 0}
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
                      <SelectItem key={model.id} value={model.id} disabled={!model.isDownloaded}>
                        {displayModelId(model.id)}
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

function useConfiguredMapping(): Record<ProviderId, Array<{ id: string; isDownloaded: boolean }>> {
  const configuredProviders = main.UI.useResultTable(main.QUERIES.sttProviders, main.STORE_ID);

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
            { id: "am-parakeet-v2", isDownloaded: p2.data ?? false },
            { id: "am-parakeet-v3", isDownloaded: p3.data ?? false },
          ],
        ];
      }

      const config = configuredProviders[provider.id] as main.AIProviderStorage | undefined;

      if (!config) {
        return [provider.id, []];
      }

      return [provider.id, provider.models.map((model) => ({ id: model, isDownloaded: true }))];
    }),
  ) as Record<ProviderId, Array<{ id: string; isDownloaded: boolean }>>;
}
