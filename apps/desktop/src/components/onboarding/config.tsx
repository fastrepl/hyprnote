import { useQuery } from "@tanstack/react-query";
import { arch, platform, type Platform } from "@tauri-apps/plugin-os";
import type { ComponentType } from "react";

import { useAuth } from "../../auth";
import { ConfigureNotice } from "./configure-notice";
import { Login } from "./login";
import { Permissions } from "./permissions";
import type { OnboardingNext } from "./shared";
import { Welcome } from "./welcome";

export type OnboardingStepId =
  | "welcome"
  | "login"
  | "configure-notice"
  | "permissions";

export type OnboardingContext = {
  platform: Platform;
  isAppleSilicon: boolean;
  isLoggedIn: boolean;
  local: boolean;
  flags: {
    calendarReady: boolean;
  };
};

export type OnboardingStepConfig = {
  id: OnboardingStepId;
  shouldShow: (ctx: OnboardingContext) => boolean;
  component: ComponentType<{ onNext: OnboardingNext; onBack?: () => void }>;
};

export function getPreviousStep(
  ctx: OnboardingContext,
  currentStep: OnboardingStepId,
): OnboardingStepId | null {
  const visibleSteps = STEP_CONFIGS.filter((s) => s.shouldShow(ctx));
  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep);
  return visibleSteps[currentIndex - 1]?.id ?? null;
}

export const STEP_CONFIGS: OnboardingStepConfig[] = [
  {
    id: "welcome",
    shouldShow: () => true,
    component: Welcome,
  },
  {
    id: "login",
    shouldShow: (ctx) => !ctx.local,
    component: Login,
  },
  {
    id: "configure-notice",
    shouldShow: (ctx) => ctx.local,
    component: ConfigureNotice,
  },
  {
    id: "permissions",
    shouldShow: (ctx) => ctx.platform === "macos",
    component: Permissions,
  },
];

export function useOnboardingContext(
  local?: boolean,
): OnboardingContext | null {
  const currentPlatform = platform();
  const auth = useAuth();
  const archQuery = useQuery({
    queryKey: ["arch"],
    queryFn: () => arch(),
  });

  if (archQuery.isPending) {
    return null;
  }

  const isAppleSilicon =
    currentPlatform === "macos" && archQuery.data === "aarch64";

  return {
    platform: currentPlatform,
    isAppleSilicon,
    isLoggedIn: auth?.session !== null,
    local: local ?? false,
    flags: {
      calendarReady: false,
    },
  };
}
