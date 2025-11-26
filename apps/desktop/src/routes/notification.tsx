import { createFileRoute, redirect } from "@tanstack/react-router";

import type { NotificationSearch } from "@hypr/plugin-deeplink2";

export const Route = createFileRoute("/notification")({
  validateSearch: (search): NotificationSearch => {
    return {
      key: (search as NotificationSearch).key ?? "",
    };
  },
  beforeLoad: async ({ search }) => {
    console.log("notification deeplink received", search);
    throw redirect({ to: "/app/main" });
  },
});
