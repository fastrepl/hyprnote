import { useQuery } from "@tanstack/react-query";
import { Channel } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Progress } from "@hypr/ui/components/ui/progress";
import { sonnerToast, toast } from "@hypr/ui/components/ui/toast";

export default function ModelDownloadNotification() {
  const checkForModelDownload = useQuery({
    queryKey: ["check-model-downloaded"],
    queryFn: async () => {
      const currentSttModel = await localSttCommands.getCurrentModel();

      const [stt, llm] = await Promise.all([
        localSttCommands.isModelDownloaded(currentSttModel),
        localLlmCommands.isModelDownloaded(),
      ]);

      return { 
        currentSttModel,
        sttModelDownloaded: stt,
        llmModelDownloaded: llm,
      };
    },
  });

  useEffect(() => {
    if (!checkForModelDownload.data) {
      return;
    }

    if (checkForModelDownload.data?.sttModelDownloaded && checkForModelDownload.data?.llmModelDownloaded) {
      return;
    }

    const sttChannel = new Channel();
    const llmChannel = new Channel();

    toast({
      id: "model-download-needed",
      title: "Model Download Needed",
      content: "Local models are required for offline functionality.",
      buttons: [
        {
          label: "Download Models",
          onClick: () => {
            sonnerToast.dismiss("model-download-needed");

            if (!checkForModelDownload.data?.sttModelDownloaded) {
              localSttCommands.downloadModel(checkForModelDownload.data?.currentSttModel, sttChannel);

              toast(
                {
                  id: "stt-model-download",
                  title: "Speech-to-Text Model",
                  content: (
                    <div className="space-y-1">
                      <div>Downloading the speech-to-text model...</div>
                      <ModelDownloadProgress
                        channel={sttChannel}
                        onComplete={() => {
                          toast({
                            id: "stt-model-download",
                            title: "Speech-to-Text Model",
                            content: "Download complete!",
                            dismissible: true,
                          });

                          localSttCommands.startServer();
                        }}
                      />
                    </div>
                  ),
                  dismissible: false,
                },
              );
            }

            if (!checkForModelDownload.data?.llmModelDownloaded) {
              localLlmCommands.downloadModel(llmChannel);

              toast(
                {
                  id: "llm-model-download",
                  title: "Large Language Model",
                  content: (
                    <div className="space-y-1">
                      <div>Downloading the large language model...</div>
                      <ModelDownloadProgress
                        channel={llmChannel}
                        onComplete={() => {
                          toast({
                            id: "llm-model-download",
                            title: "Large Language Model",
                            content: "Download complete!",
                            dismissible: true,
                          });
                          localLlmCommands.startServer();
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

const ModelDownloadProgress = ({
  channel,
  onComplete,
}: {
  channel: Channel<number>;
  onComplete?: () => void;
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    channel.onmessage = (v) => {
      setProgress(v);

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
