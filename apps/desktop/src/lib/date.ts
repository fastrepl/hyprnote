// TODO: move all to utils/datetime

import { tz } from "@date-fns/tz";
import { differenceInCalendarDays, format, isThisWeek, isThisYear, isToday, isYesterday, startOfToday } from "date-fns";

import { type Session } from "@hypr/plugin-db";

export type GroupedSessions = Record<
  string,
  { date: Date; sessions: Session[] }
>;

export const timezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export function formatDateHeader(date: Date): string {
  const userTimeZone = timezone();
  const tzOptions = { in: tz(userTimeZone) };

  if (isToday(date, tzOptions)) {
    return "Today";
  }

  if (isYesterday(date, tzOptions)) {
    return "Yesterday";
  }

  const todayStart = startOfToday();
  const daysDiff = differenceInCalendarDays(todayStart, date, tzOptions);

  if (daysDiff > 1 && daysDiff <= 7) {
    if (isThisWeek(date, tzOptions)) {
      return format(date, "EEEE", tzOptions);
    }
    return `Last ${format(date, "EEEE", tzOptions)}`;
  }

  if (isThisYear(date, tzOptions)) {
    return format(date, "MMM d", tzOptions);
  }

  return format(date, "MMM d, yyyy", tzOptions);
}

export function formatRemainingTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} later`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} later`;
  } else if (minutes > 1) {
    return `${minutes} minutes later`;
  } else if (minutes > 0) {
    return "Starting soon";
  } else {
    return "In progress";
  }
}

// We can use native groupBy implemented in browser
export function groupSessionsByDate(sessions: Session[]): GroupedSessions {
  return sessions.reduce<GroupedSessions>((groups, session) => {
    const date = new Date(session.created_at);
    const dateKey = format(date, "yyyy-MM-dd");

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date,
        sessions: [],
      };
    }

    groups[dateKey].sessions.push(session);
    return groups;
  }, {});
}

// TODO ;Move inside Notelist
export function getSortedDates(groupedSessions: GroupedSessions): string[] {
  return Object.keys(groupedSessions).sort((a, b) => b.localeCompare(a));
}
