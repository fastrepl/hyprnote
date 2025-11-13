import { z } from "zod";

export const MergeableStoreOnly = 2;
export const StoreOrMergeableStore = 3;

export const jsonObject = <T extends z.ZodTypeAny>(schema: T) => {
  return z.union([z.string(), z.any()]).transform((input, ctx) => {
    try {
      const parsed = typeof input === "string" ? JSON.parse(input) : input;
      return schema.parse(parsed);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: String(e) });
      return z.NEVER;
    }
  });
};

// https://github.com/tinyplex/tinybase/issues/136#issuecomment-3015194772
type InferCellSchema<T> = T extends string | undefined
  ? { type: "string"; default?: string }
  : T extends number | undefined
    ? { type: "number"; default?: number }
    : T extends boolean | undefined
      ? { type: "boolean"; default?: boolean }
      : T extends string
        ? { type: "string"; default?: string }
        : T extends number
          ? { type: "number"; default?: number }
          : T extends boolean
            ? { type: "boolean"; default?: boolean }
            : T extends object
              ? { type: "string" }
              : never;

export type InferTinyBaseSchema<T> = T extends { _output: infer Output }
  ? {
      [K in keyof Omit<Output, "id">]: InferCellSchema<Output[K]>;
    }
  : never;

type TransformForSchema<T> = T extends string | undefined
  ? string | undefined
  : T extends number | undefined
    ? number | undefined
    : T extends boolean | undefined
      ? boolean | undefined
      : T extends string
        ? string
        : T extends number
          ? number
          : T extends boolean
            ? boolean
            : T extends Array<any>
              ? string
              : T extends object
                ? string
                : T;

export type ToStorageType<T> = T extends { _output: infer Output }
  ? {
      [K in keyof Omit<Output, "id">]: TransformForSchema<Output[K]>;
    }
  : never;
