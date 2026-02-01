import { useEffect, useRef } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";

import { useAuth } from "../auth";
import { useBillingAccess } from "../billing";
import { useTrialBeginModal } from "../components/devtool/trial-begin-modal";
import * as settings from "../store/tinybase/store/settings";
import { useOnboardingState } from "./useOnboardingState";

export function useProSubscriptionModalTrigger() {
  const auth = useAuth();
  const { isPro, canStartTrial } = useBillingAccess();
  const { open: openProModal } = useTrialBeginModal();
  const store = settings.UI.useStore(settings.STORE_ID);

  const prevIsProRef = useRef<boolean | null>(null);
  const hasShownRef = useRef(false);

  const isAuthenticated = !!auth?.session;
  const isOnboarding = useOnboardingState();

  useEffect(() => {
    if (!isAuthenticated || !store || hasShownRef.current || isOnboarding) {
      return;
    }

    const wasNotPro = prevIsProRef.current === false;
    const isNowPro = isPro === true;
    const isSubscription = !canStartTrial;

    if (wasNotPro && isNowPro && isSubscription) {
      const lastShownAt = store.getValue("pro_subscription_modal_shown_at");
      const now = Date.now();

      if (!lastShownAt || now - lastShownAt > 60000) {
        store.setValue("pro_subscription_modal_shown_at", now);
        hasShownRef.current = true;

        void analyticsCommands.event({
          event: "subscription_started",
          plan: "pro",
        });
        void analyticsCommands.setProperties({
          set: {
            plan: "pro",
          },
        });

        openProModal();
      }
    }

    prevIsProRef.current = isPro;
  }, [
    isAuthenticated,
    isPro,
    canStartTrial,
    store,
    isOnboarding,
    openProModal,
  ]);
}
