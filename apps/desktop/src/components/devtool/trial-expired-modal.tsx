import { X } from "lucide-react";
import { create } from "zustand";

import { Modal } from "@hypr/ui/components/ui/modal";
import { cn } from "@hypr/utils";

import { useBillingAccess } from "../../billing";

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

  const handleUpgrade = () => {
    upgradeToPro();
    close();
  };

  return (
    <Modal open={isOpen} onClose={close} preventClose size="lg">
      <div className="relative flex flex-col">
        <button
          onClick={close}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-8 p-12 text-center">
          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-3xl font-semibold">
              Your free trial is over
            </h2>
            <p className="text-muted-foreground">
              You can keep using Hyprnote for free,
              <br />
              but here's what you'll be losing
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Pro AI models",
              "Cloud sync",
              "Memory",
              "Integrations",
              "Shareable links",
            ].map((feature) => (
              <div
                key={feature}
                className={cn([
                  "rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm text-secondary-foreground",
                ])}
              >
                {feature}
              </div>
            ))}
          </div>

          <button
            onClick={handleUpgrade}
            className={cn([
              "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-8 text-sm font-medium",
              "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow",
              "transition-all hover:opacity-90",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            ])}
          >
            I'd like to keep using <span className="font-serif">Pro</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
