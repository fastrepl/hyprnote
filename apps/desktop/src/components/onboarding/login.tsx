import { useCallback, useEffect, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";

import { useAuth } from "../../auth";
import type { OnboardingNext } from "./shared";

type LoginProps = {
  onNext: OnboardingNext;
};

export function Login({ onNext }: LoginProps) {
  const auth = useAuth();
  const [showManualInput, setShowManualInput] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("");

  const handleSignIn = useCallback(async () => {
    await auth?.signIn();
  }, [auth]);

  useEffect(() => {
    if (auth?.session) {
      onNext({ local: false });
    }
  }, [auth?.session, onNext]);

  useEffect(() => {
    handleSignIn();
  }, [handleSignIn]);

  if (showManualInput) {
    return (
      <>
        <img
          src="/assets/logo.svg"
          alt="HYPRNOTE"
          className="mb-6 w-[300px]"
          draggable={false}
        />

        <div className="flex flex-col gap-2 text-center mb-8">
          <h2 className="text-xl font-semibold text-neutral-900">
            Manual callback
          </h2>
          <p className="text-base text-neutral-500">
            Paste the callback URL from your browser
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Input
            type="text"
            className="text-xs font-mono"
            placeholder="hyprnote://auth/callback?access_token=...&refresh_token=..."
            value={callbackUrl}
            onChange={(e) => setCallbackUrl(e.target.value)}
          />
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
      </>
    );
  }

  return (
    <>
      <img
        src="/assets/logo.svg"
        alt="HYPRNOTE"
        className="mb-6 w-[300px]"
        draggable={false}
      />

      <div className="flex flex-col gap-2 text-center mb-8">
        <h2 className="text-xl font-semibold text-neutral-900">
          Waiting for sign-in...
        </h2>
        <p className="text-base text-neutral-500">
          Complete the sign-in process in your browser
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <Button onClick={handleSignIn} variant="outline" className="w-full">
          Reopen sign-in page
        </Button>
        <Button
          onClick={() => setShowManualInput(true)}
          variant="ghost"
          className="w-full text-xs"
        >
          Having trouble? Paste callback URL manually
        </Button>
      </div>
    </>
  );
}
