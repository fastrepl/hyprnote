import { Trans } from "@lingui/react/macro";
import { Channel } from "@tauri-apps/api/core";
import { BrainIcon, CheckCircle2Icon, MicIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { commands as localLlmCommands, SupportedModel as SupportedModelLLM } from "@hypr/plugin-local-llm";
import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { Progress } from "@hypr/ui/components/ui/progress";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { cn } from "@hypr/ui/lib/utils";

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
    <div className={cn(
      "flex items-center justify-between rounded-lg border p-4 transition-all duration-200",
      download.completed ? "border-blue-500 bg-blue-50" : "bg-white border-neutral-200"
    )}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "flex size-10 items-center justify-center rounded-full flex-shrink-0",
          download.completed ? "bg-blue-100" : "bg-neutral-50"
        )}>
          <Icon className={cn(
            "h-5 w-5",
            download.completed ? "text-blue-600" : "text-neutral-500"
          )} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{title}</h3>
            <span className="text-xs text-muted-foreground">({size})</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {download.error ? (
              <span className="text-sm text-destructive">Download failed</span>
            ) : download.completed ? (
              <span className="text-blue-600 flex items-center gap-1 text-sm">
                <CheckCircle2Icon className="w-3.5 h-3.5" />
                <Trans>Ready</Trans>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <Progress 
                  value={download.progress} 
                  className="h-1.5 flex-1 max-w-[120px]"
                />
                <span className="text-xs text-muted-foreground">
                  {Math.round(download.progress)}%
                </span>
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

const WAITING_MESSAGES = [
  "Downloading models may take a few minutes...",
  "You are free to continue your setup...",
  "Teaching your AI not to snitch...",
  "Securing your data from prying eyes...",
  "Preparing transcription capabilities...",
  "Setting up local language models...",
  "Building your AI fortress...",
  "Hiding your AI from the NSA...",
];

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

  // Start downloads when component mounts
  useEffect(() => {
    // Start STT download
    localSttCommands.downloadModel(selectedSttModel, sttDownload.channel);
    
    // Start LLM download  
    localLlmCommands.downloadModel("HyprLLM", llmDownload.channel);

    // Setup STT progress listener
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

    // Setup LLM progress listener
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

  // Cycle through waiting messages
  useEffect(() => {
    if (!bothCompleted && !hasErrors) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % WAITING_MESSAGES.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [bothCompleted, hasErrors]);

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-4">
        <Trans>Downloading AI Models</Trans>
      </h2>
      
      <p className="text-center text-sm text-muted-foreground mb-8">
        <Trans>Setting up your private AI assistant</Trans>
      </p>

      <div className="w-full max-w-lg space-y-3 mb-8">
        <ModelProgressCard
          title="Speech Recognition"
          icon={MicIcon}
          download={sttDownload}
          size="250MB"
        />
        
        <ModelProgressCard
          title="Language Model"
          icon={BrainIcon}
          download={llmDownload}
          size="2.5GB"
        />
      </div>

      <PushableButton
        onClick={onContinue}
        className="w-full max-w-sm"
      >
        <Trans>Continue Setup</Trans>
      </PushableButton>

      {/* Animated waiting messages */}
      <div className="h-8 flex items-center justify-center">
        {!bothCompleted && !hasErrors && (
          <div className="relative w-full max-w-sm">
            <p 
              key={currentMessageIndex}
              className="text-xs text-muted-foreground text-center transition-all duration-500 ease-in-out"
              style={{
                animation: 'fadeInOut 3s ease-in-out',
              }}
            >
              {WAITING_MESSAGES[currentMessageIndex]}
            </p>
          </div>
        )}
        
        {bothCompleted && (
          <p className="text-xs text-blue-600 text-center">
            <Trans>All models ready!</Trans>
          </p>
        )}
        
        {hasErrors && (
          <p className="text-xs text-amber-600 text-center">
            <Trans>Some downloads failed, but you can continue</Trans>
          </p>
        )}
      </div>
    </div>
  );
}; 