import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { LoaderIcon, SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { useHyprSearch } from "@/contexts/search";
import Shortcut from "./shortcut";

export function SearchBar() {
  const {
    searchQuery,
    searchInputRef,
    focusSearch,
    clearSearch,
    setSearchQuery,
    isSearching,
    navigateResults,
    selectResult,
    searchHistory,
    clearSearchHistory,
  } = useHyprSearch((s) => ({
    searchQuery: s.query,
    searchInputRef: s.searchInputRef,
    focusSearch: s.focusSearch,
    clearSearch: s.clearSearch,
    setSearchQuery: s.setQuery,
    isSearching: s.isSearching,
    navigateResults: s.navigateResults,
    selectResult: s.selectResult,
    searchHistory: s.searchHistory,
    clearSearchHistory: s.clearSearchHistory,
  }));
  const { t } = useLingui();
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowHistory(value === "" && isFocused);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        navigateResults("down");
        break;
      case "ArrowUp":
        e.preventDefault();
        navigateResults("up");
        break;
      case "Enter":
        e.preventDefault();
        selectResult();
        break;
      case "Escape":
        e.preventDefault();
        clearSearch();
        break;
    }
  };

  return (
    <div className="relative">
      <div
        className={clsx([
          "w-60 flex items-center gap-2 h-[34px]",
          "text-neutral-500 hover:text-neutral-600",
          "border border-border rounded-md px-2 py-2 bg-transparent",
          "hover:bg-white",
          isFocused && "bg-white",
          "transition-colors duration-200",
        ])}
        onClick={() => focusSearch()}
      >
        {isSearching
          ? <LoaderIcon className="h-4 w-4 text-neutral-500 animate-spin" />
          : <SearchIcon className="h-4 w-4 text-neutral-500" />}
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            setShowHistory(searchQuery === "");
          }}
          onBlur={() => {
            setTimeout(() => {
              setIsFocused(false);
              setShowHistory(false);
            }, 150);
          }}
          placeholder={t`Search...`}
          className="flex-1 bg-transparent outline-none text-xs"
        />
        {searchQuery
          ? (
            <XIcon
              onClick={() => clearSearch()}
              className="h-4 w-4 text-neutral-400 hover:text-neutral-600"
            />
          )
          : <Shortcut macDisplay="⌘K" windowsDisplay="Ctrl+K" />}
      </div>

      {showHistory && searchHistory.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
          <div className="py-1">
            <div className="px-3 py-1 text-xs text-neutral-400 font-medium border-b flex items-center justify-between">
              <span>Recent searches</span>
              <button
                onClick={() => {
                  clearSearchHistory();
                  setShowHistory(false);
                }}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Clear
              </button>
            </div>
            {searchHistory.slice(0, 5).map((historyQuery, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchQuery(historyQuery);
                  setShowHistory(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-2 group"
              >
                <SearchIcon className="h-3 w-3 text-neutral-400" />
                <span className="flex-1 truncate">{historyQuery}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
