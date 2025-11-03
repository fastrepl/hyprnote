import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/founders")({
  beforeLoad: () => {
    throw redirect({
      href: "https://cal.com/team/hyprnote/welcome?duration=20",
    });
  },
});
