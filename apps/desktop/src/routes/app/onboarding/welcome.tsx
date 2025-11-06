import { CircleQuestionMarkIcon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { cn } from "@hypr/utils";

import type { OnboardingNext } from "./shared";

type WelcomeProps = {
  onNext: OnboardingNext;
};

export function Welcome({ onNext }: WelcomeProps) {
  return (
    <div className="flex flex-col items-center">
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
        className="mb-4 w-full max-w-sm decoration-neutral-100 hover:underline"
      >
        Get Started
      </Button>

      <div
        className={cn([
          "flex flex-row items-center gap-1",
          "text-neutral-400 transition-colors hover:text-neutral-800",
        ])}
      >
        <button className="text-sm underline" onClick={() => onNext({ local: true })}>
          Or proceed without an account
        </button>
        <CircleQuestionMarkIcon className="h-4 w-4 cursor-help" />
      </div>
    </div>
  );
}
