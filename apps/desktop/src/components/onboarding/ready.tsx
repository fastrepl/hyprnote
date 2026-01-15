import { CheckCircle2Icon } from "lucide-react";

import { commands as sfxCommands } from "@hypr/plugin-sfx";
import { commands as windowsCommands } from "@hypr/plugin-windows";

import { commands } from "../../types/tauri.gen";
import { OnboardingContainer } from "./shared";

export const STEP_ID_READY = "ready" as const;

export function Ready() {
  return (
    <OnboardingContainer
      title="You're all set!"
      description="Everything is configured and ready to go"
    >
      <div className="flex justify-center py-4">
        <CheckCircle2Icon size={64} className="text-emerald-500" />
      </div>

      <button
        onClick={() => void finishOnboarding()}
        className="w-full py-3 rounded-full bg-linear-to-t from-neutral-800 to-neutral-700 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
      >
        Get Started
      </button>
    </OnboardingContainer>
  );
}

async function finishOnboarding() {
  await sfxCommands.stop("BGM").catch(console.error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await commands.setOnboardingNeeded(false).catch(console.error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await windowsCommands.windowShow({ type: "main" });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await windowsCommands.windowDestroy({ type: "onboarding" });
}
