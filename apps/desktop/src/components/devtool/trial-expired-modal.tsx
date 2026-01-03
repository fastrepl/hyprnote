import { create } from "zustand";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hypr/ui/components/ui/dialog";
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Pro Trial Has Ended</DialogTitle>
          <DialogDescription>
            Your 14-day free trial of Hyprnote Pro has expired. Upgrade now to
            continue using premium features.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="text-green-500">✓</span>
            <span>Unlimited AI-powered transcriptions</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="text-green-500">✓</span>
            <span>Advanced note enhancement</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="text-green-500">✓</span>
            <span>Priority support</span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            type="button"
            onClick={handleUpgrade}
            className={cn([
              "w-full px-4 py-2 rounded-md",
              "text-sm font-medium text-white",
              "bg-blue-600 hover:bg-blue-700",
              "transition-colors cursor-pointer",
            ])}
          >
            Upgrade to Pro
          </button>
          <button
            type="button"
            onClick={close}
            className={cn([
              "w-full px-4 py-2 rounded-md",
              "text-sm font-medium text-neutral-600",
              "hover:bg-neutral-100",
              "transition-colors cursor-pointer",
            ])}
          >
            Continue with Free
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
