import {
  formatRelative as originalFormatRelative,
  formatRemainingTime as originalFormatRemainingTime,
} from "@hypr/utils/datetime";
import { i18n } from "@lingui/core";
import { format } from "date-fns";

/**
 * Internationalized version of formatRemainingTime
 * Formats the remaining time until a date in a human-readable format with i18n support
 */
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

/**
 * Internationalized version of formatRelative
 * Formats a date relative to the current date in a human-readable format with i18n support
 */
export function formatRelative(date: string, t?: string): string {
  const d = new Date(date);
  const now = new Date();

  // Calculate the difference in days
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffInDays = Math.floor((startOfToday.getTime() - startOfDay.getTime()) / (1000 * 60 * 60 * 24));

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
      const formattedDate = format(d, "MMM d");
      return i18n._("{date} ({dayOfWeek})", { date: formattedDate, dayOfWeek });
    } else {
      // Format like "May 19, 2024 (Wed)"
      const formattedDate = format(d, "MMM d, yyyy");
      return i18n._("{date} ({dayOfWeek})", { date: formattedDate, dayOfWeek });
    }
  }
}

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

  // If the date is in the past, return "in progress"
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

export { originalFormatRelative, originalFormatRemainingTime };
