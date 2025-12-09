import { Icon } from "@iconify-icon/react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import {
  commands as localSttCommands,
  events as localSttEvents,
  type SupportedSttModel,
} from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import * as main from "../../store/tinybase/main";
import { OnboardingContainer, type OnboardingNext } from "./shared";

type ModelDownloadProps = {
  onNext: OnboardingNext;
};

const DEFAULT_MODEL: SupportedSttModel = "am-parakeet-v2";

export function ModelDownload({ onNext }: ModelDownloadProps) {
  const {
    progress,
    hasError,
    isDownloaded,
    showProgress,
    handleDownload,
    handleCancel,
  } = useModelDownload(DEFAULT_MODEL, onNext);

  return (
    <OnboardingContainer
      title="Download transcription model"
      description="A local model will be downloaded to enable on-device transcription"
    >
      <ModelCard
        name="Parakeet v2"
        description="English only. Fast and accurate on-device transcription."
        size="~1.2 GB"
        isDownloaded={isDownloaded}
        showProgress={showProgress}
        progress={progress}
        hasError={hasError}
        onDownload={handleDownload}
        onCancel={handleCancel}
      />
    </OnboardingContainer>
  );
}

type ModelCardProps = {
  name: string;
  description: string;
  size: string;
  isDownloaded: boolean;
  showProgress: boolean;
  progress: number;
  hasError: boolean;
  onDownload: () => void;
  onCancel: () => void;
};

function ModelCard({
  name,
  description,
  size,
  isDownloaded,
  showProgress,
  progress,
  hasError,
  onDownload,
  onCancel,
}: ModelCardProps) {
  return (
    <div
      className={cn([
        "flex flex-col gap-4 p-4 rounded-xl border-2 border-dashed bg-neutral-50",
      ])}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium">{name}</span>
          <span className="text-xs text-neutral-500">{size}</span>
        </div>
        <span className="text-sm text-neutral-500">{description}</span>
      </div>

      <Button
        size="lg"
        className={cn([
          "w-full relative overflow-hidden group",
          hasError && "border-red-500",
        ])}
        variant={
          isDownloaded ? "outline" : hasError ? "destructive" : "default"
        }
        onClick={
          isDownloaded ? undefined : showProgress ? onCancel : onDownload
        }
        disabled={isDownloaded}
      >
        {showProgress && (
          <div
            className="absolute inset-0 bg-black/30 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        {isDownloaded ? (
          <div className="relative z-10 flex items-center gap-2">
            <Icon icon="mdi:check" width={20} />
            <span>Downloaded</span>
          </div>
        ) : hasError ? (
          <div className="relative z-10 flex items-center gap-2">
            <Icon icon="mdi:alert-circle" width={20} />
            <span>Retry Download</span>
          </div>
        ) : showProgress ? (
          <>
            <div className="relative z-10 flex items-center gap-2 group-hover:hidden">
              <Icon icon="mdi:loading" width={20} className="animate-spin" />
              <span>Downloading {Math.round(progress)}%</span>
            </div>
            <div className="relative z-10 hidden items-center gap-2 group-hover:flex">
              <Icon icon="mdi:close" width={20} />
              <span>Cancel</span>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex items-center gap-2">
            <Icon icon="mdi:download" width={20} />
            <span>Download Model</span>
          </div>
        )}
      </Button>
    </div>
  );
}

function useModelDownload(model: SupportedSttModel, onComplete: () => void) {
  const [progress, setProgress] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const isDownloaded = useQuery({
    queryKey: ["local-stt", "is-downloaded", model],
    queryFn: async () => {
      const result = await localSttCommands.isModelDownloaded(model);
      return result.status === "ok" ? result.data : false;
    },
  });

  const isDownloading = useQuery({
    queryKey: ["local-stt", "is-downloading", model],
    queryFn: async () => {
      const result = await localSttCommands.isModelDownloading(model);
      return result.status === "ok" ? result.data : false;
    },
    refetchInterval: 1000,
  });

  const showProgress =
    !isDownloaded.data && (isStarting || (isDownloading.data ?? false));

  const handleSelectModel = main.UI.useSetValueCallback(
    "current_stt_model",
    (m: SupportedSttModel) => m,
    [],
    main.STORE_ID,
  );

  const handleSelectProvider = main.UI.useSetValueCallback(
    "current_stt_provider",
    (p: string) => p,
    [],
    main.STORE_ID,
  );

  useEffect(() => {
    if (isDownloading.data) {
      setIsStarting(false);
    }
  }, [isDownloading.data]);

  useEffect(() => {
    const unlisten = localSttEvents.downloadProgressPayload.listen((event) => {
      if (event.payload.model === model) {
        if (event.payload.progress < 0) {
          setHasError(true);
          setIsStarting(false);
          setProgress(0);
        } else {
          setHasError(false);
          setProgress(Math.max(0, Math.min(100, event.payload.progress)));
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [model]);

  useEffect(() => {
    if (isDownloaded.data) {
      setProgress(0);
      handleSelectProvider("hyprnote");
      handleSelectModel(model);
      onComplete();
    }
  }, [
    isDownloaded.data,
    model,
    onComplete,
    handleSelectModel,
    handleSelectProvider,
  ]);

  const handleDownload = useCallback(() => {
    if (isDownloaded.data || isDownloading.data || isStarting) {
      return;
    }
    setHasError(false);
    setIsStarting(true);
    setProgress(0);
    localSttCommands.downloadModel(model).then((result) => {
      if (result.status === "error") {
        setHasError(true);
        setIsStarting(false);
      }
    });
  }, [isDownloaded.data, isDownloading.data, isStarting, model]);

  const handleCancel = useCallback(() => {
    localSttCommands.cancelDownload(model);
    setIsStarting(false);
    setProgress(0);
  }, [model]);

  return {
    progress,
    hasError,
    isDownloaded: isDownloaded.data ?? false,
    showProgress,
    handleDownload,
    handleCancel,
  };
}
