import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
