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

      <button
        onClick={() => onNext()}
        className="w-full py-3 rounded-full bg-gradient-to-t from-stone-600 to-stone-500 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
      >
        Get Started
      </button>

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
