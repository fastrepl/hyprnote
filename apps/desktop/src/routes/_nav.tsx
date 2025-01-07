import { type ReactNode, useCallback } from "react";
import {
  createFileRoute,
  Outlet,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import { ArrowLeft, PanelRight, PanelRightClose } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import clsx from "clsx";

import { Button } from "@hypr/ui/components/ui/button";

import { useUI } from "@/stores/ui";
import Controls from "@/components/controls";
import SearchBar from "@/components/search-bar";
import SettingsDialog from "@/components/settings-dialog";

export const Route = createFileRoute("/_nav")({
  component: Component,
});

function Component() {
  const { history, navigate } = useRouter();
  const { pathname } = useLocation();

  const handleClickBack = useCallback(() => {
    history.back();
  }, [history]);

  const handleClickNewNote = useCallback(() => {
    navigate({ to: "/note/new" });
  }, [navigate]);

  return (
    <>
      <Header>
        <div className="flex flex-row gap-2">
          <Controls />
          {!pathname.includes("onboarding") && (
            <button
              className="text-gray-600 hover:text-gray-900"
              onClick={handleClickBack}
            >
              <ArrowLeft
                size={16}
                className={clsx([
                  "opacity-0",
                  pathname !== "/" && "opacity-100",
                ])}
              />
            </button>
          )}
        </div>
        {!pathname.includes("onboarding") && (
          <div className="flex flex-1 justify-center" data-tauri-drag-region>
            <SearchBar />
          </div>
        )}
        <div className="mr-3 flex flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className={clsx([
              "h-7 px-2 text-xs",
              pathname === "/" ? "opacity-100" : "opacity-0",
            ])}
            onClick={handleClickNewNote}
          >
            <Trans>New Note</Trans>
          </Button>
          {pathname.includes("note") ? <PanelToggle /> : <SettingsDialog />}
        </div>
      </Header>
      <Outlet />
    </>
  );
}

function Header({ children }: { children: ReactNode }) {
  return (
    <header
      className={clsx([
        "flex w-full items-center justify-between",
        "h-10 border-b border-border bg-secondary",
      ])}
      data-tauri-drag-region
    >
      {children}
    </header>
  );
}

function PanelToggle() {
  const { isPanelOpen, setIsPanelOpen } = useUI();

  return (
    <button
      className="text-gray-600 hover:text-gray-900"
      onClick={() => setIsPanelOpen(!isPanelOpen)}
    >
      {isPanelOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
    </button>
  );
}
