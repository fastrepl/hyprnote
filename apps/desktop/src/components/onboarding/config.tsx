import type { ComponentType } from "react";

import type { Search } from "../../routes/app/onboarding";
import { ConfigureNotice, STEP_ID_CONFIGURE_NOTICE } from "./configure-notice";
import { Login, STEP_ID_LOGIN } from "./login";
import { Permissions, STEP_ID_PERMISSIONS } from "./permissions";
import { STEP_ID_WELCOME, Welcome } from "./welcome";

export type NavigateTarget = Omit<Search, "step"> & {
  step: Search["step"] | "done";
};

export type StepProps = {
  onNavigate: (ctx: NavigateTarget) => void;
};

export function getNext(ctx: Search): Search["step"] | "done" {
  switch (ctx.step) {
    case STEP_ID_WELCOME:
      if (ctx.local) return STEP_ID_CONFIGURE_NOTICE;
      if (ctx.platform === "macos") return STEP_ID_PERMISSIONS;
      return STEP_ID_LOGIN;
    case STEP_ID_PERMISSIONS:
      return ctx.local ? STEP_ID_CONFIGURE_NOTICE : STEP_ID_LOGIN;
    case STEP_ID_LOGIN:
      return ctx.pro ? "done" : STEP_ID_CONFIGURE_NOTICE;
    case STEP_ID_CONFIGURE_NOTICE:
      return "done";
  }
}

export function getBack(ctx: Search): Search["step"] | null {
  switch (ctx.step) {
    case STEP_ID_WELCOME:
      return null;
    case STEP_ID_PERMISSIONS:
      return STEP_ID_WELCOME;
    case STEP_ID_LOGIN:
      return ctx.platform === "macos" ? STEP_ID_PERMISSIONS : STEP_ID_WELCOME;
    case STEP_ID_CONFIGURE_NOTICE:
      if (ctx.local) return STEP_ID_WELCOME;
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
  STEP_ID_CONFIGURE_NOTICE,
  STEP_ID_PERMISSIONS,
] as const;

export const STEP_CONFIGS: StepConfig[] = [
  { id: STEP_ID_WELCOME, component: Welcome },
  { id: STEP_ID_LOGIN, component: Login },
  { id: STEP_ID_CONFIGURE_NOTICE, component: ConfigureNotice },
  { id: STEP_ID_PERMISSIONS, component: Permissions },
];
