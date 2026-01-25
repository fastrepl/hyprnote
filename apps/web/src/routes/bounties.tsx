import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/bounties")({
  beforeLoad: () => {
    throw redirect({
      href: "https://github.com/orgs/fastrepl/projects/7/views/1?pane=info",
    } as any);
  },
});
