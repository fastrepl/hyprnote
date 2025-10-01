export const MergeableStoreOnly = 2;
export const StoreOrMergeableStore = 3;

export const BROADCAST_CHANNEL_NAME = "hypr-window-sync";

// https://github.com/tinyplex/tinybase/issues/136#issuecomment-3015194772
type InferCellSchema<T> = T extends string | undefined ? { type: "string"; default?: string }
  : T extends number | undefined ? { type: "number"; default?: number }
  : T extends boolean | undefined ? { type: "boolean"; default?: boolean }
  : T extends string ? { type: "string"; default?: string }
  : T extends number ? { type: "number"; default?: number }
  : T extends boolean ? { type: "boolean"; default?: boolean }
  : never;

export type InferTinyBaseSchema<T> = T extends { _output: infer Output } ? {
    [K in keyof Omit<Output, "id">]: InferCellSchema<Output[K]>;
  }
  : never;
