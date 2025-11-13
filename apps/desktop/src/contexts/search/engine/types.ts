import { Orama } from "@orama/orama";
import { z } from "zod";

const searchEntityTypeSchema = z.enum(["session", "human", "organization"]);
export type SearchEntityType = z.infer<typeof searchEntityTypeSchema>;

export const searchDocumentSchema = z.object({
  id: z.string(),
  type: searchEntityTypeSchema,
  title: z.string(),
  content: z.string(),
  created_at: z.number(),
});

export type SearchDocument = z.infer<typeof searchDocumentSchema>;

export const SEARCH_SCHEMA = {
  id: "string",
  type: "enum",
  title: "string",
  content: "string",
  created_at: "number",
} as const satisfies InferOramaSchema<typeof searchDocumentSchema>;

export type Index = Orama<typeof SEARCH_SCHEMA>;

const numberFilterSchema = z
  .object({
    gte: z.number().optional(),
    lte: z.number().optional(),
    gt: z.number().optional(),
    lt: z.number().optional(),
    eq: z.number().optional(),
  })
  .optional();

export const searchFiltersSchema = z.object({
  created_at: numberFilterSchema,
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export type SearchHit = {
  score: number;
  document: SearchDocument;
};

type InferOramaField<T> = T extends z.ZodString
  ? "string"
  : T extends z.ZodNumber
    ? "number"
    : T extends z.ZodBoolean
      ? "boolean"
      : T extends z.ZodEnum<any>
        ? "enum"
        : never;

type InferOramaSchema<T extends z.ZodObject<any>> = {
  [K in keyof T["shape"]]: InferOramaField<T["shape"][K]>;
};
