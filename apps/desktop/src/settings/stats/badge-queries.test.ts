import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ executeTransaction: vi.fn() }));
vi.mock("~/db", () => ({
  executeTransaction: mocks.executeTransaction,
  useLiveQuery: vi.fn(),
}));

import { collectBadges, COLLECTED_BADGES_SQL } from "./badge-queries";
import { parseCollectedBadges } from "./badges";

const { DatabaseSync } = createRequire(import.meta.url)(
  "node:sqlite",
) as typeof import("node:sqlite");
let db: InstanceType<typeof DatabaseSync>;

describe("badge collection persistence", () => {
  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec(
      "CREATE TABLE app_settings (id TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL)",
    );
    mocks.executeTransaction.mockImplementation(
      async (statements: { sql: string; params: string[] }[]) => {
        db.exec("BEGIN");
        for (const statement of statements)
          db.prepare(statement.sql).run(...statement.params);
        db.exec("COMMIT");
      },
    );
  });
  afterEach(() => {
    db.close();
    vi.useRealTimers();
  });

  it("keeps the original collection date across duplicate awards and later empty activity", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00Z"));
    await collectBadges("alice", ["hello", "first-words", "first-words"]);
    vi.setSystemTime(new Date("2026-09-08T12:00:00Z"));
    await collectBadges("alice", ["first-words"]);
    await collectBadges("alice", []);
    const prefix = "personal-badges.v1:alice:";
    const rows = db.prepare(COLLECTED_BADGES_SQL).all(prefix, prefix) as {
      value_json: string;
    }[];
    expect(parseCollectedBadges(rows)).toEqual({
      hello: "2026-09-01T12:00:00.000Z",
      "first-words": "2026-09-01T12:00:00.000Z",
    });
  });

  it("keeps collections separate for accounts and guests", async () => {
    await collectBadges("alice", ["hello"]);
    await collectBadges("alice-other", ["memory-keeper"]);
    await collectBadges("guest-user", ["first-words"]);
    const prefix = "personal-badges.v1:alice:";
    const rows = db.prepare(COLLECTED_BADGES_SQL).all(prefix, prefix) as {
      value_json: string;
    }[];
    expect(Object.keys(parseCollectedBadges(rows))).toEqual(["hello"]);
  });
});
