import { addDays, format, startOfWeek, subDays } from "date-fns";

import { TZDate } from "@anlg/utils";

import type { ActivityRecord } from "./queries";

export function summarizeActivity(
  records: ActivityRecord[],
  now: Date,
  timezone?: string,
  weekStartsOn: 0 | 1 = 0,
  range: "all" | "30d" | "7d" = "all",
) {
  const localNow = timezone ? new TZDate(now, timezone) : now;
  const today = format(localNow, "yyyy-MM-dd");
  const cutoff =
    range === "all"
      ? ""
      : format(subDays(localNow, range === "7d" ? 6 : 29), "yyyy-MM-dd");
  const sessions = new Set<string>();
  const allSessions = new Set<string>();
  const dailySessions = new Map<string, Set<string>>();
  const weeks = new Set<string>();
  const intervals = new Map<string, Array<[number, number]>>();
  const sessionStarts = new Map<string, Date>();

  for (const record of records) {
    const startedAt =
      record.started_at_ms > 0
        ? record.started_at_ms
        : Date.parse(record.created_at);
    if (!Number.isFinite(startedAt) || startedAt > now.getTime()) continue;
    const date = timezone
      ? new TZDate(startedAt, timezone)
      : new Date(startedAt);
    const day = format(date, "yyyy-MM-dd");
    allSessions.add(record.session_id);
    const daySessions = dailySessions.get(day) ?? new Set<string>();
    daySessions.add(record.session_id);
    dailySessions.set(day, daySessions);
    weeks.add(format(startOfWeek(date, { weekStartsOn }), "yyyy-MM-dd"));
    if (day < cutoff) continue;
    sessions.add(record.session_id);
    const firstStart = sessionStarts.get(record.session_id);
    if (!firstStart || date < firstStart) {
      sessionStarts.set(record.session_id, date);
    }
    if (!Number.isFinite(record.duration_ms) || record.duration_ms <= 0)
      continue;
    const end = Math.min(startedAt + record.duration_ms, now.getTime());
    const spans = intervals.get(record.session_id) ?? [];
    spans.push([startedAt, end]);
    intervals.set(record.session_id, spans);
  }

  let durationMs = 0;
  const durations: number[] = [];
  for (const spans of intervals.values()) {
    spans.sort((a, b) => a[0] - b[0]);
    let previousEnd = 0;
    let sessionDurationMs = 0;
    for (const [start, end] of spans) {
      sessionDurationMs += Math.max(0, end - Math.max(start, previousEnd));
      previousEnd = Math.max(previousEnd, end);
    }
    durationMs += sessionDurationMs;
    if (sessionDurationMs > 0) durations.push(sessionDurationMs);
  }
  durations.sort((a, b) => a - b);
  const middle = Math.floor(durations.length / 2);
  const medianMinutes = durations.length
    ? (durations.length % 2
        ? durations[middle]
        : (durations[middle - 1] + durations[middle]) / 2) / 60_000
    : null;
  const weekdayCounts = Array.from({ length: 7 }, (_, index) => ({
    weekday: (index + weekStartsOn) % 7,
    count: 0,
  }));
  for (const date of sessionStarts.values()) {
    weekdayCounts[(date.getDay() - weekStartsOn + 7) % 7].count += 1;
  }

  let currentWeek = startOfWeek(localNow, { weekStartsOn });
  if (!weeks.has(format(currentWeek, "yyyy-MM-dd")))
    currentWeek = subDays(currentWeek, 7);
  let streak = 0;
  while (weeks.has(format(currentWeek, "yyyy-MM-dd"))) {
    streak += 1;
    currentWeek = subDays(currentWeek, 7);
  }

  const heatmapStart = startOfWeek(subDays(localNow, 364), { weekStartsOn });
  const days = [];
  for (
    let date = heatmapStart;
    format(date, "yyyy-MM-dd") <= today;
    date = addDays(date, 1)
  ) {
    const key = format(date, "yyyy-MM-dd");
    days.push({ date, key, count: dailySessions.get(key)?.size ?? 0 });
  }

  const total = allSessions.size;

  return {
    conversations: sessions.size,
    totalConversations: total,
    hours: durationMs / 3_600_000,
    activeDays: [...dailySessions.keys()].filter((day) => day >= cutoff).length,
    streak,
    days,
    weekdayCounts,
    medianMinutes,
    timedConversations: durations.length,
    conversationDays: new Set(
      [...sessionStarts.values()].map((date) => format(date, "yyyy-MM-dd")),
    ).size,
  };
}
