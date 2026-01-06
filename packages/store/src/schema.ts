import type { TablesSchema } from "tinybase/with-schemas";
import { z } from "zod";

import { InferTinyBaseSchema, jsonObject, type ToStorageType } from "./shared";

export const humanSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  name: z.string(),
  email: z.string(),
  org_id: z.string(),
  job_title: z.preprocess((val) => val ?? undefined, z.string().optional()),
  linkedin_username: z.preprocess(
    (val) => val ?? undefined,
    z.string().optional(),
  ),
  memo: z.preprocess((val) => val ?? undefined, z.string().optional()),
});

export const eventSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  tracking_id_event: z.string(),
  calendar_id: z.string(),
  title: z.string(),
  started_at: z.string(),
  ended_at: z.string(),
  location: z.preprocess((val) => val ?? undefined, z.string().optional()),
  meeting_link: z.preprocess((val) => val ?? undefined, z.string().optional()),
  description: z.preprocess((val) => val ?? undefined, z.string().optional()),
  note: z.preprocess((val) => val ?? undefined, z.string().optional()),
  ignored: z.preprocess((val) => val ?? undefined, z.boolean().optional()),
  recurrence_series_id: z.preprocess(
    (val) => val ?? undefined,
    z.string().optional(),
  ),
});

export const calendarProviderSchema = z.enum(["apple", "google", "outlook"]);
export type CalendarProvider = z.infer<typeof calendarProviderSchema>;

export const calendarSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  tracking_id_calendar: z.string(),
  name: z.string(),
  enabled: z.preprocess((val) => val ?? false, z.boolean()),
  provider: calendarProviderSchema,
  source: z.preprocess((val) => val ?? undefined, z.string().optional()),
  color: z.preprocess((val) => val ?? undefined, z.string().optional()),
});

export const organizationSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  name: z.string(),
});

export const sessionSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  folder_id: z.preprocess((val) => val ?? undefined, z.string().optional()),
  event_id: z.preprocess((val) => val ?? undefined, z.string().optional()),
  title: z.string(),
  raw_md: z.string(),
});

export const transcriptSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  session_id: z.string(),
  started_at: z.number(),
  ended_at: z.preprocess((val) => val ?? undefined, z.number().optional()),
});

export const participantSourceSchema = z.enum(["manual", "auto", "excluded"]);
export type ParticipantSource = z.infer<typeof participantSourceSchema>;

export const mappingSessionParticipantSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  session_id: z.string(),
  human_id: z.string(),
  source: z.preprocess(
    (val) => val ?? undefined,
    participantSourceSchema.optional(),
  ),
});

export const tagSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  name: z.string(),
});

export const mappingTagSessionSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  tag_id: z.string(),
  session_id: z.string(),
});

export const templateSectionSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const templateSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.preprocess((val) => val ?? undefined, z.string().optional()),
  targets: z.preprocess(
    (val) => val ?? undefined,
    jsonObject(z.array(z.string())).optional(),
  ),
  sections: jsonObject(z.array(templateSectionSchema)),
});

export const chatGroupSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  title: z.string(),
});

export const chatMessageSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  chat_group_id: z.string(),
  role: z.string(),
  content: z.string(),
  metadata: jsonObject(z.any()),
  parts: jsonObject(z.any()),
});

export const chatShortcutSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  title: z.string(),
  content: z.string(),
});

export const enhancedNoteSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  session_id: z.string(),
  content: z.string(),
  template_id: z.preprocess((val) => val ?? undefined, z.string().optional()),
  position: z.number(),
  title: z.preprocess((val) => val ?? undefined, z.string().optional()),
});

export const promptSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  task_type: z.string(),
  content: z.string(),
});

export const wordSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  transcript_id: z.string(),
  text: z.string(),
  start_ms: z.number(),
  end_ms: z.number(),
  channel: z.number(),
  speaker: z.preprocess((val) => val ?? undefined, z.string().optional()),
  metadata: z.preprocess(
    (val) => val ?? undefined,
    jsonObject(z.record(z.string(), z.unknown())).optional(),
  ),
});

export const speakerHintSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  transcript_id: z.string(),
  word_id: z.string(),
  type: z.string(),
  value: jsonObject(z.record(z.string(), z.unknown())),
});

export const providerSpeakerIndexSchema = z.object({
  speaker_index: z.number(),
  provider: z.string().optional(),
  channel: z.number().optional(),
});

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
  ignored_recurring_series: jsonObject(z.array(z.string()).default([])),
  current_llm_provider: z.string().optional(),
  current_llm_model: z.string().optional(),
  current_stt_provider: z.string().optional(),
  current_stt_model: z.string().optional(),
});

export const aiProviderSchema = z
  .object({
    type: z.enum(["stt", "llm"]),
    base_url: z.url().min(1),
    api_key: z.string(),
  })
  .refine(
    (data) => !data.base_url.startsWith("https:") || data.api_key.length > 0,
    {
      message: "API key is required for HTTPS URLs",
      path: ["api_key"],
    },
  );

export type ProviderSpeakerIndexHint = z.infer<
  typeof providerSpeakerIndexSchema
>;

export type Human = z.infer<typeof humanSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Calendar = z.infer<typeof calendarSchema>;
export type CalendarStorage = ToStorageType<typeof calendarSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Transcript = z.infer<typeof transcriptSchema>;
export type Word = z.infer<typeof wordSchema>;
export type SpeakerHint = z.infer<typeof speakerHintSchema>;
export type MappingSessionParticipant = z.infer<
  typeof mappingSessionParticipantSchema
>;
export type Tag = z.infer<typeof tagSchema>;
export type MappingTagSession = z.infer<typeof mappingTagSessionSchema>;
export type Template = z.infer<typeof templateSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export type ChatGroup = z.infer<typeof chatGroupSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatShortcut = z.infer<typeof chatShortcutSchema>;
export type EnhancedNote = z.infer<typeof enhancedNoteSchema>;
export type Prompt = z.infer<typeof promptSchema>;
export type AIProvider = z.infer<typeof aiProviderSchema>;
export type General = z.infer<typeof generalSchema>;

export type SessionStorage = ToStorageType<typeof sessionSchema>;
export type TranscriptStorage = ToStorageType<typeof transcriptSchema>;
export type WordStorage = ToStorageType<typeof wordSchema>;
export type SpeakerHintStorage = ToStorageType<typeof speakerHintSchema>;
export type TemplateStorage = ToStorageType<typeof templateSchema>;
export type ChatMessageStorage = ToStorageType<typeof chatMessageSchema>;
export type EnhancedNoteStorage = ToStorageType<typeof enhancedNoteSchema>;
export type HumanStorage = ToStorageType<typeof humanSchema>;
export type OrganizationStorage = ToStorageType<typeof organizationSchema>;
export type PromptStorage = ToStorageType<typeof promptSchema>;
export type ChatShortcutStorage = ToStorageType<typeof chatShortcutSchema>;
export type EventStorage = ToStorageType<typeof eventSchema>;
export type MappingSessionParticipantStorage = ToStorageType<
  typeof mappingSessionParticipantSchema
>;
export type AIProviderStorage = ToStorageType<typeof aiProviderSchema>;
export type GeneralStorage = ToStorageType<typeof generalSchema>;

export const tableSchemaForTinybase = {
  sessions: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    folder_id: { type: "string" },
    event_id: { type: "string" },
    title: { type: "string" },
    raw_md: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof sessionSchema>,
  transcripts: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    session_id: { type: "string" },
    started_at: { type: "number" },
    ended_at: { type: "number" },
  } as const satisfies InferTinyBaseSchema<typeof transcriptSchema>,
  words: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    text: { type: "string" },
    transcript_id: { type: "string" },
    start_ms: { type: "number" },
    end_ms: { type: "number" },
    channel: { type: "number" },
    speaker: { type: "string" },
    metadata: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof wordSchema>,
  speaker_hints: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    transcript_id: { type: "string" },
    word_id: { type: "string" },
    type: { type: "string" },
    value: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof speakerHintSchema>,
  humans: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    name: { type: "string" },
    email: { type: "string" },
    org_id: { type: "string" },
    job_title: { type: "string" },
    linkedin_username: { type: "string" },
    memo: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof humanSchema>,
  organizations: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    name: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof organizationSchema>,
  calendars: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    tracking_id_calendar: { type: "string" },
    name: { type: "string" },
    enabled: { type: "boolean" },
    provider: { type: "string" },
    source: { type: "string" },
    color: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof calendarSchema>,
  events: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    tracking_id_event: { type: "string" },
    calendar_id: { type: "string" },
    title: { type: "string" },
    started_at: { type: "string" },
    ended_at: { type: "string" },
    location: { type: "string" },
    meeting_link: { type: "string" },
    description: { type: "string" },
    note: { type: "string" },
    ignored: { type: "boolean" },
    recurrence_series_id: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof eventSchema>,
  mapping_session_participant: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    session_id: { type: "string" },
    human_id: { type: "string" },
    source: { type: "string" },
  } as const satisfies InferTinyBaseSchema<
    typeof mappingSessionParticipantSchema
  >,
  tags: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    name: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof tagSchema>,
  mapping_tag_session: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    tag_id: { type: "string" },
    session_id: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof mappingTagSessionSchema>,
  templates: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    sections: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof templateSchema>,
  chat_groups: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    title: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof chatGroupSchema>,
  chat_messages: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    chat_group_id: { type: "string" },
    role: { type: "string" },
    content: { type: "string" },
    metadata: { type: "string" },
    parts: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof chatMessageSchema>,
  enhanced_notes: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    session_id: { type: "string" },
    content: { type: "string" },
    template_id: { type: "string" },
    position: { type: "number" },
    title: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof enhancedNoteSchema>,
  prompts: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    task_type: { type: "string" },
    content: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof promptSchema>,
  chat_shortcuts: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    title: { type: "string" },
    content: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof chatShortcutSchema>,
} as const satisfies TablesSchema;

export const valueSchemaForTinybase = {
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
  ignored_recurring_series: { type: "string" },
  current_llm_provider: { type: "string" },
  current_llm_model: { type: "string" },
  current_stt_provider: { type: "string" },
  current_stt_model: { type: "string" },
} as const satisfies InferTinyBaseSchema<typeof generalSchema>;
