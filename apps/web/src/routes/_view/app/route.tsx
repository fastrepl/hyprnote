import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/app")({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/" });
    }
  },
});
