import { createFileRoute, Outlet } from "@tanstack/react-router";
import clsx from "clsx";

import Controls from "@/components/controls";

export const Route = createFileRoute("/demo")({
  component: Component,
});

function Component() {
  return (
    <>
      <header
        className={clsx([
          "flex w-full items-center justify-between",
          "h-12 border-b border-border",
        ])}
        data-tauri-drag-region
      >
        <div data-tauri-drag-region>
          <Controls />
        </div>
      </header>
      <Outlet />
    </>
  );
}
