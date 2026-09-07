import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, test } from "node:test";

import { buildSessionList, mapTimelineRows } from "./timeline-model.ts";
import { TIMELINE_PAGE_SIZE, TIMELINE_SQL } from "./timeline-query.ts";
import { SESSION_HAS_TRANSCRIPT_SQL } from "./transcript-model.ts";

const now = "2026-09-07T12:00:00.000Z";
let db;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(
    readFileSync(
      new URL(
        "../../../../crates/db-app/migrations/20260710223922_canonical_data_model.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
});
afterEach(() => db.close());

function insert(id, createdAt, event = "", deletedAt = null) {
  db.prepare(
    "INSERT INTO sessions (id, title, created_at, event_json, deleted_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, id, createdAt, event, deletedAt);
}
const query = (limit, at = now) => db.prepare(TIMELINE_SQL).all(at, limit + 1);
const ids = (rows) => rows.map((row) => row.id);

test("a large library crosses the bridge only as a bounded window with one lookahead row", () => {
  for (let i = 0; i < 1205; i++) {
    insert(
      `session-${String(i).padStart(4, "0")}`,
      new Date(Date.parse(now) - i * 60000).toISOString(),
    );
  }
  insert("deleted-newest", now, "", now);
  const first = query(TIMELINE_PAGE_SIZE);
  assert.equal(first.length, 41);
  assert.equal(first[0].id, "session-0000");
  assert.equal(first.at(-1).id, "session-0040");
  const next = query(TIMELINE_PAGE_SIZE * 2);
  assert.equal(next.length, 81);
  assert.deepEqual(ids(next.slice(0, 40)), ids(first.slice(0, 40)));
  const all = query(1240);
  assert.equal(all.length, 1205);
  assert.equal(new Set(ids(all)).size, 1205);
});

test("SQL limits in display order using event dates, upcoming meetings, timezones and malformed fallbacks", () => {
  insert(
    "upcoming-far",
    "2020-01-01",
    JSON.stringify({ started_at: "2026-09-09T12:00:00Z" }),
  );
  insert(
    "upcoming-near",
    "2020-01-01",
    JSON.stringify({ started_at: "2026-09-07T13:00:00Z" }),
  );
  insert(
    "timezone",
    "2020-01-01",
    JSON.stringify({ started_at: "2026-09-07T23:00:00+09:00" }),
  );
  insert(
    "past-recent",
    "2020-01-01",
    JSON.stringify({ started_at: "2026-09-07T11:00:00Z" }),
  );
  insert(
    "past-old",
    now,
    JSON.stringify({ started_at: "2025-01-01T12:00:00Z" }),
  );
  insert("malformed", "2026-09-07T10:00:00Z", "not-json");
  insert(
    "invalid-start",
    "2026-09-07T09:00:00Z",
    '{"started_at":"not-a-date"}',
  );
  insert("numeric-start", "2026-09-07T08:00:00Z", '{"started_at":2461291}');
  insert("invalid-date", "not-a-date");

  const expected = [
    "upcoming-near",
    "timezone",
    "upcoming-far",
    "past-recent",
    "malformed",
    "invalid-start",
    "numeric-start",
    "past-old",
    "invalid-date",
  ];
  assert.deepEqual(ids(query(20)), expected);
  assert.deepEqual(ids(query(3)), expected.slice(0, 4));
  assert.deepEqual(
    buildSessionList(mapTimelineRows(query(20)), Date.parse(now))
      .filter((item) => item.type === "session")
      .map((item) => item.key),
    expected,
  );
});

test("the window stays consistent when synced rows arrive, disappear or cross a meeting boundary", () => {
  insert("a", "2026-09-07T10:00:00Z");
  insert("b", "2026-09-07T10:00:00Z");
  insert("upcoming", "2020-01-01", '{"started_at":"2026-09-07T12:01:00Z"}');
  insert("later", "2020-01-01", '{"started_at":"2026-09-07T12:02:00Z"}');
  assert.deepEqual(ids(query(2)), ["upcoming", "later", "b"]);
  insert("synced", "2026-09-07T11:00:00Z");
  assert.deepEqual(ids(query(2)), ["upcoming", "later", "synced"]);
  db.exec("UPDATE sessions SET deleted_at = 'deleted' WHERE id = 'synced'");
  assert.deepEqual(ids(query(2)), ["upcoming", "later", "b"]);
  assert.deepEqual(ids(query(2, "2026-09-07T12:01:01Z")), [
    "later",
    "upcoming",
    "b",
  ]);
  assert.deepEqual(ids(query(4)), ["upcoming", "later", "b", "a"]);
});

test("only card metadata and active tags are returned", () => {
  insert("note", now);
  db.exec(`
    UPDATE sessions SET folder_path = 'Work/Planning';
    INSERT INTO session_documents (id, session_id, body) VALUES ('note', 'note', 'large note body');
    INSERT INTO tags (id, name) VALUES ('a', 'Planning'), ('b', 'Deleted');
    INSERT INTO session_tags (id, session_id, tag_id) VALUES ('a', 'note', 'a'), ('duplicate', 'note', 'a'), ('b', 'note', 'b');
    UPDATE tags SET deleted_at = 'deleted' WHERE id = 'b';
  `);
  const [row] = query(40);
  assert.equal(row.tags_json, '["Planning"]');
  assert.equal(row.folder_path, "Work/Planning");
  assert.deepEqual(Object.keys(row).sort(), [
    "created_at",
    "event_json",
    "folder_path",
    "id",
    "tags_json",
    "title",
  ]);
});

test("note opening can detect transcript history without reading transcript or contact payloads", () => {
  insert("note", now);
  const exists = db.prepare(SESSION_HAS_TRANSCRIPT_SQL);
  assert.equal(exists.get("note").has_transcript, 0);
  db.exec(
    "INSERT INTO transcripts (id, session_id, words_json) VALUES ('transcript', 'note', 'not parsed by the existence query')",
  );
  assert.equal(exists.get("note").has_transcript, 1);
  assert.equal(exists.get("other").has_transcript, 0);
  db.exec("UPDATE transcripts SET deleted_at = 'deleted'");
  assert.equal(exists.get("note").has_transcript, 0);
});
