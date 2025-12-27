import { AnimatePresence, motion } from "motion/react";

import { cn } from "@hypr/utils";

interface NotificationBadgeProps {
  show: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function NotificationBadge({
  show,
  className,
  size = "sm",
}: NotificationBadgeProps) {
  const sizeClasses = {
    sm: "size-2",
    md: "size-3",
    lg: "size-4",
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "absolute -top-1 -right-1 z-50",
            "bg-red-500 rounded-full",
            sizeClasses[size],
            className,
          )}
        />
      )}
    </AnimatePresence>
  );
}
