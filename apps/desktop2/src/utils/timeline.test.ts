process.env.TZ = "UTC";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  buildTimelineBuckets,
  type EventsWithoutSessionTable,
  getBucketInfo,
  type SessionsWithMaybeEventTable,
} from "./timeline";

const SYSTEM_TIME = new Date("2024-01-15T12:00:00.000Z");

describe("timeline utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(SYSTEM_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("getBucketInfo returns Today for current date", () => {
    const info = getBucketInfo(new Date("2024-01-15T05:00:00.000Z"));
    expect(info).toMatchObject({ label: "Today", precision: "time" });
  });

  test("getBucketInfo groups recent past days", () => {
    const info = getBucketInfo(new Date("2024-01-10T05:00:00.000Z"));
    expect(info).toMatchObject({ label: "5 days ago", precision: "time" });
  });

  test("getBucketInfo groups distant future months", () => {
    const info = getBucketInfo(new Date("2024-03-20T12:00:00.000Z"));
    expect(info).toMatchObject({ label: "in 2 months", precision: "date" });
  });

  test("buildTimelineBuckets includes Today bucket even without items", () => {
    const buckets = buildTimelineBuckets({
      eventsWithoutSessionTable: null,
      sessionsWithMaybeEventTable: null,
    });

    const todayBucket = buckets.find(bucket => bucket.label === "Today");
    expect(todayBucket).toBeDefined();
    expect(todayBucket?.items).toEqual([]);
  });

  test("buildTimelineBuckets prioritizes upcoming events and avoids duplicate sessions", () => {
    const eventsWithoutSessionTable: EventsWithoutSessionTable = {
      "event-1": {
        title: "Future Event",
        started_at: "2024-01-18T12:00:00.000Z",
        ended_at: "2024-01-18T13:00:00.000Z",
        created_at: "2024-01-10T12:00:00.000Z",
        calendar_id: "cal-1",
        user_id: "user-1",
      },
    };

    const sessionsWithMaybeEventTable: SessionsWithMaybeEventTable = {
      "session-1": {
        title: "Linked Session",
        created_at: "2024-01-10T12:00:00.000Z",
        event_id: "event-1",
        event_started_at: "2024-01-18T12:00:00.000Z",
        user_id: "user-1",
        raw_md: "",
        enhanced_md: "",
        transcript: { words: [] },
      },
      "session-2": {
        title: "Standalone Session",
        created_at: "2024-01-14T12:00:00.000Z",
        user_id: "user-1",
        raw_md: "",
        enhanced_md: "",
        transcript: { words: [] },
      },
    };

    const buckets = buildTimelineBuckets({ eventsWithoutSessionTable, sessionsWithMaybeEventTable });

    const futureBucket = buckets[0];
    expect(futureBucket.label).toBe("in 3 days");
    expect(futureBucket.items).toHaveLength(1);
    expect(futureBucket.items[0]).toMatchObject({ type: "event", id: "event-1" });

    const sessionBucket = buckets.find(bucket => bucket.items.some(item => item.id === "session-2"));
    expect(sessionBucket).toBeDefined();
    expect(sessionBucket?.items).toHaveLength(1);
    const containsLinkedSession = buckets.some(bucket => bucket.items.some(item => item.id === "session-1"));
    expect(containsLinkedSession).toBe(false);
  });

  test("buildTimelineBuckets excludes past events but keeps related sessions", () => {
    const eventsWithoutSessionTable: EventsWithoutSessionTable = {
      "event-past": {
        title: "Past Event",
        started_at: "2024-01-10T10:00:00.000Z",
        ended_at: "2024-01-10T11:00:00.000Z",
        created_at: "2024-01-05T09:00:00.000Z",
        calendar_id: "cal-1",
        user_id: "user-1",
      },
    };

    const sessionsWithMaybeEventTable: SessionsWithMaybeEventTable = {
      "session-past": {
        title: "Follow-up Session",
        created_at: "2024-01-10T12:00:00.000Z",
        event_id: "event-past",
        event_started_at: "2024-01-10T10:00:00.000Z",
        user_id: "user-1",
        raw_md: "",
        enhanced_md: "",
        transcript: { words: [] },
      },
    };

    const buckets = buildTimelineBuckets({ eventsWithoutSessionTable, sessionsWithMaybeEventTable });

    const pastBucket = buckets.find(bucket => bucket.label === "5 days ago");
    expect(pastBucket).toBeDefined();
    expect(pastBucket?.items).toHaveLength(1);
    expect(pastBucket?.items[0]).toMatchObject({ type: "session", id: "session-past" });

    const hasPastEvent = buckets.some(bucket => bucket.items.some(item => item.id === "event-past"));
    expect(hasPastEvent).toBe(false);

    const todayBucket = buckets.find(bucket => bucket.label === "Today");
    expect(todayBucket).toBeDefined();
  });

  test("buildTimelineBuckets sorts buckets by most recent first", () => {
    const sessionsWithMaybeEventTable: SessionsWithMaybeEventTable = {
      "session-future": {
        title: "Future Session",
        created_at: "2024-01-10T12:00:00.000Z",
        event_started_at: "2024-01-16T09:00:00.000Z",
        user_id: "user-1",
        raw_md: "",
        enhanced_md: "",
        transcript: { words: [] },
      },
      "session-past": {
        title: "Past Session",
        created_at: "2024-01-14T09:00:00.000Z",
        user_id: "user-1",
        raw_md: "",
        enhanced_md: "",
        transcript: { words: [] },
      },
    };

    const buckets = buildTimelineBuckets({ eventsWithoutSessionTable: null, sessionsWithMaybeEventTable });

    expect(buckets.map(bucket => bucket.label)).toEqual(["Tomorrow", "Today", "Yesterday"]);
  });
});
