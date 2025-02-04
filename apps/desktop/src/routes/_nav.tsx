import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

import { Header } from "@/components/header";
import { HyprAIButton } from "../components/hypr-ai-button";

export const Route = createFileRoute("/_nav")({
  component: Component,
});

function Component() {
  return (
    <div className="relative h-full w-full">
      <Header />
      <Outlet />
      <HyprAIButton />
    </div>
  );
}
