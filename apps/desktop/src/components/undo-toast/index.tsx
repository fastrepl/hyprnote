import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@hypr/utils";

import * as main from "../../store/tinybase/store/main";
import { useUndoStore } from "../../store/zustand/undo";

const TOAST_DISPLAY_MS = 8000;

export function UndoToast() {
  const checkpoints = main.UI.useCheckpoints(main.STORE_ID);
  const operations = useUndoStore((state) => state.operations);
  const removeOperation = useUndoStore((state) => state.removeOperation);
  const latestOperation = operations[operations.length - 1];

  const [visible, setVisible] = useState(false);
  const [currentCheckpointId, setCurrentCheckpointId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    if (
      latestOperation &&
      latestOperation.checkpointId !== currentCheckpointId
    ) {
      setCurrentCheckpointId(latestOperation.checkpointId);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, TOAST_DISPLAY_MS);

      return () => clearTimeout(timer);
    }
  }, [latestOperation, currentCheckpointId]);

  const handleUndo = useCallback(() => {
    if (!checkpoints || !latestOperation) {
      return;
    }

    if (latestOperation.audioDeleteTimeoutId) {
      clearTimeout(latestOperation.audioDeleteTimeoutId);
    }

    checkpoints.goTo(latestOperation.checkpointId);
    removeOperation(latestOperation.checkpointId);
    setVisible(false);
  }, [checkpoints, latestOperation, removeOperation]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  useHotkeys(
    "mod+z",
    () => {
      if (latestOperation) {
        handleUndo();
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: false,
      enableOnContentEditable: false,
    },
    [handleUndo, latestOperation],
  );

  return (
    <AnimatePresence>
      {visible && latestOperation && (
        <motion.div
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
          <span className="text-sm">Note deleted</span>
          <button
            onClick={handleUndo}
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
          <button
            onClick={handleDismiss}
            className={cn([
              "ml-2 text-neutral-400 hover:text-white transition-colors",
            ])}
            aria-label="Dismiss"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
