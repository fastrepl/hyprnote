import { createFileRoute } from "@tanstack/react-router";

import { fetchAdminUser } from "@/functions/admin";
import { duplicateContentFile } from "@/functions/github-content";

interface DuplicateRequest {
  sourcePath: string;
  newFilename?: string;
}

export const Route = createFileRoute("/api/admin/content/duplicate")({
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

        let body: DuplicateRequest;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { sourcePath, newFilename } = body;

        if (!sourcePath) {
          return new Response(
            JSON.stringify({ error: "Missing required field: sourcePath" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const result = await duplicateContentFile(sourcePath, newFilename);

        if (!result.success) {
          return new Response(JSON.stringify({ error: result.error }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ success: true, path: result.path }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
