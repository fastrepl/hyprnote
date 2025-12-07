import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { z } from "zod";

import { commands as windowsCommands } from "@hypr/plugin-windows";

import {
  type OnboardingStepId,
  STEP_CONFIGS,
  useOnboardingContext,
} from "../../../components/onboarding/config";
import type { OnboardingNext } from "../../../components/onboarding/shared";
import { commands } from "../../../types/tauri.gen";

const ALL_STEP_IDS = STEP_CONFIGS.map((s) => s.id) as [
  OnboardingStepId,
  ...OnboardingStepId[],
];

const validateSearch = z.object({
  step: z.enum(ALL_STEP_IDS).default("welcome"),
  local: z.boolean().default(false),
});

export const Route = createFileRoute("/app/onboarding/")({
  validateSearch,
  component: Component,
});

function Component() {
  const navigate = useNavigate();
  const { step, local } = Route.useSearch();
  const ctx = useOnboardingContext(local);

  const visibleSteps = useMemo(() => {
    if (!ctx) {
      return [];
    }
    return STEP_CONFIGS.filter((s) => s.shouldShow(ctx));
  }, [ctx]);

  const currentIndex = visibleSteps.findIndex((s) => s.id === step);
  const currentConfig = visibleSteps[currentIndex];

  const goNext = useCallback<OnboardingNext>(
    (params) => {
      if (!ctx) {
        return;
      }

      const nextLocal = params?.local ?? local;
      const nextCtx = { ...ctx, local: nextLocal };
      const nextVisibleSteps = STEP_CONFIGS.filter((s) =>
        s.shouldShow(nextCtx),
      );
      const nextCurrentIndex = nextVisibleSteps.findIndex((s) => s.id === step);
      const nextStep = nextVisibleSteps[nextCurrentIndex + 1];

      if (nextStep) {
        navigate({
          to: "/app/onboarding",
          search: { step: nextStep.id, local: nextLocal },
        });
        return;
      }

      commands.setOnboardingNeeded(false).catch((e) => console.error(e));
      windowsCommands.windowShow({ type: "main" }).then(() => {
        windowsCommands.windowDestroy({ type: "onboarding" });
      });
    },
    [ctx, navigate, step, local],
  );

  if (!ctx || !currentConfig) {
    return (
      <div className="flex flex-col h-full relative items-center justify-center p-8">
        <div
          data-tauri-drag-region
          className="h-14 w-full absolute top-0 left-0 right-0"
        />
      </div>
    );
  }

  const StepComponent = currentConfig.component;

  return (
    <div className="flex flex-col h-full relative items-center justify-center p-8">
      <div
        data-tauri-drag-region
        className="h-14 w-full absolute top-0 left-0 right-0"
      />
      <StepComponent onNext={goNext} />
    </div>
  );
}
