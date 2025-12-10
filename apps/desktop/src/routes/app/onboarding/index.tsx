import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useActorRef, useSelector } from "@xstate/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { z } from "zod";

import { commands as windowsCommands } from "@hypr/plugin-windows";

import {
  type OnboardingContext,
  type OnboardingStepId,
  STEP_CONFIGS,
  useOnboardingContext,
} from "../../../components/onboarding/config";
import {
  createOnboardingLogic,
  type OnboardingState,
} from "../../../components/onboarding/machine";
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

function finishOnboarding() {
  commands.setOnboardingNeeded(false).catch((e) => console.error(e));
  windowsCommands.windowShow({ type: "main" }).then(() => {
    windowsCommands.windowDestroy({ type: "onboarding" });
  });
}

function LoadingState() {
  return (
    <div className="flex flex-col h-full relative items-center justify-center p-8">
      <div
        data-tauri-drag-region
        className="h-14 w-full absolute top-0 left-0 right-0"
      />
    </div>
  );
}

function Component() {
  const { step, local } = Route.useSearch();
  const ctx = useOnboardingContext(local);

  if (!ctx) {
    return <LoadingState />;
  }

  return <OnboardingFlow ctx={ctx} initialStep={step} initialLocal={local} />;
}

function OnboardingFlow({
  ctx,
  initialStep,
  initialLocal,
}: {
  ctx: OnboardingContext;
  initialStep: OnboardingStepId;
  initialLocal: boolean;
}) {
  const navigate = useNavigate();

  const logic = useMemo(
    () => createOnboardingLogic(ctx, initialStep, initialLocal),
    [ctx, initialStep, initialLocal],
  );

  const actorRef = useActorRef(logic);
  const state = useSelector(actorRef, (s) => s.context as OnboardingState);
  const prevStateRef = useRef(state);

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;

    if (state.done) {
      finishOnboarding();
      return;
    }

    if (state.step !== prev.step || state.local !== prev.local) {
      navigate({
        to: "/app/onboarding",
        search: { step: state.step, local: state.local },
      });
    }
  }, [state, navigate]);

  const goNext = useCallback<OnboardingNext>(
    (params) => {
      if (params?.step) {
        actorRef.send({
          type: "GO_TO",
          step: params.step as OnboardingStepId,
          local: params.local,
        });
      } else {
        actorRef.send({ type: "NEXT", local: params?.local });
      }
    },
    [actorRef],
  );

  const visibleSteps = useMemo(
    () =>
      STEP_CONFIGS.filter((s) => s.shouldShow({ ...ctx, local: state.local })),
    [ctx, state.local],
  );

  const currentConfig = visibleSteps.find((s) => s.id === state.step);

  if (!currentConfig) {
    return <LoadingState />;
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
