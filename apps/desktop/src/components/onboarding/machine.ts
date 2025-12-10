import { fromTransition } from "xstate";

import {
  type OnboardingContext,
  type OnboardingStepId,
  STEP_CONFIGS,
} from "./config";

export type OnboardingState = {
  step: OnboardingStepId;
  local: boolean;
  done: boolean;
};

export type OnboardingEvent =
  | { type: "NEXT"; local?: boolean }
  | { type: "GO_TO"; step: OnboardingStepId; local?: boolean };

function getNextStep(
  ctx: OnboardingContext,
  currentStep: OnboardingStepId,
): OnboardingStepId | null {
  const visibleSteps = STEP_CONFIGS.filter((s) => s.shouldShow(ctx));
  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep);
  return visibleSteps[currentIndex + 1]?.id ?? null;
}

export function createOnboardingLogic(
  ctx: OnboardingContext,
  initialStep: OnboardingStepId,
  initialLocal: boolean,
) {
  return fromTransition(
    (state: OnboardingState, event: OnboardingEvent): OnboardingState => {
      const nextLocal = event.local ?? state.local;
      const mergedCtx = { ...ctx, local: nextLocal };

      if (event.type === "GO_TO") {
        return { step: event.step, local: nextLocal, done: false };
      }

      const nextStep = getNextStep(mergedCtx, state.step);
      if (nextStep) {
        return { step: nextStep, local: nextLocal, done: false };
      }
      return { ...state, local: nextLocal, done: true };
    },
    { step: initialStep, local: initialLocal, done: false },
  );
}
