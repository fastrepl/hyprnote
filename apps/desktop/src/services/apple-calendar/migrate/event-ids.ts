import type { AppleEvent } from "@hypr/plugin-apple-calendar";
import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";

import type { Store } from "../../../store/tinybase/store/main";
import { createAppleEventId, isLegacyEventId } from "../utils/event-id";

interface LegacyEvent {
  id: string;
  tracking_id_event: string;
  started_at: string;
}

/**
 * Migrates legacy UUID-based event IDs to new deterministic format.
 *
 * Strategy:
 * 1. Find all events with legacy UUID IDs
 * 2. Fetch current Apple Calendar data for these events
 * 3. Generate new deterministic IDs using calendar_item_identifier
 * 4. Update event row IDs and session references atomically
 *
 * This migration is idempotent and safe to run multiple times.
 */
export async function migrateEventIds(store: Store): Promise<void> {
  const legacyEvents: LegacyEvent[] = [];

  store.forEachRow("events", (rowId, _forEachCell) => {
    if (isLegacyEventId(rowId)) {
      const event = store.getRow("events", rowId);
      if (event) {
        legacyEvents.push({
          id: rowId,
          tracking_id_event: event.tracking_id_event as string,
          started_at: event.started_at as string,
        });
      }
    }
  });

  if (legacyEvents.length === 0) {
    return;
  }

  console.log(
    `[Migration] Found ${legacyEvents.length} legacy events to migrate`,
  );

  const calendarIds = getEnabledCalendarIds(store);
  if (calendarIds.length === 0) {
    console.log("[Migration] No enabled calendars found, skipping migration");
    return;
  }

  let appleEvents: AppleEvent[] = [];
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    for (const calendarId of calendarIds) {
      const result = await appleCalendarCommands.listEvents({
        calendar_tracking_id: calendarId,
        from: sixMonthsAgo.toISOString(),
        to: threeMonthsLater.toISOString(),
      });

      if (result.status === "ok") {
        appleEvents = appleEvents.concat(result.data);
      }
    }
  } catch (error) {
    console.error("[Migration] Failed to fetch Apple Calendar events:", error);
    return;
  }

  const appleEventByEventIdentifier = new Map<string, AppleEvent>();
  for (const appleEvent of appleEvents) {
    appleEventByEventIdentifier.set(appleEvent.event_identifier, appleEvent);
  }

  let migratedCount = 0;
  let skippedCount = 0;

  store.transaction(() => {
    for (const legacyEvent of legacyEvents) {
      const appleEvent = appleEventByEventIdentifier.get(
        legacyEvent.tracking_id_event,
      );

      if (!appleEvent) {
        skippedCount++;
        continue;
      }

      const newId = createAppleEventId(appleEvent, legacyEvent.started_at);

      if (newId === legacyEvent.id) {
        continue;
      }

      const existingEvent = store.getRow("events", newId);
      if (existingEvent && Object.keys(existingEvent).length > 0) {
        const hasLegacySession = hasSessionForEvent(store, legacyEvent.id);
        const hasNewSession = hasSessionForEvent(store, newId);

        if (hasLegacySession && !hasNewSession) {
          updateSessionEventId(store, legacyEvent.id, newId);
        }
        store.delRow("events", legacyEvent.id);
        migratedCount++;
        continue;
      }

      const eventData: Record<string, unknown> = {};
      store.forEachCell("events", legacyEvent.id, (cellId, cell) => {
        eventData[cellId] = cell;
      });

      eventData.tracking_id_event = appleEvent.calendar_item_identifier;

      store.setRow(
        "events",
        newId,
        eventData as Parameters<typeof store.setRow>[2],
      );

      updateSessionEventId(store, legacyEvent.id, newId);

      store.delRow("events", legacyEvent.id);

      migratedCount++;
    }
  });

  console.log(
    `[Migration] Complete: ${migratedCount} migrated, ${skippedCount} skipped`,
  );
}

function getEnabledCalendarIds(store: Store): string[] {
  const calendarIds: string[] = [];

  store.forEachRow("calendars", (rowId, _forEachCell) => {
    const calendar = store.getRow("calendars", rowId);
    if (
      calendar &&
      calendar.enabled === true &&
      calendar.provider === "apple"
    ) {
      const trackingId = calendar.tracking_id_calendar as string | undefined;
      if (trackingId) {
        calendarIds.push(trackingId);
      }
    }
  });

  return calendarIds;
}

function hasSessionForEvent(store: Store, eventId: string): boolean {
  let hasSession = false;

  store.forEachRow("sessions", (sessionId, _forEachCell) => {
    const session = store.getRow("sessions", sessionId);
    if (session && session.event_id === eventId) {
      const rawMd = session.raw_md as string | undefined;
      if (rawMd && rawMd.trim() !== "") {
        hasSession = true;
      }
    }
  });

  return hasSession;
}

function updateSessionEventId(
  store: Store,
  oldEventId: string,
  newEventId: string,
): void {
  store.forEachRow("sessions", (sessionId, _forEachCell) => {
    const session = store.getRow("sessions", sessionId);
    if (session && session.event_id === oldEventId) {
      store.setCell("sessions", sessionId, "event_id", newEventId);
    }
  });
}
