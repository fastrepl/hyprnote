import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/utils/auth-schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:./db.sqlite",
  },
});
