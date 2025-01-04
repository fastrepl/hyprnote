import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import clsx from "clsx";

import Controls from "@/components/controls";

export const Route = createFileRoute("/_nav")({
  component: Component,
});

function Component() {
  const { pathname } = useLocation();
  const isOnboarding = pathname.includes("onboarding");
  return (
    <>
      <header
        className={clsx([
          "flex w-full items-center justify-between",
          "h-10 border-b",
        ])}
        data-tauri-drag-region
      >
        <Controls />
        {!isOnboarding && <button>Settings</button>}
      </header>
      <Outlet />
    </>
  );
}
