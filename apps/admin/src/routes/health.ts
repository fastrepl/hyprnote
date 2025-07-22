import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";

export const ServerRoute = createServerFileRoute("/health")
  .methods((api) => ({
    GET: api.handler(async ({ request, context }) => {
      return json({ status: "ok" }, { status: 200 });
    }),
  }));
