import type { TablesSchema, ValuesSchema } from "tinybase/with-schemas";

import { externalTableSchemaForTinybase } from "./schema-external";
import { internalSchemaForTinybase } from "./schema-internal";

export * from "./schema-external";
export * from "./schema-internal";
export * from "./shared";

export const SCHEMA = {
  value: {
    ...internalSchemaForTinybase.value,
  },
  table: {
    ...externalTableSchemaForTinybase,
    ...internalSchemaForTinybase.table,
  },
} as const;

export type Schemas = [typeof SCHEMA.table, typeof SCHEMA.value];
