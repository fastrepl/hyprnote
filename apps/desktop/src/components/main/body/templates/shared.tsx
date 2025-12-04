import { Search, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";

export function TemplateColumnHeader({
  title,
  searchValue,
  onSearchChange,
}: {
  title: string;
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
            placeholder="Search templates..."
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
