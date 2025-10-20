import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@hypr/utils";
import { useSearch } from "../../../contexts/search/ui";

export function Search() {
  const { query, setQuery, isSearching, isIndexing, onFocus, onBlur } = useSearch();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

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
          ? <Loader2Icon className={cn(["h-4 w-4 absolute left-3 text-gray-400 animate-spin"])} />
          : <SearchIcon className={cn(["h-4 w-4 absolute left-3 text-gray-400"])} />}
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
            "rounded-lg bg-gray-100 border border-transparent",
            "focus:outline-none focus:bg-gray-200 focus:border-black",
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
