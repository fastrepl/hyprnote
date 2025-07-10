import { drizzle } from "drizzle-orm/libsql";

export const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL || "file:./db.sqlite",
  },
});
