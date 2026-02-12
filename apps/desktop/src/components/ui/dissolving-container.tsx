import { motion } from "motion/react";
import { useCallback } from "react";

import { cn } from "@hypr/utils";

import { restoreSessionData } from "../../store/tinybase/store/deleteSession";
import * as main from "../../store/tinybase/store/main";
import { useTabs } from "../../store/zustand/tabs";
import {
  UNDO_TIMEOUT_MS,
  useUndoDelete,
} from "../../store/zustand/undo-delete";
import { useDissolvingProgress } from "../main/sidebar/toast/undo-delete-toast";

type DissolvingContainerProps = {
  sessionId: string;
  children: React.ReactNode;
  className?: string;
  variant?: "sidebar" | "content";
};

export function DissolvingContainer({
  sessionId,
  children,
  className,
  variant = "sidebar",
}: DissolvingContainerProps) {
  const store = main.UI.useStore(main.STORE_ID);
  const pending = useUndoDelete((state) => state.pendingDeletions[sessionId]);
  const pause = useUndoDelete((state) => state.pause);
  const resume = useUndoDelete((state) => state.resume);
  const clearDeletion = useUndoDelete((state) => state.clearDeletion);
  const openCurrent = useTabs((state) => state.openCurrent);
  const { isDissolving, progress } = useDissolvingProgress(sessionId);

  const handleMouseEnter = useCallback(() => {
    pause(sessionId);
  }, [pause, sessionId]);

  const handleMouseLeave = useCallback(() => {
    resume(sessionId);
  }, [resume, sessionId]);

  const handleRestore = useCallback(() => {
    if (!store || !pending) return;
    restoreSessionData(store, pending.data);
    openCurrent({ type: "sessions", id: sessionId });
    clearDeletion(sessionId);
  }, [store, pending, sessionId, openCurrent, clearDeletion]);

  if (!isDissolving) {
    return <>{children}</>;
  }

  const opacity = progress / 100;
  const blur = ((100 - progress) / 100) * 4;
  const remainingSeconds = Math.ceil(
    (progress / 100) * (UNDO_TIMEOUT_MS / 1000),
  );

  if (variant === "content") {
    return (
      <div
        className={cn(["relative h-full", className])}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          className="h-full"
          animate={{
            opacity: Math.max(0.3, opacity),
            filter: `blur(${blur}px) grayscale(${(100 - progress) / 100})`,
          }}
          transition={{ duration: 0.1 }}
        >
          {children}
        </motion.div>

        <div
          className={cn([
            "absolute inset-0 z-50",
            "flex items-center justify-center",
            "pointer-events-none",
          ])}
        >
          {pending?.isPaused ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-auto"
            >
              <button
                onClick={handleRestore}
                className={cn([
                  "px-6 py-3 rounded-xl",
                  "bg-neutral-900 text-white",
                  "text-sm font-medium",
                  "shadow-2xl",
                  "hover:bg-neutral-800 active:bg-neutral-700",
                  "transition-colors duration-150",
                ])}
              >
                Restore Note
              </button>
            </motion.div>
          ) : (
            <span className="text-4xl font-medium text-neutral-400 tabular-nums">
              {remainingSeconds}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(["relative flex items-center", className])}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="flex-1"
        animate={{
          opacity: Math.max(0.3, opacity),
          filter: `blur(${blur}px) grayscale(${(100 - progress) / 100})`,
        }}
        transition={{ duration: 0.1 }}
      >
        {children}
      </motion.div>

      {!pending?.isPaused && (
        <span className="text-xs text-neutral-400 tabular-nums mr-2">
          {remainingSeconds}
        </span>
      )}

      {pending?.isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn([
            "absolute inset-0 z-10",
            "flex items-center justify-center",
            "bg-white/60 backdrop-blur-xs rounded-lg",
          ])}
        >
          <button
            onClick={handleRestore}
            className={cn([
              "px-3 py-1.5 rounded-md",
              "bg-neutral-900 text-white",
              "text-xs font-medium",
              "shadow-lg",
              "hover:bg-neutral-800 active:bg-neutral-700",
              "transition-colors duration-150",
            ])}
          >
            Restore
          </button>
        </motion.div>
      )}
    </div>
  );
}
