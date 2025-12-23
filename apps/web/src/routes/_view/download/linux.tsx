import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/download/linux")({
  beforeLoad: async () => {
    throw redirect({
      to: "/download/linux-appimage",
    });
  },
});
