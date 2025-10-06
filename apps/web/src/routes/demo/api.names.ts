import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/api/names")({
  server: {
    handlers: {
      GET: () => {
        return new Response(JSON.stringify(["Alice", "Bob", "Charlie"]), {
          headers: {
            "Content-Type": "application/json",
          },
        });
      },
    },
  },
});
