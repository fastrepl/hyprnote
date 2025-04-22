import { Channel } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { Progress } from "@hypr/ui/components/ui/progress";
import { sonnerToast, toast } from "@hypr/ui/components/ui/toast";

export const DownloadProgress = ({
  channel,
  onComplete,
}: {
  channel: Channel<number>;
  onComplete?: () => void;
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    channel.onmessage = (v) => {
      if (v > progress) {
        setProgress(v);
      }

      if (v >= 100 && onComplete) {
        onComplete();
      }
    };
  }, [channel, onComplete]);

  return (
    <div className="w-full space-y-2">
      <Progress value={progress} className="h-2" />
      <div className="text-xs text-right">{Math.round(progress)}%</div>
    </div>
  );
};

export function showSttModelDownloadToast(model: SupportedModel) {
  const sttChannel = new Channel();
  localSttCommands.downloadModel(model, sttChannel);

  const id = `stt-model-download-${model}`;

  toast(
    {
      id,
      title: "Speech-to-Text Model",
      content: (
        <div className="space-y-1">
          <div>Downloading the speech-to-text model...</div>
          <DownloadProgress
            channel={sttChannel}
            onComplete={() => {
              sonnerToast.dismiss(id);
              localSttCommands.startServer();
            }}
          />
        </div>
      ),
      dismissible: false,
    },
  );
}

export function showLlmModelDownloadToast() {
  const llmChannel = new Channel();
  localLlmCommands.downloadModel(llmChannel);

  const id = "llm-model-download";

  toast(
    {
      id,
      title: "Large Language Model",
      content: (
        <div className="space-y-1">
          <div>Downloading the large language model...</div>
          <DownloadProgress
            channel={llmChannel}
            onComplete={() => {
              sonnerToast.dismiss(id);
              localLlmCommands.startServer();
            }}
          />
        </div>
      ),
      dismissible: false,
    },
  );
}
