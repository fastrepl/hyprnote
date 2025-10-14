import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@hypr/ui/lib/utils";
import { useSearch } from "../../../contexts/search/ui";

export function Search() {
  const { query, setQuery, isSearching, isIndexing, onFocus, onBlur } = useSearch();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const showLoading = isSearching || isIndexing;

  useHotkeys("mod+k", (e) => {
    e.preventDefault();
    inputRef.current?.focus();
  });

  useHotkeys(
    "down",
    (event) => {
      if (document.activeElement === inputRef.current) {
        event.preventDefault();
        console.log("down");
      }
    },
    { enableOnFormTags: true },
  );

  useHotkeys(
    "up",
    (event) => {
      if (document.activeElement === inputRef.current) {
        event.preventDefault();
        console.log("up");
      }
    },
    { enableOnFormTags: true },
  );

  useHotkeys(
    "enter",
    (event) => {
      if (document.activeElement === inputRef.current) {
        event.preventDefault();
        console.log("enter");
      }
    },
    { enableOnFormTags: true },
  );

  return (
    <div className="flex items-center h-full pl-4 flex-[0_1_260px] min-w-[160px] w-full">
      <div className="relative flex items-center w-full">
        {showLoading
          ? <Loader2Icon className={cn(["h-4 w-4 absolute left-3 text-gray-400 animate-spin"])} />
          : <SearchIcon className={cn(["h-4 w-4 absolute left-3 text-gray-400"])} />}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search anything..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className={cn([
            "text-sm",
            "w-full pl-9 py-2",
            query ? "pr-9" : "pr-4",
            "rounded-lg bg-gray-100 border-0",
            "focus:outline-none focus:bg-gray-200",
          ])}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className={cn([
              "absolute right-3",
              "h-4 w-4",
              "text-gray-400 hover:text-gray-600",
              "transition-colors",
            ])}
            aria-label="Clear search"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
