import { commands as notificationCommands } from "@hypr/plugin-notification";

import type * as main from "../../store/tinybase/store/main";
import type * as settings from "../../store/tinybase/store/settings";

export const EVENT_NOTIFICATION_TASK_ID = "eventNotification";
export const EVENT_NOTIFICATION_INTERVAL = 30 * 1000; // 30 sec

const NOTIFY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes before

export function checkEventNotifications(
  store: main.Store,
  settingsStore: settings.Store,
  notifiedEvents: Set<string>,
) {
  const notificationEnabled = settingsStore?.getValue("notification_event");
  if (!notificationEnabled || !store) {
    return;
  }

  const now = new Date();

  store.forEachRow("events", (eventId, _forEachCell) => {
    const event = store.getRow("events", eventId);
    if (!event?.started_at) return;

    const startTime = new Date(String(event.started_at));
    const timeUntilStart = startTime.getTime() - now.getTime();
    const notificationKey = `event-${eventId}-${startTime.getTime()}`;

    if (timeUntilStart > 0 && timeUntilStart <= NOTIFY_WINDOW_MS) {
      if (notifiedEvents.has(notificationKey)) {
        return;
      }

      notifiedEvents.add(notificationKey);

      const title = String(event.title || "Upcoming Event");
      const minutesUntil = Math.ceil(timeUntilStart / 60000);

      void notificationCommands.showNotification({
        key: notificationKey,
        title: title,
        message: `Starting in ${minutesUntil} minute${minutesUntil !== 1 ? "s" : ""}`,
        timeout: { secs: 30, nanos: 0 },
        event_id: eventId,
      });
    } else if (timeUntilStart <= 0) {
      notifiedEvents.delete(notificationKey);
    }
  });
}
