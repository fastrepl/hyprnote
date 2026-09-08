import { format, startOfWeek } from "date-fns";

import { TZDate } from "@anlg/utils";

import type { ActivityRecord } from "./queries";

// These IDs are persisted; keep them stable when badge names or artwork change.
export const BADGES = [
  { id: "hello", metric: "signup", target: 1 },
  { id: "all-set", metric: "onboarding", target: 1 },
  { id: "first-words", metric: "conversations", target: 1 },
  { id: "good-listener", metric: "conversations", target: 10 },
  { id: "memory-keeper", metric: "conversations", target: 50 },
  { id: "story-collector", metric: "conversations", target: 100 },
  { id: "living-library", metric: "conversations", target: 250 },
  { id: "finding-rhythm", metric: "weeks", target: 4 },
  { id: "familiar-face", metric: "weeks", target: 12 },
] as const;

export type BadgeId = (typeof BADGES)[number]["id"];

export function getBadgeProgress({
  records,
  signedUp,
  onboardingComplete,
  now,
  timezone,
  weekStartsOn,
}: {
  records: ActivityRecord[];
  signedUp: boolean;
  onboardingComplete: boolean;
  now: Date;
  timezone?: string;
  weekStartsOn: 0 | 1;
}) {
  const sessions = new Set<string>();
  const weeks = new Set<string>();
  for (const record of records) {
    if (record.is_demo) continue;
    const startedAt =
      record.started_at_ms > 0
        ? record.started_at_ms
        : Date.parse(record.created_at);
    if (!Number.isFinite(startedAt) || startedAt > now.getTime()) continue;
    sessions.add(record.session_id);
    const date = timezone
      ? new TZDate(startedAt, timezone)
      : new Date(startedAt);
    weeks.add(format(startOfWeek(date, { weekStartsOn }), "yyyy-MM-dd"));
  }
  const metrics = {
    signup: Number(signedUp),
    onboarding: Number(onboardingComplete),
    conversations: sessions.size,
    weeks: weeks.size,
  };
  return BADGES.map((badge) => ({
    ...badge,
    value: Math.min(metrics[badge.metric], badge.target),
  }));
}

export function parseCollectedBadges(rows: { value_json: string }[]) {
  const collected: Partial<Record<BadgeId, string>> = {};
  for (const row of rows) {
    try {
      const badge: unknown = JSON.parse(row.value_json);
      if (
        !badge ||
        typeof badge !== "object" ||
        !("id" in badge) ||
        !("collectedAt" in badge)
      )
        continue;
      const definition = BADGES.find((entry) => entry.id === badge.id);
      if (
        definition &&
        typeof badge.collectedAt === "string" &&
        Number.isFinite(Date.parse(badge.collectedAt))
      ) {
        collected[definition.id] = badge.collectedAt;
      }
    } catch {
      // Ignore malformed local metadata without hiding the rest of the collection.
    }
  }
  return collected;
}
