import type { CalendarEvent } from "../types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export const formatMeetingTime = (date: CalendarEvent["start"]) => {
  if (!date) return "";

  const time = date.dateTime
    ? new Date(date.dateTime)
    : date.date
      ? new Date(date.date)
      : null;

  if (!time) return "";

  return format(time, "HH:mm", { locale: ko });
};
