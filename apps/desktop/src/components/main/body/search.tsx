import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@hypr/utils";
import { useSearch } from "../../../contexts/search/ui";

export function Search() {
  const { query, setQuery, isSearching, isIndexing, onFocus, onBlur, registerFocusCallback } = useSearch();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const showLoading = isSearching || isIndexing;

  useEffect(() => {
    registerFocusCallback(() => {
      inputRef.current?.focus();
    });
  }, [registerFocusCallback]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur();
  };

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
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn([
            "text-sm",
            "w-full pl-9 h-full",
            query ? "pr-9" : "pr-4",
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
      </div>
    </div>
  );
}
