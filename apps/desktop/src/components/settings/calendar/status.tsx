import { RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useManager,
  useRunningTaskRunIds,
  useScheduledTaskRunIds,
  useScheduleTaskRunCallback,
} from "tinytick/ui-react";

import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";

import {
  CALENDAR_SYNC_INTERVAL,
  CALENDAR_SYNC_TASK_ID,
} from "../../../services/apple-calendar";
import * as main from "../../../store/tinybase/main";

export function CalendarStatus() {
  const manager = useManager();
  const calendars = main.UI.useTable("calendars", main.STORE_ID);

  const selectedCount = useMemo(() => {
    return Object.values(calendars).filter((cal) => cal.enabled).length;
  }, [calendars]);

  const scheduleTaskRun = useScheduleTaskRunCallback(
    CALENDAR_SYNC_TASK_ID,
    undefined,
    0,
  );

  const runningTaskRunIds = useRunningTaskRunIds();
  const scheduledTaskRunIds = useScheduledTaskRunIds();

  const [lastCompletedAt, setLastCompletedAt] = useState<number | null>(null);
  const [nextRunIn, setNextRunIn] = useState<number | null>(null);

  const isRunning = useMemo(() => {
    if (!manager) return false;
    return runningTaskRunIds.some((id) => {
      const info = manager.getTaskRunInfo(id);
      return info?.taskId === CALENDAR_SYNC_TASK_ID;
    });
  }, [manager, runningTaskRunIds]);

  const scheduledNextTimestamp = useMemo(() => {
    if (!manager) return null;
    for (const id of scheduledTaskRunIds) {
      const info = manager.getTaskRunInfo(id);
      if (info?.taskId === CALENDAR_SYNC_TASK_ID) {
        return info.nextTimestamp;
      }
    }
    return null;
  }, [manager, scheduledTaskRunIds]);

  // Track when task completes (transitions from running to not running)
  useEffect(() => {
    if (
      !isRunning &&
      runningTaskRunIds.length === 0 &&
      lastCompletedAt === null
    ) {
      // On initial mount, estimate last completion based on when next run is scheduled
      if (scheduledNextTimestamp) {
        const estimatedLastCompletion =
          scheduledNextTimestamp - CALENDAR_SYNC_INTERVAL;
        if (estimatedLastCompletion > 0) {
          setLastCompletedAt(estimatedLastCompletion);
        }
      }
    }
  }, [
    isRunning,
    runningTaskRunIds.length,
    lastCompletedAt,
    scheduledNextTimestamp,
  ]);

  // When task finishes running, update lastCompletedAt
  const wasRunningRef = useMemo(() => ({ current: isRunning }), []);
  useEffect(() => {
    if (wasRunningRef.current && !isRunning) {
      setLastCompletedAt(Date.now());
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, wasRunningRef]);

  // Update countdown timer
  useEffect(() => {
    const updateNextRunIn = () => {
      if (scheduledNextTimestamp) {
        const remaining = Math.max(
          0,
          Math.floor((scheduledNextTimestamp - Date.now()) / 1000),
        );
        setNextRunIn(remaining);
      } else if (lastCompletedAt) {
        const nextRun = lastCompletedAt + CALENDAR_SYNC_INTERVAL;
        const remaining = Math.max(
          0,
          Math.floor((nextRun - Date.now()) / 1000),
        );
        setNextRunIn(remaining);
      } else {
        setNextRunIn(null);
      }
    };

    updateNextRunIn();
    const intervalId = setInterval(updateNextRunIn, 1000);
    return () => clearInterval(intervalId);
  }, [scheduledNextTimestamp, lastCompletedAt]);

  const handleRefetch = useCallback(() => {
    scheduleTaskRun();
  }, [scheduleTaskRun]);

  const getStatusText = () => {
    if (isRunning) {
      return "Syncing...";
    }
    if (nextRunIn !== null && nextRunIn > 0) {
      return `Next sync in ${nextRunIn}s`;
    }
    return "Syncs every minute automatically";
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-lg border bg-neutral-50 px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">
          {selectedCount} calendar{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <span className="text-xs text-neutral-500">{getStatusText()}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefetch}
        disabled={isRunning}
        className="gap-2"
      >
        {isRunning ? (
          <Spinner className="size-3.5" />
        ) : (
          <RefreshCwIcon className="size-3.5" />
        )}
        Sync Now
      </Button>
    </div>
  );
}
