import type { ToastCondition, ToastType } from "./types";

type ToastRegistryEntry = {
  toast: ToastType;
  condition: ToastCondition;
};

type ToastRegistryParams = {
  isAuthenticated: boolean;
  hasLLMConfigured: boolean;
  hasSttConfigured: boolean;
  isAiTranscriptionTabActive: boolean;
  isAiIntelligenceTabActive: boolean;
  onSignIn: () => void | Promise<void>;
  onOpenLLMSettings: () => void;
  onOpenSTTSettings: () => void;
};

export function createToastRegistry({
  isAuthenticated,
  hasLLMConfigured,
  hasSttConfigured,
  isAiTranscriptionTabActive,
  isAiIntelligenceTabActive,
  onSignIn,
  onOpenLLMSettings,
  onOpenSTTSettings,
}: ToastRegistryParams): ToastRegistryEntry[] {
  // order matters
  return [
    {
      toast: {
        id: "missing-stt",
        description: (
          <>
            <strong className="font-mono">Transcription model</strong> is needed
            to make Hyprnote listen to your conversations.
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
      toast: {
        id: "missing-llm",
        description: (
          <>
            <strong className="font-mono">Language model</strong> is needed to
            make Hyprnote summarize and chat about your conversations.
          </>
        ),
        primaryAction: {
          label: "Add intelligence",
          onClick: onOpenLLMSettings,
        },
        dismissible: false,
      },
      condition: () =>
        hasSttConfigured && !hasLLMConfigured && !isAiIntelligenceTabActive,
    },
    {
      toast: {
        id: "upgrade-to-pro",
        icon: (
          <img
            src="/assets/hyprnote-pro.png"
            alt="Hyprnote Pro"
            className="size-5"
          />
        ),
        title: "Keep the magic going",
        description:
          "Transcription stays free. Pro unlocks other magic you'll love.",
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

export function getToastToShow(
  registry: ToastRegistryEntry[],
  isDismissed: (id: string) => boolean,
): ToastType | null {
  for (const entry of registry) {
    if (entry.condition() && !isDismissed(entry.toast.id)) {
      return entry.toast;
    }
  }
  return null;
}
