import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/download/staging")({
  beforeLoad: async () => {
    throw redirect({
      to: "/api/download/staging-dmg",
    });
  },
});
