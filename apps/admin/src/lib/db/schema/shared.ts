import { randomUUID } from "crypto";
import { integer, text } from "drizzle-orm/sqlite-core";

export const shared = {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
};
