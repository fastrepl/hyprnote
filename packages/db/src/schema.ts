import { json, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
});

export const TABLE_ORGANIZATIONS = "organizations";
export const organizations = pgTable(TABLE_ORGANIZATIONS, {
  ...SHARED,
  name: text("name").notNull(),
});

export const TABLE_SESSIONS = "sessions";
export const sessions = pgTable(TABLE_SESSIONS, {
  ...SHARED,
  event_id: uuid("event_id"),
  title: text("title").notNull(),
  raw_md: text("raw_md").notNull(),
  enhanced_md: text("enhanced_md").notNull(),
  transcript: json("transcript").notNull(),
});

export const TABLE_EVENTS = "events";
export const events = pgTable(TABLE_EVENTS, {
  ...SHARED,
  title: text("title").notNull(),
  started_at: timestamp("started_at").notNull(),
  ended_at: timestamp("ended_at").notNull(),
});

export const TABLE_MAPPING_EVENT_PARTICIPANT = "mapping_event_participant";
export const mappingEventParticipant = pgTable(TABLE_MAPPING_EVENT_PARTICIPANT, {
  ...SHARED,
  event_id: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  human_id: uuid("human_id").notNull().references(() => humans.id, { onDelete: "cascade" }),
});

export const humanSchema = createSelectSchema(humans);
export const organizationSchema = createSelectSchema(organizations);
export const eventSchema = createSelectSchema(events);
export const sessionSchema = createSelectSchema(sessions);
export const mappingEventParticipantSchema = createSelectSchema(mappingEventParticipant);

export const transcriptSchema = z.object({
  words: z.array(z.object({
    speaker: z.string(),
    text: z.string(),
    start: z.iso.datetime(),
    end: z.iso.datetime(),
  })),
});
