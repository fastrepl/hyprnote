import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/download/staging")({
  beforeLoad: async () => {
    throw redirect({
      href: "https://build.hyprnote.com/desktop/staging/hyprnote-macos-aarch64.dmg",
    } as any);
  },
});
