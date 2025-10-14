import { insert } from "@orama/orama";

import { createHumanSearchableContent, createSessionSearchableContent } from "./content";
import type { Index } from "./types";
import { collectCells, toBoolean, toNumber, toString, toTrimmedString } from "./utils";

export function indexSessions(db: Index, persistedStore: any): void {
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

  persistedStore.forEachRow("sessions", (rowId: string) => {
    const row = collectCells(persistedStore, "sessions", rowId, fields);
    const title = toTrimmedString(row.title) || "Untitled";

    void insert(db, {
      id: rowId,
      type: "session",
      title,
      content: createSessionSearchableContent(row),
      created_at: toNumber(row.created_at),
      folder_id: toString(row.folder_id),
      event_id: toString(row.event_id),
      org_id: "",
      is_user: false,
      metadata: JSON.stringify({}),
    });
  });
}

export function indexHumans(db: Index, persistedStore: any): void {
  const fields = [
    "name",
    "email",
    "org_id",
    "job_title",
    "linkedin_username",
    "is_user",
    "created_at",
  ];

  persistedStore.forEachRow("humans", (rowId: string) => {
    const row = collectCells(persistedStore, "humans", rowId, fields);
    const title = toTrimmedString(row.name) || "Unknown";

    void insert(db, {
      id: rowId,
      type: "human",
      title,
      content: createHumanSearchableContent(row),
      created_at: toNumber(row.created_at),
      folder_id: "",
      event_id: "",
      org_id: toString(row.org_id),
      is_user: toBoolean(row.is_user),
      metadata: JSON.stringify({
        email: row.email,
        job_title: row.job_title,
      }),
    });
  });
}

export function indexOrganizations(db: Index, persistedStore: any): void {
  const fields = ["name", "created_at"];

  persistedStore.forEachRow("organizations", (rowId: string) => {
    const row = collectCells(persistedStore, "organizations", rowId, fields);
    const title = toTrimmedString(row.name) || "Unknown Organization";

    void insert(db, {
      id: rowId,
      type: "organization",
      title,
      content: "",
      created_at: toNumber(row.created_at),
      folder_id: "",
      event_id: "",
      org_id: "",
      is_user: false,
      metadata: JSON.stringify({}),
    });
  });
}
