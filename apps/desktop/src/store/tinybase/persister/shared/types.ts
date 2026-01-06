import type {
  JsonValue as FsSyncJsonValue,
  ParsedDocument,
} from "@hypr/plugin-fs-sync";
import type {
  ChatGroup,
  ChatMessageStorage,
  EnhancedNoteStorage,
  SessionStorage,
  SpeakerHintStorage,
  TemplateStorage,
  TranscriptStorage,
  WordStorage,
} from "@hypr/store";

export type { FsSyncJsonValue as JsonValue };

export type BatchItem<T> = [T, string];

export interface BatchCollectorResult<T> {
  items: BatchItem<T>[];
  dirs: Set<string>;
}

export type TablesContent = {
  enhanced_notes?: Record<string, EnhancedNoteStorage>;
  sessions?: Record<string, SessionStorage>;
  templates?: Record<string, TemplateStorage>;
  transcripts?: Record<string, TranscriptStorage>;
  words?: Record<string, WordStorage>;
  speaker_hints?: Record<string, SpeakerHintStorage>;
  chat_groups?: Record<string, ChatGroup>;
  chat_messages?: Record<string, ChatMessageStorage>;
};

type TableRowType<K extends keyof TablesContent> =
  NonNullable<TablesContent[K]> extends Record<string, infer R> ? R : never;

export type WriteOperation =
  | { type: "json"; path: string; content: unknown }
  | { type: "md-batch"; items: Array<[FsSyncJsonValue, string]> }
  | { type: "text"; path: string; content: string }
  | { type: "frontmatter-batch"; items: Array<[ParsedDocument, string]> };

export type CollectorResult = {
  dirs: Set<string>;
  operations: WriteOperation[];
};

// Simplified type for changed tables extracted from TinyBase's Changes or MergeableChanges
// Maps table name -> row id -> changed cells (or undefined for deletion)
export type ChangedTables = Record<string, Record<string, unknown> | undefined>;

// Extract changed tables from TinyBase's Changes or MergeableChanges
// Changes format: [changedTables, changedValues, 1]
// MergeableChanges format: [[changedTables, hlc?], [changedValues, hlc?], 1]
export function extractChangedTables(changes: unknown): ChangedTables | null {
  if (!changes || !Array.isArray(changes) || changes.length < 1) {
    return null;
  }

  const tablesOrStamp = changes[0];

  // Check if it's MergeableChanges (wrapped in [thing, hlc?] tuple)
  if (Array.isArray(tablesOrStamp) && tablesOrStamp.length >= 1) {
    const tables = tablesOrStamp[0];
    if (tables && typeof tables === "object") {
      return unwrapMergeableTables(tables as Record<string, unknown>);
    }
    return null;
  }

  // Regular Changes format
  if (tablesOrStamp && typeof tablesOrStamp === "object") {
    return tablesOrStamp as ChangedTables;
  }

  return null;
}

// Unwrap MergeableChanges table structure where each value is [thing, hlc?]
function unwrapMergeableTables(tables: Record<string, unknown>): ChangedTables {
  const result: ChangedTables = {};

  for (const [tableName, tableValue] of Object.entries(tables)) {
    if (!tableValue) {
      result[tableName] = undefined;
      continue;
    }

    // MergeableChanges wraps each table in [rows, hlc?]
    if (Array.isArray(tableValue) && tableValue.length >= 1) {
      const rows = tableValue[0];
      if (rows && typeof rows === "object") {
        result[tableName] = unwrapMergeableRows(
          rows as Record<string, unknown>,
        );
      }
    } else if (typeof tableValue === "object") {
      // Fallback: treat as regular rows
      result[tableName] = tableValue as Record<string, unknown>;
    }
  }

  return result;
}

// Unwrap MergeableChanges row structure where each row is [cells, hlc?]
function unwrapMergeableRows(
  rows: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [rowId, rowValue] of Object.entries(rows)) {
    if (!rowValue) {
      result[rowId] = undefined;
      continue;
    }

    // MergeableChanges wraps each row in [cells, hlc?]
    if (Array.isArray(rowValue) && rowValue.length >= 1) {
      result[rowId] = rowValue[0];
    } else {
      result[rowId] = rowValue;
    }
  }

  return result;
}

export interface MarkdownDirPersisterConfig<TStorage> {
  tableName: string;
  dirName: string;
  label: string;
  legacyJsonPath: string;
  toFrontmatter: (entity: TStorage) => {
    frontmatter: Record<string, FsSyncJsonValue>;
    body: string;
  };
  fromFrontmatter: (
    frontmatter: Record<string, unknown>,
    body: string,
  ) => TStorage;
}

// https://github.com/tinyplex/tinybase/blob/aa5cb9014f6def18266414174e0fd31ccfae0828/src/persisters/common/create.ts#L185
// When content[2] === 1, TinyBase uses applyChanges() instead of setContent(),
// allowing us to merge into a specific table without wiping other tables.
export function asTablesChanges(
  tables: Record<string, Record<string, Record<string, unknown>>>,
): [Record<string, unknown>, Record<string, unknown>, 1] {
  return [tables, {}, 1];
}

export function iterateTableRows<K extends keyof TablesContent>(
  tables: TablesContent | undefined,
  tableName: K,
): Array<TableRowType<K> & { id: string }> {
  const result: Array<TableRowType<K> & { id: string }> = [];
  const tableData = tables?.[tableName];
  if (tableData) {
    for (const [id, row] of Object.entries(tableData)) {
      result.push({ ...row, id } as TableRowType<K> & { id: string });
    }
  }
  return result;
}
