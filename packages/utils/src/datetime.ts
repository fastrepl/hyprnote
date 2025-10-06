import * as FNS_TZ from "@date-fns/tz";
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

export const formatRelative = (date: string | null | undefined, t?: string) => {
  if (!date) {
    return "Unknown date";
  }

  try {
    const tz = FNS_TZ.tz(t ?? timezone());
    const d = new Date(date);

    // Check for invalid date
    if (isNaN(d.getTime())) {
      return "Invalid date";
    }

    const now = new Date();

    const startOfDay = FNS.startOfDay(d);
    const startOfToday = FNS.startOfDay(now);
    const diffInDays = FNS.differenceInCalendarDays(startOfToday, startOfDay, { in: tz });

    if (diffInDays === 0) {
      return "Today";
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays > 0 && diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 0 && diffInDays > -7) {
      return `${Math.abs(diffInDays)} days later`;
    } else {
      const currentYear = now.getFullYear();
      const dateYear = d.getFullYear();

      if (dateYear === currentYear) {
        const formattedDate = FNS.format(d, "MMM d", { in: tz });
        return formattedDate;
      } else {
        const formattedDate = FNS.format(d, "MMM d, yyyy", { in: tz });
        return formattedDate;
      }
    }
  } catch (error) {
    console.error("Error formatting relative date:", error);
    return "Date error";
  }
};

export const formatRelativeWithDay = (date: string | null | undefined, t?: string, now = new Date()) => {
  if (!date) {
    return "Unknown date";
  }

  try {
    const tz = FNS_TZ.tz(t ?? timezone());
    const d = new Date(date);

    if (isNaN(d.getTime())) {
      return "Invalid date";
    }

    const startOfDay = FNS.startOfDay(d);
    const startOfToday = FNS.startOfDay(now);
    const diffInDays = FNS.differenceInCalendarDays(startOfToday, startOfDay, { in: tz });

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayOfWeek = daysOfWeek[d.getDay()];

    if (diffInDays === 0) {
      return `Today (${dayOfWeek})`;
    } else if (diffInDays === 1) {
      return `Yesterday (${dayOfWeek})`;
    } else if (diffInDays > 0 && diffInDays < 7) {
      return `${diffInDays} days ago (${dayOfWeek})`;
    } else if (diffInDays < 0 && diffInDays > -7) {
      return `${Math.abs(diffInDays)} days later (${dayOfWeek})`;
    } else {
      const currentYear = now.getFullYear();
      const dateYear = d.getFullYear();

      if (dateYear === currentYear) {
        const formattedDate = FNS.format(d, "MMM d", { in: tz });
        return `${formattedDate} (${dayOfWeek})`;
      } else {
        const formattedDate = FNS.format(d, "MMM d, yyyy", { in: tz });
        return `${formattedDate} (${dayOfWeek})`;
      }
    }
  } catch (error) {
    console.error("Error formatting relative date with day:", error);
    return "Date error";
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
    return "Just now";
  } else if (seconds < 60) {
    return `${seconds} seconds ago`;
  } else if (minutes === 1) {
    return "1 minute ago";
  } else if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours === 1) {
    return "1 hour ago";
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else if (days === 1) {
    return "Yesterday";
  } else if (days < 7) {
    return `${days} days ago`;
  } else if (weeks === 1) {
    return "1 week ago";
  } else if (weeks < 4) {
    return `${weeks} weeks ago`;
  } else if (months === 1) {
    return "1 month ago";
  } else if (months < 12) {
    return `${months} months ago`;
  } else if (years === 1) {
    return "1 year ago";
  } else {
    return `${years} years ago`;
  }
}

export function formatUpcomingTime(date: Date | string): string {
  const futureDate = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  if (futureDate <= now) {
    return "In progress";
  }

  // Use calendar day difference calculation to be consistent with formatRelativeWithDay
  const startOfFutureDay = FNS.startOfDay(futureDate);
  const startOfToday = FNS.startOfDay(now);
  const diffInDays = Math.abs(FNS.differenceInCalendarDays(startOfToday, startOfFutureDay));

  // For same day events, calculate hours/minutes
  if (diffInDays === 0) {
    const diffMs = futureDate.getTime() - now.getTime();
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
      return "Starting soon";
    } else if (minutes === 1) {
      return "In 1 minute";
    } else if (minutes < 60) {
      return `In ${minutes} minutes`;
    } else if (hours === 1) {
      return "In 1 hour";
    } else {
      return `In ${hours} hours`;
    }
  } else if (diffInDays === 1) {
    return "1 day later";
  } else if (diffInDays < 7) {
    return `${diffInDays} days later`;
  } else {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} weeks later`;
  }
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffInDays = FNS.differenceInCalendarDays(now, d);
  if (diffInDays === 0) {
    // Same day - show time
    return format(d, "h:mm a");
  } else if (diffInDays < 0) {
    // Future date (d is after now)
    return formatUpcomingTime(d);
  } else {
    // Past date (d is before now)
    return formatTimeAgo(d);
  }
}
