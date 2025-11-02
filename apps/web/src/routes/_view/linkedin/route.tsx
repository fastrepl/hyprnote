import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/linkedin")({
  beforeLoad: () => {
    throw redirect({
      href: "https://www.linkedin.com/company/hyprnote",
    });
  },
});
