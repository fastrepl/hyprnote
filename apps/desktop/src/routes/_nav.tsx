import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

import { Header } from "@/components/app-header";
import { HyprAIButton } from "../components/hypr-ai-button";

export const Route = createFileRoute("/_nav")({
  component: Component,
});

function Component() {
  return (
    <div className="relative flex h-full w-full flex-col">
      <Header />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
      <HyprAIButton />
    </div>
  );
}
