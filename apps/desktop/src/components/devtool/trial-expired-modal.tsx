import { Brain, Cloud, Puzzle, Sparkle, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";

import { cn } from "@hypr/utils";

import { useBillingAccess } from "../../billing";
import * as settings from "../../store/tinybase/store/settings";

type TrialExpiredModalStore = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useTrialExpiredModal = create<TrialExpiredModalStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

export function TrialExpiredModal() {
  const { isOpen, close } = useTrialExpiredModal();
  const { upgradeToPro } = useBillingAccess();
  const store = settings.UI.useStore(settings.STORE_ID);

  const handleUpgrade = () => {
    upgradeToPro();
    close();
  };

  const handleDismiss = () => {
    store?.setValue("trial_expired_modal_dismissed_at", Date.now());
    close();
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape, true);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-xs">
        <div
          data-tauri-drag-region
          className="w-full min-h-11"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn([
            "relative w-full max-w-lg max-h-full overflow-auto",
            "bg-background rounded-lg shadow-lg pointer-events-auto",
          ])}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDismiss}
            className="absolute right-6 top-6 z-10 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center gap-10 p-10 text-center">
            <div className="flex flex-col gap-3">
              <h2 className="font-serif text-3xl font-semibold">
                Your free trial is over
              </h2>
              <p className="text-muted-foreground">
                Here's what you just lost access to
              </p>
            </div>

            <div className="flex gap-3 justify-center overflow-x-auto scrollbar-hide">
              {[
                { label: "Pro AI models", icon: Sparkle, comingSoon: false },
                { label: "Cloud sync", icon: Cloud, comingSoon: true },
                { label: "Memory", icon: Brain, comingSoon: true },
                { label: "Integrations", icon: Puzzle, comingSoon: true },
              ].map(({ label, icon: Icon, comingSoon }) => (
                <div
                  key={label}
                  className="relative overflow-hidden flex flex-col items-center justify-center gap-2 w-20 h-20 shrink-0 rounded-lg bg-linear-to-b from-white to-stone-50 border border-neutral-200 text-neutral-600"
                >
                  {comingSoon && (
                    <span className="absolute top-0 px-1.5 py-0.5 text-[10px] rounded-b bg-neutral-200 text-neutral-500 opacity-50">
                      Soon
                    </span>
                  )}
                  <Icon className="h-5 w-5" />
                  <span className="text-xs text-center leading-tight">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleUpgrade}
                className="px-6 h-[42px] rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white text-sm font-mono transition-opacity duration-150 hover:opacity-90"
              >
                I'd like to keep using <span className="font-serif">Pro</span>
              </button>
              <button
                onClick={handleDismiss}
                className="text-sm text-muted-foreground transition-opacity duration-150 hover:opacity-70"
              >
                dismiss for a week
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
