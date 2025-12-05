import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";

import { env } from "./env";

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

export const requireSupabaseAuth = createMiddleware<{
  Variables: { supabaseUserId: string };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.text("unauthorized", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabaseClient.auth.getUser(token);

  if (error || !data.user) {
    return c.text("unauthorized", 401);
  }

  c.set("supabaseUserId", data.user.id);
  await next();
});
