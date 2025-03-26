import * as FNS_TZ from "@date-fns/tz";
import { i18n } from "@lingui/core";
import * as FNS from "date-fns";
// import * as FNS_LOCALE from "date-fns/locale";

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

export const formatRelative = (date: string, t?: string) => {
  const tz = FNS_TZ.tz(t ?? timezone());
  const d = new Date(date);
  const now = new Date();

  const startOfDay = FNS.startOfDay(d);
  const startOfToday = FNS.startOfDay(now);
  const diffInDays = FNS.differenceInCalendarDays(startOfToday, startOfDay, { in: tz });

  // Get day of week
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeek = daysOfWeek[d.getDay()];

  if (diffInDays === 0) {
    return i18n._("Today ({dayOfWeek})", { dayOfWeek });
  } else if (diffInDays === 1) {
    return i18n._("Yesterday ({dayOfWeek})", { dayOfWeek });
  } else if (diffInDays < 7) {
    return i18n._("{days} days ago ({dayOfWeek})", { days: diffInDays, dayOfWeek });
  } else {
    // For dates older than a week, use localized date format
    const currentYear = now.getFullYear();
    const dateYear = d.getFullYear();
    
    // If it's the current year, don't show the year
    if (dateYear === currentYear) {
      // Format like "Apr 13 (Wed)"
      const formattedDate = FNS.format(d, "MMM d", { in: tz });
      return i18n._("{date} ({dayOfWeek})", { date: formattedDate, dayOfWeek });
    } else {
      // Format like "May 19, 2024 (Wed)"
      const formattedDate = FNS.format(d, "MMM d, yyyy", { in: tz });
      return i18n._("{date} ({dayOfWeek})", { date: formattedDate, dayOfWeek });
    }
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
