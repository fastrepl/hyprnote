import { clsx } from "clsx";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { useLeftSidebar } from "@hypr/utils/contexts";
import { useNavigate } from "@tanstack/react-router";

export function Header() {
  const navigate = useNavigate();

  const { isExpanded } = useLeftSidebar();
  const isMain = getCurrentWebviewWindowLabel() === "main";

  const handleClickSettings = () => {
    windowsCommands.windowShow({ type: "settings" });
  };

  const handleClickNewNote = () => {
    navigate({ to: "/app/new" });
  };
  return (
    <header
      data-tauri-drag-region
      className={clsx([
        "flex w-full items-center justify-between min-h-11 py-1 px-2 border-b",
        isMain
          ? "border-border bg-neutral-50"
          : "border-transparent bg-transparent",
        !isExpanded && "pl-[72px]",
      ])}
    >
      <div
        className="w-40 flex items-center justify-start"
        data-tauri-drag-region
      >
        <button
          className="bg-neutral-700 hover:bg-neutral-800 text-white px-4 py-2 rounded-md"
          onClick={handleClickSettings}
        >
          Setting
        </button>
        <button
          className="bg-neutral-700 hover:bg-neutral-800 text-white px-4 py-2 rounded-md"
          onClick={handleClickNewNote}
        >
          New note
        </button>
      </div>
    </header>
  );
}
