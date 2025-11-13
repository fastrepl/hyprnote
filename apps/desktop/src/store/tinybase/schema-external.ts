import type { TablesSchema } from "tinybase/with-schemas";
import { z } from "zod";

import {
  calendarSchema as baseCalendarSchema,
  chatGroupSchema as baseChatGroupSchema,
  chatMessageSchema as baseChatMessageSchema,
  eventSchema as baseEventSchema,
  folderSchema as baseFolderSchema,
  humanSchema as baseHumanSchema,
  mappingSessionParticipantSchema as baseMappingSessionParticipantSchema,
  mappingTagSessionSchema as baseMappingTagSessionSchema,
  memorySchema as baseMemorySchema,
  organizationSchema as baseOrganizationSchema,
  sessionSchema as baseSessionSchema,
  speakerHintSchema as baseSpeakerHintSchema,
  tagSchema as baseTagSchema,
  templateSchema as baseTemplateSchema,
  transcriptSchema as baseTranscriptSchema,
  wordSchema,
} from "@hypr/db";

import { InferTinyBaseSchema, jsonObject, type ToStorageType } from "./shared";

export const humanSchema = baseHumanSchema.omit({ id: true }).extend({
  created_at: z.string(),
  job_title: z.preprocess((val) => val ?? undefined, z.string().optional()),
  linkedin_username: z.preprocess(
    (val) => val ?? undefined,
    z.string().optional(),
  ),
  is_user: z.preprocess((val) => val ?? undefined, z.boolean().optional()),
  memo: z.preprocess((val) => val ?? undefined, z.string().optional()),
});

export const eventSchema = baseEventSchema.omit({ id: true }).extend({
  created_at: z.string(),
  started_at: z.string(),
  ended_at: z.string(),
  location: z.preprocess((val) => val ?? undefined, z.string().optional()),
  meeting_link: z.preprocess((val) => val ?? undefined, z.string().optional()),
  description: z.preprocess((val) => val ?? undefined, z.string().optional()),
  note: z.preprocess((val) => val ?? undefined, z.string().optional()),
});

export const calendarSchema = baseCalendarSchema
  .omit({ id: true })
  .extend({ created_at: z.string() });

export const organizationSchema = baseOrganizationSchema
  .omit({ id: true })
  .extend({ created_at: z.string() });

export const folderSchema = baseFolderSchema.omit({ id: true }).extend({
  created_at: z.string(),
  parent_folder_id: z.preprocess(
    (val) => val ?? undefined,
    z.string().optional(),
  ),
});

export const sessionSchema = baseSessionSchema.omit({ id: true }).extend({
  created_at: z.string(),
  event_id: z.preprocess((val) => val ?? undefined, z.string().optional()),
  folder_id: z.preprocess((val) => val ?? undefined, z.string().optional()),
});

export const transcriptSchema = baseTranscriptSchema.omit({ id: true }).extend({
  created_at: z.string(),
  started_at: z.number(),
  ended_at: z.preprocess((val) => val ?? undefined, z.number().optional()),
});

export const mappingSessionParticipantSchema =
  baseMappingSessionParticipantSchema.omit({ id: true }).extend({
    created_at: z.string(),
  });

export const tagSchema = baseTagSchema.omit({ id: true }).extend({
  created_at: z.string(),
});

export const mappingTagSessionSchema = baseMappingTagSessionSchema
  .omit({ id: true })
  .extend({
    created_at: z.string(),
  });

export const templateSectionSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const templateSchema = baseTemplateSchema.omit({ id: true }).extend({
  created_at: z.string(),
  category: z.preprocess((val) => val ?? undefined, z.string().optional()),
  targets: z.preprocess(
    (val) => val ?? undefined,
    jsonObject(z.array(z.string())).optional(),
  ),
  sections: jsonObject(z.array(templateSectionSchema)),
});

export const chatGroupSchema = baseChatGroupSchema
  .omit({ id: true })
  .extend({ created_at: z.string() });
export const chatMessageSchema = baseChatMessageSchema
  .omit({ id: true })
  .extend({
    created_at: z.string(),
    metadata: jsonObject(z.any()),
    parts: jsonObject(z.any()),
  });

export const memorySchema = baseMemorySchema.omit({ id: true }).extend({
  created_at: z.string(),
});

export const wordSchemaOverride = wordSchema.omit({ id: true }).extend({
  created_at: z.string(),
  speaker: z.preprocess((val) => val ?? undefined, z.string().optional()),
  transcript_id: z.string(),
  metadata: z.preprocess(
    (val) => val ?? undefined,
    jsonObject(z.record(z.string(), z.unknown())).optional(),
  ),
});

export const speakerHintSchemaOverride = baseSpeakerHintSchema
  .omit({ id: true })
  .extend({
    created_at: z.string(),
    transcript_id: z.string(),
    word_id: z.string(),
    type: z.string(),
    value: jsonObject(z.record(z.string(), z.unknown())),
  });

export type Human = z.infer<typeof humanSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Calendar = z.infer<typeof calendarSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Folder = z.infer<typeof folderSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Transcript = z.infer<typeof transcriptSchema>;
export type Word = z.infer<typeof wordSchemaOverride>;
export type SpeakerHint = z.infer<typeof speakerHintSchemaOverride>;
export type mappingSessionParticipant = z.infer<
  typeof mappingSessionParticipantSchema
>;
export type Tag = z.infer<typeof tagSchema>;
export type MappingTagSession = z.infer<typeof mappingTagSessionSchema>;
export type Template = z.infer<typeof templateSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export type ChatGroup = z.infer<typeof chatGroupSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type Memory = z.infer<typeof memorySchema>;

export type SessionStorage = ToStorageType<typeof sessionSchema>;
export type TranscriptStorage = ToStorageType<typeof transcriptSchema>;
export type WordStorage = ToStorageType<typeof wordSchemaOverride>;
export type SpeakerHintStorage = ToStorageType<
  typeof speakerHintSchemaOverride
>;
export type TemplateStorage = ToStorageType<typeof templateSchema>;
export type ChatMessageStorage = ToStorageType<typeof chatMessageSchema>;
export type MemoryStorage = ToStorageType<typeof memorySchema>;

export const externalTableSchemaForTinybase = {
  folders: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    name: { type: "string" },
    parent_folder_id: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof folderSchema>,
  sessions: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    folder_id: { type: "string" },
    event_id: { type: "string" },
    title: { type: "string" },
    raw_md: { type: "string" },
    enhanced_md: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof sessionSchema>,
  transcripts: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    session_id: { type: "string" },
    started_at: { type: "number" },
    ended_at: { type: "number" },
  } satisfies InferTinyBaseSchema<typeof transcriptSchema>,
  words: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    text: { type: "string" },
    transcript_id: { type: "string" },
    start_ms: { type: "number" },
    end_ms: { type: "number" },
    channel: { type: "number" },
    metadata: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof wordSchemaOverride>,
  speaker_hints: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    transcript_id: { type: "string" },
    word_id: { type: "string" },
    type: { type: "string" },
    value: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof speakerHintSchemaOverride>,
  humans: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    name: { type: "string" },
    email: { type: "string" },
    org_id: { type: "string" },
    job_title: { type: "string" },
    linkedin_username: { type: "string" },
    is_user: { type: "boolean" },
    memo: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof humanSchema>,
  organizations: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    name: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof organizationSchema>,
  calendars: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    name: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof calendarSchema>,
  events: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    calendar_id: { type: "string" },
    title: { type: "string" },
    started_at: { type: "string" },
    ended_at: { type: "string" },
    location: { type: "string" },
    meeting_link: { type: "string" },
    description: { type: "string" },
    note: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof eventSchema>,
  mapping_session_participant: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    session_id: { type: "string" },
    human_id: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof mappingSessionParticipantSchema>,
  tags: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    name: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof tagSchema>,
  mapping_tag_session: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    tag_id: { type: "string" },
    session_id: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof mappingTagSessionSchema>,
  templates: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    sections: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof templateSchema>,
  chat_groups: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    title: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof chatGroupSchema>,
  chat_messages: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    chat_group_id: { type: "string" },
    role: { type: "string" },
    content: { type: "string" },
    metadata: { type: "string" },
    parts: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof chatMessageSchema>,
  memories: {
    user_id: { type: "string" },
    created_at: { type: "string" },
    type: { type: "string" },
    text: { type: "string" },
  } satisfies InferTinyBaseSchema<typeof memorySchema>,
} as const satisfies TablesSchema;
