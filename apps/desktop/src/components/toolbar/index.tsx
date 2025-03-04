import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";

import SettingsPanel from "@/components/settings-panel";
import { NewNoteButton } from "@/components/toolbar/new-note-button";
import { BackButton } from "@/components/toolbar/back-button";
import { type as getOsType } from "@tauri-apps/plugin-os";

import { SearchBar, SearchIconButton, SearchPalette } from "../search";
import { RightPanelButton } from "./right-panel-button";
import { cn } from "@/utils";
import { HomeButton } from "./home-button";
import { LeftSidebarButton } from "./left-sidebar-button";

export default function Toolbar() {
  const osType = useQuery({
    queryKey: ["osType"],
    queryFn: async () => {
      return getOsType();
    },
  });

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
        {/* TODO */}
        <div
          className={cn("w-40", osType.data === "macos" && "pl-[70px]")}
          data-tauri-drag-region
        >
          <LeftSidebarButton />
          <HomeButton />
          <BackButton />
        </div>

        <SearchBar />

        <div
          className="flex w-40 items-center justify-end gap-1"
          data-tauri-drag-region
        >
          <SearchIconButton />
          <NewNoteButton />
          <RightPanelButton />
          <SettingsPanel />
        </div>
      </header>

      <SearchPalette />
    </>
  );
}
