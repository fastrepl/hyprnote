import { useCallback, useEffect, useMemo, useState } from "react";
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
  const pendingDeletions = useUndoDelete((state) => state.pendingDeletions);
  const clearDeletion = useUndoDelete((state) => state.clearDeletion);
  const openCurrent = useTabs((state) => state.openCurrent);

  const latestSessionId = useMemo(() => {
    let latest: string | null = null;
    let latestTime = 0;
    for (const [sessionId, pending] of Object.entries(pendingDeletions)) {
      if (pending.addedAt > latestTime) {
        latestTime = pending.addedAt;
        latest = sessionId;
      }
    }
    return latest;
  }, [pendingDeletions]);

  const handleUndo = useCallback(() => {
    if (!store || !latestSessionId) return;
    const pending = pendingDeletions[latestSessionId];
    if (!pending) return;

    restoreSessionData(store, pending.data);
    openCurrent({ type: "sessions", id: latestSessionId });
    clearDeletion(latestSessionId);
  }, [store, latestSessionId, pendingDeletions, openCurrent, clearDeletion]);

  useHotkeys(
    "mod+z",
    () => {
      if (latestSessionId) {
        handleUndo();
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [latestSessionId, handleUndo],
  );

  return { handleUndo, hasPendingDeletion: latestSessionId !== null };
}

export function UndoDeleteKeyboardHandler() {
  useUndoDeleteHandler();
  return null;
}

export function useDissolvingProgress(sessionId: string | null) {
  const pending = useUndoDelete((state) =>
    sessionId ? state.pendingDeletions[sessionId] : undefined,
  );
  const [progress, setProgress] = useState(100);

  const isDissolving = pending !== undefined;

  useEffect(() => {
    if (!isDissolving || !pending) {
      setProgress(100);
      return;
    }

    if (pending.isPaused) {
      setProgress((pending.remainingTime / UNDO_TIMEOUT_MS) * 100);
      return;
    }

    const startTime = pending.data.deletedAt;
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
  }, [isDissolving, pending]);

  return { isDissolving, progress };
}
