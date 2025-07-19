import { sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

import { organization } from "./auth";
import { shared } from "./shared";

export const llmProvider = sqliteTable("llm_provider", {
  ...shared,
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  model: text("model").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
}, (table) => ({
  nameUniqueInOrg: unique().on(table.name, table.organizationId),
}));
