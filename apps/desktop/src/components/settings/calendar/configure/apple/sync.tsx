import { useCallback, useEffect, useRef, useState } from "react";
import {
  useScheduleTaskRunCallback,
  useTaskRunRunning,
} from "tinytick/ui-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { CALENDAR_SYNC_TASK_ID } from "../../../../../services/apple-calendar";

export const TOGGLE_SYNC_DEBOUNCE_MS = 5000;

export type SyncStatus = "idle" | "scheduled" | "syncing";

export function useSyncStatus() {
  const scheduleEventSync = useScheduleTaskRunCallback(
    CALENDAR_SYNC_TASK_ID,
    undefined,
    0,
  );
  const toggleSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [pendingTaskRunId, setPendingTaskRunId] = useState<string | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const isTaskRunning = useTaskRunRunning(pendingTaskRunId ?? "");
  const isSyncing = pendingTaskRunId !== null && isTaskRunning === true;

  const status: SyncStatus = isSyncing
    ? "syncing"
    : isDebouncing
      ? "scheduled"
      : "idle";

  useEffect(() => {
    if (pendingTaskRunId && isTaskRunning === false) {
      setPendingTaskRunId(null);
    }
  }, [pendingTaskRunId, isTaskRunning]);

  useEffect(() => {
    return () => {
      if (toggleSyncTimeoutRef.current) {
        clearTimeout(toggleSyncTimeoutRef.current);
      }
    };
  }, []);

  const scheduleSync = useCallback(() => {
    const taskRunId = scheduleEventSync();
    if (taskRunId) {
      setPendingTaskRunId(taskRunId);
    }
  }, [scheduleEventSync]);

  const scheduleDebouncedSync = useCallback(() => {
    if (toggleSyncTimeoutRef.current) {
      clearTimeout(toggleSyncTimeoutRef.current);
    }
    setIsDebouncing(true);
    toggleSyncTimeoutRef.current = setTimeout(() => {
      toggleSyncTimeoutRef.current = null;
      setIsDebouncing(false);
      scheduleSync();
    }, TOGGLE_SYNC_DEBOUNCE_MS);
  }, [scheduleSync]);

  const cancelDebouncedSync = useCallback(() => {
    if (toggleSyncTimeoutRef.current) {
      clearTimeout(toggleSyncTimeoutRef.current);
      setIsDebouncing(false);
    }
  }, []);

  return { status, scheduleSync, scheduleDebouncedSync, cancelDebouncedSync };
}

export function SyncIndicator() {
  const { status } = useSyncStatus();

  const statusText =
    status === "syncing"
      ? "Syncing"
      : status === "scheduled"
        ? "Sync scheduled"
        : "Idle";

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <span
          className={cn([
            "size-2.5 rounded-full",
            status === "syncing" && "bg-blue-500 animate-pulse",
            status === "scheduled" && "bg-amber-500",
            status === "idle" && "bg-neutral-300",
          ])}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom">{statusText}</TooltipContent>
    </Tooltip>
  );
}
