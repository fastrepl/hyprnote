import { i18n } from "@lingui/core";
import { formatRemainingTime as originalFormatRemainingTime, formatRelative as originalFormatRelative } from "@hypr/utils/datetime";

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

  if (diffInDays === 0) {
    return i18n._("Today");
  } else if (diffInDays === 1) {
    return i18n._("Yesterday");
  } else if (diffInDays === 2) {
    return i18n._("2 days ago");
  } else if (diffInDays < 7) {
    return i18n._("{days} days ago", { days: diffInDays });
  } else if (diffInDays < 14) {
    return i18n._("Last week");
  } else if (diffInDays < 21) {
    return i18n._("2 weeks ago");
  } else if (diffInDays < 30) {
    return i18n._("3 weeks ago");
  } else {
    return i18n._("{days} days ago", { days: diffInDays });
  }
}

// Export the original functions as fallbacks
export { originalFormatRemainingTime, originalFormatRelative };
