import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  useManager,
  useScheduleTaskRun,
  useScheduleTaskRunCallback,
  useSetTask,
} from "tinytick/ui-react";

import {
  commands as appleCalendarCommands,
  events as appleCalendarEvents,
} from "@hypr/plugin-apple-calendar";
import { commands as permissionsCommands } from "@hypr/plugin-permissions";

import { checkForUpdate } from "./main/sidebar/profile/ota/task";

const UPDATE_CHECK_TASK_ID = "checkForUpdate";
const UPDATE_CHECK_INTERVAL = 30 * 1000;

const CALENDAR_FETCH_TASK_ID = "fetchAppleCalendarChunk";
const CALENDAR_SYNC_INTERVAL = 5 * 60 * 1000;

type ChunkArg = {
  chunks: Array<{ from: string; to: string }>;
  currentIndex: number;
};

function generateCalendarChunks(): Array<{ from: string; to: string }> {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  return [
    {
      from: new Date(now.getTime() - 7 * day).toISOString(),
      to: now.toISOString(),
    },
    {
      from: now.toISOString(),
      to: new Date(now.getTime() + 7 * day).toISOString(),
    },
    {
      from: new Date(now.getTime() + 7 * day).toISOString(),
      to: new Date(now.getTime() + 14 * day).toISOString(),
    },
  ];
}

export function TaskManager() {
  const manager = useManager();

  const calendarPermission = useQuery({
    queryKey: ["calendarPermissionForSync"],
    queryFn: async () => {
      const result = await permissionsCommands.checkCalendarPermission();
      return result.status === "ok" ? result.data : "denied";
    },
    refetchInterval: 10000,
  });

  const hasCalendarPermission = calendarPermission.data === "authorized";

  useSetTask(UPDATE_CHECK_TASK_ID, async () => {
    await checkForUpdate();
  });

  useScheduleTaskRun(UPDATE_CHECK_TASK_ID, undefined, 0, {
    repeatDelay: UPDATE_CHECK_INTERVAL,
  });

  useSetTask(
    CALENDAR_FETCH_TASK_ID,
    async (arg) => {
      const permCheck = await permissionsCommands.checkCalendarPermission();
      if (permCheck.status !== "ok" || permCheck.data !== "authorized") {
        return;
      }

      const { chunks, currentIndex }: ChunkArg = arg
        ? JSON.parse(arg)
        : { chunks: generateCalendarChunks(), currentIndex: 0 };

      const chunk = chunks[currentIndex];
      if (!chunk) {
        return;
      }

      const result = await appleCalendarCommands.listEvents({
        from: chunk.from,
        to: chunk.to,
        calendar_tracking_id: "",
      });

      if (result.status === "ok") {
        console.log(
          `[Calendar] Fetched ${result.data.length} events for chunk ${currentIndex + 1}/${chunks.length}`,
        );
      }

      const nextIndex = currentIndex + 1;
      if (nextIndex < chunks.length && manager) {
        manager.scheduleTaskRun(
          CALENDAR_FETCH_TASK_ID,
          JSON.stringify({ chunks, currentIndex: nextIndex }),
          100,
        );
      }
    },
    [manager],
  );

  useScheduleTaskRun(
    hasCalendarPermission ? CALENDAR_FETCH_TASK_ID : "",
    undefined,
    0,
    { repeatDelay: CALENDAR_SYNC_INTERVAL },
    [hasCalendarPermission],
  );

  const triggerCalendarSync = useScheduleTaskRunCallback(
    CALENDAR_FETCH_TASK_ID,
  );

  useEffect(() => {
    if (!hasCalendarPermission) {
      return;
    }

    const unlisten = appleCalendarEvents.calendarChangedEvent.listen(() => {
      console.log("[Calendar] Change detected, triggering sync");
      triggerCalendarSync();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [hasCalendarPermission, triggerCalendarSync]);

  return null;
}
