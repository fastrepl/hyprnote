import * as Sentry from "@sentry/react";
import { useEffect, useRef, useState } from "react";

import { getRpcCanStartTrial, postBillingStartTrial } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as sfxCommands } from "@hypr/plugin-sfx";
import { commands as windowsCommands } from "@hypr/plugin-windows";

import { useAuth } from "../../auth";
import { env } from "../../env";
import { Route } from "../../routes/app/onboarding/_layout.index";
import { commands } from "../../types/tauri.gen";
import { getBack, getNext, type StepProps } from "./config";
import { Divider, OnboardingContainer } from "./shared";

export const STEP_ID_LOGIN = "login" as const;

export function Login({ onNavigate }: StepProps) {
  const search = Route.useSearch();
  const auth = useAutoSignIn();
  const [callbackUrl, setCallbackUrl] = useState("");

  usePostAuthNavigation(onNavigate);

  const backStep = getBack(search);

  return (
    <OnboardingContainer
      title="Waiting for sign in..."
      description="Complete the process in your browser"
      onBack={
        backStep ? () => onNavigate({ ...search, step: backStep }) : undefined
      }
    >
      <button
        onClick={() => auth?.signIn()}
        className="w-full py-3 rounded-full bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
      >
        Open sign in page in browser
      </button>

      <Divider text="or paste callback URL" />

      <div className="relative flex items-center border rounded-full overflow-hidden transition-all duration-200 border-neutral-200 focus-within:border-neutral-400">
        <input
          type="text"
          className="flex-1 px-4 py-3 text-xs font-mono outline-hidden bg-white"
          placeholder="hyprnote://...?access_token=..."
          value={callbackUrl}
          onChange={(e) => setCallbackUrl(e.target.value)}
        />
        <button
          onClick={() => auth?.handleAuthCallback(callbackUrl)}
          disabled={!callbackUrl}
          className="absolute right-0.5 px-4 py-2 text-sm bg-linear-to-t from-neutral-600 to-neutral-500 text-white rounded-full enabled:hover:scale-[1.02] enabled:active:scale-[0.98] transition-all disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </OnboardingContainer>
  );
}

async function finishOnboarding() {
  await sfxCommands.stop("BGM").catch(console.error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await commands.setOnboardingNeeded(false).catch(console.error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await windowsCommands.windowShow({ type: "main" });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await windowsCommands.windowDestroy({ type: "onboarding" });
}

async function tryStartTrial(headers: Record<string, string>) {
  const client = createClient({ baseUrl: env.VITE_API_URL, headers });
  const { data } = await getRpcCanStartTrial({ client });

  if (!data?.canStartTrial) {
    return false;
  }

  const { error } = await postBillingStartTrial({
    client,
    query: { interval: "monthly" },
  });

  if (error) {
    return false;
  }

  void analyticsCommands.event({ event: "trial_started", plan: "pro" });
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 14);
  void analyticsCommands.setProperties({
    set: { plan: "pro", trial_end_date: trialEndDate.toISOString() },
  });

  return true;
}

function useAutoSignIn() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth?.session) {
      void auth?.signIn();
    }
  }, [auth?.session, auth?.signIn]);

  return auth;
}

function usePostAuthNavigation(onNavigate: StepProps["onNavigate"]) {
  const search = Route.useSearch();
  const auth = useAuth();
  const hasHandledRef = useRef(false);

  useEffect(() => {
    if (!auth?.session || hasHandledRef.current) {
      return;
    }
    hasHandledRef.current = true;

    const handle = async () => {
      const headers = auth.getHeaders();
      if (headers) {
        try {
          await tryStartTrial(headers);
          await auth.refreshSession();
        } catch (e) {
          Sentry.captureException(e);
          console.error(e);
        }
      }

      const nextStep = getNext(search);
      if (nextStep) {
        onNavigate({ ...search, step: nextStep });
      } else {
        void finishOnboarding();
      }
    };

    void handle();
  }, [auth, search, onNavigate]);
}
