import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Component,
  beforeLoad: ({ context }) => {
    if (!context.userSession) {
      throw redirect({ to: "/login" });
    }
  },
});

function Component() {
  return <div>Home</div>;
}
