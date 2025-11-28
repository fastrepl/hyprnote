import { type Store as PersistedStore } from "../../../store/tinybase/main";

const SPACE_REGEX = /\s+/g;

export function safeParseJSON(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function normalizeQuery(query: string): string {
  return query.trim().replace(SPACE_REGEX, " ");
}

export function toTrimmedString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function toString(value: unknown): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return "";
}

export function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return false;
}

export function mergeContent(parts: unknown[]): string {
  return parts.map(toTrimmedString).filter(Boolean).join(" ");
}

export function flattenTranscript(transcript: unknown): string {
  if (transcript == null) {
    return "";
  }

  const parsed = safeParseJSON(transcript);

  if (typeof parsed === "string") {
    return parsed;
  }

  if (Array.isArray(parsed)) {
    return mergeContent(
      parsed.map((segment) => {
        if (!segment) {
          return "";
        }

        if (typeof segment === "string") {
          return segment;
        }

        if (typeof segment === "object") {
          const record = segment as Record<string, unknown>;
          const preferred = record.text ?? record.content;
          if (typeof preferred === "string") {
            return preferred;
          }

          return flattenTranscript(Object.values(record));
        }

        return "";
      }),
    );
  }

  if (typeof parsed === "object" && parsed !== null) {
    return mergeContent(
      Object.values(parsed).map((value) => flattenTranscript(value)),
    );
  }

  return "";
}

export function collectCells(
  persistedStore: any,
  table: string,
  rowId: string,
  fields: string[],
): Record<string, unknown> {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    acc[field] = persistedStore.getCell(table, rowId, field);
    return acc;
  }, {});
}

export function getEnhancedContentForSession(
  store: PersistedStore,
  sessionId: string,
): string {
  const contents: string[] = [];
  store.forEachRow("enhanced_notes", (rowId: string, _forEachCell) => {
    const noteSessionId = store.getCell("enhanced_notes", rowId, "session_id");
    if (noteSessionId === sessionId) {
      const content = store.getCell("enhanced_notes", rowId, "content");
      if (typeof content === "string" && content) {
        contents.push(content);
      }
    }
  });
  return contents.join(" ");
}
