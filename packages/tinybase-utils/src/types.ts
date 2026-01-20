import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type { Content, OptionalSchemas } from "tinybase/with-schemas";

export type TablesInput = Record<
  string,
  Record<string, Record<string, unknown> | undefined> | undefined
>;

export type ChangedTables = Record<string, Record<string, unknown> | undefined>;

export type TablesChanges = [
  Record<string, unknown>,
  Record<string, unknown>,
  1,
];

export type { PersistedChanges, Persists, Content, OptionalSchemas };
