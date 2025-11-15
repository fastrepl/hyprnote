import { createMiddleware } from "@tanstack/react-start";

import { getSupabaseServerClient } from "@/functions/supabase";

export const supabaseClientMiddleware = createMiddleware().server(
  async ({ next }) => {
    const supabase = getSupabaseServerClient();
    return next({ context: { supabase } });
  },
);

export const supabaseAuthMiddleware = createMiddleware()
  .middleware([supabaseClientMiddleware])
  .server(async ({ next, request, context }) => {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      throw new Response(
        JSON.stringify({ error: "missing_authorization_header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { data, error } = await context.supabase.auth.getUser(token);

    if (error || !data?.user) {
      throw new Response(
        JSON.stringify({ error: "invalid_authorization_header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return next({ context: { user: data.user } });
  });
