import { Icon } from "@iconify-icon/react";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { openPath } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useState } from "react";
import { useManager } from "tinytick/ui-react";

import { commands as localSttCommands, type SupportedSttModel } from "@hypr/plugin-local-stt";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";
import { useListener } from "../../../../contexts/listener";
import * as main from "../../../../store/tinybase/main";
import { aiProviderSchema } from "../../../../store/tinybase/main";
import {
  DOWNLOAD_MODEL_TASK_ID,
  registerDownloadProgressCallback,
  unregisterDownloadProgressCallback,
} from "../../../task-manager";
import { FormField, StyledStreamdown, useProvider } from "../shared";
import { ProviderId, PROVIDERS, sttModelQueries } from "./shared";

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
        {PROVIDERS
          .filter((provider) => provider.id !== "hyprnote")
          .map((provider) => (
            <NonHyprProviderCard
              key={provider.id}
              config={provider}
            />
          ))}
      </Accordion>
    </div>
  );
}

function NonHyprProviderCard({ config }: { config: typeof PROVIDERS[number] }) {
  const [provider, setProvider] = useProvider(config.id);

  const form = useForm({
    onSubmit: ({ value }) => setProvider(value),
    defaultValues: provider
      ?? ({
        type: "stt",
        base_url: config.baseUrl ?? "",
        api_key: "",
      } satisfies main.AIProvider),
    listeners: {
      onChange: ({ formApi }) => {
        queueMicrotask(() => {
          const { form: { errors } } = formApi.getAllErrors();
          if (errors.length > 0) {
            console.log(errors);
          }

          formApi.handleSubmit();
        });
      },
    },
    validators: { onChange: aiProviderSchema },
  });

  return (
    <AccordionItem
      disabled={config.disabled}
      value={config.id}
      className={cn(["rounded-lg border-2 border-dashed bg-neutral-50"])}
    >
      <AccordionTrigger
        className={cn([
          "capitalize gap-2 px-4",
          config.disabled && "cursor-not-allowed opacity-30",
        ])}
      >
        <div className="flex items-center gap-2">
          {config.icon}
          <span>{config.displayName}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <ProviderContext providerId={config.id} />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {!config.baseUrl && (
            <form.Field name="base_url">
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
          {config.baseUrl && (
            <details className="space-y-4 pt-2">
              <summary className="text-xs cursor-pointer text-neutral-600 hover:text-neutral-900 hover:underline">
                Advanced
              </summary>
              <div className="mt-4">
                <form.Field name="base_url">
                  {(field) => (
                    <FormField
                      field={field}
                      label="Base URL"
                      icon="mdi:web"
                    />
                  )}
                </form.Field>
              </div>
            </details>
          )}
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
      className={cn(["rounded-lg border-2 border-dashed bg-neutral-50"])}
    >
      <AccordionTrigger className={cn(["capitalize gap-2 px-4"])}>
        <div className="flex items-center gap-2">
          {icon}
          <span>{providerName}</span>
          <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
            Recommended
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <ProviderContext providerId={providerId} />
        <div className="space-y-3">
          <HyprProviderCloudRow />
          <HyprProviderLocalRow
            model="am-parakeet-v2"
            displayName="Parakeet v2"
            description="On-device model. English only. Works best for English."
          />
          <HyprProviderLocalRow
            model="am-parakeet-v3"
            displayName="Parakeet v3"
            description="On-device model. English and European languages."
          />

          <details className="space-y-4 pt-2">
            <summary className="text-xs cursor-pointer text-neutral-600 hover:text-neutral-900 hover:underline">
              Advanced
            </summary>
            <div className="mt-4 space-y-3">
              <HyprProviderLocalRow
                model="QuantizedTinyEn"
                displayName="whisper-tiny-en-q8"
                description="Only for experiment & development purposes."
              />
              <HyprProviderLocalRow
                model="QuantizedSmallEn"
                displayName="whisper-small-en-q8"
                description="Only for experiment & development purposes."
              />
            </div>
          </details>
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
          <span className="text-xs text-neutral-500">
            Use the Hyprnote Cloud API to transcribe your audio.
          </span>
        </div>
        <Button
          className="w-[110px]"
          size="sm"
          variant="default"
          disabled={true}
        >
          For Pro Users
        </Button>
      </div>
    </HyprProviderRow>
  );
}

function LocalModelAction({
  isDownloaded,
  showProgress,
  progress,
  onOpen,
  onDownload,
  onCancel,
}: {
  isDownloaded: boolean;
  showProgress: boolean;
  progress: number;
  onOpen: () => void;
  onDownload: () => void;
  onCancel: () => void;
}) {
  return (
    <Button
      size="sm"
      className="w-[110px] relative overflow-hidden group"
      variant={isDownloaded ? "outline" : "default"}
      onClick={isDownloaded ? onOpen : (showProgress ? onCancel : onDownload)}
    >
      {showProgress && (
        <div
          className="absolute inset-0 bg-black/50 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      )}
      {isDownloaded
        ? (
          <>
            <div className="relative z-10 flex items-center gap-1">
              <Icon icon="mdi:folder-open" size={16} />
              <span>Show Model</span>
            </div>
          </>
        )
        : showProgress
        ? (
          <>
            <div className="relative z-10 flex items-center gap-2 group-hover:hidden">
              <Icon icon="mdi:loading" size={16} className="animate-spin" />
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="relative z-10 hidden items-center gap-2 group-hover:flex">
              <Icon icon="mdi:close" size={16} />
              <span>Cancel</span>
            </div>
          </>
        )
        : (
          <div className="relative z-10 flex items-center gap-2">
            <Icon icon="mdi:download" size={16} />
            <span>Download</span>
          </div>
        )}
    </Button>
  );
}

function HyprProviderLocalRow({
  model,
  displayName,
  description,
}: {
  model: SupportedSttModel;
  displayName: string;
  description: string;
}) {
  const handleSelectModel = useSafeSelectModel();

  const {
    progress,
    isDownloaded,
    showProgress,
    handleDownload,
    handleCancel,
  } = useLocalModelDownload(model, handleSelectModel);

  const handleOpen = () =>
    localSttCommands.modelsDir().then((result) => {
      if (result.status === "ok") {
        openPath(result.data);
      }
    });

  return (
    <HyprProviderRow>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{displayName}</span>
        <span className="text-xs text-neutral-500">
          {description}
        </span>
      </div>

      <LocalModelAction
        isDownloaded={isDownloaded}
        showProgress={showProgress}
        progress={progress}
        onOpen={handleOpen}
        onDownload={handleDownload}
        onCancel={handleCancel}
      />
    </HyprProviderRow>
  );
}

function useLocalModelDownload(
  model: SupportedSttModel,
  onDownloadComplete?: (model: SupportedSttModel) => void,
) {
  const manager = useManager();
  const [progress, setProgress] = useState<number>(0);
  const [taskRunId, setTaskRunId] = useState<string | null>(null);

  const isDownloaded = useQuery(sttModelQueries.isDownloaded(model));
  const isDownloading = useQuery(sttModelQueries.isDownloading(model));

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
      onDownloadComplete?.(model);
    }
  }, [isDownloaded.data, taskRunId, onDownloadComplete]);

  useEffect(() => {
    const isNotDownloading = !isDownloading.data;
    const isNotDownloaded = !isDownloaded.data;
    if (isNotDownloading && isNotDownloaded && taskRunId && !isDownloading.isLoading) {
      setTaskRunId(null);
      setProgress(0);
    }
  }, [isDownloading.data, isDownloading.isLoading, isDownloaded.data, taskRunId]);

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

  const handleCancel = () => {
    if (!manager || !taskRunId) {
      return;
    }
    manager.delTaskRun(taskRunId);
    setTaskRunId(null);
    setProgress(0);
  };

  const showProgress = !isDownloaded.data && taskRunId !== null;

  return {
    progress,
    isDownloaded: isDownloaded.data ?? false,
    showProgress,
    handleDownload,
    handleCancel,
  };
}

function ProviderContext({ providerId }: { providerId: ProviderId }) {
  const content = providerId === "hyprnote"
    ? "Hyprnote curates list of on-device models and also cloud models with high-availability and performance."
    : providerId === "deepgram"
    ? `Use [Deepgram](https://deepgram.com) for transcriptions. \
    If you want to use a [Dedicated](https://developers.deepgram.com/reference/custom-endpoints#deepgram-dedicated-endpoints)
    or [EU](https://developers.deepgram.com/reference/custom-endpoints#eu-endpoints) endpoint,
    you can do that in the **advanced** section.`
    : providerId === "custom"
    ? `We only support **Deepgram compatible** endpoints for now.`
    : "";

  if (!content.trim()) {
    return null;
  }

  return <StyledStreamdown className="mb-6">{content.trim()}</StyledStreamdown>;
}

function useSafeSelectModel() {
  const handleSelectModel = main.UI.useSetValueCallback(
    "current_stt_model",
    (model: SupportedSttModel) => model,
    [],
    main.STORE_ID,
  );

  const active = useListener((state) => state.live.status !== "inactive");

  const handler = useCallback((model: SupportedSttModel) => {
    if (active) {
      return;
    }
    handleSelectModel(model);
  }, [active, handleSelectModel]);

  return handler;
}
