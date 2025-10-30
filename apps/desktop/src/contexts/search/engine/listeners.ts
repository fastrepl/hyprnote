import { remove, type TypedDocument, update } from "@orama/orama";
import { RowListener } from "tinybase/with-schemas";

import { Schemas } from "../../../store/tinybase/main";
import { type Store as PersistedStore } from "../../../store/tinybase/main";
import { createHumanSearchableContent, createSessionSearchableContent } from "./content";
import type { Index } from "./types";
import { collectCells, toNumber, toTrimmedString } from "./utils";

export function createSessionListener(index: Index): RowListener<Schemas, "sessions", null, PersistedStore> {
  return (store, _, rowId) => {
    try {
      const rowExists = store.getRow("sessions", rowId);

      if (!rowExists) {
        void remove(index, rowId);
      } else {
        const fields = [
          "user_id",
          "created_at",
          "title",
          "raw_md",
          "enhanced_md",
          "transcript",
        ];
        const row = collectCells(store, "sessions", rowId, fields);
        const title = toTrimmedString(row.title) || "Untitled";

        const data: TypedDocument<Index> = {
          id: rowId,
          type: "session",
          title,
          content: createSessionSearchableContent(row),
          created_at: toNumber(row.created_at),
        };

        update(index, rowId, data);
      }
    } catch (error) {
      console.error("Failed to update session in search index:", error);
    }
  };
}

export function createHumanListener(index: Index): RowListener<Schemas, "humans", null, PersistedStore> {
  return (store, _, rowId) => {
    try {
      const rowExists = store.getRow("humans", rowId);

      if (!rowExists) {
        void remove(index, rowId);
      } else {
        const fields = [
          "name",
          "email",
          "created_at",
        ];
        const row = collectCells(store, "humans", rowId, fields);
        const title = toTrimmedString(row.name) || "Unknown";

        const data: TypedDocument<Index> = {
          id: rowId,
          type: "human",
          title,
          content: createHumanSearchableContent(row),
          created_at: toNumber(row.created_at),
        };
        update(index, rowId, data);
      }
    } catch (error) {
      console.error("Failed to update human in search index:", error);
    }
  };
}

export function createOrganizationListener(index: Index): RowListener<Schemas, "organizations", null, PersistedStore> {
  return (store, _, rowId) => {
    try {
      const rowExists = store.getRow("organizations", rowId);

      if (!rowExists) {
        remove(index, rowId);
      } else {
        const fields = ["name", "created_at"];
        const row = collectCells(store, "organizations", rowId, fields);
        const title = toTrimmedString(row.name) || "Unknown Organization";

        const data: TypedDocument<Index> = {
          id: rowId,
          type: "organization",
          title,
          content: "",
          created_at: toNumber(row.created_at),
        };

        update(index, rowId, data);
      }
    } catch (error) {
      console.error("Failed to update organization in search index:", error);
    }
  };
}
