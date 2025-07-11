import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { shared } from "./shared";

export const llmProvider = sqliteTable("llm_provider", {
  ...shared,
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  model: text("model").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
});
