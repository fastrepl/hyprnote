import { useQuery } from "@tanstack/react-query";
import { arch, type Platform } from "@tauri-apps/plugin-os";
import type { ComponentType } from "react";

import { useAuth } from "../../auth";
import { usePlatform } from "../../hooks/usePlatform";
import { Login } from "./login";
import { ModelDownload } from "./model";
import { Permissions } from "./permissions";
import type { OnboardingNext } from "./shared";
import { Welcome } from "./welcome";

export type OnboardingStepId = "welcome" | "permissions" | "login" | "model";

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
  component: ComponentType<{ onNext: OnboardingNext }>;
};

export const STEP_CONFIGS: OnboardingStepConfig[] = [
  {
    id: "welcome",
    shouldShow: () => true,
    component: Welcome,
  },
  {
    id: "permissions",
    shouldShow: (ctx) => ctx.platform === "macos",
    component: Permissions,
  },
  {
    id: "login",
    shouldShow: (ctx) => !ctx.local,
    component: Login,
  },
  {
    id: "model",
    shouldShow: (ctx) => ctx.local && ctx.isAppleSilicon,
    component: ModelDownload,
  },
];

export function useOnboardingContext(
  local?: boolean,
): OnboardingContext | null {
  const platform = usePlatform();
  const auth = useAuth();
  const archQuery = useQuery({
    queryKey: ["arch"],
    queryFn: () => arch(),
  });

  if (archQuery.isPending) {
    return null;
  }

  return {
    platform,
    isAppleSilicon: platform === "macos" && archQuery.data === "aarch64",
    isLoggedIn: auth?.session !== null,
    local: local ?? false,
    flags: {
      calendarReady: false,
    },
  };
}
