import { SearchIcon } from "lucide-react";
import { CommandShortcut } from "@hypr/ui/components/ui/command";
import clsx from "clsx";
import { useSearchStore } from "../../stores/use-search-store";

export function SearchBar() {
  const { open } = useSearchStore();

  return (
    <button
      className={clsx([
        "w-72",
        "hidden flex-row items-center gap-2 sm:flex",
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
  return <CommandShortcut>⌘K</CommandShortcut>;
}
