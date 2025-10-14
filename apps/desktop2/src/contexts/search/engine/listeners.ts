import { Orama, remove, update } from "@orama/orama";

import { RowListener } from "tinybase/with-schemas";
import { Schemas } from "../../../store/tinybase/persisted";
import { createHumanSearchableContent, createSessionSearchableContent } from "./content";
import { collectCells, toBoolean, toNumber, toString, toTrimmedString } from "./utils";

export function createSessionListener(index: Orama<any>): RowListener<Schemas, "sessions", null, any> {
  return (store, _, rowId) => {
    try {
      const rowExists = store.getRow("sessions", rowId);

      if (!rowExists) {
        void remove(index, rowId);
      } else {
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
        const row = collectCells(store, "sessions", rowId, fields);
        const title = toTrimmedString(row.title) || "Untitled";

        void update(index, rowId, {
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
      }
    } catch (error) {
      console.error("Failed to update session in search index:", error);
    }
  };
}

export function createHumanListener(index: Orama<any>): RowListener<Schemas, "humans", null, any> {
  return (store, _, rowId) => {
    try {
      const rowExists = store.getRow("humans", rowId);

      if (!rowExists) {
        void remove(index, rowId);
      } else {
        const fields = [
          "name",
          "email",
          "org_id",
          "job_title",
          "linkedin_username",
          "is_user",
          "created_at",
        ];
        const row = collectCells(store, "humans", rowId, fields);
        const title = toTrimmedString(row.name) || "Unknown";

        void update(index, rowId, {
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
      }
    } catch (error) {
      console.error("Failed to update human in search index:", error);
    }
  };
}

export function createOrganizationListener(index: Orama<any>): RowListener<Schemas, "organizations", null, any> {
  return (store, _, rowId) => {
    try {
      const rowExists = store.getRow("organizations", rowId);

      if (!rowExists) {
        void remove(index, rowId);
      } else {
        const fields = ["name", "created_at"];
        const row = collectCells(store, "organizations", rowId, fields);
        const title = toTrimmedString(row.name) || "Unknown Organization";

        void update(index, rowId, {
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
      }
    } catch (error) {
      console.error("Failed to update organization in search index:", error);
    }
  };
}
