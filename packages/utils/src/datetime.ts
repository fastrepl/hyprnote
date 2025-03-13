import * as FNS_TZ from "@date-fns/tz";
import * as FNS from "date-fns";
import * as FNS_LOCALE from "date-fns/locale";

// TODO
export const formatDate = (date: string) => {
  const d = new Date(date);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;

  if (diff < 60 * 1) {
    return "방금 전";
  }
  if (diff < 60 * 60 * 24 * 3) {
    return FNS.formatDistanceToNow(d, { addSuffix: true, locale: FNS_LOCALE.ko });
  }
  return FNS.format(d, "PPP EEE p", { locale: FNS_LOCALE.ko });
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
