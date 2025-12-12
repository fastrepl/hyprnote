import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
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

import type { ChunkArg } from "./types";
import {
  generateCalendarChunks,
  getEnabledAppleCalendarMap,
  storeEvents,
} from "./utils";

const TASK_ID = "fetchAppleCalendarChunk";
const SYNC_INTERVAL = 5 * 60 * 1000;

export type CalendarStore = {
  getTable: (tableId: string) => Record<string, Record<string, unknown>>;
  setRow: (
    tableId: string,
    rowId: string,
    row: Record<string, unknown>,
  ) => unknown;
};

export function useCalendarSyncTask(
  store: CalendarStore | undefined,
  userId: string | undefined,
  calendars: Record<string, Record<string, unknown>>,
) {
  const manager = useManager();

  const enabledAppleCalendars = useMemo(
    () => getEnabledAppleCalendarMap(calendars),
    [calendars],
  );

  const hasEnabledAppleCalendar = Object.keys(enabledAppleCalendars).length > 0;

  const calendarPermission = useQuery({
    queryKey: ["calendarPermissionForSync"],
    queryFn: async () => {
      const result = await permissionsCommands.checkCalendarPermission();
      return result.status === "ok" ? result.data : "denied";
    },
    refetchInterval: 10000,
    enabled: hasEnabledAppleCalendar,
  });

  const hasCalendarPermission = calendarPermission.data === "authorized";
  const shouldSync = hasEnabledAppleCalendar && hasCalendarPermission;

  useSetTask(
    TASK_ID,
    async (arg) => {
      const permCheck = await permissionsCommands.checkCalendarPermission();
      if (permCheck.status !== "ok" || permCheck.data !== "authorized") {
        return;
      }

      if (!store || !userId) {
        return;
      }

      const currentCalendars = store.getTable("calendars");
      const calendarMap = getEnabledAppleCalendarMap(currentCalendars);

      if (Object.keys(calendarMap).length === 0) {
        return;
      }

      const calendarTrackingIds = Object.keys(calendarMap);

      const {
        chunks,
        calendarTrackingIds: storedCalendarIds,
        currentChunkIndex,
        currentCalendarIndex,
      }: ChunkArg = arg
        ? JSON.parse(arg)
        : {
            chunks: generateCalendarChunks(),
            calendarTrackingIds,
            currentChunkIndex: 0,
            currentCalendarIndex: 0,
          };

      const chunk = chunks[currentChunkIndex];
      const calendarTrackingId = storedCalendarIds[currentCalendarIndex];

      if (!chunk || !calendarTrackingId) {
        return;
      }

      const result = await appleCalendarCommands.listEvents({
        from: chunk.from,
        to: chunk.to,
        calendar_tracking_id: calendarTrackingId,
      });

      if (result.status === "ok") {
        storeEvents(store, result.data, calendarMap, userId);
        console.log(
          `[Calendar] Stored ${result.data.length} events for calendar ${currentCalendarIndex + 1}/${storedCalendarIds.length}, chunk ${currentChunkIndex + 1}/${chunks.length}`,
        );
      }

      scheduleNextChunk(manager, {
        chunks,
        storedCalendarIds,
        currentChunkIndex,
        currentCalendarIndex,
      });
    },
    [manager, store, userId],
  );

  useScheduleTaskRun(
    shouldSync ? TASK_ID : "",
    undefined,
    0,
    { repeatDelay: SYNC_INTERVAL },
    [shouldSync],
  );

  const triggerCalendarSync = useScheduleTaskRunCallback(TASK_ID);

  useEffect(() => {
    if (!shouldSync) {
      return;
    }

    const unlisten = appleCalendarEvents.calendarChangedEvent.listen(() => {
      console.log("[Calendar] Change detected, triggering sync");
      triggerCalendarSync();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [shouldSync, triggerCalendarSync]);
}

function scheduleNextChunk(
  manager: ReturnType<typeof useManager>,
  params: {
    chunks: ChunkArg["chunks"];
    storedCalendarIds: string[];
    currentChunkIndex: number;
    currentCalendarIndex: number;
  },
) {
  if (!manager) return;

  const { chunks, storedCalendarIds, currentChunkIndex, currentCalendarIndex } =
    params;
  const nextCalendarIndex = currentCalendarIndex + 1;
  const nextChunkIndex = currentChunkIndex + 1;

  if (nextCalendarIndex < storedCalendarIds.length) {
    manager.scheduleTaskRun(
      TASK_ID,
      JSON.stringify({
        chunks,
        calendarTrackingIds: storedCalendarIds,
        currentChunkIndex,
        currentCalendarIndex: nextCalendarIndex,
      }),
      100,
    );
  } else if (nextChunkIndex < chunks.length) {
    manager.scheduleTaskRun(
      TASK_ID,
      JSON.stringify({
        chunks,
        calendarTrackingIds: storedCalendarIds,
        currentChunkIndex: nextChunkIndex,
        currentCalendarIndex: 0,
      }),
      100,
    );
  }
}
