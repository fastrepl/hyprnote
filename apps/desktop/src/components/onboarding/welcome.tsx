import { Button } from "@hypr/ui/components/ui/button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";

import { useOnboardingContext } from "./config";
import type { OnboardingNext } from "./shared";

type WelcomeProps = {
  onNext: OnboardingNext;
};

export function Welcome({ onNext }: WelcomeProps) {
  const ctx = useOnboardingContext();
  const canProceedWithoutLogin = ctx?.isAppleSilicon === true;

  return (
    <>
      <img
        src="/assets/logo.svg"
        alt="HYPRNOTE"
        className="mb-6 w-[300px]"
        draggable={false}
      />

      <TextAnimate
        animation="slideUp"
        by="word"
        once
        className="mb-16 text-center text-xl font-medium text-neutral-600"
      >
        Where Conversations Stay Yours
      </TextAnimate>

      <Button
        onClick={() => onNext({ local: false })}
        size="lg"
        className="w-full"
      >
        Get Started
      </Button>

      {canProceedWithoutLogin && (
        <button
          className="mt-4 text-sm text-neutral-400 transition-colors hover:text-neutral-600"
          onClick={() => onNext({ local: true })}
        >
          Proceed without account
        </button>
      )}
    </>
  );
}
