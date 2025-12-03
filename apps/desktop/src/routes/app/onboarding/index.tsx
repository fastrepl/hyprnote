import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { z } from "zod";

import { commands as windowsCommands } from "@hypr/plugin-windows";

import { Permissions } from "../../../components/onboarding/permissions";
import type { OnboardingNext } from "../../../components/onboarding/shared";
import { Welcome } from "../../../components/onboarding/welcome";
import { useIsLinux } from "../../../hooks/usePlatform";
import { commands } from "../../../types/tauri.gen";

const ALL_STEPS = ["welcome", "permissions"] as const;

const validateSearch = z.object({
  step: z.enum(ALL_STEPS).default("welcome"),
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
    <div className="flex flex-col h-full relative items-center justify-center p-8">
      <div
        data-tauri-drag-region
        className="h-14 w-full absolute top-0 left-0 right-0"
      />
      {content}
    </div>
  );
}

function useOnboarding() {
  const navigate = useNavigate();
  const search: OnboardingSearch = Route.useSearch();
  const { step, local } = search;
  const isLinux = useIsLinux();

  const steps = useMemo(() => {
    if (isLinux) {
      return ALL_STEPS.filter((s) => s !== "permissions");
    }
    return [...ALL_STEPS];
  }, [isLinux]);

  const stepIndex = steps.indexOf(step);

  const previous = stepIndex > 0 ? steps[stepIndex - 1] : undefined;

  const next =
    stepIndex >= 0 && stepIndex < steps.length - 1
      ? steps[stepIndex + 1]
      : undefined;

  const goPrevious = useCallback(() => {
    if (!previous) {
      return;
    }

    navigate({ to: "/app/onboarding", search: { ...search, step: previous } });
  }, [navigate, previous, search]);

  const goNext = useCallback<OnboardingNext>(
    (params) => {
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
    },
    [navigate, next, search],
  );

  return {
    step,
    local,
    previous,
    next,
    goNext,
    goPrevious,
  };
}
