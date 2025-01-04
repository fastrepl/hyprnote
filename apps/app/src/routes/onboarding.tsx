import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Outlet />
    </div>
  );
}
