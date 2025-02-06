import { useCallback } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import clsx from "clsx";
import { useLocation, useRouter } from "@tanstack/react-router";

import SettingsDialog from "@/components/settings";
import SearchBar from "@/components/search-bar";

import { Button } from "@hypr/ui/components/ui/button";

export function Header() {
  const { history, navigate } = useRouter();
  const { pathname } = useLocation();

  const handleClickBack = useCallback(() => {
    history.back();
  }, [history]);

  const handleClickNewNote = useCallback(() => {
    navigate({ to: "/note/new" });
  }, [navigate]);

  return (
    <header
      className={clsx([
        "flex w-full items-center justify-between",
        "h-10 border-b border-border bg-secondary",
      ])}
      data-tauri-drag-region
    >
      <div
        className="flex flex-1 flex-row gap-4 justify-center"
        data-tauri-drag-region
      >
        <button
          className="text-gray-600 hover:text-gray-900 disabled:opacity-0"
          onClick={handleClickBack}
          disabled={!history.canGoBack()}
        >
          <ArrowLeft size={14} />
        </button>
        <SearchBar />
      </div>

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
        <SettingsDialog />
      </div>
    </header>
  );
}
