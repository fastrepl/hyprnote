import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@hypr/utils";

import { restoreSessionData } from "../../../../store/tinybase/store/deleteSession";
import * as main from "../../../../store/tinybase/store/main";
import { useTabs } from "../../../../store/zustand/tabs";
import { useUndoDelete } from "../../../../store/zustand/undo-delete";

const UNDO_TIMEOUT_MS = 5000;

export function UndoDeleteToast() {
  const store = main.UI.useStore(main.STORE_ID);
  const { deletedSession, clear } = useUndoDelete();
  const openCurrent = useTabs((state) => state.openCurrent);
  const [progress, setProgress] = useState(100);

  const handleUndo = useCallback(() => {
    if (!store || !deletedSession) return;

    restoreSessionData(store, deletedSession);
    openCurrent({ type: "sessions", id: deletedSession.session.id });
    clear();
  }, [store, deletedSession, openCurrent, clear]);

  useHotkeys(
    "mod+z",
    () => {
      if (deletedSession) {
        handleUndo();
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [deletedSession, handleUndo],
  );

  useEffect(() => {
    if (!deletedSession) {
      setProgress(100);
      return;
    }

    const startTime = deletedSession.deletedAt;
    const endTime = startTime + UNDO_TIMEOUT_MS;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const newProgress = (remaining / UNDO_TIMEOUT_MS) * 100;
      setProgress(newProgress);

      if (newProgress > 0) {
        requestAnimationFrame(updateProgress);
      }
    };

    const animationId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationId);
  }, [deletedSession]);

  const noteTitle = deletedSession?.session.title || "Untitled";

  return (
    <AnimatePresence>
      {deletedSession && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn([
            "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
            "bg-neutral-900 text-white rounded-lg shadow-xl",
            "px-4 py-3 min-w-[300px] max-w-[400px]",
            "flex items-center gap-3",
          ])}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              "{noteTitle}" deleted
            </p>
          </div>
          <button
            onClick={handleUndo}
            className={cn([
              "shrink-0 px-3 py-1.5 rounded-md",
              "bg-white text-neutral-900",
              "text-sm font-medium",
              "hover:bg-neutral-100 active:bg-neutral-200",
              "transition-colors duration-150",
            ])}
          >
            Undo
          </button>
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-white/30 rounded-b-lg transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
