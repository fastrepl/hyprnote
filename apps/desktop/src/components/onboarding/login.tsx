import { useMutation } from "@tanstack/react-query";
import { platform } from "@tauri-apps/plugin-os";
import { useCallback, useEffect, useState } from "react";

import { getRpcCanStartTrial, postBillingStartTrial } from "@hypr/api-client";
import { createClient, createConfig } from "@hypr/api-client/client";

import { useAuth } from "../../auth";
import { getEntitlementsFromToken } from "../../billing";
import { env } from "../../env";
import * as settings from "../../store/tinybase/settings";
import { getNextAfterLogin, type StepProps } from "./config";
import { Divider, OnboardingContainer } from "./shared";

export function Login({ onNavigate }: StepProps) {
  const auth = useAuth();
  const currentPlatform = platform();
  const [callbackUrl, setCallbackUrl] = useState("");

  const setLlmProvider = settings.UI.useSetValueCallback(
    "current_llm_provider",
    () => "hyprnote",
    [],
    settings.STORE_ID,
  );
  const setLlmModel = settings.UI.useSetValueCallback(
    "current_llm_model",
    () => "Auto",
    [],
    settings.STORE_ID,
  );
  const setSttProvider = settings.UI.useSetValueCallback(
    "current_stt_provider",
    () => "hyprnote",
    [],
    settings.STORE_ID,
  );
  const setSttModel = settings.UI.useSetValueCallback(
    "current_stt_model",
    () => "cloud",
    [],
    settings.STORE_ID,
  );

  const setTrialDefaults = useCallback(() => {
    setLlmProvider();
    setLlmModel();
    setSttProvider();
    setSttModel();
  }, [setLlmProvider, setLlmModel, setSttProvider, setSttModel]);

  const processLoginMutation = useMutation({
    mutationFn: async () => {
      const client = createClient(
        createConfig({
          baseUrl: env.VITE_API_URL,
          headers: {
            Authorization: `Bearer ${auth!.session!.access_token}`,
          },
        }),
      );

      const { data } = await getRpcCanStartTrial({ client });
      if (data?.canStartTrial) {
        await postBillingStartTrial({ client, query: { interval: "monthly" } });
      }

      const newSession = await auth!.refreshSession();
      return newSession
        ? getEntitlementsFromToken(newSession.access_token).includes(
            "hyprnote_pro",
          )
        : false;
    },
    onSuccess: (isPro) => {
      if (isPro) {
        setTrialDefaults();
      }
      onNavigate(getNextAfterLogin(currentPlatform, isPro));
    },
    onError: (e) => {
      console.error(e);
      onNavigate("configure-notice");
    },
  });

  const { mutate, isIdle } = processLoginMutation;

  useEffect(() => {
    if (auth?.session && isIdle) {
      mutate();
    }
  }, [auth?.session, isIdle, mutate]);

  useEffect(() => {
    if (isIdle && !auth?.session) {
      void auth?.signIn();
    }
  }, [auth, isIdle]);

  return (
    <OnboardingContainer
      title="Waiting for sign in..."
      description="Complete the process in your browser"
      onBack={() => onNavigate("welcome")}
    >
      <button
        onClick={() => auth?.signIn()}
        className="w-full py-3 rounded-full bg-gradient-to-t from-neutral-200 to-neutral-100 text-neutral-900 text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
      >
        Open sign in page in browser
      </button>

      <Divider text="or paste callback URL" />

      <div className="relative flex items-center border rounded-full overflow-hidden transition-all duration-200 border-neutral-200 focus-within:border-neutral-400">
        <input
          type="text"
          className="flex-1 px-4 py-3 text-xs font-mono outline-none bg-white"
          placeholder="hyprnote://...?access_token=..."
          value={callbackUrl}
          onChange={(e) => setCallbackUrl(e.target.value)}
        />
        <button
          onClick={() => auth?.handleAuthCallback(callbackUrl)}
          disabled={!callbackUrl}
          className="absolute right-0.5 px-4 py-2 text-sm bg-gradient-to-t from-neutral-600 to-neutral-500 text-white rounded-full enabled:hover:scale-[1.02] enabled:active:scale-[0.98] transition-all disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </OnboardingContainer>
  );
}
