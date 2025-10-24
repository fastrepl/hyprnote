import { formatDate, isSameDay } from "@hypr/utils";

import { useMeetingMetadata } from "./shared";

export function MeetingDate({ sessionId }: { sessionId: string }) {
  const meta = useMeetingMetadata(sessionId);

  if (!meta || !meta.started_at || !meta.ended_at) {
    return null;
  }

  return (
    <p className="text-sm text-neutral-700">
      {formatDateRange(meta.started_at, meta.ended_at)}
    </p>
  );
}

const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatTime = (date: Date) => formatDate(date, "p");
  const formatFullDate = (date: Date) => formatDate(date, "MMM d, yyyy");

  if (isSameDay(start, end)) {
    return `${formatFullDate(start)} ${formatTime(start)} to ${formatTime(end)}`;
  } else {
    return `${formatFullDate(start)} ${formatTime(start)} to ${formatFullDate(end)} ${formatTime(end)}`;
  }
};
