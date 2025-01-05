import { useCallback } from "react";
import {
  createFileRoute,
  Outlet,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";

import Controls from "@/components/controls";
import SearchBar from "@/components/search-bar";
import SettingsDialog from "@/components/settings-dialog";

export const Route = createFileRoute("/_nav")({
  component: Component,
});

function Component() {
  const { history } = useRouter();
  const { pathname } = useLocation();

  const handleClickBack = useCallback(() => {
    history.back();
  }, [history]);

  return (
    <>
      <header
        className={clsx([
          "flex w-full items-center justify-between",
          "h-10 border-b border-border bg-secondary",
        ])}
        data-tauri-drag-region
      >
        <div className="flex flex-row gap-2">
          <Controls />
          <button
            className="text-gray-600 hover:text-gray-900"
            onClick={handleClickBack}
          >
            <ArrowLeft
              size={16}
              className={clsx(["opacity-0", pathname !== "/" && "opacity-100"])}
            />
          </button>
        </div>
        <div className="flex flex-1 justify-center" data-tauri-drag-region>
          <SearchBar />
        </div>
        {!pathname.includes("onboarding") && (
          <div className="mr-4 pt-1.5">
            <SettingsDialog />
          </div>
        )}
      </header>
      <Outlet />
    </>
  );
}
