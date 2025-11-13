import { useQuery } from "@tanstack/react-query";
import { ChevronDown, CirclePlus, Eye, EyeOff } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@hypr/ui/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";
import type { ListModelsResult, ModelIgnoreReason } from "./list-common";

const filterFunction = (value: string, search: string) => {
  const v = value.toLocaleLowerCase();
  const s = search.toLocaleLowerCase();
  if (v.includes(s)) {
    return 1;
  }
  return 0;
};

const formatIgnoreReason = (reason: ModelIgnoreReason): string => {
  switch (reason) {
    case "common_keyword":
      return "Contains common ignore keyword";
    case "no_tool":
      return "No tool support";
    case "no_text_input":
      return "No text input support";
    case "no_completion":
      return "No completion support";
    case "not_llm":
      return "Not an LLM type";
    case "context_too_small":
      return "Context length too small";
  }
};

export function ModelCombobox({
  providerId,
  value,
  onChange,
  listModels,
  disabled = false,
  placeholder = "Select a model",
}: {
  providerId: string;
  value: string;
  onChange: (value: string) => void;
  listModels: () => Promise<ListModelsResult> | ListModelsResult;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showIgnored, setShowIgnored] = useState(false);

  const { data: fetchedResult, isLoading } = useQuery({
    queryKey: ["models", providerId, listModels],
    queryFn: listModels,
    retry: 3,
    retryDelay: 300,
  });

  const options: string[] = useMemo(() => fetchedResult?.models ?? [], [fetchedResult]);
  const ignoredOptions = useMemo(() => fetchedResult?.ignored ?? [], [fetchedResult]);
  const trimmedQuery = query.trim();
  const hasExactMatch = useMemo(
    () => options.some((option) => option.toLocaleLowerCase() === trimmedQuery.toLocaleLowerCase()),
    [options, trimmedQuery],
  );
  const canSelectFreeform = trimmedQuery.length > 0 && !hasExactMatch;
  const hasIgnoredOptions = ignoredOptions.length > 0;

  const handleSelect = useCallback((option: string) => {
    onChange(option);
    setOpen(false);
    setQuery("");
  }, [onChange]);

  const toggleShowIgnored = useCallback(() => setShowIgnored((prev) => !prev), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled || isLoading}
          aria-expanded={open}
          className={cn(["w-full justify-between font-normal bg-white"])}
        >
          {value && value.length > 0
            ? <span className="truncate">{value}</span>
            : <span className="text-muted-foreground">{isLoading ? "Loading models..." : placeholder}</span>}
          <ChevronDown className="-mr-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
        <Command filter={filterFunction}>
          <CommandInput
            placeholder="Search or create new"
            value={query}
            onValueChange={(value: string) => setQuery(value)}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter") {
                event.preventDefault();
              }
            }}
          />
          <CommandEmpty>
            <div className="py-1.5 px-2 text-sm text-muted-foreground">
              {trimmedQuery.length > 0
                ? <p>No results found.</p>
                : hasIgnoredOptions
                ? <p>No models ready to use.</p>
                : <p>No models available.</p>}
            </div>
          </CommandEmpty>

          <CommandList>
            <CommandGroup className="overflow-y-auto">
              {options.map((option) => (
                <CommandItem
                  key={option}
                  tabIndex={0}
                  value={option}
                  onSelect={() => {
                    handleSelect(option);
                  }}
                  onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === "Enter") {
                      event.stopPropagation();
                      handleSelect(option);
                    }
                  }}
                  className={cn([
                    "cursor-pointer",
                    "focus:!bg-neutral-200 hover:!bg-neutral-200 aria-selected:bg-transparent",
                  ])}
                >
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}

              {showIgnored
                && ignoredOptions.map((option) => (
                  <CommandItem
                    key={`ignored-${option.id}`}
                    tabIndex={0}
                    value={option.id}
                    onSelect={() => {
                      handleSelect(option.id);
                    }}
                    onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                      if (event.key === "Enter") {
                        event.stopPropagation();
                        handleSelect(option.id);
                      }
                    }}
                    className={cn([
                      "cursor-pointer opacity-50",
                      "focus:!bg-neutral-200 hover:!bg-neutral-200 aria-selected:bg-transparent",
                    ])}
                  >
                    <Tooltip delayDuration={10}>
                      <TooltipTrigger asChild>
                        <span className="truncate w-full">{option.id}</span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          {option.reasons.map((reason) => <div key={reason}>• {formatIgnoreReason(reason)}</div>)}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </CommandItem>
                ))}

              {canSelectFreeform && (
                <CommandItem
                  key={`freeform-${trimmedQuery}`}
                  tabIndex={0}
                  value={trimmedQuery}
                  onSelect={() => {
                    handleSelect(trimmedQuery);
                  }}
                  onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === "Enter") {
                      event.stopPropagation();
                      handleSelect(trimmedQuery);
                    }
                  }}
                  className={cn([
                    "cursor-pointer",
                    "focus:!bg-neutral-200 hover:!bg-neutral-200 aria-selected:bg-transparent",
                  ])}
                >
                  <CirclePlus className="mr-2 h-4 w-4" />
                  <span className="truncate">Select "{trimmedQuery}"</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>

          {hasIgnoredOptions && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-t flex items-center justify-between">
              <span>
                {showIgnored
                  ? `Showing ${ignoredOptions.length} more items.`
                  : `${ignoredOptions.length} items ignored.`}
              </span>
              <button
                type="button"
                onClick={toggleShowIgnored}
                className="flex items-center gap-1 text-xs hover:text-foreground transition-colors"
              >
                {showIgnored ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showIgnored ? "Hide" : "Show"}
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
