import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/x")({
  beforeLoad: () => {
    throw redirect({
      href: "https://x.com/tryhyprnote",
    });
  },
});
