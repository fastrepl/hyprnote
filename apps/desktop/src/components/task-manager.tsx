import type { Queries } from "tinybase/with-schemas";
import { useScheduleTaskRun, useSetTask } from "tinytick/ui-react";

import {
  CALENDAR_SYNC_INTERVAL,
  CALENDAR_SYNC_TASK_ID,
  syncCalendarEvents,
} from "../services/apple-calendar";
import * as main from "../store/tinybase/main";

export function TaskManager() {
  const store = main.UI.useStore(main.STORE_ID);
  const queries = main.UI.useQueries(main.STORE_ID);

  useSetTask(CALENDAR_SYNC_TASK_ID, async () => {
    if (store && queries) {
      await syncCalendarEvents(
        store as main.Store,
        queries as Queries<main.Schemas>,
      );
    }
  });

  useScheduleTaskRun(CALENDAR_SYNC_TASK_ID, undefined, 0, {
    repeatDelay: CALENDAR_SYNC_INTERVAL,
  });

  return null;
}
