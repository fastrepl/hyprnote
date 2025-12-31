import { Icon } from "@iconify-icon/react";
import { useForm } from "@tanstack/react-form";
import { useQueries, useQuery } from "@tanstack/react-query";
import { arch } from "@tauri-apps/plugin-os";
import { useEffect } from "react";

import type { SupportedSttModel } from "@hypr/plugin-local-stt";
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
import { useNotifications } from "../../../../contexts/notifications";
import * as settings from "../../../../store/tinybase/store/settings";
import {
  getProviderSelectionBlockers,
  requiresEntitlement,
} from "../shared/eligibility";
import { useSttSettings } from "./context";
import { HealthStatusIndicator, useConnectionHealth } from "./health";
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
  const { startDownload, startTrial } = useSttSettings();
  const health = useConnectionHealth();

  const isConfigured = !!(current_stt_provider && current_stt_model);
  const hasError = isConfigured && health.status === "error";

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

        void formApi.handleSubmit();
      },
    },
    onSubmit: ({ value }) => {
      handleSelectProvider(value.provider);
      handleSelectModel(value.model);
    },
  });

  useEffect(() => {
    if (!current_stt_provider || !current_stt_model) {
      return;
    }

    const providerConfig =
      configuredProviders[current_stt_provider as ProviderId];
    if (!providerConfig) {
      return;
    }

    if (current_stt_provider === "custom") {
      return;
    }

    const modelEntry = providerConfig.models.find(
      (m) => m.id === current_stt_model,
    );
    if (modelEntry && !modelEntry.isDownloaded) {
      handleSelectModel("");
      form.setFieldValue("model", "");
    }
  }, [
    current_stt_provider,
    current_stt_model,
    configuredProviders,
    handleSelectModel,
    form,
  ]);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-md font-semibold">Model being used</h3>
      <div
        className={cn([
          "flex flex-col gap-4",
          "p-4 rounded-xl border border-neutral-200",
          !isConfigured || hasError ? "bg-red-50" : "bg-neutral-50",
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
                    <SelectTrigger className="bg-white shadow-none focus:ring-0 [&>span]:flex [&>span]:items-center [&>span]:justify-between [&>span]:w-full [&>span]:gap-2 [&>svg]:-mr-1">
                      <SelectValue placeholder="Select a model" />
                      {isConfigured && <HealthStatusIndicator />}
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <ModelSelectItem
                          key={model.id}
                          model={model}
                          onDownload={() =>
                            startDownload(model.id as SupportedSttModel)
                          }
                          onStartTrial={startTrial}
                        />
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }}
          </form.Field>
        </div>

        {!isConfigured && (
          <div className="flex items-center gap-2 pt-2 border-t border-red-200">
            <span className="text-sm text-red-600">
              <strong className="font-medium">Transcription model</strong> is
              needed to make Hyprnote listen to your conversations.
            </span>
          </div>
        )}

        {hasError && health.message && (
          <div className="flex items-center gap-2 pt-2 border-t border-red-200">
            <span className="text-sm text-red-600">{health.message}</span>
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
        const models = [
          { id: "cloud", isDownloaded: billing.isPro },
          {
            id: "QuantizedTinyEn",
            isDownloaded: tinyEn.data ?? false,
          },
          {
            id: "QuantizedSmallEn",
            isDownloaded: smallEn.data ?? false,
          },
        ];

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
            {
              id: "am-whisper-large-v3",
              isDownloaded: whisperLargeV3.data ?? false,
            },
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

function ModelSelectItem({
  model,
  onDownload,
  onStartTrial,
}: {
  model: { id: string; isDownloaded: boolean };
  onDownload: () => void;
  onStartTrial: () => void;
}) {
  const isCloud = model.id === "cloud";
  const { activeDownloads } = useNotifications();
  const downloadInfo = activeDownloads.find((d) => d.model === model.id);
  const isDownloading = !!downloadInfo;

  if (model.isDownloaded) {
    return (
      <SelectItem key={model.id} value={model.id}>
        {displayModelId(model.id)}
      </SelectItem>
    );
  }

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDownloading) {
      return;
    }
    if (isCloud) {
      onStartTrial();
    } else {
      onDownload();
    }
  };

  return (
    <div
      className={cn([
        "relative flex items-center justify-between",
        "rounded-sm px-2 py-1.5 text-sm outline-none",
        "cursor-pointer select-none",
        "hover:bg-accent hover:text-accent-foreground",
        "group",
      ])}
    >
      <span className="text-neutral-400">{displayModelId(model.id)}</span>
      {isDownloading ? (
        <span
          className={cn([
            "px-2 py-0.5 rounded-full text-[11px] font-medium",
            "flex items-center gap-1",
            "bg-gradient-to-t from-neutral-200 to-neutral-100 text-neutral-500",
          ])}
        >
          <Icon icon="lucide:loader-2" className="size-3 animate-spin" />
          <span>{Math.round(downloadInfo.progress)}%</span>
        </span>
      ) : (
        <button
          className={cn([
            "px-2 py-0.5 rounded-full text-[11px] font-medium",
            "opacity-0 group-hover:opacity-100",
            "transition-all duration-150",
            isCloud
              ? "bg-gradient-to-t from-stone-600 to-stone-500 text-white shadow-sm hover:shadow-md"
              : "bg-gradient-to-t from-neutral-200 to-neutral-100 text-neutral-900 shadow-sm hover:shadow-md",
          ])}
          onClick={handleAction}
        >
          {isCloud ? "Free Trial" : "Download"}
        </button>
      )}
    </div>
  );
}
