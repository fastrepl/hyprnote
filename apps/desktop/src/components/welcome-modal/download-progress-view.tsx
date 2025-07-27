import { Trans } from "@lingui/react/macro";
import { Channel } from "@tauri-apps/api/core";
import { BrainIcon, CheckCircle2Icon, MicIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { Progress } from "@hypr/ui/components/ui/progress";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { cn } from "@hypr/ui/lib/utils";
import { sttModelMetadata } from "../settings/components/ai/stt-view";

interface ModelDownloadProgress {
  channel: Channel<number>;
  progress: number;
  error: boolean;
  completed: boolean;
}

interface DownloadProgressViewProps {
  selectedSttModel: SupportedModel;
  onContinue: () => void;
}

const ModelProgressCard = ({
  title,
  icon: Icon,
  download,
  size,
}: {
  title: string;
  icon: React.ElementType;
  download: ModelDownloadProgress;
  size: string;
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4 transition-all duration-200",
        download.completed ? "border-blue-500 bg-blue-50" : "bg-white border-neutral-200",
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-full flex-shrink-0",
            download.completed ? "bg-blue-100" : "bg-neutral-50",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              download.completed ? "text-blue-600" : "text-neutral-500",
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{title}</div>
          <div className="text-sm text-muted-foreground">
            {download.error
              ? <span className="text-destructive">Download failed</span>
              : download.completed
              ? (
                <span className="text-blue-600 flex items-center gap-1">
                  <CheckCircle2Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <Trans>Ready</Trans>
                </span>
              )
              : (
                <div className="space-y-2">
                  <span className="block text-xs">Size: {size} • {Math.round(download.progress)}%</span>
                  <Progress value={download.progress} className="h-2" />
                </div>
              )}
          </div>
        </div>
      </div>
      {download.completed && (
        <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
          <CheckCircle2Icon className="w-4 h-4 text-blue-600" />
        </div>
      )}
    </div>
  );
};

export const DownloadProgressView = ({
  selectedSttModel,
  onContinue,
}: DownloadProgressViewProps) => {
  const [sttDownload, setSttDownload] = useState<ModelDownloadProgress>({
    channel: new Channel(),
    progress: 0,
    error: false,
    completed: false,
  });

  const [llmDownload, setLlmDownload] = useState<ModelDownloadProgress>({
    channel: new Channel(),
    progress: 0,
    error: false,
    completed: false,
  });

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    localSttCommands.downloadModel(selectedSttModel, sttDownload.channel);

    localLlmCommands.downloadModel("HyprLLM", llmDownload.channel);

    sttDownload.channel.onmessage = (progress) => {
      if (progress < 0) {
        setSttDownload(prev => ({ ...prev, error: true }));
        return;
      }

      setSttDownload(prev => ({
        ...prev,
        progress: Math.max(prev.progress, progress),
        completed: progress >= 100,
      }));
    };

    llmDownload.channel.onmessage = (progress) => {
      if (progress < 0) {
        setLlmDownload(prev => ({ ...prev, error: true }));
        return;
      }

      setLlmDownload(prev => ({
        ...prev,
        progress: Math.max(prev.progress, progress),
        completed: progress >= 100,
      }));
    };
  }, [selectedSttModel, sttDownload.channel, llmDownload.channel]);

  const bothCompleted = sttDownload.completed && llmDownload.completed;
  const hasErrors = sttDownload.error || llmDownload.error;

  useEffect(() => {
    if (!bothCompleted && !hasErrors) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % WAITING_MESSAGES.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [bothCompleted, hasErrors]);

  const WAITING_MESSAGES = [
    "Downloading models may take a few minutes...",
    "You are free to continue your setup...",
    "Teaching your AI not to snitch...",
    "Running vibe_check.sh...",
    "Munching granola for breakfast...",
    "Securing your data from enemies...",
    "Building your AI fortress...",
    "Hunting down infected otters...",
    "Wiping fingerprints off the algorithm...",
    "Installing integrity.dmg (beta)...",
  ];

  useEffect(() => {
    const handleSttCompletion = async () => {
      if (sttDownload.completed) {
        try {
          await localSttCommands.setCurrentModel(selectedSttModel);
          await localSttCommands.startServer();
        } catch (error) {
          console.error("Error setting up STT:", error);
        }
      }
    };

    const handleLlmCompletion = async () => {
      if (llmDownload.completed) {
        try {
          await localLlmCommands.setCurrentModel("HyprLLM");
          await localLlmCommands.startServer();
        } catch (error) {
          console.error("Error setting up LLM:", error);
        }
      }
    };

    handleSttCompletion();
    handleLlmCompletion();
  }, [sttDownload.completed, llmDownload.completed, selectedSttModel]);

  const sttMetadata = sttModelMetadata[selectedSttModel];

  return (
    <div className="flex flex-col items-center min-w-[30rem] w-full max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-4">
        <Trans>Downloading AI Models</Trans>
      </h2>

      {/* Replace static text with animated messages */}
      <div className="w-full max-w-[30rem] mb-8">
        <p className="text-center text-sm text-muted-foreground">
          {!bothCompleted && !hasErrors && (
            <span
              key={currentMessageIndex}
              className="transition-all duration-500 ease-in-out block"
              style={{
                animation: "fadeInOut 4s ease-in-out",
              }}
            >
              {WAITING_MESSAGES[currentMessageIndex]}
            </span>
          )}

          {bothCompleted && (
            <span className="text-blue-600">
              <Trans>All models ready!</Trans>
            </span>
          )}

          {hasErrors && (
            <span className="text-amber-600">
              <Trans>Some downloads failed, but you can continue</Trans>
            </span>
          )}
        </p>
      </div>

      <div className="w-full max-w-[30rem] space-y-3 mb-8">
        <ModelProgressCard
          title="Speech Recognition"
          icon={MicIcon}
          download={sttDownload}
          size={sttMetadata?.size || "250MB"}
        />

        <ModelProgressCard
          title="Language Model"
          icon={BrainIcon}
          download={llmDownload}
          size="1.1GB"
        />
      </div>

      <PushableButton
        onClick={onContinue}
        className="w-full max-w-sm"
      >
        <Trans>Continue</Trans>
      </PushableButton>

      <p className="text-xs text-muted-foreground text-center mt-4">
        <Trans>It's ok to move on, downloads will continue in the background</Trans>
      </p>
    </div>
  );
};
