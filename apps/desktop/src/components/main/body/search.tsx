import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Kbd, KbdGroup } from "@hypr/ui/components/ui/kbd";
import { cn } from "@hypr/utils";
import { useSearch } from "../../../contexts/search/ui";
import { useCmdKeyPressed } from "../../../hooks/useCmdKeyPressed";

export function Search() {
  const { query, setQuery, isSearching, isIndexing, inputRef } = useSearch();
  const [isFocused, setIsFocused] = useState(false);
  const isCmdPressed = useCmdKeyPressed();

  const showLoading = isSearching || isIndexing;
  const showShortcut = isCmdPressed && !query;

  return (
    <div
      className={cn([
        "flex items-center h-full transition-all duration-300",
        isFocused ? "w-[240px]" : "w-[200px]",
      ])}
    >
      <div className="relative flex items-center w-full h-full">
        {showLoading
          ? <Loader2Icon className={cn(["h-4 w-4 absolute left-3 text-neutral-400 animate-spin"])} />
          : <SearchIcon className={cn(["h-4 w-4 absolute left-3 text-neutral-400"])} />}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search anything..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.currentTarget.blur();
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn([
            "text-sm",
            "w-full pl-9 h-full",
            query ? "pr-9" : showShortcut ? "pr-14" : "pr-4",
            "rounded-lg bg-neutral-100 border border-transparent",
            "focus:outline-none focus:bg-neutral-200 focus:border-black",
          ])}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className={cn([
              "absolute right-3",
              "h-4 w-4",
              "text-neutral-400 hover:text-neutral-600",
              "transition-colors",
            ])}
            aria-label="Clear search"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
        {showShortcut && (
          <div className="absolute right-2 top-1">
            <KbdGroup>
              <Kbd className="bg-neutral-200">⌘</Kbd>
              <Kbd className="bg-neutral-200">K</Kbd>
            </KbdGroup>
          </div>
        )}
      </div>
    </div>
  );
}
