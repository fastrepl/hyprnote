import clsx from "clsx";
import SettingsDialog from "@/components/settings-dialog";
import { NewNoteButton } from "@/components/app-header/new-note-button";
import { BackButton } from "@/components/app-header/back-button";
import { type OsType, type as getOsType } from "@tauri-apps/plugin-os";
import { useEffect, useState } from "react";
import { SearchBar, SearchIconButton, SearchCommandDialog } from "../search";

export default function Header() {
  const [osType, setOsType] = useState<OsType>("macos");

  useEffect(() => {
    async function fetchOsType() {
      try {
        const os = await getOsType(); // Returns "Linux", "Windows_NT", "Darwin"
        setOsType(os);
      } catch (error) {
        console.error("Failed to get OS type:", error);
      }
    }
    fetchOsType();
  }, []);

  return (
    <>
      <header
        className={clsx([
          "flex w-full items-center justify-between",
          "border-b border-border bg-neutral-100",
          "min-h-11 p-1 px-2",
        ])}
        data-tauri-drag-region
      >
        {/* TODO: This is a poor way for implementing just for macOS */}
        <div className="w-32" data-tauri-drag-region>
          {osType === "macos" && <BackButton />}
        </div>

        <SearchBar />

        <div
          className="flex w-32 items-center justify-end gap-2"
          data-tauri-drag-region
        >
          <SearchIconButton />
          <NewNoteButton />
          <SettingsDialog />
        </div>
      </header>

      <SearchCommandDialog />
    </>
  );
}
