import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";

import { getEnv } from "../env";

export const supabaseMiddleware = () => {
  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return c.json({ error: "missing_authorization_header" }, 401);
    }

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEnv(c);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return c.json({ error: "invalid_authorization_header" }, 401);
    }

    c.set("supabase", supabase);
    c.set("user", data.user);
    await next();
  });
};
