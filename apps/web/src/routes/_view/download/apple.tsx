import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/download/apple")({
  beforeLoad: async () => {
    throw redirect({
      to: "/download/apple-silicon",
    });
  },
});
