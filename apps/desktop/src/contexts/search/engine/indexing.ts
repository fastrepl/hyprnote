import { commands as tantivy } from "@hypr/plugin-tantivy";

import { type Store as MainStore } from "../../../store/tinybase/store/main";
import {
  createHumanSearchableContent,
  createSessionSearchableContent,
} from "./content";
import {
  collectCells,
  collectEnhancedNotesContent,
  toEpochMs,
  toTrimmedString,
} from "./utils";

export function indexSessions(store: MainStore): void {
  const fields = [
    "user_id",
    "created_at",
    "folder_id",
    "event_id",
    "title",
    "raw_md",
    "transcript",
  ];

  store.forEachRow("sessions", (rowId: string, _forEachCell) => {
    const row = collectCells(store, "sessions", rowId, fields);
    row.enhanced_notes_content = collectEnhancedNotesContent(store, rowId);
    const title = toTrimmedString(row.title) || "Untitled";

    void tantivy.updateDocument(
      {
        id: rowId,
        doc_type: "session",
        language: null,
        title,
        content: createSessionSearchableContent(row),
        created_at: toEpochMs(row.created_at),
        facets: [],
      },
      null,
    );
  });
}

export function indexHumans(store: MainStore): void {
  const fields = [
    "name",
    "email",
    "org_id",
    "job_title",
    "linkedin_username",
    "created_at",
    "memo",
  ];

  store.forEachRow("humans", (rowId: string, _forEachCell) => {
    const row = collectCells(store, "humans", rowId, fields);
    const title = toTrimmedString(row.name) || "Unknown";

    void tantivy.updateDocument(
      {
        id: rowId,
        doc_type: "human",
        language: null,
        title,
        content: createHumanSearchableContent(row),
        created_at: toEpochMs(row.created_at),
        facets: [],
      },
      null,
    );
  });
}

export function indexOrganizations(store: MainStore): void {
  const fields = ["name", "created_at"];

  store.forEachRow("organizations", (rowId: string, _forEachCell) => {
    const row = collectCells(store, "organizations", rowId, fields);
    const title = toTrimmedString(row.name) || "Unknown Organization";

    void tantivy.updateDocument(
      {
        id: rowId,
        doc_type: "organization",
        language: null,
        title,
        content: "",
        created_at: toEpochMs(row.created_at),
        facets: [],
      },
      null,
    );
  });
}
