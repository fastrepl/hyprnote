import { describe, expect, it } from "vitest";

import { getBadgeProgress, parseCollectedBadges } from "./badges";
import type { ActivityRecord } from "./queries";

const now = new Date("2026-09-08T12:00:00Z");
const record = (id: string, date: string): ActivityRecord => ({
  session_id: id,
  started_at_ms: Date.parse(date),
  created_at: date,
  duration_ms: 60_000,
});
const progress = (records: ActivityRecord[], timezone = "UTC") =>
  getBadgeProgress({
    records,
    now,
    timezone,
    weekStartsOn: 1,
    signedUp: false,
    onboardingComplete: false,
  });

describe("personal badges", () => {
  it("awards only deliberate conversation milestones and deduplicates resumed recordings", () => {
    const records = Array.from({ length: 50 }, (_, i) =>
      record(String(i), "2026-09-01T12:00:00Z"),
    );
    records.push(record("0", "2026-09-02T12:00:00Z"));
    expect(
      progress(records)
        .filter((badge) => badge.value === badge.target)
        .map((badge) => badge.id),
    ).toEqual(["first-words", "good-listener", "memory-keeper"]);
  });

  it("excludes the welcome demo and invalid or future activity", () => {
    const records = [
      { ...record("demo", "2026-09-01T12:00:00Z"), is_demo: 1 },
      record("invalid", "invalid"),
      record("future", "2027-01-01T12:00:00Z"),
    ];
    expect(progress(records).every((badge) => badge.value === 0)).toBe(true);
  });

  it("counts separate active weeks in the calendar timezone without requiring a streak", () => {
    const records = [
      record("a", "2026-07-05T15:00:00Z"),
      record("b", "2026-07-26T15:00:00Z"),
      record("c", "2026-08-23T15:00:00Z"),
      record("d", "2026-08-30T14:59:00Z"),
    ];
    expect(
      progress(records, "Asia/Seoul").find(
        (badge) => badge.id === "finding-rhythm",
      )?.value,
    ).toBe(3);
    expect(
      progress(records).find((badge) => badge.id === "finding-rhythm")?.value,
    ).toBe(4);
  });

  it("only awards the getting-started badges from confirmed account and onboarding state", () => {
    const badges = getBadgeProgress({
      records: [],
      now,
      weekStartsOn: 0,
      signedUp: true,
      onboardingComplete: true,
    });
    expect(
      badges
        .filter((badge) => badge.value === badge.target)
        .map((badge) => badge.id),
    ).toEqual(["hello", "all-set"]);
  });

  it("ignores unknown or malformed stored badges while preserving valid collection dates", () => {
    expect(
      parseCollectedBadges([
        { value_json: "invalid" },
        { value_json: "null" },
        {
          value_json: JSON.stringify({
            id: "unknown",
            collectedAt: now.toISOString(),
          }),
        },
        {
          value_json: JSON.stringify({ id: "all-set", collectedAt: "invalid" }),
        },
        {
          value_json: JSON.stringify({
            id: "hello",
            collectedAt: now.toISOString(),
          }),
        },
      ]),
    ).toEqual({ hello: now.toISOString() });
  });
});
