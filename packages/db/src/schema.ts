import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// TODO: this is kind of isolated. need drizzle-zod bridge. we might want to just remove zod schemas from hybrid.ts

export const TABLE_HUMANS = "humans";
export const humans = pgTable(TABLE_HUMANS, {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const TABLE_ORGANIZATIONS = "organizations";
export const organizations = pgTable(TABLE_ORGANIZATIONS, {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const TABLE_SESSIONS = "sessions";
export const sessions = pgTable(TABLE_SESSIONS, {
  id: uuid("id").primaryKey().defaultRandom(),
  humanId: uuid("human_id").notNull().references(() => humans.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const TABLE_EVENTS = "events";
export const events = pgTable(TABLE_EVENTS, {
  id: uuid("id").primaryKey().defaultRandom(),
  humanId: uuid("human_id").notNull().references(() => humans.id),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
