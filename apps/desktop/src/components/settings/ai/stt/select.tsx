import { useForm } from "@tanstack/react-form";
import { useQueries, useQuery } from "@tanstack/react-query";
import { arch } from "@tauri-apps/plugin-os";
import { useCallback } from "react";

import type { AIProviderStorage } from "@hypr/store";
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
import { useValidateSttModel } from "../../../../hooks/useValidateSttModel";
import * as settings from "../../../../store/tinybase/settings";
import {
  getProviderSelectionBlockers,
  requiresEntitlement,
} from "../shared/eligibility";
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

  const handleSelectProvider = settings.UI.useSetValueCallback(
    "current_stt_provider",
    (provider: string) => provider,
    [],
    settings.STORE_ID,
  );

  const handleSelectModel = settings.UI.useSetValueCallback(
    "current_stt_model",
    (model: string) => model,
    [],
    settings.STORE_ID,
  );

  // Validate the initial model selection
  const getValidatedModel = () => {
    if (!current_stt_provider || !current_stt_model) return "";

    const providerModels =
      configuredProviders[current_stt_provider as ProviderId]?.models ?? [];
    const isModelValid = providerModels.some(
      (model) => model.id === current_stt_model && model.isDownloaded,
    );

    return isModelValid ? current_stt_model : "";
  };

  const form = useForm({
    defaultValues: {
      provider: current_stt_provider || "",
      model: getValidatedModel(),
    },
    listeners: {
      onChange: ({ formApi }) => {
        const {
          form: { errors },
        } = formApi.getAllErrors();
        if (errors.length > 0) {
          console.log(errors);
        }

        void formApi.handleSubmit();
      },
    },
    onSubmit: ({ value }) => {
      handleSelectProvider(value.provider);
      handleSelectModel(value.model);
    },
  });

  // Clear model selection callback
  const handleClearModel = useCallback(() => {
    handleSelectModel("");
    form.setFieldValue("model", "");
  }, [handleSelectModel, form]);

  // Validate that the selected model is actually downloaded
  useValidateSttModel(
    current_stt_provider,
    current_stt_model,
    handleClearModel,
  );

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
                  <SelectTrigger className="bg-white shadow-none focus:ring-0">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.filter(({ disabled }) => !disabled).map(
                      (provider) => {
                        const configured =
                          configuredProviders[provider.id]?.configured ?? false;
                        const requiresPro = requiresEntitlement(
                          provider.requirements,
                          "pro",
                        );
                        const locked = requiresPro && !billing.isPro;
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
                                {requiresPro ? (
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

              // We'll show all models for Hyprnote provider
              const modelsToShow =
                providerId === "hyprnote"
                  ? allModels
                  : allModels.filter((model) => {
                      // For non-Hyprnote providers, only show downloaded models
                      if (model.id === "cloud") {
                        return true;
                      }
                      return model.isDownloaded;
                    });

              return (
                <div className="flex-[3] min-w-0">
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value)}
                    disabled={modelsToShow.length === 0}
                  >
                    <SelectTrigger className="bg-white shadow-none focus:ring-0">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      {modelsToShow.map((model) => (
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          disabled={!model.isDownloaded}
                          className="group"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{displayModelId(model.id)}</span>
                            {!model.isDownloaded && providerId === "hyprnote" && (
                              <span className="text-xs text-neutral-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                {model.id === "cloud" ? "Start trial" : "Download model"}
                              </span>
                            )}
                          </div>
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

        {(!current_stt_provider || !current_stt_model) && (
          <div className="flex items-center gap-2 pt-2 border-t border-red-200">
            <span className="text-sm text-red-600">
              <strong className="font-medium">Transcription model</strong> is
              needed to make Hyprnote listen to your conversations.
            </span>
          </div>
        )}
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
  const configuredProviders = settings.UI.useResultTable(
    settings.QUERIES.sttProviders,
    settings.STORE_ID,
  );

  const targetArch = useQuery({
    queryKey: ["target-arch"],
    queryFn: () => arch(),
    staleTime: Infinity,
  });

  const isAppleSilicon = targetArch.data === "aarch64";

  const [p2, p3, whisperLargeV3, tinyEn, smallEn] = useQueries({
    queries: [
      sttModelQueries.isDownloaded("am-parakeet-v2"),
      sttModelQueries.isDownloaded("am-parakeet-v3"),
      sttModelQueries.isDownloaded("am-whisper-large-v3"),
      sttModelQueries.isDownloaded("QuantizedTinyEn"),
      sttModelQueries.isDownloaded("QuantizedSmallEn"),
    ],
  });

  return Object.fromEntries(
    PROVIDERS.map((provider) => {
      const config = configuredProviders[provider.id] as
        | AIProviderStorage
        | undefined;
      const baseUrl = String(config?.base_url || provider.baseUrl || "").trim();
      const apiKey = String(config?.api_key || "").trim();

      const eligible =
        getProviderSelectionBlockers(provider.requirements, {
          isAuthenticated: true,
          isPro: billing.isPro,
          config: { base_url: baseUrl, api_key: apiKey },
        }).length === 0;

      if (!eligible) {
        return [provider.id, { configured: false, models: [] }];
      }

      if (provider.id === "hyprnote") {
        const models = [{ id: "cloud", isDownloaded: billing.isPro }];

        // Add Parakeet models first for Apple Silicon
        if (isAppleSilicon) {
          models.push(
            {
              id: "am-parakeet-v2",
              isDownloaded: p2.data ?? false,
            },
            {
              id: "am-parakeet-v3",
              isDownloaded: p3.data ?? false,
            },
          );
        }

        // Add Whisper models after Parakeet
        if (isAppleSilicon) {
          models.push({
            id: "am-whisper-large-v3",
            isDownloaded: whisperLargeV3.data ?? false,
          });
        }

        // Add Quantized Whisper models at the bottom
        models.push(
          {
            id: "QuantizedTinyEn",
            isDownloaded: tinyEn.data ?? false,
          },
          {
            id: "QuantizedSmallEn",
            isDownloaded: smallEn.data ?? false,
          },
        );

        return [
          provider.id,
          {
            configured: true,
            models,
          },
        ];
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
