import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { LoaderIcon, SearchIcon, TagIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { useHyprSearch } from "@/contexts/search";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import Shortcut from "./shortcut";
import { CommandPalette } from "@/components/command-palette";

export function SearchBar() {
  const {
    searchQuery,
    selectedTags,
    searchInputRef,
    focusSearch,
    clearSearch,
    setSearchQuery,
    isSearching,
    navigateResults,
    selectResult,
    searchHistory,
    clearSearchHistory,
    addTagFilter,
    removeTagFilter,
    clearTagFilters,
  } = useHyprSearch((s) => ({
    searchQuery: s.query,
    selectedTags: s.selectedTags,
    searchInputRef: s.searchInputRef,
    focusSearch: s.focusSearch,
    clearSearch: s.clearSearch,
    setSearchQuery: s.setQuery,
    isSearching: s.isSearching,
    navigateResults: s.navigateResults,
    selectResult: s.selectResult,
    searchHistory: s.searchHistory,
    clearSearchHistory: s.clearSearchHistory,
    addTagFilter: s.addTagFilter,
    removeTagFilter: s.removeTagFilter,
    clearTagFilters: s.clearTagFilters,
  }));
  const { t } = useLingui();
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Get all available tags for filtering
  const { data: allTags = [] } = useQuery({
    queryKey: ["all-tags"],
    queryFn: () => dbCommands.listAllTags(),
  });

  // Filter out already selected tags
  const availableTags = allTags.filter(tag => !selectedTags.find(selected => selected.id === tag.id));

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
      {/* Selected tag filters */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
            >
              <TagIcon size={10} />
              <span>{tag.name}</span>
              <button
                onClick={() => removeTagFilter(tag.id)}
                className="hover:text-blue-600"
              >
                <XIcon size={10} />
              </button>
            </div>
          ))}
          <button
            onClick={clearTagFilters}
            className="text-xs text-neutral-500 hover:text-neutral-700 px-2 py-1"
          >
            Clear all
          </button>
        </div>
      )}

      <div
        className={clsx([
          "w-60 flex items-center gap-2 h-[34px]",
          "text-neutral-500 hover:text-neutral-600",
          "border border-border rounded-md px-2 py-2 bg-transparent",
          "hover:bg-white",
          isFocused && "bg-white",
          "transition-colors duration-200",
        ])}
        onClick={() => setShowCommandPalette(true)}
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
        {/* Tag selector */}
        <Popover open={showTagSelector} onOpenChange={setShowTagSelector}>
          <PopoverTrigger asChild>
            <button className="h-4 w-4 text-neutral-400 hover:text-neutral-600">
              <TagIcon size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end">
            <div className="space-y-2">
              <div className="text-xs font-medium text-neutral-700 px-1">
                Filter by tags
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {availableTags.length > 0
                  ? (
                    availableTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          addTagFilter(tag);
                          setShowTagSelector(false);
                        }}
                        className="w-full text-left px-2 py-1 text-xs rounded hover:bg-neutral-100 flex items-center gap-2"
                      >
                        <TagIcon size={10} />
                        {tag.name}
                      </button>
                    ))
                  )
                  : (
                    <div className="px-2 py-1 text-xs text-neutral-500">
                      {selectedTags.length > 0 ? "All tags selected" : "No tags available"}
                    </div>
                  )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {searchQuery && (
          <XIcon
            onClick={() => clearSearch()}
            className="h-4 w-4 text-neutral-400 hover:text-neutral-600"
          />
        )}

        {!searchQuery && <Shortcut macDisplay="⌘K" windowsDisplay="Ctrl+K" />}
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

      <CommandPalette 
        open={showCommandPalette} 
        onOpenChange={setShowCommandPalette}
      />
    </div>
  );
}
