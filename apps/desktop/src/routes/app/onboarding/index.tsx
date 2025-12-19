import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { platform } from "@tauri-apps/plugin-os";
import { useCallback } from "react";
import { z } from "zod";

import { commands as windowsCommands } from "@hypr/plugin-windows";

import {
  type NavigateTarget,
  STEP_CONFIGS,
  STEP_IDS,
} from "../../../components/onboarding/config";
import { commands } from "../../../types/tauri.gen";

const validateSearch = z.object({
  step: z.enum(STEP_IDS).default("welcome"),
  local: z.boolean().default(false),
  pro: z.boolean().default(false),
  platform: z.string().default(platform()),
});

export type Search = z.infer<typeof validateSearch>;

export const Route = createFileRoute("/app/onboarding/")({
  validateSearch,
  component: Component,
});

function finishOnboarding() {
  commands.setOnboardingNeeded(false).catch((e) => console.error(e));
  void windowsCommands.windowShow({ type: "main" }).then(() => {
    void windowsCommands.windowDestroy({ type: "onboarding" });
  });
}

function Component() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const onNavigate = useCallback(
    (ctx: NavigateTarget) => {
      const { step, ...rest } = ctx;
      if (step === "done") {
        finishOnboarding();
      } else {
        void navigate({ to: "/app/onboarding", search: { step, ...rest } });
      }
    },
    [navigate],
  );

  const currentConfig = STEP_CONFIGS.find((s) => s.id === search.step);
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
