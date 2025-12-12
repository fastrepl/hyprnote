import * as main from "../../store/tinybase/main";
import { type CalendarStore, useCalendarSyncTask } from "./calendar-sync";
import { useUpdateCheckTask } from "./update-check";

export function TaskManager() {
  const store = main.UI.useStore(main.STORE_ID);
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const calendars = main.UI.useTable("calendars", main.STORE_ID);

  useUpdateCheckTask();
  useCalendarSyncTask(store as CalendarStore | undefined, user_id, calendars);

  return null;
}
