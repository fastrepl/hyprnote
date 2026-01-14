import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  beforeLoad: async () => {
    throw redirect({
      to: "/admin/collections/",
    });
  },
  component: () => null,
});
