import { cn } from "@hypr/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  preventClose?: boolean;
}

export function BottomSheet({
  open,
  onClose,
  children,
  className,
  preventClose = false,
}: BottomSheetProps) {
  React.useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open && !preventClose) {
        event.preventDefault();
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscapeKey, true);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey, true);
    };
  }, [open, preventClose, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-white/70 backdrop-blur-sm"
            aria-hidden="true"
            onClick={preventClose ? undefined : onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "rounded-t-lg shadow-lg border-t overflow-clip",
              className,
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface BottomSheetContentProps {
  children: React.ReactNode;
  className?: string;
}

export function BottomSheetContent({
  children,
  className,
}: BottomSheetContentProps) {
  return (
    <div className={cn("p-4", className)}>
      {children}
    </div>
  );
}

interface BottomSheetTriggerProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export function BottomSheetTrigger({
  children,
  onClick,
  className,
}: BottomSheetTriggerProps) {
  return (
    <div
      onClick={onClick}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </div>
  );
}
