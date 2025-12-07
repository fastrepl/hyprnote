import { useCallback, useEffect, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";

import { useAuth } from "../../auth";
import { OnboardingContainer, type OnboardingNext } from "./shared";

type LoginProps = {
  onNext: OnboardingNext;
};

export function Login({ onNext }: LoginProps) {
  const auth = useAuth();
  const [isPending, setIsPending] = useState(false);

  const handleSignIn = useCallback(async () => {
    setIsPending(true);
    try {
      await auth?.signIn();
    } catch {
      setIsPending(false);
    }
  }, [auth]);

  useEffect(() => {
    if (auth?.session) {
      setIsPending(false);
      onNext();
    }
  }, [auth?.session, onNext]);

  return (
    <OnboardingContainer
      title="Sign in to your account"
      description="Sign in to use cloud transcription"
    >
      <Button
        onClick={handleSignIn}
        disabled={isPending}
        className="w-full"
        size="lg"
      >
        {isPending ? "Waiting for sign in..." : "Sign in"}
      </Button>
    </OnboardingContainer>
  );
}
