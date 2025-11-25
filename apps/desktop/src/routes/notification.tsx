import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/notification")({
  beforeLoad: async () => {
    throw redirect({ to: "/app/main" });
  },
});
