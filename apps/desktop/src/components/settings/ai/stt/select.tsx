import { useForm } from "@tanstack/react-form";
import { useQueries, useQuery } from "@tanstack/react-query";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { Input } from "@hypr/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/utils";

import { useBillingAccess } from "../../../../billing";
import { useConfigValues } from "../../../../config/use-config";
import * as main from "../../../../store/tinybase/main";
import { HealthCheckForConnection } from "./health";
import {
  displayModelId,
  type ProviderId,
  PROVIDERS,
  sttModelQueries,
} from "./shared";

export function SelectProviderAndModel() {
  const { current_stt_provider, current_stt_model } = useConfigValues([
    "current_stt_provider",
    "current_stt_model",
  ] as const);
  const billing = useBillingAccess();
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
          "p-4 rounded-xl border border-neutral-200",
          !!current_stt_provider && !!current_stt_model
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
              <div className="flex-[2] min-w-0" data-stt-provider-selector>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.filter(({ disabled }) => !disabled).map(
                      (provider) => {
                        const configured =
                          configuredProviders[provider.id]?.configured ?? false;
                        const locked = provider.requiresPro && !billing.isPro;
                        return (
                          <SelectItem
                            key={provider.id}
                            value={provider.id}
                            disabled={
                              provider.disabled || !configured || locked
                            }
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                {provider.icon}
                                <span>{provider.displayName}</span>
                                {provider.requiresPro ? (
                                  <span className="text-[10px] uppercase tracking-wide text-neutral-500 border border-neutral-200 rounded-full px-2 py-0.5">
                                    Pro
                                  </span>
                                ) : null}
                              </div>
                              {locked ? (
                                <span className="text-[11px] text-neutral-500">
                                  Upgrade to Pro to use this provider.
                                </span>
                              ) : null}
                            </div>
                          </SelectItem>
                        );
                      },
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <span className="text-neutral-500">/</span>

          <form.Field name="model">
            {(field) => {
              const providerId = field.form.getFieldValue(
                "provider",
              ) as ProviderId;
              if (providerId === "custom") {
                return (
                  <div className="flex-[3] min-w-0">
                    <Input
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      className="text-xs"
                      placeholder="Enter a model identifier"
                    />
                  </div>
                );
              }

              const allModels = configuredProviders?.[providerId]?.models ?? [];
              const models = allModels.filter((model) => {
                if (model.id === "cloud") {
                  return true;
                }
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
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          disabled={!model.isDownloaded}
                        >
                          {displayModelId(model.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }}
          </form.Field>

          {current_stt_provider && current_stt_model && (
            <HealthCheckForConnection />
          )}
        </div>
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
  const billing = useBillingAccess();
  const configuredProviders = main.UI.useResultTable(
    main.QUERIES.sttProviders,
    main.STORE_ID,
  );

  const targetArch = useQuery({
    queryKey: ["target-arch"],
    queryFn: () => miscCommands.getTargetArch(),
    staleTime: Infinity,
  });

  const isAppleSilicon = targetArch.data === "aarch64";

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
      if (provider.requiresPro && !billing.isPro) {
        return [provider.id, { configured: false, models: [] }];
      }

      if (provider.id === "hyprnote") {
        const models = [
          { id: "cloud", isDownloaded: billing.isPro },
          { id: "QuantizedTinyEn", isDownloaded: tinyEn.data ?? false },
          { id: "QuantizedSmallEn", isDownloaded: smallEn.data ?? false },
        ];

        if (isAppleSilicon) {
          models.push(
            { id: "am-parakeet-v2", isDownloaded: p2.data ?? false },
            { id: "am-parakeet-v3", isDownloaded: p3.data ?? false },
          );
        }

        return [
          provider.id,
          {
            configured: true,
            models,
          },
        ];
      }

      const config = configuredProviders[provider.id] as
        | main.AIProviderStorage
        | undefined;

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
          models: provider.models.map((model) => ({
            id: model,
            isDownloaded: true,
          })),
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
