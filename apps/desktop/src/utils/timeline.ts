import type { Event, Session } from "@hypr/store";
import { isPast, safeFormat, safeParseDate } from "@hypr/utils";

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function getDatePartsInTimezone(date: Date, timezone?: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const formatted = formatter.format(date);
  const [year, month, day] = formatted.split("-").map(Number);
  return { year, month, day };
}

function datePartsToUtcMidnight(parts: DateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function differenceInCalendarDaysInTimezone(
  dateLeft: Date,
  dateRight: Date,
  timezone?: string,
): number {
  const leftParts = getDatePartsInTimezone(dateLeft, timezone);
  const rightParts = getDatePartsInTimezone(dateRight, timezone);
  const leftUtc = datePartsToUtcMidnight(leftParts);
  const rightUtc = datePartsToUtcMidnight(rightParts);
  return Math.round((leftUtc - rightUtc) / (1000 * 60 * 60 * 24));
}

function differenceInCalendarMonthsInTimezone(
  dateLeft: Date,
  dateRight: Date,
  timezone?: string,
): number {
  const leftParts = getDatePartsInTimezone(dateLeft, timezone);
  const rightParts = getDatePartsInTimezone(dateRight, timezone);
  return (
    (leftParts.year - rightParts.year) * 12 +
    (leftParts.month - rightParts.month)
  );
}

function getSortKeyForDateInTimezone(date: Date, timezone?: string): number {
  const parts = getDatePartsInTimezone(date, timezone);
  return datePartsToUtcMidnight(parts);
}

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

export type EventsWithoutSessionTable =
  | Record<string, TimelineEventRow>
  | null
  | undefined;
export type SessionsWithMaybeEventTable =
  | Record<string, TimelineSessionRow>
  | null
  | undefined;

export type EventTimelineItem = {
  type: "event";
  id: string;
  date: string;
  data: Event;
};
export type SessionTimelineItem = {
  type: "session";
  id: string;
  date: string;
  data: Session;
};
export type TimelineItem = EventTimelineItem | SessionTimelineItem;

export type TimelinePrecision = "time" | "date";

export type TimelineBucket = {
  label: string;
  precision: TimelinePrecision;
  items: TimelineItem[];
};

export function getBucketInfo(
  date: Date,
  timezone?: string,
): {
  label: string;
  sortKey: number;
  precision: TimelinePrecision;
} {
  const now = new Date();
  const daysDiff = differenceInCalendarDaysInTimezone(date, now, timezone);
  const sortKey = getSortKeyForDateInTimezone(date, timezone);
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
      const weekRangeEndDay = Math.max(7, weeks * 7 - 3);
      const weekRangeEnd = new Date(
        now.getTime() - weekRangeEndDay * 24 * 60 * 60 * 1000,
      );
      const weekSortKey = getSortKeyForDateInTimezone(weekRangeEnd, timezone);

      return {
        label: weeks === 1 ? "a week ago" : `${weeks} weeks ago`,
        sortKey: weekSortKey,
        precision: "date",
      };
    }

    let months = Math.abs(
      differenceInCalendarMonthsInTimezone(date, now, timezone),
    );
    if (months === 0) {
      months = 1;
    }
    const targetParts = getDatePartsInTimezone(date, timezone);
    const monthStartKey = datePartsToUtcMidnight({
      year: targetParts.year,
      month: targetParts.month,
      day: 1,
    });
    const lastDayInMonthBucket = new Date(
      now.getTime() - 28 * 24 * 60 * 60 * 1000,
    );
    const lastDayKey = getSortKeyForDateInTimezone(
      lastDayInMonthBucket,
      timezone,
    );
    const monthSortKey = Math.min(monthStartKey, lastDayKey);
    return {
      label: months === 1 ? "a month ago" : `${months} months ago`,
      sortKey: monthSortKey,
      precision: "date",
    };
  }

  if (absDays <= 6) {
    return { label: `in ${absDays} days`, sortKey, precision: "time" };
  }

  if (absDays <= 27) {
    const weeks = Math.max(1, Math.round(absDays / 7));
    const weekRangeStartDay = Math.max(7, weeks * 7 - 3);
    const weekRangeStart = new Date(
      now.getTime() + weekRangeStartDay * 24 * 60 * 60 * 1000,
    );
    const weekSortKey = getSortKeyForDateInTimezone(weekRangeStart, timezone);

    return {
      label: weeks === 1 ? "next week" : `in ${weeks} weeks`,
      sortKey: weekSortKey,
      precision: "date",
    };
  }

  let months = differenceInCalendarMonthsInTimezone(date, now, timezone);
  if (months === 0) {
    months = 1;
  }
  const targetParts = getDatePartsInTimezone(date, timezone);
  const monthStartKey = datePartsToUtcMidnight({
    year: targetParts.year,
    month: targetParts.month,
    day: 1,
  });
  const firstDayInMonthBucket = new Date(
    now.getTime() + 28 * 24 * 60 * 60 * 1000,
  );
  const firstDayKey = getSortKeyForDateInTimezone(
    firstDayInMonthBucket,
    timezone,
  );
  const monthSortKey = Math.max(monthStartKey, firstDayKey);
  return {
    label: months === 1 ? "next month" : `in ${months} months`,
    sortKey: monthSortKey,
    precision: "date",
  };
}

export function calculateIndicatorIndex(
  entries: Array<{ timestamp: Date | null }>,
  current: Date,
): number {
  const index = entries.findIndex(({ timestamp }) => {
    if (!timestamp) {
      return true;
    }

    return timestamp.getTime() < current.getTime();
  });

  if (index === -1) {
    return entries.length;
  }

  return index;
}

export function buildTimelineBuckets({
  eventsWithoutSessionTable,
  sessionsWithMaybeEventTable,
  timezone,
}: {
  eventsWithoutSessionTable: EventsWithoutSessionTable;
  sessionsWithMaybeEventTable: SessionsWithMaybeEventTable;
  timezone?: string;
}): TimelineBucket[] {
  const items: TimelineItem[] = [];
  const seenEvents = new Set<string>();

  if (eventsWithoutSessionTable) {
    Object.entries(eventsWithoutSessionTable).forEach(([eventId, row]) => {
      const eventStartTime = safeParseDate(row.started_at);

      if (!eventStartTime) {
        return;
      }

      const eventEndTime = safeParseDate((row as unknown as Event).ended_at);
      const timeToCheck = eventEndTime || eventStartTime;

      if (!isPast(timeToCheck)) {
        items.push({
          type: "event",
          id: eventId,
          date: safeFormat(eventStartTime, "yyyy-MM-dd"),
          data: row as unknown as Event,
        });
        seenEvents.add(eventId);
      }
    });
  }

  if (sessionsWithMaybeEventTable) {
    Object.entries(sessionsWithMaybeEventTable).forEach(([sessionId, row]) => {
      const eventId = row.event_id ? String(row.event_id) : undefined;
      if (eventId && seenEvents.has(eventId)) {
        return;
      }

      const date = safeParseDate(row.event_started_at ?? row.created_at);

      if (!date) {
        return;
      }

      items.push({
        type: "session",
        id: sessionId,
        date: safeFormat(date, "yyyy-MM-dd"),
        data: row as unknown as Session,
      });
    });
  }

  items.sort((a, b) => {
    const timeA =
      a.type === "event"
        ? a.data.started_at
        : ((a.data as unknown as TimelineSessionRow).event_started_at ??
          a.data.created_at);
    const timeB =
      b.type === "event"
        ? b.data.started_at
        : ((b.data as unknown as TimelineSessionRow).event_started_at ??
          b.data.created_at);
    const dateA = safeParseDate(timeA);
    const dateB = safeParseDate(timeB);
    const timeAValue = dateA?.getTime() ?? 0;
    const timeBValue = dateB?.getTime() ?? 0;
    return timeBValue - timeAValue;
  });

  const bucketMap = new Map<
    string,
    { sortKey: number; precision: TimelinePrecision; items: TimelineItem[] }
  >();

  items.forEach((item) => {
    const timestamp =
      item.type === "event"
        ? item.data.started_at
        : ((item.data as unknown as TimelineSessionRow).event_started_at ??
          item.data.created_at);
    const itemDate =
      safeParseDate(timestamp) ?? new Date(item.date + "T12:00:00");
    const bucket = getBucketInfo(itemDate, timezone);

    if (!bucketMap.has(bucket.label)) {
      bucketMap.set(bucket.label, {
        sortKey: bucket.sortKey,
        precision: bucket.precision,
        items: [],
      });
    }
    bucketMap.get(bucket.label)!.items.push(item);
  });

  return Array.from(bucketMap.entries())
    .sort((a, b) => b[1].sortKey - a[1].sortKey)
    .map(
      ([label, value]) =>
        ({
          label,
          items: value.items,
          precision: value.precision,
        }) satisfies TimelineBucket,
    );
}
