import * as Sentry from "@sentry/react";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  canStartTrial as canStartTrialApi,
  startTrial,
} from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as sfxCommands } from "@hypr/plugin-sfx";
import { commands as windowsCommands } from "@hypr/plugin-windows";

import { useAuth } from "../../auth";
import { env } from "../../env";
import { Route } from "../../routes/app/onboarding/_layout.index";
import * as settings from "../../store/tinybase/store/settings";
import { commands } from "../../types/tauri.gen";
import { configureProSettings } from "../../utils";
import { pollForTrialActivation } from "../../utils/poll-trial-activation";
import { getBack, type StepProps } from "./config";
import { OnboardingContainer } from "./shared";

export const STEP_ID_FINAL = "final" as const;

export function Final({ onNavigate }: StepProps) {
  const search = Route.useSearch();
  const auth = useAuth();
  const store = settings.UI.useStore(settings.STORE_ID);
  const [isLoading, setIsLoading] = useState(true);
  const [trialStarted, setTrialStarted] = useState(false);
  const hasHandledRef = useRef(false);
  const authRef = useRef(auth);
  authRef.current = auth;
  const storeRef = useRef(store);
  storeRef.current = store;

  const backStep = getBack(search);

  useEffect(() => {
    if (hasHandledRef.current) {
      return;
    }
    hasHandledRef.current = true;

    const abortController = new AbortController();

    const handle = async () => {
      const currentAuth = authRef.current;
      if (!currentAuth?.session) {
        setIsLoading(false);
        return;
      }

      const headers = currentAuth.getHeaders();
      if (!headers) {
        setIsLoading(false);
        return;
      }

      try {
        const started = await tryStartTrial(headers, storeRef.current);
        setTrialStarted(started);
        if (started) {
          const result = await pollForTrialActivation({
            refreshSession: () => authRef.current.refreshSession(),
            signal: abortController.signal,
          });
          if (result.status === "aborted") return;
        } else {
          await authRef.current.refreshSession();
        }
      } catch (e) {
        Sentry.captureException(e);
        console.error(e);
      }

      setIsLoading(false);
    };

    void handle();

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <OnboardingContainer
        title="Setting up your account..."
        description={trialStarted ? "Starting your Pro trial" : "Please wait"}
        onBack={
          backStep ? () => onNavigate({ ...search, step: backStep }) : undefined
        }
      >
        <div className="flex justify-center py-4">
          <Loader2Icon size={64} className="text-neutral-400 animate-spin" />
        </div>
      </OnboardingContainer>
    );
  }

  return (
    <OnboardingContainer
      title="You're all set!"
      description="Everything is configured and ready to go"
      onBack={
        backStep ? () => onNavigate({ ...search, step: backStep }) : undefined
      }
    >
      <div className="flex justify-center py-4">
        <CheckCircle2Icon size={64} className="text-emerald-500" />
      </div>

      <button
        onClick={() => void finishOnboarding()}
        className="w-full py-3 rounded-full bg-linear-to-t from-neutral-800 to-neutral-700 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
      >
        Get Started
      </button>
    </OnboardingContainer>
  );
}

async function tryStartTrial(
  headers: Record<string, string>,
  store: Parameters<typeof configureProSettings>[0] | undefined,
) {
  const client = createClient({ baseUrl: env.VITE_API_URL, headers });
  const { data } = await canStartTrialApi({ client });

  if (!data?.canStartTrial) {
    return false;
  }

  const { data: startData, error } = await startTrial({
    client,
    query: { interval: "monthly" },
  });

  if (error || !startData?.started) {
    Sentry.captureMessage("Trial start failed", {
      level: "warning",
      extra: { error },
    });
    return false;
  }

  if (store) {
    configureProSettings(store);
  }

  void analyticsCommands.event({ event: "trial_started", plan: "pro" });
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 14);
  void analyticsCommands.setProperties({
    set: { plan: "pro", trial_end_date: trialEndDate.toISOString() },
  });

  return true;
}

async function finishOnboarding() {
  await sfxCommands.stop("BGM").catch(console.error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await commands.setOnboardingNeeded(false).catch(console.error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await analyticsCommands.event({ event: "onboarding_completed" });
  await windowsCommands.windowShow({ type: "main" });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await windowsCommands.windowDestroy({ type: "onboarding" });
}
