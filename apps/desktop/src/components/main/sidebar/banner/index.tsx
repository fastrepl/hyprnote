import { cn } from "@hypr/utils";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";

import { useAuth } from "../../../../auth";
import * as main from "../../../../store/tinybase/main";
import { Banner } from "./component";
import { createBannerRegistry, getBannerToShow } from "./registry";
import { useDismissedBanners } from "./useDismissedBanners";

export function BannerArea({
  isProfileExpanded,
}: {
  isProfileExpanded: boolean;
}) {
  const auth = useAuth();
  const { dismissBanner, isDismissed } = useDismissedBanners();

  const isAuthenticated = !!auth?.session;
  const {
    current_llm_provider,
    current_llm_model,
    current_stt_provider,
    current_stt_model,
  } = main.UI.useValues(main.STORE_ID);
  const hasLLMConfigured = !!(current_llm_provider && current_llm_model);
  const hasSttConfigured = !!(current_stt_provider && current_stt_model);

  const handleSignIn = useCallback(async () => {
    await auth?.signIn();
  }, [auth]);

  const openSettingsTab = useCallback((tab: "intelligence" | "transcription") => {
    windowsCommands.windowShow({ type: "settings" })
      .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
      .then(() =>
        windowsCommands.windowEmitNavigate({ type: "settings" }, {
          path: "/app/settings",
          search: { tab },
        })
      );
  }, []);

  const handleOpenLLMSettings = useCallback(() => {
    openSettingsTab("intelligence");
  }, [openSettingsTab]);

  const handleOpenSTTSettings = useCallback(() => {
    openSettingsTab("transcription");
  }, [openSettingsTab]);

  const registry = useMemo(
    () =>
      createBannerRegistry({
        isAuthenticated,
        hasLLMConfigured,
        hasSttConfigured,
        onSignIn: handleSignIn,
        onOpenLLMSettings: handleOpenLLMSettings,
        onOpenSTTSettings: handleOpenSTTSettings,
      }),
    [
      isAuthenticated,
      hasLLMConfigured,
      hasSttConfigured,
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
      {!isProfileExpanded && currentBanner
        ? (
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
              <Banner banner={currentBanner} onDismiss={currentBanner.dismissible ? handleDismiss : undefined} />
            </div>
          </motion.div>
        )
        : null}
    </AnimatePresence>
  );
}
