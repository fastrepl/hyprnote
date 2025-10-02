import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const SHARED = {
  id: uuid("id").primaryKey().defaultRandom(),
  // it is crucial to have user_id for sync filtering
  user_id: uuid("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
};

export const TABLE_HUMANS = "humans";
export const humans = pgTable(TABLE_HUMANS, {
  ...SHARED,
  name: text("name").notNull(),
  email: text("email").notNull(),
});

export const TABLE_ORGANIZATIONS = "organizations";
export const organizations = pgTable(TABLE_ORGANIZATIONS, {
  ...SHARED,
  name: text("name").notNull(),
});

export const TABLE_SESSIONS = "sessions";
export const sessions = pgTable(TABLE_SESSIONS, {
  ...SHARED,
  title: text("title").notNull(),
  body: text("body").notNull(),
});

export const TABLE_EVENTS = "events";
export const events = pgTable(TABLE_EVENTS, {
  ...SHARED,
  title: text("title").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
});
