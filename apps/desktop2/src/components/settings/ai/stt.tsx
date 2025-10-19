import { Icon } from "@iconify-icon/react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { useManager } from "tinytick/ui-react";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import type { SupportedSttModel } from "@hypr/plugin-local-stt";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/ui/lib/utils";
import { useQuery } from "../../../hooks/useQuery";
import * as internal from "../../../store/tinybase/internal";
import { aiProviderSchema } from "../../../store/tinybase/internal";
import {
  DOWNLOAD_MODEL_TASK_ID,
  registerDownloadProgressCallback,
  unregisterDownloadProgressCallback,
} from "../../task-manager";
import { FormField, useProvider } from "./shared";

const CUSTOM_PROVIDERS = [
  {
    id: "deepgram",
    displayName: "Deepgram",
    icon: <Icon icon="simple-icons:deepgram" className="size-4" />,
    baseUrl: { value: "https://api.deepgram.com/v1", immutable: true },
    models: ["nova-3", "nova-3-general", "nova-3-medical"],
  },
  {
    id: "deepgram-custom",
    displayName: "Deepgram (Custom)",
    badge: null,
    icon: <Icon icon="simple-icons:deepgram" className="size-4" />,
    baseUrl: { value: "https://api.openai.com/v1", immutable: false },
    models: ["nova-3", "nova-3-general", "nova-3-medical"],
  },
] as const;

type ProviderId = "hyprnote" | typeof CUSTOM_PROVIDERS[number]["id"];

export function STT() {
  return (
    <div className="space-y-6">
      <SelectProviderAndModel />
      <ConfigureProviders />
    </div>
  );
}

function SelectProviderAndModel() {
  const configuredProviders = internal.UI.useResultTable(internal.QUERIES.sttProviders, internal.STORE_ID);
  const selectedProvider = internal.UI.useValue("current_stt_provider", internal.STORE_ID);

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
                  {CUSTOM_PROVIDERS.map((provider) => (
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
            const selectedProviderConfig = CUSTOM_PROVIDERS.find(
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

function ConfigureProviders() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Configure Providers</h3>
      <Accordion type="single" collapsible className="space-y-3">
        <HyprProviderCard
          providerId="hyprnote"
          providerName="Hyprnote"
          icon={<img src="/assets/icon.png" alt="Hyprnote" className="size-5" />}
        />
        {CUSTOM_PROVIDERS.map((provider) => (
          <NonHyprProviderCard
            key={provider.id}
            icon={provider.icon}
            providerName={provider.displayName}
            providerId={provider.id}
            providerConfig={provider}
          />
        ))}
      </Accordion>
    </div>
  );
}

function NonHyprProviderCard({
  providerName,
  providerId,
  icon,
  providerConfig,
}: {
  providerName: string;
  providerId: ProviderId;
  icon: React.ReactNode;
  providerConfig: typeof CUSTOM_PROVIDERS[number];
}) {
  const [provider, setProvider] = useProvider(providerId);

  const form = useForm({
    onSubmit: ({ value }) => setProvider(value),
    defaultValues: provider
      ?? ({
        type: "stt",
        model: "",
        base_url: "",
        api_key: "",
      } satisfies internal.AIProvider),
    listeners: { onChange: ({ formApi }) => formApi.handleSubmit() },
    validators: { onChange: aiProviderSchema },
  });

  return (
    <AccordionItem
      value={providerId}
      className={cn(["rounded-lg border-2 border-dashed bg-gray-50"])}
    >
      <AccordionTrigger className={cn(["capitalize gap-2 px-4"])}>
        <div className="flex items-center gap-2">
          {icon}
          <span>{providerName}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <ProviderContext providerId={providerId} />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {!providerConfig.baseUrl.immutable && (
            <form.Field name="base_url" defaultValue={providerConfig.baseUrl.value}>
              {(field) => (
                <FormField
                  field={field}
                  label="Base URL"
                  icon="mdi:web"
                />
              )}
            </form.Field>
          )}
          <form.Field name="api_key">
            {(field) => (
              <FormField
                field={field}
                label="API Key"
                icon="mdi:key"
                placeholder="Enter your API key"
                type="password"
              />
            )}
          </form.Field>
        </form>
      </AccordionContent>
    </AccordionItem>
  );
}

function HyprProviderCard(
  {
    providerId,
    providerName,
    icon,
  }: {
    providerId: ProviderId;
    providerName: string;
    icon: React.ReactNode;
  },
) {
  return (
    <AccordionItem
      value={providerId}
      className={cn(["rounded-lg border-2 border-dashed bg-gray-50"])}
    >
      <AccordionTrigger className={cn(["capitalize gap-2 px-4"])}>
        <div className="flex items-center gap-2">
          {icon}
          <span>{providerName}</span>
          <span className="text-xs text-gray-500 font-light border border-gray-300 rounded-full px-2">
            Recommended
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <ProviderContext providerId={providerId} />
        <div className="space-y-3">
          <ModelDownloadRow model="am-parakeet-v2" displayName="Parakeet v2" />
          <ModelDownloadRow model="am-parakeet-v3" displayName="Parakeet v3" />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function ModelDownloadRow({ model, displayName }: { model: SupportedSttModel; displayName: string }) {
  const manager = useManager();
  const [progress, setProgress] = useState<number>(0);
  const [taskRunId, setTaskRunId] = useState<string | null>(null);

  const isDownloaded = useQuery({
    queryFn: () => localSttCommands.isModelDownloaded(model),
    refetchInterval: 1500,
  });

  const isDownloading = useQuery({
    queryFn: () => localSttCommands.isModelDownloading(model),
    refetchInterval: 500,
  });

  const taskRunInfo = taskRunId && manager ? manager.getTaskRunInfo(taskRunId) : null;
  const isTaskRunning = taskRunInfo?.running ?? false;

  useEffect(() => {
    registerDownloadProgressCallback(model, setProgress);
    return () => {
      unregisterDownloadProgressCallback(model);
    };
  }, [model]);

  useEffect(() => {
    if (isDownloaded.data && taskRunId) {
      setTaskRunId(null);
      setProgress(0);
    }
  }, [isDownloaded.data, taskRunId]);

  const handleDownload = () => {
    if (!manager || isDownloaded.data) {
      return;
    }
    const runId = manager.scheduleTaskRun(DOWNLOAD_MODEL_TASK_ID, model);
    if (runId) {
      setTaskRunId(runId);
      setProgress(0);
    }
  };

  const showProgress = !isDownloaded.data && (isDownloading.data || isTaskRunning);

  return (
    <div
      className={cn([
        "flex items-center justify-between",
        "p-3 rounded-md border bg-white",
      ])}
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{displayName}</span>
        {showProgress && (
          <div className="flex items-center gap-2">
            <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant={isDownloaded.data ? "outline" : "default"}
        disabled={showProgress || !!isDownloaded.data}
        onClick={handleDownload}
      >
        {isDownloaded.data
          ? (
            <>
              <Icon icon="mdi:check-circle" className="size-4 mr-1" />
              Downloaded
            </>
          )
          : showProgress
          ? (
            <>
              <Icon icon="mdi:loading" className="size-4 mr-1 animate-spin" />
              Downloading
            </>
          )
          : (
            <>
              <Icon icon="mdi:download" className="size-4 mr-1" />
              Download
            </>
          )}
      </Button>
    </div>
  );
}

function ProviderContext({ providerId }: { providerId: ProviderId }) {
  const content = providerId === "hyprnote"
    ? "Hyprnote is great"
    : providerId === "deepgram"
    ? "Deepgram is great"
    : providerId === "deepgram-custom"
    ? `If you're using a [Dedicated endpoint](https://developers.deepgram.com/reference/custom-endpoints#deepgram-dedicated-endpoints), or other Deepgram-compatible endpoint, you can configure it here.`
      .trim()
    : "";

  if (!content) {
    return null;
  }

  return (
    <Streamdown className="text-sm mt-1 mb-6">
      {content}
    </Streamdown>
  );
}
