import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/download/linux")({
  beforeLoad: async () => {
    throw redirect({
      // TODO: needs to be fixed
      href: "https://desktop2.hyprnote.com/download/latest/appimage?channel=nightly",
    });
  },
});
