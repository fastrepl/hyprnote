/**
 * Centralized date utilities
 *
 * This module provides date manipulation and formatting utilities.
 * It re-exports ALL date-fns functions and adds custom helpers where needed.
 */

// Re-export ALL date-fns functions so users can import any date-fns function from @hypr/utils
export * from "date-fns";

// Import only what we need for our custom functions
import { isSameDay } from "date-fns";

/**
 * Formats a date according to a custom format string.
 *
 * This is a lightweight alternative to date-fns format for simple cases.
 * For complex formatting, prefer using date-fns format function.
 *
 * @param date - The date to format
 * @param formatString - Format string with tokens:
 *   - yyyy: 4-digit year
 *   - MMM: Short month name (Jan, Feb, etc.)
 *   - MM: 2-digit month (01-12)
 *   - dd: 2-digit day (01-31)
 *   - d: Day without leading zero
 *   - EEE: Short day name (Sun, Mon, etc.)
 *   - h: Hour in 12-hour format
 *   - mm: 2-digit minutes
 *   - a: AM/PM
 *   - p: Complete time string (e.g., "3:45 PM")
 * @returns Formatted date string
 */
export const formatDate = (date: Date, formatString: string): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const replacements: Record<string, string> = {
    "yyyy": date.getFullYear().toString(),
    "MMM": months[date.getMonth()],
    "MM": pad(date.getMonth() + 1),
    "d": date.getDate().toString(),
    "dd": pad(date.getDate()),
    "EEE": days[date.getDay()],
    "h": (date.getHours() % 12 || 12).toString(),
    "mm": pad(date.getMinutes()),
    "a": date.getHours() >= 12 ? "PM" : "AM",
    "p": `${date.getHours() % 12 || 12}:${pad(date.getMinutes())} ${date.getHours() >= 12 ? "PM" : "AM"}`,
  };

  return formatString.replace(/yyyy|MMM|MM|dd|EEE|h|mm|a|p|d/g, (token) => replacements[token]);
};
