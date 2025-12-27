import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Kbd } from "@hypr/ui/components/ui/kbd";
import { cn } from "@hypr/utils";

import { useSearch } from "../../../contexts/search/ui";
import { useCmdKeyPressed } from "../../../hooks/useCmdKeyPressed";

export function Search({
  hasSpace,
  onManualExpandChange,
}: {
  hasSpace: boolean;
  onManualExpandChange?: (isManuallyExpanded: boolean) => void;
}) {
  const { focus, setFocusImpl, inputRef } = useSearch();
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);

  const shouldShowExpanded = hasSpace || isManuallyExpanded;

  useEffect(() => {
    onManualExpandChange?.(isManuallyExpanded);
  }, [isManuallyExpanded, onManualExpandChange]);

  useEffect(() => {
    if (!shouldShowExpanded) {
      setFocusImpl(() => {
        setIsManuallyExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      });
    } else {
      setFocusImpl(() => {
        inputRef.current?.focus();
      });
    }
  }, [shouldShowExpanded, setFocusImpl, inputRef]);

  const handleCollapsedClick = () => {
    focus();
  };

  const handleExpandedFocus = () => {
    if (!hasSpace) {
      setIsManuallyExpanded(true);
    }
  };

  const handleExpandedBlur = () => {
    if (!hasSpace) {
      setIsManuallyExpanded(false);
    }
  };

  if (shouldShowExpanded) {
    return (
      <ExpandedSearch
        hasSpace={hasSpace}
        onFocus={handleExpandedFocus}
        onBlur={handleExpandedBlur}
      />
    );
  }

  return <CollapsedSearch onClick={handleCollapsedClick} />;
}

function CollapsedSearch({ onClick }: { onClick: () => void }) {
  const { isSearching, isIndexing } = useSearch();
  const showLoading = isSearching || isIndexing;

  return (
    <Button
      onClick={onClick}
      size="icon"
      variant="ghost"
      className="text-neutral-400"
    >
      {showLoading ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <SearchIcon className="size-4" />
      )}
    </Button>
  );
}

function ExpandedSearch({
  hasSpace,
  onFocus,
  onBlur,
}: {
  hasSpace: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const { query, setQuery, isSearching, isIndexing, inputRef, results } =
    useSearch();
  const [isFocused, setIsFocused] = useState(false);
  const isCmdPressed = useCmdKeyPressed();

  const showLoading = isSearching || isIndexing;
  const showShortcut = isCmdPressed && !query;
  const hasResults = results && results.totalResults > 0;
  const resultCount = results?.totalResults ?? 0;

  const width = hasSpace
    ? isFocused
      ? "w-[250px]"
      : "w-[180px]"
    : "w-[180px]";

  return (
    <div
      data-tauri-drag-region
      className={cn([
        "flex items-center h-full transition-all duration-300",
        width,
      ])}
    >
      <div className="relative flex items-center w-full h-full">
        {showLoading ? (
          <Loader2Icon
            className={cn([
              "h-4 w-4 absolute left-3 text-neutral-400 animate-spin",
            ])}
          />
        ) : (
          <SearchIcon
            className={cn(["h-4 w-4 absolute left-3 text-neutral-400"])}
          />
        )}
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
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          className={cn([
            "text-sm placeholder:text-sm placeholder:text-neutral-400",
            "w-full pl-9 h-full",
            query
              ? hasResults
                ? "pr-16"
                : "pr-9"
              : showShortcut
                ? "pr-14"
                : "pr-4",
            "rounded-xl bg-neutral-100",
            "focus:outline-none focus:bg-neutral-200",
          ])}
        />
        {hasResults && query && (
          <div
            className={cn([
              "absolute right-9",
              "px-2 py-0.5",
              "rounded-full bg-neutral-400",
              "text-xs text-white font-semibold",
              "pointer-events-none",
            ])}
          >
            {resultCount}
          </div>
        )}
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
            <Kbd>⌘ K</Kbd>
          </div>
        )}
      </div>
    </div>
  );
}
