import clsx from "clsx";
import { SearchIcon, XIcon } from "lucide-react";

import { useHyprSearch } from "@/contexts/search";
import Shortcut from "./shortcut";

export function SearchBar() {
  const {
    searchQuery,
    searchInputRef,
    focusSearch,
    clearSearch,
    setSearchQuery,
  } = useHyprSearch((s) => ({
    searchQuery: s.query,
    searchInputRef: s.searchInputRef,
    focusSearch: s.focusSearch,
    clearSearch: s.clearSearch,
    setSearchQuery: s.setQuery,
  }));

  return (
    <div
      className={clsx([
        "w-72 hidden sm:flex flex-row items-center gap-2 h-[34px]",
        "text-neutral-500 hover:text-neutral-600",
        "border border-border rounded-md px-2 py-2 bg-transparent hover:bg-white",
        "transition-colors duration-200",
      ])}
      onClick={() => focusSearch()}
    >
      <SearchIcon className="h-4 w-4 text-neutral-500" />
      {/* TODO: add mention operator */}
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
        className="flex-1 bg-transparent outline-none text-xs"
      />
      {searchQuery && (
        <XIcon
          onClick={() => clearSearch()}
          className="h-4 w-4 text-neutral-400 hover:text-neutral-600"
        />
      )}
      {!searchQuery && <Shortcut macDisplay="⌘K" windowsDisplay="Ctrl+K" />}
    </div>
  );
}
