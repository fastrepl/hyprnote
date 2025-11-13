import { AudioLinesIcon, SparklesIcon } from "lucide-react";

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
        icon: <AudioLinesIcon className="size-5" />,
        title: "Configure STT model",
        description: "Speech-to-text model is needed to make Hyprnote listen to your conversations",
        primaryAction: {
          label: "Go to settings",
          onClick: onOpenSTTSettings,
        },
        dismissible: false,
      },
      condition: () => !hasSttConfigured,
    },
    {
      banner: {
        id: "missing-llm",
        icon: <SparklesIcon className="size-5" />,
        title: "Configure LLM",
        description: "Language model is needed to make Hyprnote summarize and chat about your conversations",
        primaryAction: {
          label: "Go to settings",
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
