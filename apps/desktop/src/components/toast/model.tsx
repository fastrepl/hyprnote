import { useQuery } from "@tanstack/react-query";
import { Channel } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Progress } from "@hypr/ui/components/ui/progress";
import { toast } from "@hypr/ui/components/ui/toast";

export default function ModelDownloadNotification() {
  const checkForModelDownload = useQuery({
    queryKey: ["check-model-downloaded"],
    queryFn: async () => {
      const [stt, llm] = await Promise.all([
        localSttCommands.isModelDownloaded(),
        localLlmCommands.isModelDownloaded(),
      ]);

      return { stt, llm };
    },
  });

  useEffect(() => {
    if (checkForModelDownload.data?.stt && checkForModelDownload.data?.llm) {
      return;
    }

    const sttChannel = new Channel();
    const llmChannel = new Channel();

    toast({
      title: "Model Download Needed",
      content: "Local models are required for offline functionality.",
      buttons: [
        {
          label: "Download Models",
          onClick: () => {
            if (!checkForModelDownload.data?.stt) {
              localSttCommands.downloadModel(sttChannel);

              toast(
                {
                  title: "Speech-to-Text Model",
                  content: (
                    <div className="space-y-1">
                      <div>Downloading the speech-to-text model...</div>
                      <ModelDownloadProgress
                        channel={sttChannel}
                        onComplete={() => {
                          toast({
                            title: "Speech-to-Text Model",
                            content: "Download complete!",
                            dismissible: true,
                          });
                        }}
                      />
                    </div>
                  ),
                  dismissible: false,
                },
              );
            }

            if (!checkForModelDownload.data?.llm) {
              localLlmCommands.downloadModel(llmChannel);

              toast(
                {
                  title: "Large Language Model",
                  content: (
                    <div className="space-y-1">
                      <div>Downloading the large language model...</div>
                      <ModelDownloadProgress
                        channel={llmChannel}
                        onComplete={() => {
                          toast({
                            title: "Large Language Model",
                            content: "Download complete!",
                            dismissible: true,
                          });
                        }}
                      />
                    </div>
                  ),
                  dismissible: false,
                },
              );
            }
          },
          primary: true,
        },
      ],
      dismissible: false,
    });
  }, [checkForModelDownload.data]);

  return null;
}

interface ProgressPayload {
  progress: number;
}

const ModelDownloadProgress = ({
  channel,
  onComplete,
}: {
  channel: Channel<unknown>;
  onComplete?: () => void;
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    channel.onmessage = (response) => {
      const data = response as unknown as ProgressPayload;
      setProgress(data.progress);

      if (data.progress >= 100 && onComplete) {
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
