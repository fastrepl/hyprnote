import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/github")({
  beforeLoad: () => {
    throw redirect({
      href: "https://github.com/fastrepl/hyprnote",
    });
  },
});
