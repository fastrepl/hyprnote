import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/new")({
  beforeLoad: async () => {
    return redirect({ to: "/app" });
  },
});
