import { useScheduleTaskRun, useSetTask } from "tinytick/ui-react";

import * as main from "../store/tinybase/main";
import {
  CALENDAR_SYNC_TASK_ID,
  syncCalendarEvents,
} from "./main/sidebar/timeline/task";

const CALENDAR_SYNC_INTERVAL = 60 * 1000; // 60 sec

export function TaskManager() {
  const store = main.UI.useStore(main.STORE_ID);

  useSetTask(CALENDAR_SYNC_TASK_ID, async () => {
    if (store) {
      await syncCalendarEvents(store as main.Store);
    }
  });

  useScheduleTaskRun(CALENDAR_SYNC_TASK_ID, undefined, 0, {
    repeatDelay: CALENDAR_SYNC_INTERVAL,
  });

  return null;
}
