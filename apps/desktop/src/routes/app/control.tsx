import { createFileRoute } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/app/control")({
  component: Component,
});

function Component() {
  return (
    <div
      className={cn([
        "h-full w-full flex flex-col",
        "bg-black/50 backdrop-blur-md",
      ])}
    >
      <header
        data-tauri-drag-region
        className={cn([
          "flex flex-row shrink-0",
          "w-full items-center h-9",
          "pl-[72px]",
        ])}
      >
        <div className="flex-1 flex justify-center" data-tauri-drag-region>
          <span
            data-tauri-drag-region
            className="text-sm font-semibold select-none cursor-default pr-12 text-white"
          >
            Control
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="text-white/80 text-sm">
          Control window content goes here
        </div>
      </div>
    </div>
  );
}
