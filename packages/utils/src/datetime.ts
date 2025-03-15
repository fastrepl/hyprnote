import * as FNS_TZ from "@date-fns/tz";
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

export const formatRelative = (date: string, t?: string) => {
  const tz = FNS_TZ.tz(t ?? timezone());
  const d = new Date(date);
  const now = new Date();

  const startOfDay = FNS.startOfDay(d);
  const startOfToday = FNS.startOfDay(now);
  const diffInDays = FNS.differenceInCalendarDays(startOfToday, startOfDay, { in: tz });

  if (diffInDays === 0) {
    return "Today";
  } else if (diffInDays === 1) {
    return "Yesterday";
  } else if (diffInDays === 2) {
    return "2 days ago";
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 14) {
    return "Last week";
  } else if (diffInDays < 21) {
    return "2 weeks ago";
  } else if (diffInDays < 30) {
    return "3 weeks ago";
  } else {
    return `${diffInDays} days ago`;
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

// TODO: use FNS_LOCALE
export const renderDaysDiff = (diff: number, t?: string) => {
  const tz = t || timezone();

  if (diff === 0) {
    if (tz === "Asia/Seoul") {
      return "오늘";
    }

    return "Today";
  }

  if (diff === 1) {
    if (tz === "Asia/Seoul") {
      return "어제";
    }

    return "Yesterday";
  }

  if (diff === 2) {
    if (tz === "Asia/Seoul") {
      return "그저께";
    }

    return "2 days ago";
  }

  if (diff < 7) {
    if (tz === "Asia/Seoul") {
      return `${diff} 일 전`;
    }

    return `${diff} days ago`;
  }

  if (diff < 14) {
    if (tz === "Asia/Seoul") {
      return "저번 주";
    }

    return "Last week";
  }

  if (diff < 21) {
    if (tz === "Asia/Seoul") {
      return "2주 전";
    }

    return "2 weeks ago";
  }

  if (diff < 30) {
    if (tz === "Asia/Seoul") {
      return "3주 전";
    }

    return "3 weeks ago";
  }

  return `${diff} days ago`;
};
