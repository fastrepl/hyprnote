import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sync/write")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        console.log(request);
        return new Response("Hello, World!");
      },
    },
  },
});
