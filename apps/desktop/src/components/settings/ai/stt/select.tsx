import { useForm } from "@tanstack/react-form";
import { useQueries } from "@tanstack/react-query";
import { useCallback } from "react";

import { commands as localSttCommands, type SupportedSttModel } from "@hypr/plugin-local-stt";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";
import { useConfigValues } from "../../../../config/use-config";
import { useSTTConnection } from "../../../../hooks/useSTTConnection";
import * as main from "../../../../store/tinybase/main";
import { displayModelId, type ProviderId, PROVIDERS, sttModelQueries } from "./shared";

export function SelectProviderAndModel() {
  const { current_stt_provider, current_stt_model } = useConfigValues(
    ["current_stt_provider", "current_stt_model"] as const,
  );
  const configuredProviders = useConfiguredMapping();

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
        <h3 className="text-md font-semibold">Model being used</h3>
        <HealthCheck />
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
            <div className="flex-[2] min-w-0">
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
            const allModels = configuredProviders?.[providerId] ?? [];
            const models = allModels.filter((model) => {
              if (model.id.startsWith("Quantized")) {
                return model.isDownloaded;
              }
              return true;
            });

            return (
              <div className="flex-[3] min-w-0">
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

  const [p2, p3, tinyEn, smallEn] = useQueries({
    queries: [
      sttModelQueries.isDownloaded("am-parakeet-v2"),
      sttModelQueries.isDownloaded("am-parakeet-v3"),
      sttModelQueries.isDownloaded("QuantizedTinyEn"),
      sttModelQueries.isDownloaded("QuantizedSmallEn"),
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
            { id: "QuantizedTinyEn", isDownloaded: tinyEn.data ?? false },
            { id: "QuantizedSmallEn", isDownloaded: smallEn.data ?? false },
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

function HealthCheck() {
  const configs = useConfigValues(
    ["current_stt_provider", "current_stt_model", "spoken_languages"] as const,
  );
  const current_stt_provider = configs.current_stt_provider as string | undefined;
  const current_stt_model = configs.current_stt_model as string | undefined;

  const experimental_handleServer = useCallback(() => {
    if (
      current_stt_provider === "hyprnote"
      && current_stt_model
      && (
        current_stt_model.startsWith("am-")
        || current_stt_model.startsWith("Quantized")
      )
    ) {
      localSttCommands.stopServer(null)
        .then(() => new Promise((resolve) => setTimeout(resolve, 500)))
        .then(() => localSttCommands.startServer(current_stt_model as SupportedSttModel))
        .then(console.log)
        .catch(console.error);
    }
  }, [current_stt_provider, current_stt_model]);

  const conn = useSTTConnection();

  const isLocalModel = current_stt_provider === "hyprnote" && current_stt_model?.startsWith("am-") === true;
  const hasServerIssue = isLocalModel && !conn?.baseUrl;

  const { color, tooltipMessage } = (() => {
    if (!conn) {
      return {
        color: "bg-red-400",
        tooltipMessage: "No STT connection. Please configure a provider and model.",
      };
    }

    if (hasServerIssue) {
      return {
        color: "bg-red-400",
        tooltipMessage: "Local server not ready. Click to restart.",
      };
    }

    if (conn.baseUrl) {
      return {
        color: "bg-green-400",
        tooltipMessage: "STT connection ready",
      };
    }

    return {
      color: "bg-red-400",
      tooltipMessage: "Connection not available",
    };
  })();

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <span
          onClick={experimental_handleServer}
          className={cn([
            "w-2 h-2 rounded-full cursor-pointer",
            color,
          ])}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-xs">{tooltipMessage}</p>
      </TooltipContent>
    </Tooltip>
  );
}
