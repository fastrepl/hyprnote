import { createFileRoute, Outlet } from "@tanstack/react-router";

import Controls from "@/components/controls";
import clsx from "clsx";

export const Route = createFileRoute("/_nav")({
  component: Component,
});

function Component() {
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
        <button>Settings</button>
      </header>
      <Outlet />
    </>
  );
}
