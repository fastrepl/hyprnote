import { ChevronLeftIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getRpcCanStartTrial, postBillingStartTrial } from "@hypr/api-client";
import { createClient, createConfig } from "@hypr/api-client/client";

import { useAuth } from "../../auth";
import { getEntitlementsFromToken } from "../../billing";
import { env } from "../../env";
import { Divider, OnboardingContainer, type OnboardingNext } from "./shared";

export function Login({ onNext }: { onNext: OnboardingNext }) {
  const auth = useAuth();
  const [callbackUrl, setCallbackUrl] = useState("");

  const signInStarted = useRef(false);
  const trialStarted = useRef(false);

  useEffect(() => {
    if (auth?.session && !trialStarted.current) {
      trialStarted.current = true;

      const client = createClient(
        createConfig({
          baseUrl: env.VITE_API_URL,
          headers: {
            Authorization: `Bearer ${auth.session.access_token}`,
          },
        }),
      );

      (async () => {
        try {
          const { data } = await getRpcCanStartTrial({ client });
          if (data?.canStartTrial) {
            await postBillingStartTrial({
              client,
              query: { interval: "monthly" },
            });
          }

          const newSession = await auth.refreshSession();
          const isPro = newSession
            ? getEntitlementsFromToken(newSession.access_token).includes(
                "hyprnote_pro",
              )
            : false;
          onNext({ local: !isPro });
        } catch (e) {
          console.error("Failed to process login:", e);
          onNext({ local: true });
        }
      })();
    }
  }, [auth?.session, auth?.refreshSession, onNext]);

  useEffect(() => {
    if (!signInStarted.current) {
      signInStarted.current = true;
      auth?.signIn();
    }
  }, [auth]);

  return (
    <>
      <button
        onClick={() => onNext({ step: "welcome" })}
        className="fixed top-10 left-1 flex items-center gap-1 px-2 py-1 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        <ChevronLeftIcon size={16} />
        Back
      </button>
      <OnboardingContainer
        title="Waiting for sign in..."
        description="Complete the process in your browser"
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
    </>
  );
}
