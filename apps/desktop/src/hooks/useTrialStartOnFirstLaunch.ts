import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { postBillingStartTrial } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";

import { useAuth } from "../auth";
import { getEntitlementsFromToken, useBillingAccess } from "../billing";
import { useTrialBeginModal } from "../components/devtool/trial-begin-modal";
import { env } from "../env";
import * as settings from "../store/tinybase/store/settings";
import { useOnboardingState } from "./useOnboardingState";

export function useTrialStartOnFirstLaunch() {
  const auth = useAuth();
  const { canStartTrial } = useBillingAccess();
  const { open: openTrialBeginModal } = useTrialBeginModal();
  const store = settings.UI.useStore(settings.STORE_ID);
  const hasCheckedRef = useRef(false);
  const hasShownModalRef = useRef(false);

  const isOnboarding = useOnboardingState();

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const headers = auth?.getHeaders();
      if (!headers) {
        throw new Error("No auth headers");
      }
      const client = createClient({ baseUrl: env.VITE_API_URL, headers });
      await postBillingStartTrial({ client, query: { interval: "monthly" } });

      const newSession = await auth!.refreshSession();
      const isPro = newSession
        ? getEntitlementsFromToken(newSession.access_token).includes(
            "hyprnote_pro",
          )
        : false;

      return { isPro };
    },
    onSuccess: ({ isPro }) => {
      if (isPro) {
        void analyticsCommands.event({
          event: "trial_started",
          plan: "pro",
        });
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        void analyticsCommands.setProperties({
          set: {
            plan: "pro",
            trial_end_date: trialEndDate.toISOString(),
          },
        });
        store?.setValue("trial_begin_modal_pending", true);
      }
    },
    onError: (e) => {
      console.error("Failed to start trial:", e);
    },
  });

  const isAuthenticated = !!auth?.session;
  const startTrial = startTrialMutation.mutate;

  useEffect(() => {
    if (hasCheckedRef.current || !store || !isAuthenticated) {
      return;
    }

    const checkedAt = store.getValue("trial_start_checked_at");
    if (checkedAt) {
      hasCheckedRef.current = true;
      return;
    }

    store.setValue("trial_start_checked_at", Date.now());
    hasCheckedRef.current = true;

    if (canStartTrial) {
      startTrial();
    }
  }, [isAuthenticated, canStartTrial, store, startTrial]);

  useEffect(() => {
    if (hasShownModalRef.current || !store || isOnboarding) {
      return;
    }

    const pending = store.getValue("trial_begin_modal_pending");
    if (pending) {
      store.setValue("trial_begin_modal_pending", false);
      hasShownModalRef.current = true;
      openTrialBeginModal();
    }
  }, [store, isOnboarding, openTrialBeginModal]);
}
