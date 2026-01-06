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

export type PersistedChanges = [TablesContent, Record<string, unknown>];

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
