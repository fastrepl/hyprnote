import type { ComponentType } from "react";

import type { Search } from "../../routes/app/onboarding/_layout.index";
import { Login, STEP_ID_LOGIN } from "./login";
import { Permissions, STEP_ID_PERMISSIONS } from "./permissions";
import { STEP_ID_WELCOME, Welcome } from "./welcome";

export type NavigateTarget = Search;

export type StepProps = {
  onNavigate: (ctx: NavigateTarget) => void;
};

export function getNext(ctx: Search): Search["step"] | null {
  switch (ctx.step) {
    case STEP_ID_WELCOME:
      return STEP_ID_LOGIN;
    case STEP_ID_LOGIN:
      return ctx.platform === "macos" ? STEP_ID_PERMISSIONS : null;
    case STEP_ID_PERMISSIONS:
      return null;
  }
}

export function getBack(ctx: Search): Search["step"] | null {
  switch (ctx.step) {
    case STEP_ID_WELCOME:
      return null;
    case STEP_ID_LOGIN:
      return STEP_ID_WELCOME;
    case STEP_ID_PERMISSIONS:
      return STEP_ID_LOGIN;
  }
}

type StepConfig = {
  id: Search["step"];
  component: ComponentType<StepProps>;
};

export const STEP_IDS = [
  STEP_ID_WELCOME,
  STEP_ID_LOGIN,
  STEP_ID_PERMISSIONS,
] as const;

export const STEP_CONFIGS: StepConfig[] = [
  { id: STEP_ID_WELCOME, component: Welcome },
  { id: STEP_ID_LOGIN, component: Login },
  { id: STEP_ID_PERMISSIONS, component: Permissions },
];
