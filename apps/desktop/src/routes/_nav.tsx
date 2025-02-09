import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

import Header from "@/components/app-header";

export const Route = createFileRoute("/_nav")({
  component: Component,
});

function Component() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-x-hidden">
      <Header />
      <Outlet />
    </div>
  );
}
