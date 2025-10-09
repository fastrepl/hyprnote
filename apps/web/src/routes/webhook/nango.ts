import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/webhook/nango")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = await request.json();

          if (
            payload.type === "auth"
            && payload.operation === "creation"
            && payload.success === true
          ) {
            const connectionId = payload.connectionId;
            const endUserId = payload.endUser?.endUserId;
            const tags = payload.endUser?.tags;

            console.log("New connection created:", {
              connectionId,
              endUserId,
              tags,
            });

            // TODO: Persist the connection ID in the database
            // await db.connections.create({
            //   userId: endUserId,
            //   nangoConnectionId: connectionId,
            //   organizationId: tags?.organizationId,
            //   integrationId: payload.integrationId,
            //   provider: payload.provider,
            // });
          }

          return new Response("OK", { status: 200 });
        } catch (error) {
          console.error("Error processing Nango webhook:", error);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
