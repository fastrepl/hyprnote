import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/note/new")({
  beforeLoad: () => {
    throw redirect({
      to: "/note/$id",
      params: { id: crypto.randomUUID() },
    });
  },
  component: () => null,
});
