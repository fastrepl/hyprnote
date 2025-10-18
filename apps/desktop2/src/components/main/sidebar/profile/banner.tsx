import { X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";

export function TryProBanner({ isDismissed, onDismiss }: { isDismissed: boolean; onDismiss: () => void }) {
  const handleDismiss = () => {
    onDismiss();
  };

  const handleSignUp = () => {};

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
            "py-2 px-1",
            "overflow-hidden",
          ])}
        >
          <div
            className={cn([
              "relative rounded-lg overflow-hidden",
              "bg-white border border-gray-200 shadow-sm",
            ])}
          >
            <div className="relative p-5">
              <button
                onClick={handleDismiss}
                className={cn([
                  "absolute top-2.5 right-2.5",
                  "p-1.5 rounded-md",
                  "text-gray-400 hover:text-gray-600",
                  "hover:bg-gray-100/80",
                  "transition-colors duration-200",
                ])}
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3.5 mb-5">
                <div
                  className={cn([
                    "flex-shrink-0 w-11 h-11 rounded-xl",
                    "bg-gray-900",
                    "flex items-center justify-center",
                  ])}
                >
                  <Zap className="w-5 h-5 text-white fill-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className={cn([
                      "text-base font-bold text-gray-900",
                      "mb-1.5",
                    ])}
                  >
                    Try Hyprnote Pro
                  </h3>
                  <p
                    className={cn([
                      "text-xs text-gray-600 leading-relaxed",
                    ])}
                  >
                    Experience smarter meetings
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSignUp}
                className={cn([
                  "w-full h-9",
                  "bg-black hover:bg-gray-800",
                  "text-sm font-medium text-white",
                ])}
              >
                Start 2 week Free Trial
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
