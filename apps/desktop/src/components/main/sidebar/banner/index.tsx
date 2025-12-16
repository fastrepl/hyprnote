import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@hypr/utils";

import { useAuth } from "../../../../auth";
import { useConfigValues } from "../../../../config/use-config";
import { useTabs } from "../../../../store/zustand/tabs";
import { Banner } from "./component";
import { createBannerRegistry, getBannerToShow } from "./registry";
import { useDismissedBanners } from "./useDismissedBanners";

export function BannerArea({ isProfileExpanded }: { isProfileExpanded: boolean }) {
  const auth = useAuth();
  const { dismissBanner, isDismissed } = useDismissedBanners();
  const shouldShowBanner = useShouldShowBanner(isProfileExpanded);

  const isAuthenticated = !!auth?.session;
  const { current_llm_provider, current_llm_model, current_stt_provider, current_stt_model } =
    useConfigValues([
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

  const currentBanner = useMemo(
    () => getBannerToShow(registry, isDismissed),
    [registry, isDismissed],
  );

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
          className={cn(["absolute bottom-0 left-0 right-0 z-20", "pointer-events-none"])}
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

function useShouldShowBanner(isProfileExpanded: boolean) {
  const BANNER_CHECK_DELAY_MS = 3000;

  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, BANNER_CHECK_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  return !isProfileExpanded && showBanner;
}
