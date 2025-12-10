import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";

import { env } from "../env";
import type { AppBindings } from "../hono-bindings";

export const supabaseAuthMiddleware = createMiddleware<AppBindings>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.text("unauthorized", 401);
    }

    const token = authHeader.replace(/^bearer /i, "");
    const supabaseClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    const { data, error } = await supabaseClient.auth.getUser(token);

    if (error || !data.user) {
      return c.text("unauthorized", 401);
    }

    c.set("supabaseUserId", data.user.id);
    c.set("supabaseClient", supabaseClient);
    await next();
  },
);
