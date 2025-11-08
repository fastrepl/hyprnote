import { CaptionsOffIcon, Zap } from "lucide-react";

import type { BannerCondition, BannerType } from "./types";

type BannerRegistryEntry = {
  banner: BannerType;
  condition: BannerCondition;
};

type BannerRegistryParams = {
  isAuthenticated: boolean;
  hasLLMConfigured: boolean;
  hasSttConfigured: boolean;
  onSignIn: () => void | Promise<void>;
  onOpenLLMSettings: () => void;
  onOpenSTTSettings: () => void;
};

export function createBannerRegistry({
  isAuthenticated,
  hasLLMConfigured,
  hasSttConfigured,
  onSignIn,
  onOpenLLMSettings,
  onOpenSTTSettings,
}: BannerRegistryParams): BannerRegistryEntry[] {
  // order matters
  return [
    {
      banner: {
        id: "missing-stt",
        icon: <CaptionsOffIcon className="size-5" />,
        title: "Missing transcription",
        description: "Needs to be configured to transcribe your meetings.",
        primaryAction: {
          label: "Open AI settings",
          onClick: onOpenSTTSettings,
        },
        dismissible: false,
      },
      condition: () => !hasSttConfigured,
    },
    {
      banner: {
        id: "missing-llm",
        icon: <Zap className="size-5" />,
        title: "Missing intelligence",
        description: "Needs to be configured to get the most out of the transcription.",
        primaryAction: {
          label: "Open AI settings",
          onClick: onOpenLLMSettings,
        },
        dismissible: false,
      },
      condition: () => !hasLLMConfigured,
    },
    {
      banner: {
        id: "upgrade-to-pro",
        icon: <img src="/assets/hyprnote-pro.png" alt="Hyprnote Pro" className="size-5" />,
        title: "Keep the magic going",
        description: "Transcription stays free. Pro unlocks other magic you'll love.",
        primaryAction: {
          label: "Upgrade to Pro",
          onClick: onSignIn,
        },
        dismissible: true,
      },
      condition: () => !isAuthenticated && hasLLMConfigured && hasSttConfigured,
    },
  ];
}

export function getBannerToShow(
  registry: BannerRegistryEntry[],
  isDismissed: (id: string) => boolean,
): BannerType | null {
  for (const entry of registry) {
    if (entry.condition() && !isDismissed(entry.banner.id)) {
      return entry.banner;
    }
  }
  return null;
}
