import type { ReactNode } from "react";
import { useCallback } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Permissions } from "../../../components/onboarding/permissions";
import type { OnboardingNext } from "../../../components/onboarding/shared";
import { Welcome } from "../../../components/onboarding/welcome";
import { commands } from "../../../types/tauri.gen";

const STEPS = ["welcome", "permissions"] as const;

const validateSearch = z.object({
  step: z.enum(STEPS).default("welcome"),
  local: z.boolean().default(false),
});

type OnboardingSearch = z.infer<typeof validateSearch>;

export const Route = createFileRoute("/app/onboarding/")({
  validateSearch,
  component: Component,
});

function Component() {
  const onboarding = useOnboarding();

  let content: ReactNode = null;

  if (onboarding.step === "welcome") {
    content = <Welcome onNext={onboarding.goNext} />;
  }

  if (onboarding.step === "permissions") {
    content = <Permissions onNext={onboarding.goNext} />;
  }

  return (
    <div
      data-tauri-drag-region
      className="flex h-full items-center justify-center px-8 pt-20 pb-12"
    >
      {content}
    </div>
  );
}

function useOnboarding() {
  const navigate = useNavigate();
  const search: OnboardingSearch = Route.useSearch();
  const { step, local } = search;

  const previous = STEPS?.[STEPS.indexOf(step) - 1] as (typeof STEPS)[number] | undefined;
  const next = STEPS?.[STEPS.indexOf(step) + 1] as (typeof STEPS)[number] | undefined;

  const goPrevious = useCallback(() => {
    if (!previous) {
      return;
    }

    navigate({ to: "/app/onboarding", search: { ...search, step: previous } });
  }, [navigate, previous, search]);

  const goNext = useCallback<OnboardingNext>((params) => {
    if (!next) {
      commands.setOnboardingNeeded(false).catch((e) => console.error(e));
      windowsCommands.windowShow({ type: "main" }).then(() => {
        windowsCommands.windowDestroy({ type: "onboarding" });
      });
      return;
    }

    navigate({
      to: "/app/onboarding",
      search: { ...search, step: next, ...(params ?? {}) },
    });
  }, [navigate, next, search]);

  return {
    step,
    local,
    previous,
    next,
    goNext,
    goPrevious,
  };
}
