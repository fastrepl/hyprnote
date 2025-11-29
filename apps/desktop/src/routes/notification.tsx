import { createFileRoute, redirect } from "@tanstack/react-router";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import type { NotificationSearch } from "@hypr/plugin-deeplink2";

export const Route = createFileRoute("/notification")({
  validateSearch: (search): NotificationSearch => {
    return {
      key: (search as NotificationSearch).key ?? "",
    };
  },
  beforeLoad: async ({ search }) => {
    console.log("notification deeplink received", search);
    analyticsCommands.event({ event: "notification_clicked" });
    throw redirect({ to: "/app/main" });
  },
});
