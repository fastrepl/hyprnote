import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  useScheduleTaskRunCallback,
  useTaskRunRunning,
} from "tinytick/ui-react";
import { useHover } from "usehooks-ts";

import { commands as permissionsCommands } from "@hypr/plugin-permissions";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { useTabs } from "../../../../store/zustand/tabs";
import { CALENDAR_SYNC_TASK_ID } from "./task";

function useCalendarConfigured() {
  const { data: status } = useQuery({
    queryKey: ["calendarPermissionStatus"],
    queryFn: async () => {
      const result = await permissionsCommands.checkCalendarPermission();
      if (result.status === "ok") {
        return result.data;
      }
      return "denied";
    },
  });

  return status === "authorized";
}

export function RefetchButton() {
  const isConfigured = useCalendarConfigured();
  const openNew = useTabs((state) => state.openNew);
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

  const handleOpenCalendar = useCallback(() => {
    openNew({ type: "calendar" });
  }, [openNew]);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const isHovered = useHover(buttonRef as React.RefObject<HTMLButtonElement>);

  const Icon = isRunning ? Spinner : isHovered ? RefreshCwIcon : CalendarIcon;

  if (isConfigured) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            ref={buttonRef}
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={handleRefetch}
            disabled={isRunning}
          >
            <Icon className="size-3.5 text-neutral-500" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-48">
          <p className="text-xs">
            {isRunning
              ? "Syncing calendar events..."
              : "Re-synced once per minute while Hyprnote is running"}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          ref={buttonRef}
          variant="ghost"
          size="icon"
          className="size-6"
          disabled
        >
          <Icon className={cn(["size-3.5 text-neutral-300"])} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">
        <div className="flex flex-row items-center gap-3">
          <p className="text-xs">You have no Calendar configured.</p>
          <Button
            size="sm"
            variant="outline"
            className="text-black rounded-[6px]"
            onClick={handleOpenCalendar}
          >
            Configure
          </Button>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
