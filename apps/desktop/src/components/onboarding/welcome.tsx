import { platform } from "@tauri-apps/plugin-os";
import { memo, useCallback, useEffect } from "react";

import { commands as sfxCommands } from "@hypr/plugin-sfx";
import { commands as windowsCommands } from "@hypr/plugin-windows";

import { usePermissions } from "../../hooks/usePermissions";
import { Route } from "../../routes/app/onboarding/_layout.index";
import { commands } from "../../types/tauri.gen";
import { getNext, type StepProps } from "./config";
import { STEP_ID_PERMISSIONS } from "./permissions";

export const STEP_ID_WELCOME = "welcome" as const;

async function finishOnboarding() {
  await sfxCommands.stop("BGM").catch(console.error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await commands.setOnboardingNeeded(false).catch(console.error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await windowsCommands.windowShow({ type: "main" });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await windowsCommands.windowDestroy({ type: "onboarding" });
}

export const Welcome = memo(function Welcome({ onNavigate }: StepProps) {
  const search = Route.useSearch();

  const {
    micPermissionStatus,
    systemAudioPermissionStatus,
    accessibilityPermissionStatus,
  } = usePermissions();

  const allPermissionsGranted =
    platform() === "macos" &&
    micPermissionStatus.data === "authorized" &&
    systemAudioPermissionStatus.data === "authorized" &&
    accessibilityPermissionStatus.data === "authorized";

  useEffect(() => {
    if (allPermissionsGranted && !search.skipAutoForward) {
      void finishOnboarding();
    }
  }, [allPermissionsGranted, search.skipAutoForward]);

  const handleClickGetStarted = useCallback(async () => {
    await commands.setOnboardingLocal(false);
    onNavigate({ ...search, step: getNext(search)! });
  }, [onNavigate, search]);

  const handleProceedWithoutAccount = useCallback(async () => {
    await commands.setOnboardingLocal(false);
    if (platform() === "macos") {
      onNavigate({ ...search, step: STEP_ID_PERMISSIONS });
    } else {
      void finishOnboarding();
    }
  }, [onNavigate, search]);

  return (
    <>
      <img
        src="/assets/logo.svg"
        alt="HYPRNOTE"
        className="mb-6 w-[300px]"
        draggable={false}
      />

      <p className="mb-16 text-center text-xl font-medium text-neutral-600">
        Where Conversations Stay Yours
      </p>

      <div className="flex flex-col items-center gap-2 w-full">
        <button
          onClick={handleClickGetStarted}
          className="w-full py-3 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
        >
          Get Started
        </button>
        <button
          onClick={handleProceedWithoutAccount}
          className="text-sm text-neutral-500 transition-opacity duration-150 hover:opacity-70"
        >
          proceed without account
        </button>
      </div>
    </>
  );
});
