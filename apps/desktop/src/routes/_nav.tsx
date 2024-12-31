import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_nav")({
  component: Component,
});

function Component() {
  return (
    <div className="flex flex-col">
      <nav>nav</nav>
      <Outlet />
    </div>
  );
}
