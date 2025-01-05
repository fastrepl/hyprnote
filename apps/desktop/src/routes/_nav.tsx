import {
  createFileRoute,
  Outlet,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import clsx from "clsx";

import Controls from "@/components/controls";
import SearchBar from "@/components/search-bar";
import SettingsDialog from "@/components/settings-dialog";
import { ArrowLeft } from "lucide-react";
import { useCallback } from "react";

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
          "h-12 border-b border-border",
        ])}
        data-tauri-drag-region
      >
        <div className="flex flex-row gap-2">
          <Controls />
          <button
            className="text-gray-600 hover:text-gray-900"
            onClick={handleClickBack}
          >
            <ArrowLeft size={16} />
          </button>
        </div>
        {pathname === "/" && (
          <div className="flex flex-1 justify-center" data-tauri-drag-region>
            <SearchBar />
          </div>
        )}
        {!pathname.includes("onboarding") && <SettingsDialog />}
        <span className="pl-4"></span>
      </header>
      <Outlet />
    </>
  );
}
