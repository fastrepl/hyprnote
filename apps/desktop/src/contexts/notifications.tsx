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
  // Whether there's an active banner that needs attention
  hasActiveBanner: boolean;
  // Whether any notes are being enhanced
  hasActiveEnhancement: boolean;
  // Whether any model is downloading
  hasActiveDownload: boolean;
  // Current download progress (0-100)
  downloadProgress: number | null;
  // Name of model being downloaded
  downloadingModel: string | null;
  // Total count of notifications
  notificationCount: number;
  // Whether to show the badge
  shouldShowBadge: boolean;
}

const NotificationContext = createContext<NotificationState | null>(null);

const MODEL_DISPLAY_NAMES: Record<SupportedSttModel, string> = {
  "am-parakeet-v2": "Parakeet v2",
  "am-parakeet-v3": "Parakeet v3",
  "am-whisper-large-v3": "Whisper Large v3",
  QuantizedTiny: "Whisper Tiny",
  QuantizedTinyEn: "Whisper Tiny (English)",
  QuantizedBase: "Whisper Base",
  QuantizedBaseEn: "Whisper Base (English)",
  QuantizedSmall: "Whisper Small",
  QuantizedSmallEn: "Whisper Small (English)",
  QuantizedLargeTurbo: "Whisper Large Turbo",
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

  // Simple check if configuration is missing
  // We'll rely on the settings page to validate if models are actually downloaded
  const hasConfigBanner =
    !current_stt_provider ||
    !current_stt_model ||
    !current_llm_provider ||
    !current_llm_model;

  // Track model download progress
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

  // Check for active AI tasks (enhancements)
  // For now, we'll disable this to avoid the error
  const hasActiveEnhancement = false;

  // Check if sidebar is expanded
  const currentTab = useTabs((state) => state.currentTab);
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
        ? MODEL_DISPLAY_NAMES[downloadingModel]
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
