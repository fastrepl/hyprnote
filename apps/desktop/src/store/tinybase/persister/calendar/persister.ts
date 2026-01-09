import type { Store } from "../../store/main";
import { createJsonFilePersister } from "../factories";

export function createCalendarPersister(store: Store) {
  return createJsonFilePersister(store, {
    tableName: "calendars",
    filename: "calendars.json",
    label: "CalendarPersister",
  });
}
