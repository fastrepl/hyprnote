import { RefreshCwIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  useScheduleTaskRunCallback,
  useTaskRunRunning,
} from "tinytick/ui-react";

import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";

import { CALENDAR_SYNC_TASK_ID } from "../../../services/apple-calendar";
import * as main from "../../../store/tinybase/main";

export function CalendarStatus() {
  const calendars = main.UI.useTable("calendars", main.STORE_ID);

  const selectedCount = useMemo(() => {
    return Object.values(calendars).filter((cal) => cal.enabled).length;
  }, [calendars]);

  const [currentTaskRunId, setCurrentTaskRunId] = useState<string | undefined>(
    undefined,
  );

  const scheduleTaskRun = useScheduleTaskRunCallback(
    CALENDAR_SYNC_TASK_ID,
    undefined,
    0,
  );

  const isRunning = useTaskRunRunning(currentTaskRunId ?? "");

  const handleRefetch = useCallback(() => {
    const taskRunId = scheduleTaskRun();
    setCurrentTaskRunId(taskRunId);
  }, [scheduleTaskRun]);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-lg border bg-neutral-50 px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">
          {selectedCount} calendar{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <span className="text-xs text-neutral-500">
          {isRunning ? "Syncing..." : "Syncs every minute automatically"}
        </span>
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
