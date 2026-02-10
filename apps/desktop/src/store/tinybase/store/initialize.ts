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
    migrateIgnoredEvents(store);
  });
}

function migrateSessionEventIds(store: Store): void {
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

function migrateIgnoredEvents(store: Store): void {
  const raw = store.getValue("ignored_events") as string | undefined;
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    const needsMigration = parsed.some(
      (e: { day?: string }) => typeof e.day !== "string",
    );
    if (needsMigration) {
      const migrated = parsed.filter(
        (e: { day?: string }) => typeof e.day === "string",
      );
      store.setValue("ignored_events", JSON.stringify(migrated));
    }
  } catch {}
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
