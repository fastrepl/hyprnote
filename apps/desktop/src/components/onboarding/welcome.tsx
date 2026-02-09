import { memo, useCallback } from "react";

import { Route } from "../../routes/app/onboarding/_layout.index";
import { getNext, type StepProps } from "./config";

export const STEP_ID_WELCOME = "welcome" as const;

export const Welcome = memo(function Welcome({ onNavigate }: StepProps) {
  const search = Route.useSearch();

  const goNext = useCallback(
    (skipLogin: boolean) => {
      const ctx = { ...search, skipLogin };
      const nextStep = getNext(ctx);
      if (nextStep) {
        onNavigate({ ...ctx, step: nextStep });
      }
    },
    [onNavigate, search],
  );

  return (
    <>
      <img
        src="/assets/logo.svg"
        alt="HYPRNOTE"
        className="mb-6 w-[300px]"
        draggable={false}
      />

      <p className="mb-16 text-center text-xl font-medium text-neutral-600">
        Where Conversations Stay Yours
      </p>

      <div className="flex flex-col items-center gap-2 w-full">
        <button
          onClick={() => goNext(false)}
          className="w-full py-3 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
        >
          Get Started
        </button>
        <button
          onClick={() => goNext(true)}
          className="text-sm text-neutral-500 transition-opacity duration-150 hover:opacity-70"
        >
          proceed without account
        </button>
      </div>
    </>
  );
});
