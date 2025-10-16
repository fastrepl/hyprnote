import { differenceInCalendarMonths, differenceInDays, isPast, startOfDay } from "date-fns";

import { format } from "@hypr/utils/datetime";
import type * as persisted from "../store/tinybase/persisted";

export type TimelineEventRow = {
  started_at?: string | null;
  created_at?: string | null;
  title?: string | null;
  [key: string]: unknown;
};

export type TimelineSessionRow = {
  event_started_at?: string | null;
  created_at?: string | null;
  event_id?: string | null;
  title?: string | null;
  [key: string]: unknown;
};

export type EventsWithoutSessionTable = Record<string, TimelineEventRow> | null | undefined;
export type SessionsWithMaybeEventTable = Record<string, TimelineSessionRow> | null | undefined;

export type TimelineItem =
  | { type: "event"; id: string; date: string; data: persisted.Event }
  | { type: "session"; id: string; date: string; data: persisted.Session };

export type TimelinePrecision = "time" | "date";

export type TimelineBucket = {
  label: string;
  precision: TimelinePrecision;
  items: TimelineItem[];
};

export function getBucketInfo(date: Date): { label: string; sortKey: number; precision: TimelinePrecision } {
  const now = startOfDay(new Date());
  const targetDay = startOfDay(date);
  const daysDiff = differenceInDays(targetDay, now);
  const sortKey = targetDay.getTime();
  const absDays = Math.abs(daysDiff);

  if (daysDiff === 0) {
    return { label: "Today", sortKey, precision: "time" };
  }

  if (daysDiff === -1) {
    return { label: "Yesterday", sortKey, precision: "time" };
  }

  if (daysDiff === 1) {
    return { label: "Tomorrow", sortKey, precision: "time" };
  }

  if (daysDiff < 0) {
    if (absDays <= 6) {
      return { label: `${absDays} days ago`, sortKey, precision: "time" };
    }

    if (absDays <= 27) {
      const weeks = Math.max(1, Math.round(absDays / 7));
      const weekStart = startOfDay(new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000));
      const weekSortKey = weekStart.getTime();

      return {
        label: weeks === 1 ? "a week ago" : `${weeks} weeks ago`,
        sortKey: weekSortKey,
        precision: "date",
      };
    }

    let months = Math.abs(differenceInCalendarMonths(targetDay, now));
    if (months === 0) {
      months = 1;
    }
    const monthStart = startOfDay(new Date(targetDay.getFullYear(), targetDay.getMonth(), 1));
    return {
      label: months === 1 ? "a month ago" : `${months} months ago`,
      sortKey: monthStart.getTime(),
      precision: "date",
    };
  }

  if (absDays <= 6) {
    return { label: `in ${absDays} days`, sortKey, precision: "time" };
  }

  if (absDays <= 27) {
    const weeks = Math.max(1, Math.round(absDays / 7));
    const weekStart = startOfDay(new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000));
    const weekSortKey = weekStart.getTime();

    return {
      label: weeks === 1 ? "next week" : `in ${weeks} weeks`,
      sortKey: weekSortKey,
      precision: "date",
    };
  }

  let months = differenceInCalendarMonths(targetDay, now);
  if (months === 0) {
    months = 1;
  }
  const monthStart = startOfDay(new Date(targetDay.getFullYear(), targetDay.getMonth(), 1));
  return {
    label: months === 1 ? "next month" : `in ${months} months`,
    sortKey: monthStart.getTime(),
    precision: "date",
  };
}

export function buildTimelineBuckets({
  eventsWithoutSessionTable,
  sessionsWithMaybeEventTable,
}: {
  eventsWithoutSessionTable: EventsWithoutSessionTable;
  sessionsWithMaybeEventTable: SessionsWithMaybeEventTable;
}): TimelineBucket[] {
  const items: TimelineItem[] = [];
  const seenEvents = new Set<string>();

  eventsWithoutSessionTable
    && Object.entries(eventsWithoutSessionTable).forEach(([eventId, row]) => {
      const rawTimestamp = String(row.started_at ?? "");
      const eventStartTime = new Date(rawTimestamp);

      if (isNaN(eventStartTime.getTime())) {
        return;
      }

      if (eventStartTime && !isPast(eventStartTime)) {
        items.push({
          type: "event",
          id: eventId,
          date: format(eventStartTime, "yyyy-MM-dd"),
          data: row as unknown as persisted.Event,
        });
        seenEvents.add(eventId);
      }
    });

  sessionsWithMaybeEventTable
    && Object.entries(sessionsWithMaybeEventTable).forEach(([sessionId, row]) => {
      const eventId = row.event_id ? String(row.event_id) : undefined;
      if (eventId && seenEvents.has(eventId)) {
        return;
      }

      const rawTimestamp = String(row.event_started_at ?? row.created_at ?? "");
      const date = new Date(rawTimestamp);

      if (isNaN(date.getTime())) {
        return;
      }

      if (date) {
        items.push({
          type: "session",
          id: sessionId,
          date: format(date, "yyyy-MM-dd"),
          data: row as unknown as persisted.Session,
        });
      }
    });

  items.sort((a, b) => {
    const timeA = a.type === "event" ? a.data.started_at : a.data.created_at;
    const timeB = b.type === "event" ? b.data.started_at : b.data.created_at;
    const dateA = new Date(String(timeA ?? ""));
    const dateB = new Date(String(timeB ?? ""));
    const timeAValue = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
    const timeBValue = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
    return timeBValue - timeAValue;
  });

  const bucketMap = new Map<string, { sortKey: number; precision: TimelinePrecision; items: TimelineItem[] }>();

  items.forEach((item) => {
    const itemDate = new Date(item.date);
    const bucket = getBucketInfo(itemDate);

    if (!bucketMap.has(bucket.label)) {
      bucketMap.set(bucket.label, { sortKey: bucket.sortKey, precision: bucket.precision, items: [] });
    }
    bucketMap.get(bucket.label)!.items.push(item);
  });

  const todayBucket = getBucketInfo(new Date());
  if (!bucketMap.has(todayBucket.label)) {
    bucketMap.set(todayBucket.label, {
      sortKey: todayBucket.sortKey,
      precision: todayBucket.precision,
      items: [],
    });
  }

  return Array.from(bucketMap.entries())
    .sort((a, b) => b[1].sortKey - a[1].sortKey)
    .map(([label, value]) => ({ label, items: value.items, precision: value.precision } satisfies TimelineBucket));
}
