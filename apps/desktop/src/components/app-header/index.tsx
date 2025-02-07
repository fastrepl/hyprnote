import clsx from "clsx";

import SettingsDialog from "@/components/settings";
import SearchBar from "@/components/app-header/search-bar";
import { NewNoteButton } from "@/components/app-header/new-note-button";
import { BackButton } from "@/components/app-header/back-button";

export default function Header() {
  return (
    <header
      className={clsx([
        "flex w-full items-center",
        "border-b border-border bg-neutral-100 p-1 px-2",
      ])}
      data-tauri-drag-region
    >
      {/* TODO: This is a poor way for implementing just for macOS */}
      <div className="w-32" data-tauri-drag-region>
        <BackButton />
      </div>

      <div className="flex flex-1 justify-center" data-tauri-drag-region>
        <SearchBar />
      </div>

      <div
        className="flex w-32 items-center justify-end gap-2"
        data-tauri-drag-region
      >
        <NewNoteButton />
        <SettingsDialog />
      </div>
    </header>
  );
}
