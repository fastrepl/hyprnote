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

type StepConfig = {
  id: OnboardingStepId;
  component: ComponentType<{
    onNavigate: (step: OnboardingStepId | "done") => void;
  }>;
};

export const STEP_CONFIGS: StepConfig[] = [
  { id: "welcome", component: Welcome },
  { id: "login", component: Login },
  { id: "configure-notice", component: ConfigureNotice },
  { id: "permissions", component: Permissions },
];
