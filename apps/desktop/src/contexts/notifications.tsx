import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  events as localSttEvents,
  type SupportedSttModel,
} from "@hypr/plugin-local-stt";

import { useConfigValues } from "../config/use-config";
import { useTabs } from "../store/zustand/tabs";

interface NotificationState {
  hasActiveBanner: boolean;
  hasActiveEnhancement: boolean;
  hasActiveDownload: boolean;
  downloadProgress: number | null;
  downloadingModel: string | null;
  notificationCount: number;
  shouldShowBadge: boolean;
}

const NotificationContext = createContext<NotificationState | null>(null);

const MODEL_DISPLAY_NAMES: Partial<Record<SupportedSttModel, string>> = {
  "am-parakeet-v2": "Parakeet v2",
  "am-parakeet-v3": "Parakeet v3",
  "am-whisper-large-v3": "Whisper Large v3",
  QuantizedTinyEn: "Whisper Tiny (English)",
  QuantizedSmallEn: "Whisper Small (English)",
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const {
    current_stt_provider,
    current_stt_model,
    current_llm_provider,
    current_llm_model,
  } = useConfigValues([
    "current_stt_provider",
    "current_stt_model",
    "current_llm_provider",
    "current_llm_model",
  ] as const);

  const hasConfigBanner =
    !current_stt_provider ||
    !current_stt_model ||
    !current_llm_provider ||
    !current_llm_model;

  const [downloadingModel, setDownloadingModel] =
    useState<SupportedSttModel | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  useEffect(() => {
    const unlisten = localSttEvents.downloadProgressPayload.listen((event) => {
      const { model: eventModel, progress: eventProgress } = event.payload;

      if (eventProgress < 0 || eventProgress >= 100) {
        setDownloadingModel(null);
        setDownloadProgress(null);
      } else {
        setDownloadingModel(eventModel);
        setDownloadProgress(Math.max(0, Math.min(100, eventProgress)));
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  const hasActiveEnhancement = false;

  const currentTab = useTabs(
    (state: {
      currentTab: ReturnType<typeof useTabs.getState>["currentTab"];
    }) => state.currentTab,
  );
  const isAiTab = currentTab?.type === "ai";

  const value = useMemo<NotificationState>(() => {
    const hasActiveBanner = hasConfigBanner && !isAiTab;
    const hasActiveDownload =
      downloadingModel !== null && downloadProgress !== null;

    const notificationCount =
      (hasActiveBanner ? 1 : 0) +
      (hasActiveEnhancement ? 1 : 0) +
      (hasActiveDownload ? 1 : 0);

    return {
      hasActiveBanner,
      hasActiveEnhancement,
      hasActiveDownload,
      downloadProgress,
      downloadingModel: downloadingModel
        ? (MODEL_DISPLAY_NAMES[downloadingModel] ?? downloadingModel)
        : null,
      notificationCount,
      shouldShowBadge: notificationCount > 0,
    };
  }, [
    hasConfigBanner,
    hasActiveEnhancement,
    downloadingModel,
    downloadProgress,
    isAiTab,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return context;
}
