import { isPast, safeParseDate } from "@hypr/utils";

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

// comes from QUERIES.timelineEvents
export type TimelineEventRow = {
  title?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  calendar_id?: string | null;
  recurrence_series_id?: string | null;
};

// comes from QUERIES.timelineSessions
export type TimelineSessionRow = {
  title?: string | null;
  created_at?: string | null;
  event_id?: string | null;
  folder_id?: string | null;
  event_started_at?: string | null;
};

export type TimelineEventsTable =
  | Record<string, TimelineEventRow>
  | null
  | undefined;
export type TimelineSessionsTable =
  | Record<string, TimelineSessionRow>
  | null
  | undefined;

export type EventTimelineItem = {
  type: "event";
  id: string;
  data: TimelineEventRow;
};
export type SessionTimelineItem = {
  type: "session";
  id: string;
  data: TimelineSessionRow;
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

export function getItemTimestamp(item: TimelineItem): Date | null {
  const value =
    item.type === "event"
      ? item.data.started_at
      : (item.data.event_started_at ?? item.data.created_at);
  return safeParseDate(value);
}

export function buildTimelineBuckets({
  timelineEventsTable,
  timelineSessionsTable,
  timezone,
}: {
  timelineEventsTable: TimelineEventsTable;
  timelineSessionsTable: TimelineSessionsTable;
  timezone?: string;
}): TimelineBucket[] {
  const items: TimelineItem[] = [];
  const seenEventIds = new Set<string>();

  if (timelineSessionsTable) {
    Object.entries(timelineSessionsTable).forEach(([sessionId, row]) => {
      const startTime = safeParseDate(row.event_started_at ?? row.created_at);

      if (!startTime) {
        return;
      }

      items.push({
        type: "session",
        id: sessionId,
        data: row,
      });
      if (row.event_id) {
        seenEventIds.add(row.event_id);
      }
    });
  }

  if (timelineEventsTable) {
    Object.entries(timelineEventsTable).forEach(([eventId, row]) => {
      // only return events without sessions for timeline
      if (seenEventIds.has(eventId)) {
        return;
      }
      const eventStartTime = safeParseDate(row.started_at);
      const eventEndTime = safeParseDate(row.ended_at);
      const timeToCheck = eventEndTime || eventStartTime;
      if (!timeToCheck) {
        return;
      }

      if (!isPast(timeToCheck)) {
        items.push({
          type: "event",
          id: eventId,
          data: row,
        });
      }
    });
  }

  items.sort((a, b) => {
    const dateA = getItemTimestamp(a);
    const dateB = getItemTimestamp(b);
    const timeAValue = dateA?.getTime() ?? 0;
    const timeBValue = dateB?.getTime() ?? 0;
    return timeBValue - timeAValue;
  });

  const bucketMap = new Map<
    string,
    { sortKey: number; precision: TimelinePrecision; items: TimelineItem[] }
  >();

  items.forEach((item) => {
    const bucket = getBucketInfo(
      getItemTimestamp(item) ?? new Date(0),
      timezone,
    );

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
