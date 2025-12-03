import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/download/windows")({
  beforeLoad: async () => {
    throw redirect({
      // TODO: needs to be fixed
      href: "https://desktop2.hyprnote.com/download/latest/msi?channel=nightly",
    });
  },
});
