import { createFileRoute } from "@tanstack/react-router";

import oauthCallback from "@/lib/oauth-callback";

export const Route = createFileRoute("/oauth/callback")({
  server: { handlers: { GET: ({ request }) => oauthCallback(request) } },
});
