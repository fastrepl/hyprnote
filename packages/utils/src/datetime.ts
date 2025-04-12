import * as FNS_TZ from "@date-fns/tz";
import { i18n } from "@lingui/core";
import * as FNS from "date-fns";

export const format = (
  date: Parameters<typeof FNS.format>[0],
  format: Parameters<typeof FNS.format>[1],
  options?: Parameters<typeof FNS.format>[2],
) => {
  const tz = options?.in ?? FNS_TZ.tz(timezone());
  return FNS.format(new Date(date), format, { ...options, in: tz });
};

export function formatRemainingTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return i18n._("{days} day{plural} later", {
      days,
      plural: days > 1 ? "s" : "",
    });
  } else if (hours > 0) {
    return i18n._("{hours} hour{plural} later", {
      hours,
      plural: hours > 1 ? "s" : "",
    });
  } else if (minutes > 1) {
    return i18n._("{minutes} minutes later", {
      minutes,
    });
  } else if (minutes > 0) {
    return i18n._("Starting soon");
  } else {
    return i18n._("In progress");
  }
}

export const formatRelative = (date: string | null | undefined, t?: string) => {
  if (!date) {
    return i18n._("Unknown date");
  }

  try {
    const tz = FNS_TZ.tz(t ?? timezone());
    const d = new Date(date);

    // Check for invalid date
    if (isNaN(d.getTime())) {
      return i18n._("Invalid date");
    }

    const now = new Date();

    const startOfDay = FNS.startOfDay(d);
    const startOfToday = FNS.startOfDay(now);
    const diffInDays = FNS.differenceInCalendarDays(startOfToday, startOfDay, { in: tz });

    if (diffInDays === 0) {
      return i18n._("Today");
    } else if (diffInDays === 1) {
      return i18n._("Yesterday");
    } else if (diffInDays < 7) {
      return i18n._("{days} days ago", { days: diffInDays });
    } else {
      const currentYear = now.getFullYear();
      const dateYear = d.getFullYear();

      if (dateYear === currentYear) {
        const formattedDate = FNS.format(d, "MMM d", { in: tz });
        return i18n._("{date}", { date: formattedDate });
      } else {
        const formattedDate = FNS.format(d, "MMM d, yyyy", { in: tz });
        return i18n._("{date}", { date: formattedDate });
      }
    }
  } catch (error) {
    console.error("Error formatting relative date:", error);
    return i18n._("Date error");
  }
};

export const formatRelativeWithDay = (date: string | null | undefined, t?: string, now = new Date()) => {
  if (!date) {
    return i18n._("Unknown date");
  }

  try {
    const tz = FNS_TZ.tz(t ?? timezone());
    const d = new Date(date);

    // Check for invalid date
    if (isNaN(d.getTime())) {
      return i18n._("Invalid date");
    }

    const startOfDay = FNS.startOfDay(d);
    const startOfToday = FNS.startOfDay(now);
    const diffInDays = FNS.differenceInCalendarDays(startOfToday, startOfDay, { in: tz });

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayOfWeek = daysOfWeek[d.getDay()];

    if (diffInDays === 0) {
      return i18n._("Today ({dayOfWeek})", { dayOfWeek });
    } else if (diffInDays === 1) {
      return i18n._("Yesterday ({dayOfWeek})", { dayOfWeek });
    } else if (diffInDays > 0 && diffInDays < 7) {
      return i18n._("{days} days ago ({dayOfWeek})", { days: diffInDays, dayOfWeek });
    } else if (diffInDays < 0 && diffInDays > -7) {
      return i18n._("{days} days later ({dayOfWeek})", { days: Math.abs(diffInDays), dayOfWeek });
    } else {
      const currentYear = now.getFullYear();
      const dateYear = d.getFullYear();

      if (dateYear === currentYear) {
        const formattedDate = FNS.format(d, "MMM d", { in: tz });
        return i18n._("{date} ({dayOfWeek})", { date: formattedDate, dayOfWeek });
      } else {
        const formattedDate = FNS.format(d, "MMM d, yyyy", { in: tz });
        return i18n._("{date} ({dayOfWeek})", { date: formattedDate, dayOfWeek });
      }
    }
  } catch (error) {
    console.error("Error formatting relative date with day:", error);
    return i18n._("Date error");
  }
};

export const timezone = () => {
  if (typeof window === "undefined") {
    throw new Error("timezone is only available on browser");
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const differenceInBusinessDays = (
  d1: Parameters<typeof FNS.differenceInBusinessDays>[0],
  d2: Parameters<typeof FNS.differenceInBusinessDays>[1],
  t?: string,
) => {
  return FNS.differenceInBusinessDays(d1, d2, { in: FNS_TZ.tz(t || timezone()) });
};

export const isToday = (d: Parameters<typeof FNS.isToday>[0]) => {
  return FNS.isToday(d, { in: FNS_TZ.tz(timezone()) });
};

/**
 * Formats a past date relative to now in a human-readable format with i18n support
 * Examples: "just now", "1 minute ago", "2 hours ago", "Yesterday", etc.
 */
export function formatTimeAgo(date: Date | string): string {
  const pastDate = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - pastDate.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 5) {
    return i18n._("just now");
  } else if (seconds < 60) {
    return i18n._("{seconds} seconds ago", { seconds });
  } else if (minutes === 1) {
    return i18n._("1 minute ago");
  } else if (minutes < 60) {
    return i18n._("{minutes} minutes ago", { minutes });
  } else if (hours === 1) {
    return i18n._("1 hour ago");
  } else if (hours < 24) {
    return i18n._("{hours} hours ago", { hours });
  } else if (days === 1) {
    return i18n._("Yesterday");
  } else if (days < 7) {
    return i18n._("{days} days ago", { days });
  } else if (weeks === 1) {
    return i18n._("1 week ago");
  } else if (weeks < 4) {
    return i18n._("{weeks} weeks ago", { weeks });
  } else if (months === 1) {
    return i18n._("1 month ago");
  } else if (months < 12) {
    return i18n._("{months} months ago", { months });
  } else if (years === 1) {
    return i18n._("1 year ago");
  } else {
    return i18n._("{years} years ago", { years });
  }
}

/**
 * Formats an upcoming date relative to now in a human-readable format with i18n support
 * Examples: "in progress", "in 5 seconds", "in 10 minutes", "in 2 hours", "2 days later", etc.
 */
export function formatUpcomingTime(date: Date | string): string {
  const futureDate = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = futureDate.getTime() - now.getTime();

  if (diff <= 0) {
    return i18n._("in progress");
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) {
    return i18n._("in {seconds} seconds", { seconds });
  } else if (minutes === 1) {
    return i18n._("in 1 minute");
  } else if (minutes < 60) {
    return i18n._("in {minutes} minutes", { minutes });
  } else if (hours === 1) {
    return i18n._("in 1 hour");
  } else if (hours < 24) {
    return i18n._("in {hours} hours", { hours });
  } else if (days === 1) {
    return i18n._("1 day later");
  } else if (days < 7) {
    return i18n._("{days} days later", { days });
  } else {
    return i18n._("{weeks} weeks later", { weeks });
  }
}
