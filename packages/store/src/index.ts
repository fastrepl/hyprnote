import type { TablesSchema, ValuesSchema } from "tinybase/with-schemas";

import { tableSchemaForTinybase, valueSchemaForTinybase } from "./schema";

export * from "./schema";
export * from "./shared";
export * from "./derived/folders";

export const SCHEMA = {
  value: {
    ...valueSchemaForTinybase,
  } satisfies ValuesSchema,
  table: {
    ...tableSchemaForTinybase,
  } satisfies TablesSchema,
} as const;

export type Schemas = [typeof SCHEMA.table, typeof SCHEMA.value];
