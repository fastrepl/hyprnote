import { AnimatePresence, motion } from "motion/react";

import { cn } from "@hypr/utils";

import { useUndoDelete } from "../../hooks/useUndoDelete";

export function UndoDeleteToast() {
  const { hasPendingDelete, pendingDelete, undo } = useUndoDelete();

  return (
    <AnimatePresence>
      {hasPendingDelete && pendingDelete && (
        <motion.div
          key={pendingDelete.checkpointId}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn([
            "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
            "flex items-center gap-3 px-4 py-3",
            "bg-neutral-900 text-white rounded-lg shadow-lg",
          ])}
        >
          <span className="text-sm">
            "{pendingDelete.sessionTitle}" deleted
          </span>
          <button
            onClick={undo}
            className={cn([
              "px-3 py-1 rounded-md text-sm font-medium",
              "bg-white text-neutral-900",
              "hover:bg-neutral-100 transition-colors",
            ])}
          >
            Undo
          </button>
          <span className="text-xs text-neutral-400 ml-1">
            {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+Z
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
