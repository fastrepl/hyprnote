import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";

export function TryProBanner({ isDismissed, onDismiss }: { isDismissed: boolean; onDismiss: () => void }) {
  const handleDismiss = () => {
    onDismiss();
  };

  const handleSignUp = () => { };

  return (
    <AnimatePresence mode="wait">
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 1, height: "auto", y: 0, scale: 1 }}
          animate={{ opacity: 1, height: "auto", y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            height: 0,
            y: 20,
            scale: 0.95,
            transition: { duration: 0.3, ease: "easeInOut" },
          }}
          className={cn([
            "overflow-hidden",
            "px-1 py-2",
          ])}
        >
          <div
            className={cn([
              "relative group overflow-hidden rounded-lg",
              "flex flex-col gap-3",
              "bg-white border border-gray-200 shadow-sm p-4",
            ])}
          >
            <Button
              onClick={handleDismiss}
              size="icon"
              variant="ghost"
              aria-label="Dismiss banner"
              className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-4">
              <img src="/assets/hyprnote-pro.png" alt="Hyprnote Pro" className="size-6" />
              <h3 className="text-lg font-bold text-gray-900">
                Try Hyprnote Pro
              </h3>
            </div>

            <p className="text-sm">
              Sign up now and experience smarter meetings with a 1-week free trial of Hyprnote Pro.
            </p>

            <Button
              onClick={handleSignUp}
              className="w-full"
            >
              Start 1 week Free Trial
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
