import { useEffect, useRef } from "react";

import { useAuth } from "../auth";
import { useBillingAccess } from "../billing";
import { useTrialExpiredModal } from "../components/billing/trial-expired-modal";
import { useOnboardingState } from "./useOnboardingState";

export function useTrialExpiredModalTrigger() {
  const auth = useAuth();
  const { isPro, canStartTrial } = useBillingAccess();
  const { open: openTrialExpiredModal } = useTrialExpiredModal();
  const hasShownRef = useRef(false);

  const isAuthenticated = !!auth?.session;
  const isOnboarding = useOnboardingState();

  useEffect(() => {
    if (hasShownRef.current || isOnboarding) {
      return;
    }

    if (!isPro && canStartTrial.isPending) {
      return;
    }

    if (isAuthenticated && !isPro && !canStartTrial.data) {
      openTrialExpiredModal();
      hasShownRef.current = true;
    }
  }, [
    isAuthenticated,
    isPro,
    canStartTrial,
    openTrialExpiredModal,
    isOnboarding,
  ]);
}
