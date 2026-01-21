import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/bounties")({
  beforeLoad: () => {
    throw redirect({
      external: "https://github.com/orgs/fastrepl/projects/7",
    } as any);
  },
});
