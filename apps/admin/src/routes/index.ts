import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context: { userSession } }) => {
    if (!userSession) {
      throw redirect({ to: "/login" });
    } else {
      return redirect({ to: "/app" });
    }
  },
});
