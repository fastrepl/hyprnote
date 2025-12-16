import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";

import { commands as windowsCommands } from "@hypr/plugin-windows";

import {
  type OnboardingStepId,
  STEP_CONFIGS,
} from "../../../components/onboarding/config";
import { commands } from "../../../types/tauri.gen";

const ALL_STEP_IDS = STEP_CONFIGS.map((s) => s.id) as [
  OnboardingStepId,
  ...OnboardingStepId[],
];

const validateSearch = z.object({
  step: z.enum(ALL_STEP_IDS).default("welcome"),
});

export const Route = createFileRoute("/app/onboarding/")({
  validateSearch,
  component: Component,
});

function finishOnboarding() {
  commands.setOnboardingNeeded(false).catch((e) => console.error(e));
  windowsCommands.windowShow({ type: "main" }).then(() => {
    windowsCommands.windowDestroy({ type: "onboarding" });
  });
}

function Component() {
  const { step } = Route.useSearch();
  const navigate = useNavigate();

  const onNavigate = useCallback(
    (target: OnboardingStepId | "done") => {
      if (target === "done") {
        finishOnboarding();
      } else {
        navigate({ to: "/app/onboarding", search: { step: target } });
      }
    },
    [navigate],
  );

  const currentConfig = STEP_CONFIGS.find((s) => s.id === step);
  if (!currentConfig) {
    return null;
  }

  const StepComponent = currentConfig.component;

  return (
    <div className="flex flex-col h-full relative items-center justify-center p-8">
      <div
        data-tauri-drag-region
        className="h-14 w-full absolute top-0 left-0 right-0"
      />
      <StepComponent onNavigate={onNavigate} />
    </div>
  );
}
