import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@hypr/utils";

import { restoreSessionData } from "../../../../store/tinybase/store/deleteSession";
import * as main from "../../../../store/tinybase/store/main";
import { useTabs } from "../../../../store/zustand/tabs";
import {
  UNDO_TIMEOUT_MS,
  useUndoDelete,
} from "../../../../store/zustand/undo-delete";

function useLatestPendingDeletion() {
  const pendingDeletions = useUndoDelete((state) => state.pendingDeletions);

  return useMemo(() => {
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
}

function useUndoRestore() {
  const store = main.UI.useStore(main.STORE_ID);
  const queryClient = useQueryClient();
  const pendingDeletions = useUndoDelete((state) => state.pendingDeletions);
  const clearDeletion = useUndoDelete((state) => state.clearDeletion);
  const openCurrent = useTabs((state) => state.openCurrent);

  return useCallback(
    (sessionId: string) => {
      if (!store) return;
      const pending = pendingDeletions[sessionId];
      if (!pending) return;

      restoreSessionData(store, pending.data);
      openCurrent({ type: "sessions", id: sessionId });
      clearDeletion(sessionId);
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.length >= 2 &&
          query.queryKey[0] === "audio" &&
          query.queryKey[1] === sessionId,
      });
    },
    [store, pendingDeletions, openCurrent, clearDeletion, queryClient],
  );
}

function useCountdown(sessionId: string | null) {
  const pending = useUndoDelete((state) =>
    sessionId ? state.pendingDeletions[sessionId] : undefined,
  );
  const [remaining, setRemaining] = useState(UNDO_TIMEOUT_MS);

  useEffect(() => {
    if (!pending) {
      setRemaining(UNDO_TIMEOUT_MS);
      return;
    }

    const update = () => {
      const elapsed = Date.now() - pending.data.deletedAt;
      setRemaining(Math.max(0, UNDO_TIMEOUT_MS - elapsed));
    };

    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [pending]);

  return Math.ceil(remaining / 1000);
}

export function UndoDeleteKeyboardHandler() {
  const latestSessionId = useLatestPendingDeletion();
  const restore = useUndoRestore();

  useHotkeys(
    "mod+z",
    () => {
      if (latestSessionId) {
        restore(latestSessionId);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [latestSessionId, restore],
  );

  return null;
}

export function UndoDeleteToast() {
  const latestSessionId = useLatestPendingDeletion();
  const pendingDeletions = useUndoDelete((state) => state.pendingDeletions);
  const restore = useUndoRestore();
  const seconds = useCountdown(latestSessionId);
  const pending = latestSessionId ? pendingDeletions[latestSessionId] : null;
  const title = pending?.data.session.title || "Untitled";
  const triggerRef = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ bottom: number; right: number } | null>(
    null,
  );

  useEffect(() => {
    const findTrigger = () => {
      const el = document.querySelector(
        "[data-chat-trigger]",
      ) as HTMLElement | null;
      triggerRef.current = el;
      if (el) {
        const rect = el.getBoundingClientRect();
        setPos({
          bottom: window.innerHeight - rect.top + 8,
          right: window.innerWidth - rect.right + rect.width / 2 - 8,
        });
      }
    };

    findTrigger();
    if (latestSessionId) {
      const id = requestAnimationFrame(findTrigger);
      return () => cancelAnimationFrame(id);
    }
  }, [latestSessionId]);

  return createPortal(
    <AnimatePresence>
      {latestSessionId && pos && (
        <motion.div
          key={latestSessionId}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ bottom: pos.bottom, right: pos.right }}
          className="fixed z-50"
        >
          <div
            className={cn([
              "relative bg-white rounded-2xl shadow-lg border border-neutral-200",
              "px-4 py-3 max-w-[260px]",
            ])}
          >
            <div
              className={cn([
                "absolute -bottom-[6px] right-2",
                "w-3 h-3 bg-white border-b border-r border-neutral-200",
                "rotate-45",
              ])}
            />

            <p className="text-sm text-neutral-700">
              <span className="font-medium truncate inline-block max-w-[160px] align-bottom">
                {title}
              </span>{" "}
              deleted.
            </p>
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={() => restore(latestSessionId)}
                className={cn([
                  "text-xs font-medium px-3 py-1 rounded-lg",
                  "bg-neutral-900 text-white",
                  "hover:bg-neutral-800 active:bg-neutral-700",
                  "transition-colors",
                ])}
              >
                Undo
              </button>
              <span className="text-xs text-neutral-400 tabular-nums">
                {seconds}s
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
