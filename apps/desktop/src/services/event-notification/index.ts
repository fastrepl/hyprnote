import {
  type EventDetails,
  commands as notificationCommands,
  type Participant,
} from "@hypr/plugin-notification";

import { CONFIG_REGISTRY } from "../../config/registry";
import type * as main from "../../store/tinybase/store/main";
import type * as settings from "../../store/tinybase/store/settings";

export const EVENT_NOTIFICATION_TASK_ID = "eventNotification";
export const EVENT_NOTIFICATION_INTERVAL = 30 * 1000; // 30 sec

const NOTIFIED_EVENTS_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL for cleanup

export type NotifiedEventsMap = Map<string, number>;

function getSessionIdForEvent(
  store: main.Store,
  eventId: string,
): string | null {
  let sessionId: string | null = null;
  store.forEachRow("sessions", (rowId, _forEachCell) => {
    const session = store.getRow("sessions", rowId);
    if (session?.event_id === eventId) {
      sessionId = rowId;
    }
  });
  return sessionId;
}

function getParticipantsForSession(
  store: main.Store,
  sessionId: string,
): Participant[] {
  const participants: Participant[] = [];

  store.forEachRow("mapping_session_participant", (mappingId, _forEachCell) => {
    const mapping = store.getRow("mapping_session_participant", mappingId);
    if (mapping?.session_id !== sessionId) return;

    const humanId = mapping.human_id as string | undefined;
    if (!humanId) return;

    const human = store.getRow("humans", humanId);
    if (!human) return;

    participants.push({
      name: (human.name as string) || null,
      email: (human.email as string) || "",
      status: "Accepted",
    });
  });

  return participants;
}

export function checkEventNotifications(
  store: main.Store,
  settingsStore: settings.Store,
  notifiedEvents: NotifiedEventsMap,
) {
  const notificationEnabled = settingsStore?.getValue("notification_event");
  if (!notificationEnabled || !store) {
    return;
  }

  const notifyBeforeMinutes =
    (settingsStore?.getValue("event_notify_before_minutes") as
      | number
      | undefined) ?? CONFIG_REGISTRY.event_notify_before_minutes.default;
  const notificationTimeoutSecs =
    (settingsStore?.getValue("event_notification_timeout_secs") as
      | number
      | undefined) ?? CONFIG_REGISTRY.event_notification_timeout_secs.default;
  const notifyWindowMs = notifyBeforeMinutes * 60 * 1000;

  const now = Date.now();

  for (const [key, timestamp] of notifiedEvents) {
    if (now - timestamp > NOTIFIED_EVENTS_TTL_MS) {
      notifiedEvents.delete(key);
    }
  }

  store.forEachRow("events", (eventId, _forEachCell) => {
    const event = store.getRow("events", eventId);
    if (!event?.started_at) return;

    const startTime = new Date(String(event.started_at));
    const timeUntilStart = startTime.getTime() - now;
    const notificationKey = `event-${eventId}-${startTime.getTime()}`;

    if (timeUntilStart > 0 && timeUntilStart <= notifyWindowMs) {
      if (notifiedEvents.has(notificationKey)) {
        return;
      }

      notifiedEvents.set(notificationKey, now);

      const title = String(event.title || "Upcoming Event");
      const minutesUntil = Math.ceil(timeUntilStart / 60000);

      const eventDetails: EventDetails = {
        what: title,
        timezone: null,
        location:
          (event.meeting_link as string) || (event.location as string) || null,
      };

      let participants: Participant[] | null = null;
      const sessionId = getSessionIdForEvent(store, eventId);
      if (sessionId) {
        const sessionParticipants = getParticipantsForSession(store, sessionId);
        if (sessionParticipants.length > 0) {
          participants = sessionParticipants;
        }
      }

      void notificationCommands.showNotification({
        key: notificationKey,
        title: title,
        message: `Starting in ${minutesUntil} minute${minutesUntil !== 1 ? "s" : ""}`,
        timeout: { secs: notificationTimeoutSecs, nanos: 0 },
        event_id: eventId,
        start_time: Math.floor(startTime.getTime() / 1000),
        participants: participants,
        event_details: eventDetails,
        action_label: "Start listening",
      });
    } else if (timeUntilStart <= 0) {
      notifiedEvents.delete(notificationKey);
    }
  });
}
