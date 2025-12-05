import { createMiddleware } from "hono/factory";

import { env } from "./env";

export const loadTestOverride = createMiddleware<{
  Variables: { supabaseUserId: string };
}>(async (c, next) => {
  if (env.OVERRIDE_AUTH) {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (token === env.OVERRIDE_AUTH) {
      c.set("supabaseUserId", "load-test-user");
      return next();
    }
  }
  return next();
});
