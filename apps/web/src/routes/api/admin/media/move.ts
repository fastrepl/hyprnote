import { createFileRoute } from "@tanstack/react-router";

import { fetchAdminUser } from "@/functions/admin";
import { moveMediaFile } from "@/functions/github-media";

export const Route = createFileRoute("/api/admin/media/move")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await fetchAdminUser();
        if (!user?.isAdmin) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { fromPath: string; toPath: string };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { fromPath, toPath } = body;

        if (!fromPath || !toPath) {
          return new Response(
            JSON.stringify({
              error: "Missing required fields: fromPath, toPath",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const result = await moveMediaFile(fromPath, toPath);

        if (!result.success) {
          return new Response(JSON.stringify({ error: result.error }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            newPath: result.newPath,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    },
  },
});
