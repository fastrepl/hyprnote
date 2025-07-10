import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Component,
  beforeLoad: ({ context }) => {
    if (!context.userSession) {
      throw redirect({ to: "/sign-in" });
    }
  },
});

function Component() {
  return <div>Home</div>;
}
