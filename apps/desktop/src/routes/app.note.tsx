import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/note")({
  component: Component,
});

function Component() {
  return <Outlet />;
}
