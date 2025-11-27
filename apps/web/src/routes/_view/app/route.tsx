import { createFileRoute, redirect } from "@tanstack/react-router";

import { fetchUser } from "@/functions/auth";

export const Route = createFileRoute("/_view/app")({
  beforeLoad: async () => {
    const user = await fetchUser();
    if (!user) {
      throw redirect({ to: "/" });
    }
    return { user };
  },
});
