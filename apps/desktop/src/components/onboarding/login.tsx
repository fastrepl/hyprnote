import { useEffect, useRef, useState } from "react";

import { getRpcCanStartTrial, postBillingStartTrial } from "@hypr/api-client";
import { createClient, createConfig } from "@hypr/api-client/client";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";

import { useAuth } from "../../auth";
import { getEntitlementsFromToken } from "../../billing";
import { env } from "../../env";
import { OnboardingContainer, type OnboardingNext } from "./shared";

export function Login({ onNext }: { onNext: OnboardingNext }) {
  const auth = useAuth();
  const [showManualInput, setShowManualInput] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("");

  const signInStarted = useRef(false);
  const trialStarted = useRef(false);

  useEffect(() => {
    if (auth?.session && !trialStarted.current) {
      trialStarted.current = true;

      const client = createClient(
        createConfig({
          baseUrl: env.VITE_API_URL,
          headers: { Authorization: `Bearer ${auth.session.access_token}` },
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

  if (showManualInput) {
    return (
      <OnboardingContainer
        title="Enter callback URL manually"
        description="Useful if deep linking is not working"
      >
        <Input
          type="text"
          className="text-xs font-mono"
          placeholder="<SOMETHING>?access_token=...&refresh_token=..."
          value={callbackUrl}
          onChange={(e) => setCallbackUrl(e.target.value)}
        />
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => auth?.handleAuthCallback(callbackUrl)}
            className="w-full"
          >
            Submit
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowManualInput(false)}
            className="w-full"
          >
            Back
          </Button>
        </div>
      </OnboardingContainer>
    );
  }

  return (
    <OnboardingContainer
      title="Waiting for sign in..."
      description="Complete the process in your browser"
    >
      <p className="text-xs text-neutral-500 text-center">Having trouble?</p>
      <div className="flex flex-col gap-2">
        <Button
          onClick={() => auth?.signIn()}
          variant="outline"
          className="w-full"
        >
          Open sign in page in browser
        </Button>
        <Button
          onClick={() => setShowManualInput(true)}
          variant="outline"
          className="w-full"
        >
          Paste callback URL manually
        </Button>
        <Button
          onClick={() => onNext({ local: true, step: "configure-notice" })}
          variant="outline"
          className="w-full"
        >
          Continue without account
        </Button>
      </div>
    </OnboardingContainer>
  );
}
