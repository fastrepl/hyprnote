import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { type as getOsType } from "@tauri-apps/plugin-os";

import { cn } from "@/utils";
import SettingsPanel from "@/components/settings-panel";
import { NewNoteButton } from "@/components/toolbar/new-note-button";
import { BackButton } from "@/components/toolbar/back-button";
import { useOngoingSession } from "@/contexts/ongoing-session";

import { SearchBar, SearchIconButton, SearchPalette } from "../search";
import { RightPanelButton } from "./right-panel-button";
import { HomeButton } from "./home-button";
import { LeftSidebarButton } from "./left-sidebar-button";
import { SessionIndicator } from "./session-indicator";

export default function Toolbar() {
  const osType = useQuery({
    queryKey: ["osType"],
    queryFn: async () => {
      return getOsType();
    },
  });

  const { listening: isListening } = useOngoingSession((s) => ({
    listening: s.listening,
    session: s.session,
  }));

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

        {/* TODO: 듣는중인데 현재 route가 노트 페이지이고 그게 현재 세션(session?.id)과 일치한다면 보여줄 필요가 없음 */}
        {!isListening ? <SearchBar /> : <SessionIndicator />}

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
