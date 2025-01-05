import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import clsx from "clsx";

import Controls from "@/components/controls";
import SearchBar from "@/components/search-bar";
import SettingsDialog from "@/components/settings-dialog";

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
          "h-12 border-b border-gray-200",
        ])}
        data-tauri-drag-region
      >
        <Controls />
        <div className="flex flex-1 justify-center" data-tauri-drag-region>
          <SearchBar />
        </div>
        {!isOnboarding && <SettingsDialog />}
        <span className="pl-4"></span>
      </header>
      <Outlet />
    </>
  );
}
