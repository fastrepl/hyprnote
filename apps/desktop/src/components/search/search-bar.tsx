import clsx from "clsx";
import { SearchIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { type as getOsType } from "@tauri-apps/plugin-os";

import { CommandShortcut } from "@hypr/ui/components/ui/command";
import { useSearchStore } from "@/stores/use-search-store";

export function SearchBar() {
  const { open } = useSearchStore();

  return (
    <button
      className={clsx([
        "w-72",
        "hidden sm:flex",
        "flex-row items-center gap-2",
        "rounded-md border border-border px-2 py-2",
        "bg-transparent transition-colors duration-200 hover:bg-white",
        "text-neutral-500 hover:text-neutral-600",
      ])}
      onClick={open}
    >
      <SearchIcon className="mr-2 h-4 w-4" />
      <span className="text-xs">Search</span>
      <Shortcut />
    </button>
  );
}

function Shortcut() {
  const osType = useQuery({
    queryKey: ["osType"],
    queryFn: async () => {
      return getOsType();
    },
  });

  if (osType.data === "macos") {
    return <CommandShortcut>⌘K</CommandShortcut>;
  }

  return <CommandShortcut>Ctrl+K</CommandShortcut>;
}
