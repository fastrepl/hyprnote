import { useQuery } from "@tanstack/react-query";
import { Channel } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { toast } from "sonner";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";

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

    toast.custom(
      (id) => (
        <div className="flex flex-col gap-2 p-4 bg-white border rounded-lg shadow-lg">
          <div className="font-medium">Model Download Needed</div>

          {!checkForModelDownload.data?.stt && (
            <div>
              <button onClick={() => localSttCommands.downloadModel(sttChannel)}>
                Download STT Model
              </button>
            </div>
          )}

          {!checkForModelDownload.data?.llm && (
            <div>
              <button onClick={() => localLlmCommands.downloadModel(llmChannel)}>
                Download LLM Model
              </button>
            </div>
          )}

          <button
            onClick={() => toast.dismiss(id)}
            className="px-3 py-1.5 text-sm bg-neutral-200 text-neutral-800 rounded-md hover:bg-neutral-300"
          >
            Dismiss
          </button>
        </div>
      ),
      {
        id: "model-download-notification",
        duration: Infinity,
      },
    );
  }, [checkForModelDownload.data]);

  return null;
}
