import { createMiddleware } from "@tanstack/react-start";

import { env } from "../env";
import { getSupabasePublicServerClient } from "../functions/supabase";
import { getWorkspaceShareSlugFromHeaders } from "../lib/request-workspace-share-host";

export const workspaceShareHostMiddleware = createMiddleware({
  type: "request",
}).server(async ({ next, request }) => {
  const slug = getWorkspaceShareSlugFromHeaders(
    request.headers,
    env.WORKSPACE_SHARE_PROXY_SECRET,
  );
  if (slug === null) return next();

  const { data, error } = await getSupabasePublicServerClient().rpc(
    "workspace_share_slug_is_active",
    { p_slug: slug },
  );

  if (error) {
    return new Response("Sharing domain unavailable", { status: 503 });
  }
  if (data !== true) return new Response("Not found", { status: 404 });

  return next();
});
