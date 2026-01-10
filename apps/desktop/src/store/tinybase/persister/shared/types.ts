import type {
  JsonValue as FsSyncJsonValue,
  ParsedDocument,
} from "@hypr/plugin-fs-sync";
import { SCHEMA } from "@hypr/store";

import type { Store } from "../../store/main";

export type { FsSyncJsonValue as JsonValue };

export type BatchItem<T> = [T, string];

export type TablesContent = Partial<ReturnType<Store["getTables"]>>;

export type WriteOperation =
  | { type: "json"; path: string; content: unknown }
  | { type: "document-batch"; items: Array<[ParsedDocument, string]> }
  | { type: "delete"; path: string }
  | { type: "delete-batch"; paths: string[] };

export type CollectorResult = {
  operations: WriteOperation[];
};

type TableNames = keyof typeof SCHEMA.table;

export type ChangedTables = Partial<{
  [K in TableNames]: Record<string, unknown> | undefined;
}>;

export interface MarkdownDirPersisterConfig<TStorage> {
  tableName: string;
  dirName: string;
  label: string;
  entityParser: (path: string) => string | null;
  toFrontmatter: (entity: TStorage) => {
    frontmatter: Record<string, FsSyncJsonValue>;
    body: string;
  };
  fromFrontmatter: (
    frontmatter: Record<string, unknown>,
    body: string,
  ) => TStorage;
}
