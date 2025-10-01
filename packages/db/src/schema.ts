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

export const TABLES = {
  TABLE_USERS: users,
  TABLE_SESSIONS: sessions,
};

export const TABLE_NAMES = {
  users: TABLE_USERS,
  sessions: TABLE_SESSIONS,
} as const;
