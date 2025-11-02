import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const inputSchema = z.object({
  email: z.email(),
  userGroup: z.string().optional(),
  locale: z.string().optional(),
  platform: z.string().optional(),
  source: z.string().optional(),
  intent: z.string().optional(),
});

export const Route = createFileRoute("/api/add-contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const data = inputSchema.parse(body);

          if (!data.email) {
            return new Response(
              JSON.stringify({ error: "Email is required" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const loopsResponse = await fetch(
            "https://app.loops.so/api/v1/contacts/create",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.LOOPS_KEY}`,
              },
              body: JSON.stringify({
                email: data.email,
                userGroup: data.userGroup,
                locale: data.locale,
                source: data.source,
                intent: data.intent,
                platform: data.platform,
              }),
            },
          );

          if (!loopsResponse.ok) {
            const error = await loopsResponse.json();
            console.error("Error creating contact:", error);
            return new Response(
              JSON.stringify({
                error: error.message || "Failed to create contact",
              }),
              {
                status: loopsResponse.status,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            return new Response(
              JSON.stringify({
                error: "Invalid input",
                details: error.issues,
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          console.error("Error creating contact:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
