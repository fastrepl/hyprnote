import type { TablesSchema } from "tinybase/with-schemas";
import { z } from "zod";

import { type InferTinyBaseSchema, jsonObject, type ToStorageType } from "./shared";

export const generalSchema = z.object({
  user_id: z.string(),
  autostart: z.boolean().default(false),
  telemetry_consent: z.boolean().default(true),
  save_recordings: z.boolean().default(true),
  notification_event: z.boolean().default(true),
  notification_detect: z.boolean().default(true),
  respect_dnd: z.boolean().default(false),
  quit_intercept: z.boolean().default(false),
  ai_language: z.string().default("en"),
  spoken_languages: jsonObject(z.array(z.string()).default(["en"])),
  ignored_platforms: jsonObject(z.array(z.string()).default([])),
  current_llm_provider: z.string().optional(),
  current_llm_model: z.string().optional(),
  current_stt_provider: z.string().optional(),
  current_stt_model: z.string().optional(),
});

export const aiProviderSchema = z.object({
  type: z.enum(["stt", "llm"]),
  base_url: z.url().min(1),
  api_key: z.string(),
}).refine(
  (data) => !data.base_url.startsWith("https:") || data.api_key.length > 0,
  {
    message: "API key is required for HTTPS URLs",
    path: ["api_key"],
  },
);

export type AIProvider = z.infer<typeof aiProviderSchema>;
export type General = z.infer<typeof generalSchema>;

export type AIProviderStorage = ToStorageType<typeof aiProviderSchema>;
export type GeneralStorage = ToStorageType<typeof generalSchema>;

export const internalSchemaForTinybase = {
  value: {
    user_id: { type: "string" },
    autostart: { type: "boolean" },
    save_recordings: { type: "boolean" },
    notification_event: { type: "boolean" },
    notification_detect: { type: "boolean" },
    respect_dnd: { type: "boolean" },
    quit_intercept: { type: "boolean" },
    telemetry_consent: { type: "boolean" },
    ai_language: { type: "string" },
    spoken_languages: { type: "string" },
    ignored_platforms: { type: "string" },
    current_llm_provider: { type: "string" },
    current_llm_model: { type: "string" },
    current_stt_provider: { type: "string" },
    current_stt_model: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof generalSchema>,
  table: {
    ai_providers: {
      type: { type: "string" },
      base_url: { type: "string" },
      api_key: { type: "string" },
    } as const satisfies InferTinyBaseSchema<typeof aiProviderSchema>,
    changes: {
      row_id: { type: "string" },
      table: { type: "string" },
      updated: { type: "boolean" },
      deleted: { type: "boolean" },
    },
    electric: {
      offset: { type: "string" },
      handle: { type: "string" },
      table: { type: "string" },
    },
  } as const satisfies TablesSchema,
};
