import { describe, expect, test } from "vitest";

import type { Ctx } from "../../ctx";
import type { ExistingEvent, IncomingEvent } from "../../fetch/types";
import { syncEvents } from "./sync";

function createMockStore(config: {
  eventToSession?: Map<string, string>;
  nonEmptySessions?: Set<string>;
}) {
  const eventToSession = config.eventToSession ?? new Map();
  const nonEmptySessions = config.nonEmptySessions ?? new Set();

  const sessionToEvent = new Map<string, string>();
  for (const [eventId, sessionId] of eventToSession) {
    sessionToEvent.set(sessionId, eventId);
  }

  return {
    getRow: (table: string, id: string) => {
      if (table === "sessions") {
        const eventId = sessionToEvent.get(id);
        if (!eventId) return {};
        const hasContent = nonEmptySessions.has(id);
        return {
          event_id: eventId,
          raw_md: hasContent ? "some content" : "",
        };
      }
      return {};
    },
    forEachRow: (table: string, callback: (rowId: string) => void) => {
      if (table === "sessions") {
        for (const sessionId of sessionToEvent.keys()) {
          callback(sessionId);
        }
      }
    },
  } as unknown as Ctx["store"];
}

function createMockCtx(
  overrides: Partial<Ctx> & {
    eventToSession?: Map<string, string>;
    nonEmptySessions?: Set<string>;
  } = {},
): Ctx {
  const store = createMockStore({
    eventToSession: overrides.eventToSession,
    nonEmptySessions: overrides.nonEmptySessions,
  });

  return {
    userId: "user-1",
    from: new Date("2024-01-01"),
    to: new Date("2024-02-01"),
    calendarIds: overrides.calendarIds ?? new Set(["cal-1"]),
    calendarTrackingIdToId:
      overrides.calendarTrackingIdToId ??
      new Map([["tracking-cal-1", "cal-1"]]),
    store,
    ...overrides,
  };
}

function createIncomingEvent(
  overrides: Partial<IncomingEvent> & { id?: string } = {},
): IncomingEvent {
  const startedAt = overrides.started_at ?? "2024-01-15T10:00:00Z";
  const trackingIdEvent = overrides.tracking_id_event ?? "incoming-1";
  return {
    id: overrides.id ?? `apple:${trackingIdEvent}:${startedAt}`,
    tracking_id_event: trackingIdEvent,
    tracking_id_calendar: "tracking-cal-1",
    title: "Test Event",
    started_at: startedAt,
    ended_at: "2024-01-15T11:00:00Z",
    ...overrides,
  };
}

function createExistingEvent(
  overrides: Partial<ExistingEvent> = {},
): ExistingEvent {
  const startedAt = overrides.started_at ?? "2024-01-15T10:00:00Z";
  const trackingIdEvent = overrides.tracking_id_event ?? "existing-1";
  return {
    id: overrides.id ?? `apple:${trackingIdEvent}:${startedAt}`,
    tracking_id_event: trackingIdEvent,
    calendar_id: "cal-1",
    user_id: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    title: "Existing Event",
    started_at: startedAt,
    ended_at: "2024-01-15T11:00:00Z",
    ...overrides,
  };
}

describe("syncEvents", () => {
  test("adds new incoming events", () => {
    const ctx = createMockCtx();
    const result = syncEvents(ctx, {
      incoming: [createIncomingEvent()],
      existing: [],
    });

    expect(result.toAdd).toHaveLength(1);
    expect(result.toDelete).toHaveLength(0);
    expect(result.toUpdate).toHaveLength(0);
  });

  test("deletes events from disabled calendars", () => {
    const ctx = createMockCtx({ calendarIds: new Set(["cal-2"]) });
    const existingEvent = createExistingEvent();
    const result = syncEvents(ctx, {
      incoming: [],
      existing: [existingEvent],
    });

    expect(result.toDelete).toContain(existingEvent.id);
  });

  test("updates existing events with matching id", () => {
    const ctx = createMockCtx();
    const existingEvent = createExistingEvent({
      tracking_id_event: "shared-1",
    });
    const incomingEvent = createIncomingEvent({
      id: existingEvent.id,
      tracking_id_event: "shared-1",
    });
    const result = syncEvents(ctx, {
      incoming: [incomingEvent],
      existing: [existingEvent],
    });

    expect(result.toUpdate).toHaveLength(1);
    expect(result.toAdd).toHaveLength(0);
    expect(result.toDelete).toHaveLength(0);
  });

  test("deletes orphaned events without matching incoming", () => {
    const ctx = createMockCtx();
    const existingEvent = createExistingEvent();
    const result = syncEvents(ctx, {
      incoming: [],
      existing: [existingEvent],
    });

    expect(result.toDelete).toContain(existingEvent.id);
  });

  describe("removed calendar cleanup", () => {
    test("deletes events when calendar removed from Apple Calendar (no incoming events)", () => {
      const ctx = createMockCtx({
        calendarIds: new Set(["cal-1"]),
        calendarTrackingIdToId: new Map([["tracking-cal-1", "cal-1"]]),
      });

      const event1 = createExistingEvent({ tracking_id_event: "track-1" });
      const event2 = createExistingEvent({ tracking_id_event: "track-2" });

      const result = syncEvents(ctx, {
        incoming: [],
        existing: [event1, event2],
      });

      expect(result.toDelete).toContain(event1.id);
      expect(result.toDelete).toContain(event2.id);
      expect(result.toDelete).toHaveLength(2);
    });

    test("preserves events with non-empty sessions when calendar removed", () => {
      const event1 = createExistingEvent({ tracking_id_event: "track-1" });
      const event2 = createExistingEvent({ tracking_id_event: "track-2" });

      const ctx = createMockCtx({
        calendarIds: new Set(["cal-1"]),
        eventToSession: new Map([[event1.id, "session-1"]]),
        nonEmptySessions: new Set(["session-1"]),
      });

      const result = syncEvents(ctx, {
        incoming: [],
        existing: [event1, event2],
      });

      expect(result.toDelete).not.toContain(event1.id);
      expect(result.toDelete).toContain(event2.id);
    });

    test("deletes events with empty sessions when calendar removed", () => {
      const event1 = createExistingEvent({ tracking_id_event: "track-1" });

      const ctx = createMockCtx({
        calendarIds: new Set(["cal-1"]),
        eventToSession: new Map([[event1.id, "session-1"]]),
        nonEmptySessions: new Set(),
      });

      const result = syncEvents(ctx, {
        incoming: [],
        existing: [event1],
      });

      expect(result.toDelete).toContain(event1.id);
    });

    test("only deletes events from removed calendar, keeps events from active calendars", () => {
      const ctx = createMockCtx({
        calendarIds: new Set(["cal-1", "cal-2"]),
        calendarTrackingIdToId: new Map([
          ["tracking-cal-1", "cal-1"],
          ["tracking-cal-2", "cal-2"],
        ]),
      });

      const event1 = createExistingEvent({
        calendar_id: "cal-1",
        tracking_id_event: "track-1",
      });
      const event2 = createExistingEvent({
        calendar_id: "cal-2",
        tracking_id_event: "track-2",
      });
      const incomingEvent2 = createIncomingEvent({
        id: event2.id,
        tracking_id_event: "track-2",
        tracking_id_calendar: "tracking-cal-2",
      });

      const result = syncEvents(ctx, {
        incoming: [incomingEvent2],
        existing: [event1, event2],
      });

      expect(result.toDelete).toContain(event1.id);
      expect(result.toDelete).not.toContain(event2.id);
      expect(result.toUpdate).toHaveLength(1);
    });
  });

  describe("disabled calendar cleanup", () => {
    test("preserves events with non-empty sessions when calendar disabled", () => {
      const event1 = createExistingEvent({ calendar_id: "cal-1" });

      const ctx = createMockCtx({
        calendarIds: new Set(["cal-2"]),
        eventToSession: new Map([[event1.id, "session-1"]]),
        nonEmptySessions: new Set(["session-1"]),
      });

      const result = syncEvents(ctx, {
        incoming: [],
        existing: [event1],
      });

      expect(result.toDelete).not.toContain(event1.id);
    });

    test("deletes events from disabled calendar without sessions", () => {
      const event1 = createExistingEvent({ calendar_id: "cal-1" });

      const ctx = createMockCtx({
        calendarIds: new Set(["cal-2"]),
      });

      const result = syncEvents(ctx, {
        incoming: [],
        existing: [event1],
      });

      expect(result.toDelete).toContain(event1.id);
    });
  });
});
