import { useEffect } from "react";

import { DEFAULT_USER_ID } from "../../../utils";
import { buildSessionEventJson } from "../../../utils/session-event";
import type { Store } from "./main";

export function useInitializeStore(
  store: Store,
  persisters: { session: unknown; human: unknown; values: unknown },
): void {
  const { session, human, values } = persisters;

  useEffect(() => {
    if (!store || !session || !human || !values) {
      return;
    }

    initializeStore(store);
  }, [store, session, human, values]);
}
function initializeStore(store: Store): void {
  store.transaction(() => {
    if (!store.hasValue("user_id")) {
      store.setValue("user_id", DEFAULT_USER_ID);
    }

    const userId = store.getValue("user_id") as string;
    if (!store.hasRow("humans", userId)) {
      store.setRow("humans", userId, {
        user_id: userId,
        name: "",
        email: "",
        org_id: "",
      });
    }

    if (
      !store.getTableIds().includes("sessions") ||
      store.getRowIds("sessions").length === 0
    ) {
      const sessionId = crypto.randomUUID();
      const now = new Date().toISOString();

      store.setRow("sessions", sessionId, {
        user_id: DEFAULT_USER_ID,
        created_at: now,
        title: "Welcome to Hyprnote",
        raw_md: "",
      });
    }

    migrateSessionEventIds(store);
    migrateIgnoredRecurringSeries(store);
  });
}

function migrateSessionEventIds(store: Store): void {
  if ((store as any).getTableCellIds("events").includes("ignored")) {
    const recurrenceMap = new Map<string, boolean>();
    const ignoredEvents: {
      tracking_id: string;
      day: string;
      last_seen: string;
    }[] = [];
    const now = new Date().toISOString();

    store.forEachRow("events", (rowId, _forEachCell) => {
      const trackingId = store.getCell(
        "events",
        rowId,
        "tracking_id_event",
      ) as string;
      const hasRecurrenceRules = !!store.getCell(
        "events",
        rowId,
        "has_recurrence_rules",
      );
      recurrenceMap.set(trackingId, hasRecurrenceRules);

      const ignored = (store as any).getCell("events", rowId, "ignored");
      if (!ignored) return;

      const startedAt = store.getCell("events", rowId, "started_at") as
        | string
        | undefined;
      const day = startedAt ? startedAt.slice(0, 10) : "1970-01-01";
      ignoredEvents.push({ tracking_id: trackingId, day, last_seen: now });
    });

    function getKey(trackingId: string, day: string): string {
      return recurrenceMap.get(trackingId)
        ? `${trackingId}:${day}`
        : trackingId;
    }

    if (ignoredEvents.length > 0) {
      const existing = store.getValue("ignored_events") as string | undefined;
      let merged = ignoredEvents;
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (Array.isArray(parsed)) {
            const existingKeys = new Set(
              parsed.map((e: { tracking_id: string; day: string }) =>
                getKey(e.tracking_id, e.day),
              ),
            );
            const newEntries = ignoredEvents.filter(
              (e) => !existingKeys.has(getKey(e.tracking_id, e.day)),
            );
            merged = [...parsed, ...newEntries];
          }
        } catch {}
      }
      store.setValue("ignored_events", JSON.stringify(merged));
    }

    store.forEachRow("events", (eventId, _forEachCell) => {
      (store as any).delCell("events", eventId, "ignored");
    });
  }

  store.forEachRow("sessions", (sessionId, _forEachCell) => {
    const eventField = store.getCell("sessions", sessionId, "eventJson") as
      | string
      | undefined;
    if (!eventField) return;

    try {
      JSON.parse(eventField);
      return;
    } catch {}

    const oldEventId = eventField;
    let eventRow: Record<string, unknown> | undefined;
    store.forEachRow("events", (rowId, _forEachCell) => {
      if (eventRow) return;
      const row = store.getRow("events", rowId);
      if (rowId === oldEventId || row?.tracking_id_event === oldEventId) {
        eventRow = row;
      }
    });

    if (eventRow) {
      const sessionEvent = {
        tracking_id: String(eventRow.tracking_id_event ?? oldEventId),
        calendar_id: String(eventRow.calendar_id ?? ""),
        title: String(eventRow.title ?? ""),
        started_at: String(eventRow.started_at ?? ""),
        ended_at: String(eventRow.ended_at ?? ""),
        is_all_day: !!eventRow.is_all_day,
        has_recurrence_rules: !!eventRow.has_recurrence_rules,
        location: eventRow.location ? String(eventRow.location) : undefined,
        meeting_link: eventRow.meeting_link
          ? String(eventRow.meeting_link)
          : undefined,
        description: eventRow.description
          ? String(eventRow.description)
          : undefined,
        recurrence_series_id: eventRow.recurrence_series_id
          ? String(eventRow.recurrence_series_id)
          : undefined,
      };
      store.setPartialRow("sessions", sessionId, {
        eventJson: buildSessionEventJson(sessionEvent),
      });
    } else {
      store.setPartialRow("sessions", sessionId, {
        eventJson: undefined,
      });
    }
  });
}

function migrateIgnoredRecurringSeries(store: Store): void {
  const raw = store.getValue("ignored_recurring_series") as string | undefined;
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    if (typeof parsed[0] === "string") {
      const now = new Date().toISOString();
      const migrated = parsed.map((id: string) => ({
        id,
        last_seen: now,
      }));
      store.setValue("ignored_recurring_series", JSON.stringify(migrated));
    }
  } catch {}
}
