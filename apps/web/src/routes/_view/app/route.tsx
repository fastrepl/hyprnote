import { createFileRoute, redirect } from "@tanstack/react-router";

import { fetchUser } from "@/functions/auth";
import { fetchBillingAccess } from "@/functions/billing-access";

export const Route = createFileRoute("/_view/app")({
  beforeLoad: async ({ location }) => {
    const [user, billingAccess] = await Promise.all([
      fetchUser(),
      fetchBillingAccess(),
    ]);

    if (!user) {
      const searchStr =
        Object.keys(location.search).length > 0
          ? `?${new URLSearchParams(location.search as Record<string, string>).toString()}`
          : "";
      throw redirect({
        to: "/auth",
        search: {
          flow: "web",
          redirect: location.pathname + searchStr,
        },
      });
    }

    return { user, billingAccess };
  },
});
