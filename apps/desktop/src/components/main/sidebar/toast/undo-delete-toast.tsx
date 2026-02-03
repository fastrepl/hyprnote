import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { restoreSessionData } from "../../../../store/tinybase/store/deleteSession";
import * as main from "../../../../store/tinybase/store/main";
import { useTabs } from "../../../../store/zustand/tabs";
import {
  UNDO_TIMEOUT_MS,
  useUndoDelete,
} from "../../../../store/zustand/undo-delete";

export function useUndoDeleteHandler() {
  const store = main.UI.useStore(main.STORE_ID);
  const { deletedSession, clear } = useUndoDelete();
  const openCurrent = useTabs((state) => state.openCurrent);

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

  return { handleUndo, deletedSession };
}

export function UndoDeleteKeyboardHandler() {
  useUndoDeleteHandler();
  return null;
}

export function useDissolvingProgress(sessionId: string | null) {
  const { deletedSession, isPaused, remainingTime } = useUndoDelete();
  const [progress, setProgress] = useState(100);

  const isDissolving =
    deletedSession !== null && deletedSession.session.id === sessionId;

  useEffect(() => {
    if (!isDissolving || !deletedSession) {
      setProgress(100);
      return;
    }

    if (isPaused) {
      setProgress((remainingTime / UNDO_TIMEOUT_MS) * 100);
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
        animationIdRef.current = requestAnimationFrame(updateProgress);
      }
    };

    const animationIdRef = { current: requestAnimationFrame(updateProgress) };
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isDissolving, deletedSession, isPaused, remainingTime]);

  return { isDissolving, progress };
}
