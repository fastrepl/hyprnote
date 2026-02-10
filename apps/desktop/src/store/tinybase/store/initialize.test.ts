import { describe, expect, test } from "vitest";

type TableData = Record<string, Record<string, unknown>>;

type MockStoreData = {
  sessions: TableData;
  events: TableData;
  values: Record<string, unknown>;
  humans: TableData;
};

function getTable(data: MockStoreData, table: string): TableData | undefined {
  if (table === "sessions") return data.sessions;
  if (table === "events") return data.events;
  if (table === "humans") return data.humans;
  return undefined;
}

function createMockStore(data: MockStoreData) {
  return {
    hasValue: (key: string) => key in data.values,
    getValue: (key: string) => data.values[key],
    setValue: (key: string, value: unknown) => {
      data.values[key] = value;
    },
    hasRow: (table: string, id: string) => {
      const t = getTable(data, table);
      return t ? id in t : false;
    },
    getRow: (table: string, id: string): Record<string, unknown> => {
      const t = getTable(data, table);
      return t?.[id] ?? {};
    },
    setRow: (table: string, id: string, row: Record<string, unknown>) => {
      const t = getTable(data, table);
      if (t) t[id] = row;
    },
    setPartialRow: (
      table: string,
      id: string,
      partial: Record<string, unknown>,
    ) => {
      const t = getTable(data, table);
      if (t?.[id]) t[id] = { ...t[id], ...partial };
    },
    getCell: (table: string, id: string, cell: string) => {
      const t = getTable(data, table);
      return t?.[id]?.[cell];
    },
    getTableIds: () => Object.keys(data).filter((k) => k !== "values"),
    getTableCellIds: (table: string) => {
      const t = getTable(data, table);
      if (!t) return [];
      const cellIds = new Set<string>();
      for (const row of Object.values(t)) {
        for (const key of Object.keys(row)) {
          cellIds.add(key);
        }
      }
      return [...cellIds];
    },
    getRowIds: (table: string) => {
      const t = getTable(data, table);
      return t ? Object.keys(t) : [];
    },
    delCell: (table: string, id: string, cell: string) => {
      const t = getTable(data, table);
      if (t?.[id]) delete t[id][cell];
    },
    forEachRow: (
      table: string,
      callback: (id: string, forEachCell: unknown) => void,
    ) => {
      const t = getTable(data, table);
      if (t) {
        for (const id of Object.keys(t)) {
          callback(id, () => {});
        }
      }
    },
    transaction: (fn: () => void) => fn(),
  };
}

function runMigrateIgnoredRecurringSeries(
  store: ReturnType<typeof createMockStore>,
) {
  const raw = store.getValue("ignored_recurring_series") as string | undefined;
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    if (typeof parsed[0] === "string") {
      const now = "2024-01-15T00:00:00.000Z";
      const migrated = parsed.map((id: string) => ({
        id,
        last_seen: now,
      }));
      store.setValue("ignored_recurring_series", JSON.stringify(migrated));
    }
  } catch {}
}

function runMigrateSessionEventIds(store: ReturnType<typeof createMockStore>) {
  if (store.getTableCellIds("events").includes("ignored")) {
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

      const ignored = store.getCell("events", rowId, "ignored");
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
      store.delCell("events", eventId, "ignored");
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
      if (
        rowId === oldEventId ||
        (row as Record<string, unknown>)?.tracking_id_event === oldEventId
      ) {
        eventRow = row as Record<string, unknown>;
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
        eventJson: JSON.stringify(sessionEvent),
      });
    } else {
      store.setPartialRow("sessions", sessionId, {
        eventJson: undefined,
      });
    }
  });
}

describe("migrateSessionEventIds - ignored events migration", () => {
  test("collects ignored events from events table into ignored_events value", () => {
    const data: MockStoreData = {
      sessions: {},
      events: {
        "event-1": {
          tracking_id_event: "track-1",
          started_at: "2024-01-15T10:00:00Z",
          ignored: true,
        },
        "event-2": {
          tracking_id_event: "track-2",
          started_at: "2024-01-16T10:00:00Z",
          ignored: false,
        },
        "event-3": {
          tracking_id_event: "track-3",
          started_at: "2024-01-17T10:00:00Z",
          ignored: true,
        },
      },
      values: {},
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateSessionEventIds(store);

    const result = JSON.parse(data.values.ignored_events as string);
    expect(result).toHaveLength(2);
    expect(result[0].tracking_id).toBe("track-1");
    expect(result[0].day).toBe("2024-01-15");
    expect(result[1].tracking_id).toBe("track-3");
    expect(result[1].day).toBe("2024-01-17");
  });

  test("merges with existing ignored_events without duplicates", () => {
    const data: MockStoreData = {
      sessions: {},
      events: {
        "event-1": {
          tracking_id_event: "track-1",
          started_at: "2024-01-15T10:00:00Z",
          ignored: true,
        },
        "event-2": {
          tracking_id_event: "track-2",
          started_at: "2024-01-16T10:00:00Z",
          ignored: true,
        },
      },
      values: {
        ignored_events: JSON.stringify([
          {
            tracking_id: "track-1",
            day: "2024-01-15",
            last_seen: "2024-01-01T00:00:00Z",
          },
        ]),
      },
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateSessionEventIds(store);

    const result = JSON.parse(data.values.ignored_events as string);
    expect(result).toHaveLength(2);
    expect(result[0].tracking_id).toBe("track-1");
    expect(result[0].last_seen).toBe("2024-01-01T00:00:00Z");
    expect(result[1].tracking_id).toBe("track-2");
  });

  test("deletes ignored cell from all events after migration", () => {
    const data: MockStoreData = {
      sessions: {},
      events: {
        "event-1": {
          tracking_id_event: "track-1",
          started_at: "2024-01-15T10:00:00Z",
          ignored: true,
        },
        "event-2": {
          tracking_id_event: "track-2",
          started_at: "2024-01-16T10:00:00Z",
          ignored: false,
        },
      },
      values: {},
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateSessionEventIds(store);

    expect(data.events["event-1"].ignored).toBeUndefined();
    expect(data.events["event-2"].ignored).toBeUndefined();
  });

  test("skips ignored events migration when no events have ignored cell", () => {
    const data: MockStoreData = {
      sessions: {},
      events: {
        "event-1": {
          tracking_id_event: "track-1",
          started_at: "2024-01-15T10:00:00Z",
        },
      },
      values: {},
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateSessionEventIds(store);

    expect(data.values.ignored_events).toBeUndefined();
  });

  test("deduplicates non-recurring events by tracking_id only", () => {
    const data: MockStoreData = {
      sessions: {},
      events: {
        "event-1": {
          tracking_id_event: "track-1",
          started_at: "2024-01-15T10:00:00Z",
          has_recurrence_rules: false,
          ignored: true,
        },
      },
      values: {
        ignored_events: JSON.stringify([
          {
            tracking_id: "track-1",
            day: "2024-01-14",
            last_seen: "2024-01-01T00:00:00Z",
          },
        ]),
      },
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateSessionEventIds(store);

    const result = JSON.parse(data.values.ignored_events as string);
    expect(result).toHaveLength(1);
    expect(result[0].day).toBe("2024-01-14");
  });

  test("deduplicates recurring events by tracking_id and day", () => {
    const data: MockStoreData = {
      sessions: {},
      events: {
        "event-1": {
          tracking_id_event: "track-1",
          started_at: "2024-01-15T10:00:00Z",
          has_recurrence_rules: true,
          ignored: true,
        },
      },
      values: {
        ignored_events: JSON.stringify([
          {
            tracking_id: "track-1",
            day: "2024-01-14",
            last_seen: "2024-01-01T00:00:00Z",
          },
        ]),
      },
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateSessionEventIds(store);

    const result = JSON.parse(data.values.ignored_events as string);
    expect(result).toHaveLength(2);
    expect(result[0].day).toBe("2024-01-14");
    expect(result[1].day).toBe("2024-01-15");
  });

  test("uses fallback day when event has no started_at", () => {
    const data: MockStoreData = {
      sessions: {},
      events: {
        "event-1": {
          tracking_id_event: "track-1",
          ignored: true,
        },
      },
      values: {},
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateSessionEventIds(store);

    const result = JSON.parse(data.values.ignored_events as string);
    expect(result).toHaveLength(1);
    expect(result[0].day).toBe("1970-01-01");
  });
});

describe("migrateIgnoredRecurringSeries", () => {
  test("migrates old string[] format to {id, last_seen}[] format", () => {
    const data: MockStoreData = {
      sessions: {},
      events: {},
      values: {
        ignored_recurring_series: JSON.stringify(["series-1", "series-2"]),
      },
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateIgnoredRecurringSeries(store);

    const result = JSON.parse(data.values.ignored_recurring_series as string);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "series-1" });
    expect(result[0]).toHaveProperty("last_seen");
    expect(result[1]).toMatchObject({ id: "series-2" });
  });

  test("does not modify already-migrated format", () => {
    const entries = [{ id: "series-1", last_seen: "2024-01-01T00:00:00Z" }];
    const data: MockStoreData = {
      sessions: {},
      events: {},
      values: { ignored_recurring_series: JSON.stringify(entries) },
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateIgnoredRecurringSeries(store);

    const result = JSON.parse(data.values.ignored_recurring_series as string);
    expect(result).toEqual(entries);
  });

  test("does nothing for empty array", () => {
    const data: MockStoreData = {
      sessions: {},
      events: {},
      values: { ignored_recurring_series: "[]" },
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateIgnoredRecurringSeries(store);
    expect(data.values.ignored_recurring_series).toBe("[]");
  });
});

describe("migrateSessionEventIds", () => {
  test("converts old event_id string to embedded event JSON", () => {
    const data: MockStoreData = {
      sessions: {
        "session-1": { eventJson: "event-1", title: "Test" },
      },
      events: {
        "event-1": {
          tracking_id_event: "track-1",
          calendar_id: "cal-1",
          title: "Meeting",
          started_at: "2024-01-15T10:00:00Z",
          ended_at: "2024-01-15T11:00:00Z",
          is_all_day: false,
          has_recurrence_rules: false,
        },
      },
      values: {},
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateSessionEventIds(store);

    const eventJson = data.sessions["session-1"].eventJson as string;
    const parsed = JSON.parse(eventJson);
    expect(parsed.tracking_id).toBe("track-1");
    expect(parsed.calendar_id).toBe("cal-1");
    expect(parsed.title).toBe("Meeting");
    expect(parsed.has_recurrence_rules).toBe(false);
  });

  test("clears eventJson when old event_id has no matching event row", () => {
    const data: MockStoreData = {
      sessions: {
        "session-1": { eventJson: "nonexistent-event", title: "Test" },
      },
      events: {},
      values: {},
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateSessionEventIds(store);

    expect(data.sessions["session-1"].eventJson).toBeUndefined();
  });

  test("skips sessions that already have valid JSON in eventJson", () => {
    const existingJson = JSON.stringify({
      tracking_id: "track-1",
      calendar_id: "cal-1",
      title: "Already Migrated",
      started_at: "2024-01-15T10:00:00Z",
      ended_at: "2024-01-15T11:00:00Z",
      is_all_day: false,
      has_recurrence_rules: false,
    });
    const data: MockStoreData = {
      sessions: {
        "session-1": { eventJson: existingJson, title: "Test" },
      },
      events: {},
      values: {},
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateSessionEventIds(store);

    expect(data.sessions["session-1"].eventJson).toBe(existingJson);
  });

  test("skips sessions without eventJson", () => {
    const data: MockStoreData = {
      sessions: {
        "session-1": { title: "No Event" },
      },
      events: {},
      values: {},
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateSessionEventIds(store);

    expect(data.sessions["session-1"].eventJson).toBeUndefined();
  });

  test("finds event by tracking_id_event when event_id does not match row id", () => {
    const data: MockStoreData = {
      sessions: {
        "session-1": { eventJson: "track-1", title: "Test" },
      },
      events: {
        "different-row-id": {
          tracking_id_event: "track-1",
          calendar_id: "cal-1",
          title: "Found by Tracking",
          started_at: "2024-01-15T10:00:00Z",
          ended_at: "2024-01-15T11:00:00Z",
        },
      },
      values: {},
      humans: {},
    };
    const store = createMockStore(data);
    runMigrateSessionEventIds(store);

    const eventJson = data.sessions["session-1"].eventJson as string;
    const parsed = JSON.parse(eventJson);
    expect(parsed.tracking_id).toBe("track-1");
    expect(parsed.title).toBe("Found by Tracking");
  });
});
