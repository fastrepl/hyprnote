import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_nav/onboarding")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Outlet />
    </div>
  );
}
