import { createFileRoute } from "@tanstack/react-router";

import { env } from "../../env";

export const Route = createFileRoute("/api/chat/completions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const data = await request.json();

          const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              ...data,
              model: env.OPENAI_DEFAULT_MODEL,
            }),
          });

          return new Response(response.body, {
            status: response.status,
            headers: response.headers,
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
