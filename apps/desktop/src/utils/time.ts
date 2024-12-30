import type { CalendarEvent } from "../types";

export const formatMeetingTime = (date: CalendarEvent["start"]) => {
  if (!date) return "";

  const time = date.dateTime
    ? new Date(date.dateTime)
    : date.date
      ? new Date(date.date)
      : null;

  if (!time) return "";

  return time.toDateString();
};
