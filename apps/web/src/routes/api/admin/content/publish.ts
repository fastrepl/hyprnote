import { createFileRoute } from "@tanstack/react-router";

import { fetchAdminUser } from "@/functions/admin";
import { publishArticle } from "@/functions/github-content";

interface PublishRequest {
  path: string;
  branch: string;
  metadata: {
    meta_title?: string;
    author?: string;
    date?: string;
    category?: string;
  };
}

export const Route = createFileRoute("/api/admin/content/publish")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const isDev = process.env.NODE_ENV === "development";
        if (!isDev) {
          const user = await fetchAdminUser();
          if (!user?.isAdmin) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        let body: PublishRequest;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { path, branch, metadata } = body;

        if (!path || !branch) {
          return new Response(
            JSON.stringify({
              error: "Missing required fields: path, branch",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const result = await publishArticle(path, branch, metadata || {});

        if (!result.success) {
          return new Response(JSON.stringify({ error: result.error }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            prNumber: result.prNumber,
            prUrl: result.prUrl,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
