import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { Settings2 as Settings } from "lucide-react";
import clsx from "clsx";

import Controls from "@/components/controls";
import SearchBar from "@/components/search-bar";

export const Route = createFileRoute("/_nav")({
  component: Component,
});

function Component() {
  const { pathname } = useLocation();

  const isOnboarding = pathname.includes("onboarding");

  const handleSettings = () => {};

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
        <div className="flex flex-1 justify-center" data-tauri-drag-region>
          <SearchBar />
        </div>
        {!isOnboarding && (
          <button
            className="mr-3 text-gray-500 hover:text-gray-900"
            onClick={handleSettings}
          >
            <Settings size={18} />
          </button>
        )}
      </header>
      <Outlet />
    </>
  );
}
