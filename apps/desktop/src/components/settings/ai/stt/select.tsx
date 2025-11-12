import { commands as localSttCommands, type SupportedSttModel } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { useForm } from "@tanstack/react-form";
import { useQueries } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { useCallback } from "react";

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
      <h3 className="text-md font-semibold">Model being used</h3>
      <div
        className={cn([
          "flex flex-col gap-4",
          "p-4 rounded-lg border border-neutral-200",
          (!!current_stt_provider && !!current_stt_model) ? "bg-neutral-50" : "bg-red-50",
        ])}
      >
        <div className="flex flex-row items-center gap-4">
          <form.Field
            name="provider"
            listeners={{
              onChange: ({ value }) => {
                form.setFieldValue("model", "");
                const providerId = value as ProviderId;
                if (providerId !== "custom") {
                  const allModels = configuredProviders?.[providerId]?.models ?? [];
                  const availableModels = allModels.filter((model) => model.isDownloaded);
                  if (availableModels.length > 0) {
                    setTimeout(() => {
                      form.setFieldValue("model", availableModels[0].id);
                    }, 0);
                  }
                }
              },
            }}
          >
            {(field) => (
              <div className="flex-[2] min-w-0" data-stt-provider-selector>
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
                        disabled={provider.disabled || !(configuredProviders[provider.id]?.configured ?? false)}
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
              if (providerId === "custom") {
                return (
                  <div className="flex-[3] min-w-0">
                    <Input
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      className="text-xs"
                      placeholder="Enter a model identifier"
                    />
                  </div>
                );
              }

              const allModels = configuredProviders?.[providerId]?.models ?? [];
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
        {current_stt_provider && current_stt_model && <HealthCheck />}
      </div>
    </div>
  );
}

function useConfiguredMapping(): Record<
  ProviderId,
  {
    configured: boolean;
    models: Array<{ id: string; isDownloaded: boolean }>;
  }
> {
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
          {
            configured: true,
            models: [
              { id: "am-parakeet-v2", isDownloaded: p2.data ?? false },
              { id: "am-parakeet-v3", isDownloaded: p3.data ?? false },
              { id: "QuantizedTinyEn", isDownloaded: tinyEn.data ?? false },
              { id: "QuantizedSmallEn", isDownloaded: smallEn.data ?? false },
            ],
          },
        ];
      }

      const config = configuredProviders[provider.id] as main.AIProviderStorage | undefined;

      if (!config) {
        return [provider.id, { configured: false, models: [] }];
      }

      if (provider.id === "custom") {
        return [provider.id, { configured: true, models: [] }];
      }

      return [
        provider.id,
        {
          configured: true,
          models: provider.models.map((model) => ({ id: model, isDownloaded: true })),
        },
      ];
    }),
  ) as Record<
    ProviderId,
    {
      configured: boolean;
      models: Array<{ id: string; isDownloaded: boolean }>;
    }
  >;
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

  const isLocalModel = current_stt_provider === "hyprnote"
    && current_stt_model
    && (
      current_stt_model.startsWith("am-")
      || current_stt_model.startsWith("Quantized")
    );

  if (!isLocalModel) {
    return null;
  }

  const hasServerIssue = !conn?.baseUrl;

  const { status, message, textColor } = (() => {
    if (!conn) {
      return {
        status: "No STT connection. Please configure a provider and model.",
        message: "No STT connection. Please configure a provider and model.",
        textColor: "text-red-600",
      };
    }

    if (hasServerIssue) {
      return {
        status: "Local server not ready. Click to restart.",
        message: "Local server not ready. Click to restart.",
        textColor: "text-red-600",
      };
    }

    if (conn.baseUrl) {
      return {
        status: "Connected!",
        message: "STT connection ready",
        textColor: "text-green-600",
      };
    }

    return {
      status: "Connection not available",
      message: "Connection not available",
      textColor: "text-red-600",
    };
  })();

  return (
    <div className="flex items-center justify-between gap-2 h-7">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span className={cn(["text-xs font-medium", textColor])}>
            {status}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">{message}</p>
        </TooltipContent>
      </Tooltip>
      {hasServerIssue && (
        <Button
          size="sm"
          variant="ghost"
          onClick={experimental_handleServer}
        >
          <RefreshCwIcon size={12} />
          Restart Server
        </Button>
      )}
    </div>
  );
}
