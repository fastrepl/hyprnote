import { useSearch } from "@/contexts/search";
import { SearchIcon, XIcon } from "lucide-react";
import Shortcut from "./shortcut";

export function SearchBar() {
  const {
    searchQuery,
    searchInputRef,
    focusSearch,
    setSearchQuery,
  } = useSearch();

  return (
    <div
      className="w-72 hidden sm:flex flex-row items-center gap-2 h-[34px] rounded-md border border-border px-2 py-2 bg-transparent transition-colors duration-200 hover:bg-white text-neutral-500 hover:text-neutral-600"
      onClick={() => focusSearch()}
    >
      <SearchIcon className="h-4 w-4 text-neutral-500" />
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
        className="flex-1 bg-transparent outline-none text-xs"
      />
      {searchQuery && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSearchQuery("");
          }}
          className="text-neutral-400 hover:text-neutral-600"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
      <Shortcut macDisplay="⌘K" windowsDisplay="Ctrl+K" />
    </div>
  );
}
