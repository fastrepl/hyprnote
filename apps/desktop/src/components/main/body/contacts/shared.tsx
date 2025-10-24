import { Button } from "@hypr/ui/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@hypr/ui/components/ui/select";

import { ArrowDownUp, Plus, Search, X } from "lucide-react";
import { useState } from "react";

export const getInitials = (name?: string | null) => {
  if (!name) {
    return "?";
  }
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export type SortOption = "alphabetical" | "reverse-alphabetical" | "oldest" | "newest";

export function SortDropdown({
  sortOption,
  setSortOption,
}: {
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
}) {
  return (
    <Select
      value={sortOption}
      onValueChange={(value: SortOption) => setSortOption(value)}
    >
      <SelectTrigger className="h-8 w-8 p-0" aria-label="Sort options">
        <ArrowDownUp size={16} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="alphabetical" className="text-xs">
          A-Z
        </SelectItem>
        <SelectItem value="reverse-alphabetical" className="text-xs">
          Z-A
        </SelectItem>
        <SelectItem value="oldest" className="text-xs">
          Oldest
        </SelectItem>
        <SelectItem value="newest" className="text-xs">
          Newest
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ColumnHeader({
  title,
  sortOption,
  setSortOption,
  onAdd,
  searchValue,
  onSearchChange,
}: {
  title: string;
  sortOption?: SortOption;
  setSortOption?: (option: SortOption) => void;
  onAdd: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}) {
  const [showSearch, setShowSearch] = useState(false);

  const handleSearchToggle = () => {
    if (showSearch) {
      onSearchChange?.("");
    }
    setShowSearch(!showSearch);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onSearchChange?.("");
      setShowSearch(false);
      e.currentTarget.blur();
    }
  };

  return (
    <div className="@container border-b border-neutral-200">
      <div className="py-2 pl-3 pr-1 flex items-center justify-between h-12 min-w-0">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="flex items-center flex-shrink-0">
          {onSearchChange && (
            <Button
              onClick={handleSearchToggle}
              size="icon"
              variant="ghost"
              title="Search"
            >
              <Search size={16} />
            </Button>
          )}
          {sortOption && setSortOption && (
            <div className="hidden @[220px]:block">
              <SortDropdown sortOption={sortOption} setSortOption={setSortOption} />
            </div>
          )}
          <Button
            onClick={onAdd}
            size="icon"
            variant="ghost"
            title="Add"
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>
      {showSearch && onSearchChange && (
        <div className="flex items-center gap-2 px-3 border-t bg-white border-neutral-200 h-12">
          <Search className="h-4 w-4 text-neutral-400 flex-shrink-0" />
          <input
            type="text"
            value={searchValue || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search..."
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
            autoFocus
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              className="p-1 rounded hover:bg-neutral-100 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4 text-neutral-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
