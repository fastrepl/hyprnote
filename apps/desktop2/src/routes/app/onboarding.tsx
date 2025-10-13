import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeftIcon, CircleQuestionMarkIcon } from "lucide-react";
import { z } from "zod";

import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { cn } from "@hypr/ui/lib/utils";
import { useCallback } from "react";

const STEPS = ["welcome", "permissions", "calendars"] as const;

const validateSearch = z.object({
  step: z.enum(STEPS).default("welcome"),
  local: z.boolean().default(false),
});

export const Route = createFileRoute("/app/onboarding")({
  validateSearch,
  component: Component,
});

function Component() {
  const { step, local } = Route.useSearch();

  if (step === "welcome") {
    return (
      <div
        data-tauri-drag-region
        className="flex flex-col items-center justify-center h-full"
      >
        <Welcome />
      </div>
    );
  }

  if (step === "permissions") {
    return (
      <NavigationContainer>
        <Permissions />
      </NavigationContainer>
    );
  }

  if (step === "calendars") {
    return (
      <NavigationContainer>
        <Calendars local={local} />
      </NavigationContainer>
    );
  }

  return null;
}

function Welcome() {
  const { goNext } = useOnboarding();

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
        className="mb-16 text-center text-xl font-medium text-gray-600"
      >
        Where Conversations Stay Yours
      </TextAnimate>

      <PushableButton
        onClick={() => goNext({ local: false })}
        className="w-full max-w-sm mb-4 hover:underline decoration-gray-100"
      >
        Get Started
      </PushableButton>

      <div
        className={cn([
          "flex flex-row gap-1 items-center",
          "text-gray-400 hover:text-gray-800 transition-colors",
        ])}
      >
        <button className="text-sm underline" onClick={() => goNext({ local: true })}>
          Or proceed without an account
        </button>
        <CircleQuestionMarkIcon className="w-4 h-4 cursor-help" />
      </div>
    </div>
  );
}

function Permissions() {
  const { goNext } = useOnboarding();
  return (
    <div>
      <p>Permissions</p>
      <button onClick={goNext}>Next</button>
    </div>
  );
}

function Calendars({ local }: { local: boolean }) {
  const { goNext } = useOnboarding();
  return (
    <div>
      <p>Calendars {local ? "Local" : "Cloud"}</p>
      <button onClick={goNext}>Next</button>
    </div>
  );
}

function NavigationContainer({ children }: { children: React.ReactNode }) {
  const { step, previous, goPrevious } = useOnboarding();

  return (
    <div className="h-full">
      <header
        data-tauri-drag-region
        className={cn([
          "relative flex items-center justify-between min-h-8",
          "bg-gray-50 rounded-md mx-1 my-0.5",
          "pl-[72px]",
        ])}
      >
        {previous
          && (
            <button
              onClick={goPrevious}
              className={cn([
                "flex items-center gap-1 pt-1",
                "text-sm text-gray-400 hover:text-gray-600 transition-colors",
              ])}
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span>{previous.charAt(0).toUpperCase() + previous.slice(1)}</span>
            </button>
          )}

        <span className="absolute left-1/2 -translate-x-1/2 font-semibold">
          {step.charAt(0).toUpperCase() + step.slice(1)}
        </span>
      </header>
      {children}
    </div>
  );
}

function useOnboarding() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { step } = search;

  const previous = STEPS?.[STEPS.indexOf(step) - 1] as typeof STEPS[number] | undefined;
  const next = STEPS?.[STEPS.indexOf(step) + 1] as typeof STEPS[number] | undefined;

  const goPrevious = useCallback(() => {
    if (!previous) {
      return;
    }

    navigate({ to: "/app/onboarding", search: { ...search, step: previous } });
  }, [search, navigate]);

  const goNext = useCallback((params?: Omit<typeof Route.useSearch, "step">) => {
    if (!next) {
      throw navigate({ to: "/app/main" });
    }

    navigate({ to: "/app/onboarding", search: { ...search, step: next, ...(params ?? {}) } });
  }, [search, navigate]);

  return {
    step,
    previous,
    next,
    goNext,
    goPrevious,
  };
}
