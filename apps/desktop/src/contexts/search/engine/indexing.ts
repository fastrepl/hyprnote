import { insert } from "@orama/orama";

import { type Store as PersistedStore } from "../../../store/tinybase/main";
import {
  createHumanSearchableContent,
  createSessionSearchableContent,
} from "./content";
import type { Index } from "./types";
import { collectCells, toNumber, toTrimmedString } from "./utils";

export function indexSessions(db: Index, store: PersistedStore): void {
  const fields = [
    "user_id",
    "created_at",
    "folder_id",
    "event_id",
    "title",
    "raw_md",
    "enhanced_md",
    "transcript",
  ];

  store.forEachRow("sessions", (rowId: string, _forEachCell) => {
    const row = collectCells(store, "sessions", rowId, fields);
    const title = toTrimmedString(row.title) || "Untitled";

    void insert(db, {
      id: rowId,
      type: "session",
      title,
      content: createSessionSearchableContent(row),
      created_at: toNumber(row.created_at),
    });
  });
}

export function indexHumans(db: Index, store: PersistedStore): void {
  const fields = [
    "name",
    "email",
    "org_id",
    "job_title",
    "linkedin_username",
    "is_user",
    "created_at",
  ];

  store.forEachRow("humans", (rowId: string, _forEachCell) => {
    const row = collectCells(store, "humans", rowId, fields);
    const title = toTrimmedString(row.name) || "Unknown";

    void insert(db, {
      id: rowId,
      type: "human",
      title,
      content: createHumanSearchableContent(row),
      created_at: toNumber(row.created_at),
    });
  });
}

export function indexOrganizations(db: Index, store: PersistedStore): void {
  const fields = ["name", "created_at"];

  store.forEachRow("organizations", (rowId: string, _forEachCell) => {
    const row = collectCells(store, "organizations", rowId, fields);
    const title = toTrimmedString(row.name) || "Unknown Organization";

    void insert(db, {
      id: rowId,
      type: "organization",
      title,
      content: "",
      created_at: toNumber(row.created_at),
    });
  });
}
