import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@hypr/utils";

import { useTranscriptSearch } from "./search-context";

export function SearchBar() {
  const search = useTranscriptSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  if (!search) {
    return null;
  }

  const {
    query,
    setQuery,
    currentMatchIndex,
    totalMatches,
    onNext,
    onPrev,
    close,
  } = search;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
    }
  };

  const displayCount =
    totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : "0/0";

  return (
    <div className="w-full pt-1 pr-1">
      <div
        className={cn([
          "flex h-7 items-center gap-2 px-2.5",
          "rounded-lg border border-neutral-200 bg-white shadow-sm",
        ])}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search in transcript..."
          className={cn([
            "flex-1 h-full px-2 text-sm",
            "bg-neutral-100 border border-neutral-200 rounded",
            "focus:outline-none focus:border-neutral-400",
          ])}
        />
        <span className="text-xs text-neutral-600 whitespace-nowrap min-w-[3rem] text-right">
          {displayCount}
        </span>
        <button
          onClick={onPrev}
          disabled={totalMatches === 0}
          className={cn([
            "p-1.5 rounded transition-colors",
            totalMatches > 0
              ? "hover:bg-neutral-200 text-neutral-700"
              : "text-neutral-400 cursor-not-allowed",
          ])}
          title="Previous match (Shift+Enter)"
        >
          <ChevronUpIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onNext}
          disabled={totalMatches === 0}
          className={cn([
            "p-1.5 rounded transition-colors",
            totalMatches > 0
              ? "hover:bg-neutral-200 text-neutral-700"
              : "text-neutral-400 cursor-not-allowed",
          ])}
          title="Next match (Enter)"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </button>
        <button
          onClick={close}
          className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors"
          title="Close (Escape)"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
