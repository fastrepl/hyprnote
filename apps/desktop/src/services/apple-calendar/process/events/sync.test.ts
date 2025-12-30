import { describe, expect, test } from "vitest";

import type { Ctx } from "../../ctx";
import type { ExistingEvent, IncomingEvent } from "../../fetch/types";
import { syncEvents } from "./sync";

function createMockCtx(
  overrides: Partial<Ctx> & {
    sessionEvents?: Map<string, string>;
    nonEmptySessions?: Set<string>;
  } = {},
): Ctx {
  const sessionEvents = overrides.sessionEvents ?? new Map();
  const nonEmptySessions = overrides.nonEmptySessions ?? new Set();

  return {
    userId: "user-1",
    from: new Date("2024-01-01"),
    to: new Date("2024-02-01"),
    calendarIds: overrides.calendarIds ?? new Set(["cal-1"]),
    calendarTrackingIdToId:
      overrides.calendarTrackingIdToId ??
      new Map([["tracking-cal-1", "cal-1"]]),
    store: {
      getRow: (_table: string, id: string) => {
        if (sessionEvents.has(id)) {
          const sessionId = sessionEvents.get(id);
          return { event_id: id, id: sessionId };
        }
        const sessionId = sessionEvents.get(id);
        if (sessionId && nonEmptySessions.has(sessionId)) {
          return { transcript: "some content" };
        }
        return {};
      },
      forEachRow: () => {},
    } as unknown as Ctx["store"],
    ...overrides,
  };
}

function createIncomingEvent(
  overrides: Partial<IncomingEvent> = {},
): IncomingEvent {
  return {
    tracking_id_event: "incoming-1",
    tracking_id_calendar: "tracking-cal-1",
    title: "Test Event",
    started_at: "2024-01-15T10:00:00Z",
    ended_at: "2024-01-15T11:00:00Z",
    participants: [],
    ...overrides,
  };
}

function createExistingEvent(
  overrides: Partial<ExistingEvent> = {},
): ExistingEvent {
  return {
    id: "event-1",
    tracking_id_event: "existing-1",
    calendar_id: "cal-1",
    user_id: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    title: "Existing Event",
    started_at: "2024-01-15T10:00:00Z",
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

  test("deletes events not in incoming and not in enabled calendars", () => {
    const ctx = createMockCtx({ calendarIds: new Set(["cal-2"]) });
    const result = syncEvents(ctx, {
      incoming: [],
      existing: [createExistingEvent()],
    });

    expect(result.toDelete).toContain("event-1");
  });

  test("updates existing events with matching tracking id", () => {
    const ctx = createMockCtx();
    const result = syncEvents(ctx, {
      incoming: [createIncomingEvent({ tracking_id_event: "existing-1" })],
      existing: [createExistingEvent()],
    });

    expect(result.toUpdate).toHaveLength(1);
    expect(result.toAdd).toHaveLength(0);
    expect(result.toDelete).toHaveLength(0);
  });

  test("deletes orphaned events without matching incoming", () => {
    const ctx = createMockCtx();
    const result = syncEvents(ctx, {
      incoming: [],
      existing: [createExistingEvent()],
    });

    expect(result.toDelete).toContain("event-1");
  });
});
