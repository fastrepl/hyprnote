import { drizzle } from "drizzle-orm/libsql/sqlite3";

export const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL || "file:./db.sqlite",
  },
});
