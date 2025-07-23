import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { sonnerToast, toast } from "@hypr/ui/components/ui/toast";
import { showLlmModelDownloadToast, showSttModelDownloadToast } from "./shared";

const TOAST_DISMISSAL_KEY = "model-download-toast-dismissed";

export default function ModelDownloadNotification() {
  const queryClient = useQueryClient();
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem(TOAST_DISMISSAL_KEY) === "true";
  });
  const currentSttModel = useQuery({
    queryKey: ["current-stt-model"],
    queryFn: () => localSttCommands.getCurrentModel(),
  });

  const currentLlmModel = useQuery({
    queryKey: ["current-llm-model"],
    queryFn: () => localLlmCommands.getCurrentModel(),
  });

  const checkForModelDownload = useQuery({
    enabled: !!currentSttModel.data,
    queryKey: ["check-model-downloaded"],
    queryFn: async () => {
      const [stt, llm] = await Promise.all([
        localSttCommands.isModelDownloaded(currentSttModel.data!),
        localLlmCommands.isModelDownloaded(currentLlmModel.data!),
      ]);

      return {
        currentSttModel,
        sttModelDownloaded: stt,
        llmModelDownloaded: llm,
      };
    },
    refetchInterval: 5000,
  });

  const sttModelDownloading = useQuery({
    enabled: !checkForModelDownload.data?.sttModelDownloaded,
    queryKey: ["stt-model-downloading"],
    queryFn: async () => {
      return localSttCommands.isModelDownloading(currentSttModel.data!);
    },
    refetchInterval: 3000,
  });

  const llmModelDownloading = useQuery({
    enabled: !checkForModelDownload.data?.llmModelDownloaded,
    queryKey: ["llm-model-downloading"],
    queryFn: async () => {
      return localLlmCommands.isModelDownloading(currentLlmModel.data!);
    },
    refetchInterval: 3000,
  });

  const sttModelExists = useQuery({
    queryKey: ["stt-model-exists"],
    queryFn: async () => {
      const results = await Promise.all([
        localSttCommands.isModelDownloaded("QuantizedTiny"),
        localSttCommands.isModelDownloaded("QuantizedTinyEn"),
        localSttCommands.isModelDownloaded("QuantizedBase"),
        localSttCommands.isModelDownloaded("QuantizedBaseEn"),
        localSttCommands.isModelDownloaded("QuantizedSmall"),
        localSttCommands.isModelDownloaded("QuantizedSmallEn"),
        localSttCommands.isModelDownloaded("QuantizedLargeTurbo"),
      ]);

      return results.some(Boolean);
    },
    refetchInterval: 3000,
  });

  const llmModelExists = useQuery({
    queryKey: ["llm-model-exists"],
    queryFn: async () => {
      const results = await Promise.all([
        localLlmCommands.isModelDownloaded("Llama3p2_3bQ4"),
        localLlmCommands.isModelDownloaded("HyprLLM"),
      ]);

      return results.some(Boolean);
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!checkForModelDownload.data) {
      return;
    }

    if (checkForModelDownload.data?.sttModelDownloaded && checkForModelDownload.data?.llmModelDownloaded) {
      return;
    }

    if (sttModelDownloading.data || llmModelDownloading.data) {
      return;
    }

    if (isDismissed) {
      return;
    }

    const needsSttModel = !sttModelExists.data;
    const needsLlmModel = !llmModelExists.data;

    let title: string;
    let content: string;
    let buttonLabel: string;

    if (needsSttModel && needsLlmModel) {
      title = "Transcribing & Enhancing AI Needed";
      content = "Both STT models and LLMs are required for offline functionality.";
      buttonLabel = "Download Models";
    } else if (needsSttModel) {
      title = "Transcribing Model Needed";
      content = "The STT model is required for offline transcribing functionality.";
      buttonLabel = "Download Model";
    } else if (needsLlmModel) {
      title = "Enhancing AI Model Needed";
      content = "The LLM model is required for offline enhancing functionality.";
      buttonLabel = "Download HyprLLM v1";
    } else {
      return;
    }

    const handleDismiss = () => {
      setIsDismissed(true);
      sessionStorage.setItem(TOAST_DISMISSAL_KEY, "true");
      sonnerToast.dismiss("model-download-needed");
    };

    toast({
      id: "model-download-needed",
      title,
      content,
      buttons: [
        {
          label: buttonLabel,
          onClick: () => {
            sonnerToast.dismiss("model-download-needed");

            if (needsSttModel && !sttModelDownloading.data) {
              showSttModelDownloadToast(currentSttModel.data!, undefined, queryClient);
            }

            if (needsLlmModel && !llmModelDownloading.data) {
              showLlmModelDownloadToast(undefined, undefined, queryClient);
            }
          },
          primary: true,
        },
        {
          label: "Dismiss",
          onClick: handleDismiss,
          primary: false,
        },
      ],
      dismissible: false,
    });
  }, [checkForModelDownload.data, sttModelDownloading.data, llmModelDownloading.data, isDismissed, sttModelExists.data, llmModelExists.data]);

  return null;
}
