import { boolean, json, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

const SHARED = {
  id: uuid("id").primaryKey().defaultRandom(),
  // it is crucial to have user_id for sync filtering
  user_id: uuid("user_id").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
};

export const TABLE_HUMANS = "humans";
export const humans = pgTable(TABLE_HUMANS, {
  ...SHARED,
  name: text("name").notNull(),
  email: text("email").notNull(),
  org_id: uuid("org_id").notNull(),
  job_title: text("job_title"),
  linkedin_username: text("linkedin_username"),
  is_user: boolean("is_user"),
});

export const TABLE_ORGANIZATIONS = "organizations";
export const organizations = pgTable(TABLE_ORGANIZATIONS, {
  ...SHARED,
  name: text("name").notNull(),
});

export const TABLE_FOLDERS = "folders";
export const folders: any = pgTable(TABLE_FOLDERS, {
  ...SHARED,
  name: text("name").notNull(),
  parent_folder_id: uuid("parent_folder_id").references((): any => folders.id, { onDelete: "cascade" }),
});

export const TABLE_SESSIONS = "sessions";
export const sessions = pgTable(TABLE_SESSIONS, {
  ...SHARED,
  folder_id: uuid("folder_id").references(() => folders.id, { onDelete: "cascade" }),
  event_id: uuid("event_id"),
  title: text("title").notNull(),
  raw_md: text("raw_md").notNull(),
  enhanced_md: text("enhanced_md").notNull(),
  transcript: json("transcript").notNull(),
});

export const TABLE_EVENTS = "events";
export const events = pgTable(TABLE_EVENTS, {
  ...SHARED,
  calendar_id: uuid("calendar_id").notNull().references(() => calendars.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  started_at: timestamp("started_at").notNull(),
  ended_at: timestamp("ended_at").notNull(),
});

export const TABLE_CALENDARS = "calendars";
export const calendars = pgTable(TABLE_CALENDARS, {
  ...SHARED,
  name: text("name").notNull(),
});

export const TABLE_MAPPING_SESSION_PARTICIPANT = "mapping_session_participant";
export const mappingSessionParticipant = pgTable(TABLE_MAPPING_SESSION_PARTICIPANT, {
  ...SHARED,
  session_id: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  human_id: uuid("human_id").notNull().references(() => humans.id, { onDelete: "cascade" }),
});

export const TABLE_TAGS = "tags";
export const tags = pgTable(TABLE_TAGS, {
  ...SHARED,
  name: text("name").notNull(),
});

export const TABLE_MAPPING_TAG_SESSION = "mapping_tag_session";
export const mappingTagSession = pgTable(TABLE_MAPPING_TAG_SESSION, {
  ...SHARED,
  tag_id: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  session_id: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
});

export const TABLE_TEMPLATES = "templates";
export const templates = pgTable(TABLE_TEMPLATES, {
  ...SHARED,
  title: text("title").notNull(),
  description: text("description").notNull(),
  sections: json("sections").notNull(),
});

export const TABLE_CHAT_GROUPS = "chat_groups";
export const chatGroups = pgTable(TABLE_CHAT_GROUPS, {
  ...SHARED,
  title: text("title").notNull(),
});

export const TABLE_CHAT_MESSAGES = "chat_messages";
export const chatMessages = pgTable(TABLE_CHAT_MESSAGES, {
  ...SHARED,
  chat_group_id: uuid("chat_group_id").notNull().references(() => chatGroups.id, { onDelete: "cascade" }),
  // https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat#messages
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  // https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message#uimessagepart-types
  parts: json("parts"),
});

export const transcriptSchema = z.object({
  words: z.array(z.object({
    speaker: z.string(),
    text: z.string(),
    start: z.iso.datetime(),
    end: z.iso.datetime(),
  })),
});

export const humanSchema = createSelectSchema(humans);
export const organizationSchema = createSelectSchema(organizations);
export const folderSchema = createSelectSchema(folders);
export const eventSchema = createSelectSchema(events);
export const calendarSchema = createSelectSchema(calendars);
export const sessionSchema = createSelectSchema(sessions);
export const mappingSessionParticipantSchema = createSelectSchema(mappingSessionParticipant);
export const tagSchema = createSelectSchema(tags);
export const mappingTagSessionSchema = createSelectSchema(mappingTagSession);
export const templateSchema = createSelectSchema(templates);
export const chatGroupSchema = createSelectSchema(chatGroups);
export const chatMessageSchema = createSelectSchema(chatMessages);
