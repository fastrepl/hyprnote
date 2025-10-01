import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const TABLE_USERS = "users";
export const users = pgTable(TABLE_USERS, {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const TABLE_SESSIONS = "sessions";
export const sessions = pgTable(TABLE_SESSIONS, {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const TABLE_ELECTRIC_METAS = "electric_metas";
export const electricMeta = pgTable(TABLE_ELECTRIC_METAS, {
  id: uuid("id").primaryKey().defaultRandom(),
  device: text("device").notNull().unique(),
  table: text("table").notNull(),
  offset: text("offset").notNull(),
  handle: text("handle").notNull(),
});

export const NAME_TABLE_MAPPING = {
  TABLE_USERS: users,
  TABLE_SESSIONS: sessions,
} as const;

export const TABLE_NAME_MAPPING = {
  users: TABLE_USERS,
  sessions: TABLE_SESSIONS,
} as const;
