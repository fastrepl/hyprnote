import { Icon } from "@iconify-icon/react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { useManager } from "tinytick/ui-react";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import type { SupportedSttModel } from "@hypr/plugin-local-stt";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import { useQuery } from "../../../../hooks/useQuery";
import * as internal from "../../../../store/tinybase/internal";
import { aiProviderSchema } from "../../../../store/tinybase/internal";
import {
  DOWNLOAD_MODEL_TASK_ID,
  registerDownloadProgressCallback,
  unregisterDownloadProgressCallback,
} from "../../../task-manager";
import { FormField, useProvider } from "../shared";
import { CUSTOM_PROVIDERS, ProviderId } from "./shared";

export function ConfigureProviders() {
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
          <HyprProviderLocalRow model="am-parakeet-v2" displayName="Parakeet v2" />
          <HyprProviderLocalRow model="am-parakeet-v3" displayName="Parakeet v3" />
          <HyprProviderCloudRow />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function HyprProviderRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn([
        "flex items-center justify-between",
        "py-2 px-3 rounded-md border bg-white",
      ])}
    >
      {children}
    </div>
  );
}

function HyprProviderCloudRow() {
  return (
    <HyprProviderRow>
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Hyprnote Cloud (Beta)</span>
          <span className="text-xs text-gray-500">
            Use the Hyprnote Cloud API to transcribe your audio.
          </span>
        </div>
        <Button size="sm" variant="default" disabled={true}>
          For Pro Users
        </Button>
      </div>
    </HyprProviderRow>
  );
}

function HyprProviderLocalRow({ model, displayName }: { model: SupportedSttModel; displayName: string }) {
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
    <HyprProviderRow>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{displayName}</span>
        <span className="text-xs text-gray-500">
          On-device model. No audio leaves your device.
        </span>

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
    </HyprProviderRow>
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
