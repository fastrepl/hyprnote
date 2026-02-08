import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { platform } from "@tauri-apps/plugin-os";
import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as sfxCommands } from "@hypr/plugin-sfx";

import {
  type NavigateTarget,
  STEP_CONFIGS,
  STEP_IDS,
} from "../../../components/onboarding/config";

const validateSearch = z.object({
  step: z.enum(STEP_IDS).default("welcome"),
  platform: z.string().default(platform()),
  skipLogin: z.boolean().optional(),
});

export type Search = z.infer<typeof validateSearch>;

export const Route = createFileRoute("/app/onboarding/_layout/")({
  validateSearch,
  component: Component,
});

function Component() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    void analyticsCommands.event({
      event: "onboarding_step_viewed",
      step: search.step,
      platform: search.platform,
      skip_login: search.skipLogin ?? false,
    });
  }, [search.step]);

  useEffect(() => {
    sfxCommands.play("BGM").catch(console.error);
    return () => {
      sfxCommands.stop("BGM").catch(console.error);
    };
  }, []);

  useEffect(() => {
    sfxCommands.setVolume("BGM", isMuted ? 0 : 1).catch(console.error);
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const onNavigate = useCallback(
    (ctx: NavigateTarget) => {
      const { step, ...rest } = ctx;
      void navigate({ to: "/app/onboarding", search: { step, ...rest } });
    },
    [navigate],
  );

  const currentConfig = STEP_CONFIGS.find((s) => s.id === search.step);
  if (!currentConfig) {
    return null;
  }

  return (
    <div className="flex flex-col h-full relative items-center justify-center p-8">
      <div
        data-tauri-drag-region
        className="h-14 w-full absolute top-0 left-0 right-0"
      />
      <button
        onClick={toggleMute}
        className="fixed top-2 right-2 p-1.5 rounded-full hover:bg-muted transition-colors z-10"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeXIcon size={16} className="text-muted-foreground" />
        ) : (
          <Volume2Icon size={16} className="text-muted-foreground" />
        )}
      </button>
      <currentConfig.component onNavigate={onNavigate} />
    </div>
  );
}
