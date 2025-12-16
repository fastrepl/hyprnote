import type { BannerCondition, BannerType } from "./types";

type BannerRegistryEntry = {
  banner: BannerType;
  condition: BannerCondition;
};

type BannerRegistryParams = {
  isAuthenticated: boolean;
  hasLLMConfigured: boolean;
  hasSttConfigured: boolean;
  isAiTranscriptionTabActive: boolean;
  isAiIntelligenceTabActive: boolean;
  onSignIn: () => void | Promise<void>;
  onOpenLLMSettings: () => void;
  onOpenSTTSettings: () => void;
};

export function createBannerRegistry({
  isAuthenticated,
  hasLLMConfigured,
  hasSttConfigured,
  isAiTranscriptionTabActive,
  isAiIntelligenceTabActive,
  onSignIn,
  onOpenLLMSettings,
  onOpenSTTSettings,
}: BannerRegistryParams): BannerRegistryEntry[] {
  // order matters
  return [
    {
      banner: {
        id: "missing-stt",
        description: (
          <>
            <strong className="font-mono">Transcription model</strong> is needed to make Hyprnote
            listen to your conversations.
          </>
        ),
        primaryAction: {
          label: "Configure transcription",
          onClick: onOpenSTTSettings,
        },
        dismissible: false,
      },
      condition: () => !hasSttConfigured && !isAiTranscriptionTabActive,
    },
    {
      banner: {
        id: "missing-llm",
        description: (
          <>
            <strong className="font-mono">Language model</strong> is needed to make Hyprnote
            summarize and chat about your conversations.
          </>
        ),
        primaryAction: {
          label: "Add intelligence",
          onClick: onOpenLLMSettings,
        },
        dismissible: false,
      },
      condition: () => hasSttConfigured && !hasLLMConfigured && !isAiIntelligenceTabActive,
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
