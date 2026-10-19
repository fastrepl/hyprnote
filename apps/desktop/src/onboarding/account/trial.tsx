import * as Sentry from "@sentry/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { canStartTrial, startTrial } from "@anlg/api-client";
import type { StartTrialReason, TrialOffer } from "@anlg/api-client";
import { createClient } from "@anlg/api-client/client";
import { commands as analyticsCommands } from "@anlg/plugin-analytics";
import { proTrialDaysForOffer } from "@anlg/pricing";
import { useMountEffect } from "@anlg/ui/hooks/use-mount-effect";

import { useAuth } from "~/auth";
import { useBillingAccess } from "~/auth/billing-context";
import { env } from "~/env";
import { waitForBillingUpdate } from "~/shared/billing";
import { configurePaidSettings } from "~/shared/config/configure-paid-settings";
import {
  holdAutoTrial,
  isSwitchableAccount,
  startTrialOnce,
} from "~/shared/trial-start";

export type TrialPhase =
  | "checking"
  | "starting"
  | "already-paid"
  | "already-trialing"
  | { choose: { email: string | undefined } }
  | {
      done: StartTrialReason | "error";
      offer?: TrialOffer;
      trialDays?: number;
    };

export function useTrialFlow(onContinue: () => void) {
  const auth = useAuth();
  const billing = useBillingAccess();
  const hasTriggeredRef = useRef(false);
  const [keptPersonalTrial, setKeptPersonalTrial] = useState(false);

  const user = auth?.session?.user;
  const needsTrial =
    !!user && billing.isReady && !billing.isPaid && !billing.isTrialing;
  const canSwitchAccount = isSwitchableAccount(user);

  // Keeps BillingProvider from starting the trial before the user picks.
  useMountEffect(() =>
    user && canSwitchAccount ? holdAutoTrial(user.id) : undefined,
  );

  // auth only supplies request headers; the result is keyed by the signed-in user.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const offerQuery = useQuery({
    queryKey: ["onboarding-trial-offer", user?.id],
    enabled: needsTrial && canSwitchAccount && auth.isFingerprintSettled,
    retry: false,
    staleTime: Infinity,
    queryFn: async () => {
      const headers = auth.getHeaders();
      if (!headers) throw new Error("no headers");
      const client = createClient({ baseUrl: env.VITE_API_URL, headers });
      const { data, error } = await canStartTrial({ client });
      if (error) throw error;
      return data;
    },
  });

  const offersWorkEmailSwitch =
    canSwitchAccount &&
    !keptPersonalTrial &&
    offerQuery.data?.canStartTrial === true &&
    offerQuery.data.offer === "personal_email";

  const {
    mutate: triggerTrial,
    data: trialResult,
    isError,
    isPending,
    isSuccess,
  } = useMutation({
    mutationFn: async () => {
      const userId = auth.session?.user.id;
      const headers = auth.getHeaders();
      if (!userId || !headers) throw new Error("no headers");

      return startTrialOnce(userId, async () => {
        const client = createClient({ baseUrl: env.VITE_API_URL, headers });
        const { data, error } = await startTrial({
          client,
          query: { interval: "monthly" },
        });
        if (error) throw error;
        await waitForBillingUpdate(
          () => auth.refreshSession(),
          data?.started ? 3000 : 1500,
        );
        return data;
      });
    },
    onSuccess: (data) => {
      // Let the trial length sink in before moving on.
      setTimeout(onContinue, data?.started ? 2500 : 0);
    },
    onError: async (e) => {
      Sentry.captureException(e);
      void analyticsCommands.event({
        event: "trial_flow_client_error",
        properties: { error: String(e) },
      });
      await new Promise((r) => setTimeout(r, 1500));
      onContinue();
    },
  });

  const switchToWorkEmail = useMutation({
    mutationFn: async () => {
      void analyticsCommands.event({
        event: "trial_offer_switch_to_work_email",
      });
      await auth.signOut();
      await auth.signIn({ switchAccount: true });
    },
    onError: (e) => {
      Sentry.captureException(e);
    },
  });

  const keepPersonalTrial = () => {
    void analyticsCommands.event({ event: "trial_offer_kept_personal_email" });
    setKeptPersonalTrial(true);
  };

  useEffect(() => {
    if (!auth?.session || !billing.isReady || hasTriggeredRef.current) return;

    if (billing.isPaid && !billing.isTrialing) {
      hasTriggeredRef.current = true;
      void analyticsCommands.event({
        event: "trial_flow_skipped",
        properties: { reason: "already_paid" },
      });
      void configurePaidSettings();
      setTimeout(onContinue, 1500);
      return;
    }

    if (billing.isTrialing) {
      hasTriggeredRef.current = true;
      void analyticsCommands.event({
        event: "trial_flow_skipped",
        properties: { reason: "already_trialing" },
      });
      void configurePaidSettings();
      setTimeout(onContinue, 1500);
      return;
    }

    if (!auth.isFingerprintSettled) return;
    if (canSwitchAccount && offerQuery.isPending) return;
    if (offersWorkEmailSwitch || switchToWorkEmail.isPending) return;

    hasTriggeredRef.current = true;
    triggerTrial();
  }, [
    auth,
    billing,
    canSwitchAccount,
    offerQuery.isPending,
    offersWorkEmailSwitch,
    onContinue,
    switchToWorkEmail.isPending,
    triggerTrial,
  ]);

  const flow = {
    keepPersonalTrial,
    switchToWorkEmail: () => switchToWorkEmail.mutate(),
    isSwitching: switchToWorkEmail.isPending,
    switchFailed: switchToWorkEmail.isError,
  };

  const phase = ((): TrialPhase | null => {
    if (!auth?.session) return null;
    if (!billing.isReady) return "checking";

    if (billing.isPaid && !billing.isTrialing) return "already-paid";
    if (billing.isTrialing && !isSuccess) return "already-trialing";

    if (offersWorkEmailSwitch && !isPending && !isSuccess) {
      return { choose: { email: auth.session.user.email } };
    }

    if (isPending) return "starting";

    if (isSuccess) {
      const reason = trialResult?.reason;
      if (reason === "started" || reason === "not_eligible") {
        const offer = trialResult?.offer ?? undefined;
        return {
          done: reason,
          offer,
          trialDays:
            trialResult?.trialDays ??
            (offer ? proTrialDaysForOffer(offer) : undefined),
        };
      }
      return { done: "error" };
    }

    if (isError) return { done: "error" };

    return "checking";
  })();

  return { phase, ...flow };
}
