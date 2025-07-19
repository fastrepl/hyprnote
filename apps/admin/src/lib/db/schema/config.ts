import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { organization } from "./auth";
import { shared } from "./shared";

export const organizationConfig = sqliteTable("organization_config", {
  ...shared,
  organizationId: text("organization_id").notNull().unique().references(() => organization.id, { onDelete: "cascade" }),
  baseUrl: text("base_url"),
});
