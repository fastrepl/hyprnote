import { Brain, Cloud, ExternalLink, Puzzle, Sparkle, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";

import { cn } from "@hypr/utils";

type TrialBeginModalStore = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useTrialBeginModal = create<TrialBeginModalStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

export function TrialBeginModal() {
  const { isOpen, close } = useTrialBeginModal();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, close]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
        onClick={close}
      >
        <div
          data-tauri-drag-region
          className="w-full min-h-11"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn([
            "relative w-full max-w-lg max-h-full overflow-auto",
            "bg-background rounded-lg shadow-lg pointer-events-auto",
          ])}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={close}
            className="absolute right-6 top-6 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center gap-10 p-10 text-center">
            <div className="flex flex-col gap-3">
              <h2 className="font-serif text-3xl font-semibold">
                Welcome to Pro!
              </h2>
              <p className="text-muted-foreground">
                Your free trial has started.
                <br />
                Here's what you now have access to
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 max-w-md">
              {[
                { label: "Pro AI models", icon: Sparkle },
                { label: "Cloud sync", icon: Cloud },
                { label: "Memory", icon: Brain },
                { label: "Integrations", icon: Puzzle },
                { label: "Shareable links", icon: ExternalLink },
              ].map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className={cn([
                    "rounded-full border border-border bg-secondary/50 px-4 py-2 text-[12px] text-secondary-foreground",
                    "flex items-center gap-2",
                  ])}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
              ))}
            </div>

            <button
              onClick={close}
              className="px-6 py-2 rounded-full bg-gradient-to-t from-stone-600 to-stone-500 text-white text-sm font-medium transition-opacity duration-150 hover:opacity-90"
            >
              Let's go!
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
