import { useEffect, useRef } from "react";

import { useAuth } from "../auth";
import { useBillingAccess } from "../billing";
import { useTrialExpiredModal } from "../components/devtool/trial-expired-modal";

export function useTrialExpiredModalTrigger() {
  const auth = useAuth();
  const { isPro, canStartTrial } = useBillingAccess();
  const { open: openTrialExpiredModal } = useTrialExpiredModal();
  const hasShownRef = useRef(false);

  const isAuthenticated = !!auth?.session;

  useEffect(() => {
    if (hasShownRef.current) {
      return;
    }

    if (isAuthenticated && !isPro && !canStartTrial) {
      openTrialExpiredModal();
      hasShownRef.current = true;
    }
  }, [isAuthenticated, isPro, canStartTrial, openTrialExpiredModal]);
}
