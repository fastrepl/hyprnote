import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/daily/today")({
  beforeLoad: () => {
    const date = new Date().toISOString().split("T")[0];
    redirect({ to: "/app/daily/$date", params: { date } });
  },
});
