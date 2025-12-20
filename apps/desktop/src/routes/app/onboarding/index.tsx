import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { platform } from "@tauri-apps/plugin-os";
import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { commands as sfxCommands } from "@hypr/plugin-sfx";
import { commands as windowsCommands } from "@hypr/plugin-windows";

import {
  type NavigateTarget,
  STEP_CONFIGS,
  STEP_IDS,
} from "../../../components/onboarding/config";
import { commands } from "../../../types/tauri.gen";

const validateSearch = z.object({
  step: z.enum(STEP_IDS).default("welcome"),
  local: z.boolean().default(false),
  pro: z.boolean().default(false),
  platform: z.string().default(platform()),
});

export type Search = z.infer<typeof validateSearch>;

export const Route = createFileRoute("/app/onboarding/")({
  validateSearch,
  component: Component,
});

function finishOnboarding() {
  sfxCommands
    .stop("BGM")
    .catch((e) => console.error("sfx: BGM finish stop failed", e));
  commands.setOnboardingNeeded(false).catch((e) => console.error(e));
  void windowsCommands.windowShow({ type: "main" }).then(() => {
    void windowsCommands.windowDestroy({ type: "onboarding" });
  });
}

function Component() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!isMuted) {
      sfxCommands
        .play("BGM")
        .then(() => console.log("sfx: BGM play command succeeded"))
        .catch((e) => console.error("sfx: BGM play failed", e));
    } else {
      sfxCommands
        .stop("BGM")
        .catch((e) => console.error("sfx: BGM stop failed", e));
    }
    return () => {
      sfxCommands
        .stop("BGM")
        .catch((e) => console.error("sfx: BGM cleanup stop failed", e));
    };
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const onNavigate = useCallback(
    (ctx: NavigateTarget) => {
      const { step, ...rest } = ctx;
      if (step === "done") {
        finishOnboarding();
      } else {
        void navigate({ to: "/app/onboarding", search: { step, ...rest } });
      }
    },
    [navigate],
  );

  const currentConfig = STEP_CONFIGS.find((s) => s.id === search.step);
  if (!currentConfig) {
    return null;
  }

  const StepComponent = currentConfig.component;

  return (
    <div className="flex flex-col h-full relative items-center justify-center p-8">
      <div
        data-tauri-drag-region
        className="h-14 w-full absolute top-0 left-0 right-0"
      />
      <button
        onClick={toggleMute}
        className="fixed top-2 right-2 p-1.5 rounded-full hover:bg-neutral-100 transition-colors z-10"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeXIcon size={16} className="text-neutral-600" />
        ) : (
          <Volume2Icon size={16} className="text-neutral-600" />
        )}
      </button>
      <StepComponent onNavigate={onNavigate} />
    </div>
  );
}
