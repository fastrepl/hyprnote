import {
  format,
  isThisYear,
  isToday,
  isYesterday,
  isThisWeek,
  differenceInCalendarDays,
  startOfToday,
} from "date-fns";
import { type Session } from "@hypr/plugin-db";

export type GroupedSessions = Record<
  string,
  { date: Date; sessions: Session[] }
>;

export function formatDateHeader(date: Date): string {
  if (isToday(date)) {
    return "Today";
  }

  if (isYesterday(date)) {
    return "Yesterday";
  }

  const daysDiff = differenceInCalendarDays(startOfToday(), date);

  if (daysDiff > 1 && daysDiff <= 7) {
    if (isThisWeek(date)) {
      return format(date, "EEEE");
    }
    return `Last ${format(date, "EEEE")}`;
  }

  if (isThisYear(date)) {
    return format(date, "MMM d");
  }

  return format(date, "MMM d, yyyy");
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

export function groupSessionsByDate(sessions: Session[]): GroupedSessions {
  return sessions.reduce<GroupedSessions>((groups, session) => {
    const timestamp = parseFloat(session.timestamp);
    const date = new Date(timestamp);
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

export function getSortedDates(groupedSessions: GroupedSessions): string[] {
  return Object.keys(groupedSessions).sort((a, b) => b.localeCompare(a));
}
