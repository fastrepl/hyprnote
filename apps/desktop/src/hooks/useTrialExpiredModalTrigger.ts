import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { useAuth } from "../auth";
import { useBillingAccess } from "../billing";
import { useTrialExpiredModal } from "../components/devtool/trial-expired-modal";
import * as settings from "../store/tinybase/store/settings";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function useTrialExpiredModalTrigger() {
  const auth = useAuth();
  const { isPro, canStartTrial } = useBillingAccess();
  const { open: openTrialExpiredModal } = useTrialExpiredModal();
  const store = settings.UI.useStore(settings.STORE_ID);
  const hasShownRef = useRef(false);
  const location = useLocation();

  const isAuthenticated = !!auth?.session;
  const isOnboarding = location.pathname.startsWith("/app/onboarding");

  useEffect(() => {
    if (hasShownRef.current || !store || isOnboarding) {
      return;
    }

    if (isAuthenticated && !isPro && !canStartTrial) {
      const dismissedAt = store.getValue("trial_expired_modal_dismissed_at");
      const now = Date.now();

      if (!dismissedAt || now - dismissedAt >= ONE_WEEK_MS) {
        openTrialExpiredModal();
        hasShownRef.current = true;
      }
    }
  }, [
    isAuthenticated,
    isPro,
    canStartTrial,
    openTrialExpiredModal,
    store,
    isOnboarding,
  ]);
}
