import {
  differenceInCalendarDays,
  format,
  isThisWeek,
  isThisYear,
  isToday,
  isYesterday,
  startOfToday,
} from "date-fns";

export const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const parseFirstLine = (html: string) =>
  new DOMParser()
    .parseFromString(html, "text/html")
    .body.textContent?.split("\n")[0] || "";

export const formatRelativeDate = (date: Date): string => {
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
};
