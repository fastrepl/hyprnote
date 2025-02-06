import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";
import { useRouter } from "@tanstack/react-router";

import SettingsDialog from "@/components/settings";
import SearchBar from "@/components/app-header/search-bar";
import { NewNoteButton } from "@/components/app-header/new-note-button";

export function Header() {
  const { history } = useRouter();

  const handleClickBack = useCallback(() => {
    history.back();
  }, [history]);

  return (
    <header
      className={clsx([
        "flex w-full items-center justify-between",
        "h-10 border-b border-border bg-secondary",
      ])}
      data-tauri-drag-region
    >
      <div
        className="flex flex-1 flex-row justify-center gap-4"
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
        <NewNoteButton />
        <SettingsDialog />
      </div>
    </header>
  );
}
