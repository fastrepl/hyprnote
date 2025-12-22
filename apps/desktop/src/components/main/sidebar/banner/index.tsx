import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  events as localSttEvents,
  type SupportedSttModel,
} from "@hypr/plugin-local-stt";
import { cn } from "@hypr/utils";

import { useAuth } from "../../../../auth";
import { useConfigValues } from "../../../../config/use-config";
import { useTabs } from "../../../../store/zustand/tabs";
import { Banner } from "./component";
import { createBannerRegistry, getBannerToShow } from "./registry";
import type { BannerType } from "./types";
import { useDismissedBanners } from "./useDismissedBanners";

export function BannerArea({
  isProfileExpanded,
}: {
  isProfileExpanded: boolean;
}) {
  const auth = useAuth();
  const { dismissBanner, isDismissed } = useDismissedBanners();
  const shouldShowBanner = useShouldShowBanner(isProfileExpanded);

  const isAuthenticated = !!auth?.session;
  const {
    current_llm_provider,
    current_llm_model,
    current_stt_provider,
    current_stt_model,
  } = useConfigValues([
    "current_llm_provider",
    "current_llm_model",
    "current_stt_provider",
    "current_stt_model",
  ] as const);
  const hasLLMConfigured = !!(current_llm_provider && current_llm_model);
  const hasSttConfigured = !!(current_stt_provider && current_stt_model);

  const currentTab = useTabs((state) => state.currentTab);
  const isAiTranscriptionTabActive =
    currentTab?.type === "ai" && currentTab.state?.tab === "transcription";
  const isAiIntelligenceTabActive =
    currentTab?.type === "ai" && currentTab.state?.tab === "intelligence";

  const openNew = useTabs((state) => state.openNew);
  const updateAiTabState = useTabs((state) => state.updateAiTabState);

  const handleSignIn = useCallback(async () => {
    await auth?.signIn();
  }, [auth]);

  const openAiTab = useCallback(
    (tab: "intelligence" | "transcription") => {
      if (currentTab?.type === "ai") {
        updateAiTabState(currentTab, { tab });
      } else {
        openNew({ type: "ai", state: { tab } });
      }
    },
    [currentTab, openNew, updateAiTabState],
  );

  const handleOpenLLMSettings = useCallback(() => {
    openAiTab("intelligence");
  }, [openAiTab]);

  const handleOpenSTTSettings = useCallback(() => {
    openAiTab("transcription");
  }, [openAiTab]);

  const registry = useMemo(
    () =>
      createBannerRegistry({
        isAuthenticated,
        hasLLMConfigured,
        hasSttConfigured,
        isAiTranscriptionTabActive,
        isAiIntelligenceTabActive,
        onSignIn: handleSignIn,
        onOpenLLMSettings: handleOpenLLMSettings,
        onOpenSTTSettings: handleOpenSTTSettings,
      }),
    [
      isAuthenticated,
      hasLLMConfigured,
      hasSttConfigured,
      isAiTranscriptionTabActive,
      isAiIntelligenceTabActive,
      handleSignIn,
      handleOpenLLMSettings,
      handleOpenSTTSettings,
    ],
  );

  const registryBanner = useMemo(
    () => getBannerToShow(registry, isDismissed),
    [registry, isDismissed],
  );

  const downloadProgress = useDownloadProgress();

  const currentBanner: BannerType | null = useMemo(() => {
    if (downloadProgress.isDownloading && downloadProgress.model) {
      return {
        id: "download-progress",
        title: "Downloading model",
        description: `${downloadProgress.modelDisplayName} is being downloaded...`,
        dismissible: false,
        progress: downloadProgress.progress,
      };
    }
    return registryBanner;
  }, [downloadProgress, registryBanner]);

  const handleDismiss = useCallback(() => {
    if (currentBanner) {
      dismissBanner(currentBanner.id);
    }
  }, [currentBanner, dismissBanner]);

  return (
    <AnimatePresence mode="wait">
      {shouldShowBanner && currentBanner ? (
        <motion.div
          key={currentBanner.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={cn([
            "absolute bottom-0 left-0 right-0 z-20",
            "pointer-events-none",
          ])}
        >
          <div className="pointer-events-auto">
            <Banner
              banner={currentBanner}
              onDismiss={currentBanner.dismissible ? handleDismiss : undefined}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

let globalShowBanner = false;
let globalBannerTimer: NodeJS.Timeout | null = null;

function useShouldShowBanner(isProfileExpanded: boolean) {
  const BANNER_CHECK_DELAY_MS = 3000;

  const [showBanner, setShowBanner] = useState(globalShowBanner);

  useEffect(() => {
    if (!globalShowBanner && !globalBannerTimer) {
      globalBannerTimer = setTimeout(() => {
        globalShowBanner = true;
        setShowBanner(true);
        globalBannerTimer = null;
      }, BANNER_CHECK_DELAY_MS);
    } else if (globalShowBanner) {
      setShowBanner(true);
    }

    return () => {};
  }, []);

  return !isProfileExpanded && showBanner;
}

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

function useDownloadProgress() {
  const [model, setModel] = useState<SupportedSttModel | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const unlisten = localSttEvents.downloadProgressPayload.listen((event) => {
      const { model: eventModel, progress: eventProgress } = event.payload;

      if (eventProgress < 0) {
        setIsDownloading(false);
        setModel(null);
        setProgress(0);
      } else if (eventProgress >= 100) {
        setIsDownloading(false);
        setModel(null);
        setProgress(0);
      } else {
        setIsDownloading(true);
        setModel(eventModel);
        setProgress(Math.max(0, Math.min(100, eventProgress)));
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  return {
    model,
    modelDisplayName: model ? MODEL_DISPLAY_NAMES[model] : "",
    progress,
    isDownloading,
  };
}
