import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/download/linux-deb")({
  beforeLoad: async () => {
    throw redirect({
      href: "https://desktop2.hyprnote.com/download/latest/deb-x86_64?channel=nightly",
    });
  },
});
