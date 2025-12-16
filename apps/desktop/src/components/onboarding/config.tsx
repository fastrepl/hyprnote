import type { ComponentType } from "react";

import { ConfigureNotice } from "./configure-notice";
import { Login } from "./login";
import { Permissions } from "./permissions";
import { Welcome } from "./welcome";

export type OnboardingStepId =
  | "welcome"
  | "login"
  | "configure-notice"
  | "permissions";

export type StepProps = {
  onNavigate: (step: OnboardingStepId | "done") => void;
};

export function getNextAfterLogin(
  platform: string,
  isPro: boolean,
): OnboardingStepId | "done" {
  if (!isPro) {
    return "configure-notice";
  }
  return platform === "macos" ? "permissions" : "done";
}

export function getNextAfterConfigureNotice(
  platform: string,
): OnboardingStepId | "done" {
  return platform === "macos" ? "permissions" : "done";
}

type StepConfig = {
  id: OnboardingStepId;
  component: ComponentType<StepProps>;
};

export const STEP_CONFIGS: StepConfig[] = [
  { id: "welcome", component: Welcome },
  { id: "login", component: Login },
  { id: "configure-notice", component: ConfigureNotice },
  { id: "permissions", component: Permissions },
];
