import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_nav/onboarding")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
