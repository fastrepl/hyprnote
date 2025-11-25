import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/docs/")({
  beforeLoad: () => {
    throw redirect({
      to: "/docs/$",
      params: { _splat: "about/hello-world" },
    });
  },
});
