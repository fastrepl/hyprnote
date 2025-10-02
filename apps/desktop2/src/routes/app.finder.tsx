import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/finder")({
  component: Component,
});

function Component() {
  return (
    <div className="flex flex-col h-full">
      <Outlet />
    </div>
  );
}
