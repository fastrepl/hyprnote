import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  integer,
  json,
  pgPolicy,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, serviceRole } from "drizzle-orm/supabase";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

const equalsAuthUid = (column: AnyPgColumn) => sql`${column} = auth.uid()`;

const createOwnerPolicies = (tableName: string, userId: AnyPgColumn) => [
  pgPolicy(`${tableName}_select_owner`, {
    for: "select",
    to: authenticatedRole,
    using: equalsAuthUid(userId),
  }),
  pgPolicy(`${tableName}_insert_owner`, {
    for: "insert",
    to: authenticatedRole,
    withCheck: equalsAuthUid(userId),
  }),
  pgPolicy(`${tableName}_update_owner`, {
    for: "update",
    to: authenticatedRole,
    using: equalsAuthUid(userId),
    withCheck: equalsAuthUid(userId),
  }),
  pgPolicy(`${tableName}_delete_owner`, {
    for: "delete",
    to: authenticatedRole,
    using: equalsAuthUid(userId),
  }),
];

const createServiceRolePolicy = (tableName: string) =>
  pgPolicy(`${tableName}_service_all`, {
    for: "all",
    to: serviceRole,
    using: sql`true`,
    withCheck: sql`true`,
  });

const createPolicies = (tableName: string, userId: AnyPgColumn) => [
  ...createOwnerPolicies(tableName, userId),
  createServiceRolePolicy(tableName),
];

const auth = pgSchema("auth");

const users = auth.table("users", {
  id: uuid("id").primaryKey(),
});

const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => createPolicies("profiles", table.id),
).enableRLS();

export const TABLE_HUMANS = "humans";
export const humans = pgTable(
  TABLE_HUMANS,
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    org_id: uuid("org_id").notNull(),
    job_title: text("job_title"),
    linkedin_username: text("linkedin_username"),
  },
  (table) => createPolicies(TABLE_HUMANS, table.user_id),
).enableRLS();

const SHARED = {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").notNull().defaultNow(),
};

export const TABLE_ORGANIZATIONS = "organizations";
export const organizations = pgTable(
  TABLE_ORGANIZATIONS,
  {
    ...SHARED,
    name: text("name").notNull(),
  },
  (table) => createPolicies(TABLE_ORGANIZATIONS, table.user_id),
).enableRLS();

export const TABLE_FOLDERS = "folders";
export const folders: any = pgTable(
  TABLE_FOLDERS,
  {
    ...SHARED,
    name: text("name").notNull(),
    parent_folder_id: uuid("parent_folder_id").references(
      (): any => folders.id,
      { onDelete: "cascade" },
    ),
  },
  (table) => createPolicies(TABLE_FOLDERS, table.user_id),
).enableRLS();

export const TABLE_SESSIONS = "sessions";
export const sessions = pgTable(
  TABLE_SESSIONS,
  {
    ...SHARED,
    folder_id: uuid("folder_id").references(() => folders.id, {
      onDelete: "cascade",
    }),
    event_id: uuid("event_id"),
    title: text("title").notNull(),
    raw_md: text("raw_md").notNull(),
    enhanced_md: text("enhanced_md").notNull(),
  },
  (table) => createPolicies(TABLE_SESSIONS, table.user_id),
).enableRLS();

export const TABLE_TRANSCRIPTS = "transcripts";
export const transcripts = pgTable(
  TABLE_TRANSCRIPTS,
  {
    ...SHARED,
    session_id: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    started_at: integer("started_at").notNull(),
    ended_at: integer("ended_at"),
  },
  (table) => createPolicies(TABLE_TRANSCRIPTS, table.user_id),
).enableRLS();

export const TABLE_WORDS = "words";
export const words = pgTable(
  TABLE_WORDS,
  {
    ...SHARED,
    transcript_id: uuid("transcript_id")
      .notNull()
      .references(() => transcripts.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    start_ms: integer("start_ms").notNull(),
    end_ms: integer("end_ms").notNull(),
    channel: integer("channel").notNull(),
  },
  (table) => createPolicies(TABLE_WORDS, table.user_id),
).enableRLS();

export const TABLE_SPEAKER_HINTS = "speaker_hints";
export const speakerHints = pgTable(
  TABLE_SPEAKER_HINTS,
  {
    ...SHARED,
    transcript_id: uuid("transcript_id")
      .notNull()
      .references(() => transcripts.id, { onDelete: "cascade" }),
    word_id: uuid("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    value: json("value").notNull(),
  },
  (table) => createPolicies(TABLE_SPEAKER_HINTS, table.user_id),
).enableRLS();

export const TABLE_EVENTS = "events";
export const events = pgTable(
  TABLE_EVENTS,
  {
    ...SHARED,
    calendar_id: uuid("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    started_at: timestamp("started_at").notNull(),
    ended_at: timestamp("ended_at").notNull(),
    location: text("location"),
    meeting_link: text("meeting_link"),
    description: text("description"),
    note: text("note"),
  },
  (table) => createPolicies(TABLE_EVENTS, table.user_id),
).enableRLS();

export const TABLE_CALENDARS = "calendars";
export const calendars = pgTable(
  TABLE_CALENDARS,
  {
    ...SHARED,
    name: text("name").notNull(),
  },
  (table) => createPolicies(TABLE_CALENDARS, table.user_id),
).enableRLS();

export const TABLE_MAPPING_SESSION_PARTICIPANT = "mapping_session_participant";
export const mappingSessionParticipant = pgTable(
  TABLE_MAPPING_SESSION_PARTICIPANT,
  {
    ...SHARED,
    session_id: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    human_id: uuid("human_id")
      .notNull()
      .references(() => humans.id, { onDelete: "cascade" }),
  },
  (table) => createPolicies(TABLE_MAPPING_SESSION_PARTICIPANT, table.user_id),
).enableRLS();

export const TABLE_TAGS = "tags";
export const tags = pgTable(
  TABLE_TAGS,
  {
    ...SHARED,
    name: text("name").notNull(),
  },
  (table) => createPolicies(TABLE_TAGS, table.user_id),
).enableRLS();

export const TABLE_MAPPING_TAG_SESSION = "mapping_tag_session";
export const mappingTagSession = pgTable(
  TABLE_MAPPING_TAG_SESSION,
  {
    ...SHARED,
    tag_id: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    session_id: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
  },
  (table) => createPolicies(TABLE_MAPPING_TAG_SESSION, table.user_id),
).enableRLS();

export const TABLE_TEMPLATES = "templates";
export const templates = pgTable(
  TABLE_TEMPLATES,
  {
    ...SHARED,
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category"),
    targets: json("targets"),
    sections: json("sections").notNull(),
  },
  (table) => createPolicies(TABLE_TEMPLATES, table.user_id),
).enableRLS();

export const TABLE_CHAT_GROUPS = "chat_groups";
export const chatGroups = pgTable(
  TABLE_CHAT_GROUPS,
  {
    ...SHARED,
    title: text("title").notNull(),
  },
  (table) => createPolicies(TABLE_CHAT_GROUPS, table.user_id),
).enableRLS();

export const TABLE_CHAT_MESSAGES = "chat_messages";
export const chatMessages = pgTable(
  TABLE_CHAT_MESSAGES,
  {
    ...SHARED,
    chat_group_id: uuid("chat_group_id")
      .notNull()
      .references(() => chatGroups.id, { onDelete: "cascade" }),
    // https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat#messages
    role: text("role").notNull(),
    content: text("content").notNull(),
    metadata: json("metadata"),
    // https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message#uimessagepart-types
    parts: json("parts"),
  },
  (table) => createPolicies(TABLE_CHAT_MESSAGES, table.user_id),
).enableRLS();

export const TABLE_MEMORIES = "memories";
export const memories = pgTable(
  TABLE_MEMORIES,
  {
    ...SHARED,
    type: text("type").notNull().default("vocab"),
    text: text("text").notNull(),
  },
  (table) => createPolicies(TABLE_MEMORIES, table.user_id),
).enableRLS();

export const TABLE_NOTE_HISTORY = "note_history";
export const noteHistory = pgTable(
  TABLE_NOTE_HISTORY,
  {
    ...SHARED,
    session_id: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    created_at_ms: integer("created_at_ms").notNull(),
    transcript_id: uuid("transcript_id").references(() => transcripts.id, {
      onDelete: "set null",
    }),
  },
  (table) => createPolicies(TABLE_NOTE_HISTORY, table.user_id),
).enableRLS();

export const humanSchema = createSelectSchema(humans);
export const organizationSchema = createSelectSchema(organizations);
export const folderSchema = createSelectSchema(folders);
export const eventSchema = createSelectSchema(events);
export const calendarSchema = createSelectSchema(calendars);
export const sessionSchema = createSelectSchema(sessions);
export const transcriptSchema = createSelectSchema(transcripts);
export const wordSchema = createSelectSchema(words);
export const speakerHintSchema = createSelectSchema(speakerHints);
export const mappingSessionParticipantSchema = createSelectSchema(
  mappingSessionParticipant,
);
export const tagSchema = createSelectSchema(tags);
export const mappingTagSessionSchema = createSelectSchema(mappingTagSession);
export const templateSchema = createSelectSchema(templates);
export const chatGroupSchema = createSelectSchema(chatGroups);
export const chatMessageSchema = createSelectSchema(chatMessages);
export const memorySchema = createSelectSchema(memories);
export const noteHistorySchema = createSelectSchema(noteHistory);

export const providerSpeakerIndexSchema = z.object({
  speaker_index: z.number(),
  provider: z.string().optional(),
  channel: z.number().optional(),
});

export type ProviderSpeakerIndexHint = z.infer<
  typeof providerSpeakerIndexSchema
>;
