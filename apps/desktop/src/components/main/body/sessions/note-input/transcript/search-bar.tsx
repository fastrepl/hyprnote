import {
  ALargeSmallIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ReplaceAllIcon,
  ReplaceIcon,
  WholeWordIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { useTranscriptSearch } from "./search-context";

function ToggleButton({
  active,
  onClick,
  tooltip,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn([
            "p-0.5 rounded-sm transition-colors",
            active
              ? "bg-neutral-300 text-neutral-700"
              : "text-neutral-400 hover:bg-neutral-200 hover:text-neutral-500",
          ])}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function IconButton({
  onClick,
  disabled,
  tooltip,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn([
            "p-0.5 rounded-sm transition-colors",
            disabled
              ? "text-neutral-300 cursor-not-allowed"
              : "hover:bg-neutral-200 text-neutral-500",
          ])}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function SearchBar() {
  const search = useTranscriptSearch();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (search?.showReplace) {
      replaceInputRef.current?.focus();
    }
  }, [search?.showReplace]);

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
    caseSensitive,
    wholeWord,
    showReplace,
    replaceQuery,
    toggleCaseSensitive,
    toggleWholeWord,
    toggleReplace,
    setReplaceQuery,
    replaceCurrent,
    replaceAll,
  } = search;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
    }
  };

  const handleReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      replaceCurrent();
    }
  };

  const displayCount =
    totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : "0/0";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 h-7 px-2 rounded-lg bg-neutral-100">
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search..."
          className="flex-1 min-w-0 h-full bg-transparent text-xs placeholder:text-neutral-400 focus:outline-hidden"
        />
        <div className="flex items-center gap-0.5">
          <ToggleButton
            active={caseSensitive}
            onClick={toggleCaseSensitive}
            tooltip="Match case"
          >
            <ALargeSmallIcon className="size-3.5" />
          </ToggleButton>
          <ToggleButton
            active={wholeWord}
            onClick={toggleWholeWord}
            tooltip="Match whole word"
          >
            <WholeWordIcon className="size-3.5" />
          </ToggleButton>
          <ToggleButton
            active={showReplace}
            onClick={toggleReplace}
            tooltip="Toggle replace (⌘H)"
          >
            <ReplaceIcon className="size-3.5" />
          </ToggleButton>
        </div>
        <span className="text-[10px] text-neutral-400 whitespace-nowrap tabular-nums">
          {displayCount}
        </span>
        <div className="flex items-center">
          <IconButton
            onClick={onPrev}
            disabled={totalMatches === 0}
            tooltip="Previous match (Shift+Enter)"
          >
            <ChevronUpIcon className="size-3.5" />
          </IconButton>
          <IconButton
            onClick={onNext}
            disabled={totalMatches === 0}
            tooltip="Next match (Enter)"
          >
            <ChevronDownIcon className="size-3.5" />
          </IconButton>
        </div>
        <IconButton onClick={close} tooltip="Close (Esc)">
          <XIcon className="size-3.5" />
        </IconButton>
      </div>

      {showReplace && (
        <div className="flex items-center gap-1.5 h-7 px-2 rounded-lg bg-neutral-100">
          <input
            ref={replaceInputRef}
            type="text"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            onKeyDown={handleReplaceKeyDown}
            placeholder="Replace with..."
            className="flex-1 min-w-0 h-full bg-transparent text-xs placeholder:text-neutral-400 focus:outline-hidden"
          />
          <div className="flex items-center gap-0.5">
            <IconButton
              onClick={replaceCurrent}
              disabled={totalMatches === 0}
              tooltip="Replace"
            >
              <ReplaceIcon className="size-3.5" />
            </IconButton>
            <IconButton
              onClick={replaceAll}
              disabled={totalMatches === 0}
              tooltip="Replace all"
            >
              <ReplaceAllIcon className="size-3.5" />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}
