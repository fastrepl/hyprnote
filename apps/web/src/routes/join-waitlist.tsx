import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/join-waitlist")({
  beforeLoad: () => {
    throw redirect({
      href: "https://tally.so/r/mJaRDY",
    });
  },
});
