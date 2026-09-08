import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, test } from "node:test";

import { collectFolderPaths } from "@anlg/utils/folders";

import { FOLDER_PATHS_SQL, sessionFolderStatements } from "./folder-model.ts";

let db;
let nextId;
beforeEach(() => {
  nextId = 0;
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
  for (const path of [
    "20260830120000_folder_attachments.sql",
    "20260830140000_folders.sql",
    "20260830160000_folder_instructions.sql",
  ]) {
    db.exec(
      readFileSync(
        new URL(
          `../../../../crates/db-app/migrations/${path}`,
          import.meta.url,
        ),
        "utf8",
      ),
    );
  }
  db.prepare(
    "INSERT INTO sessions (id, title, folder_path) VALUES (?, ?, ?)",
  ).run("note", "Meeting", "");
});
afterEach(() => db.close());

function assign(path) {
  db.exec("BEGIN");
  try {
    for (const { sql, params } of sessionFolderStatements(
      "note",
      path,
      () => `folder-${nextId++}`,
    )) {
      db.prepare(sql).run(...params);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

test("assigns a folder and its ancestors using the canonical catalog, then clears only the assignment", () => {
  assign(" Clients\\Sales/ ");
  assert.equal(
    db.prepare("SELECT folder_path FROM sessions WHERE id = 'note'").get()
      .folder_path,
    "Clients/Sales",
  );
  assert.deepEqual(
    collectFolderPaths(
      db
        .prepare(FOLDER_PATHS_SQL)
        .all()
        .map((r) => r.folder_path),
    ),
    ["Clients", "Clients/Sales"],
  );
  assign("");
  assert.equal(
    db.prepare("SELECT folder_path FROM sessions WHERE id = 'note'").get()
      .folder_path,
    "",
  );
  assert.equal(db.prepare("SELECT count(*) AS n FROM folders").get().n, 2);
  assert.equal(
    db.prepare("SELECT title FROM sessions WHERE id = 'note'").get().title,
    "Meeting",
  );
});

test("reuses existing catalog metadata and restores a deleted folder without duplicates", () => {
  assign("Sales");
  db.exec(
    "UPDATE folders SET instructions = 'Keep the decisions', deleted_at = '2026-09-08'",
  );
  assign("Sales");
  const row = db.prepare("SELECT * FROM folders").get();
  assert.equal(row.deleted_at, null);
  assert.equal(row.instructions, "Keep the decisions");
  assert.equal(db.prepare("SELECT count(*) AS n FROM folders").get().n, 1);
  assign("Sales");
  assert.equal(db.prepare("SELECT count(*) AS n FROM folders").get().n, 1);
});

test("lists live catalog folders and legacy note assignments, excluding tombstones", () => {
  assign("Sales");
  db.exec(
    "INSERT INTO folders (id, path, deleted_at) VALUES ('deleted', 'Deleted', '2026-09-08'); INSERT INTO sessions (id, folder_path) VALUES ('legacy', 'Clients/Design'); INSERT INTO sessions (id, folder_path, deleted_at) VALUES ('removed', 'Removed', '2026-09-08')",
  );
  assert.deepEqual(
    collectFolderPaths(
      db
        .prepare(FOLDER_PATHS_SQL)
        .all()
        .map((r) => r.folder_path),
    ),
    ["Clients", "Clients/Design", "Sales"],
  );
});

test("rejects invalid names before any write", () => {
  for (const path of ["../Sales", "/Sales", "a//b", "a".repeat(81)]) {
    assert.throws(() => assign(path), /valid folder/);
  }
  assert.equal(
    db.prepare("SELECT folder_path FROM sessions WHERE id = 'note'").get()
      .folder_path,
    "",
  );
  assert.equal(db.prepare("SELECT count(*) AS n FROM folders").get().n, 0);
});
