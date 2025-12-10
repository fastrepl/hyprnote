import { createFileRoute, redirect } from "@tanstack/react-router";

import { fetchUser } from "@/functions/auth";

export const Route = createFileRoute("/_view/app")({
  beforeLoad: async ({ location }) => {
    const user = await fetchUser();
    if (!user) {
      throw redirect({
        to: "/auth",
        search: {
          flow: "web",
          redirect: location.pathname + location.search,
        },
      });
    }
    return { user };
  },
});
