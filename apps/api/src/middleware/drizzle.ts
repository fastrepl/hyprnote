import { drizzle } from "drizzle-orm/postgres-js";
import { createMiddleware } from "hono/factory";

import postgres from "postgres";
import { getEnv } from "../env";
import type { Env } from "../types";

// https://orm.drizzle.team/docs/connect-supabase
export const drizzlePersisterMiddleware = () => {
  return createMiddleware<Env>(async (c, next) => {
    const { DATABASE_URL } = getEnv(c);
    const client = postgres(DATABASE_URL, { prepare: false });
    const db = drizzle({ client });

    c.set("db", db);
    await next();
  });
};
