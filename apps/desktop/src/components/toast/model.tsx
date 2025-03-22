import { useQuery } from "@tanstack/react-query";
import { Channel } from "@tauri-apps/api/core";
import { useEffect } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
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
      description: "Local models are required for offline functionality.",
      buttons: [
        {
          label: "Download Models",
          onClick: () => {
            if (!checkForModelDownload.data?.stt) {
              localSttCommands.downloadModel(sttChannel);
            }
            if (!checkForModelDownload.data?.llm) {
              localLlmCommands.downloadModel(llmChannel);
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
