import clsx from "clsx";
import { SearchIcon } from "lucide-react";
import { useSearchStore } from "@/stores/use-search-store";
import Shortcut from "../shortcut";

export function SearchBar() {
  const { open } = useSearchStore();

  return (
    <button
      className={clsx([
        "w-72",
        "hidden md:flex",
        "flex-row items-center gap-2",
        "rounded-md border border-border px-2 py-2",
        "bg-transparent transition-colors duration-200 hover:bg-white",
        "text-neutral-500 hover:text-neutral-600",
      ])}
      onClick={open}
    >
      <SearchIcon className="mr-2 h-4 w-4" />
      <span className="text-xs">Search</span>
      <Shortcut macDisplay="⌘K" windowsDisplay="Ctrl+K" />
    </button>
  );
}
