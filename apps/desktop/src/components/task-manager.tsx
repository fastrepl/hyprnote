import { useRef } from "react";
import type { Queries } from "tinybase/with-schemas";
import { useScheduleTaskRun, useSetTask } from "tinytick/ui-react";

import {
  CALENDAR_SYNC_TASK_ID,
  syncCalendarEvents,
} from "../services/apple-calendar";
import {
  checkEventNotifications,
  EVENT_NOTIFICATION_INTERVAL,
  EVENT_NOTIFICATION_TASK_ID,
} from "../services/event-notification";
import * as main from "../store/tinybase/main";
import * as settings from "../store/tinybase/settings";

const CALENDAR_SYNC_INTERVAL = 60 * 1000; // 60 sec

export function TaskManager() {
  const store = main.UI.useStore(main.STORE_ID);
  const queries = main.UI.useQueries(main.STORE_ID);

  const settingsStore = settings.UI.useStore(settings.STORE_ID);
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  useSetTask(CALENDAR_SYNC_TASK_ID, async () => {
    await syncCalendarEvents(
      store as main.Store,
      queries as Queries<main.Schemas>,
    );
  });

  useScheduleTaskRun(CALENDAR_SYNC_TASK_ID, undefined, 0, {
    repeatDelay: CALENDAR_SYNC_INTERVAL,
  });

  useSetTask(EVENT_NOTIFICATION_TASK_ID, async () => {
    if (!store || !settingsStore) return;
    checkEventNotifications(
      store as main.Store,
      settingsStore as settings.Store,
      notifiedEventsRef.current,
    );
  });

  useScheduleTaskRun(EVENT_NOTIFICATION_TASK_ID, undefined, 0, {
    repeatDelay: EVENT_NOTIFICATION_INTERVAL,
  });

  return null;
}
